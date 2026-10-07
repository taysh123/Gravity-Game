// Crash-reporting seam. Web build = console (dev) / no-op (prod); native build =
// Firebase Crashlytics, dynamically imported and guarded by Capacitor.isNativePlatform().
// init() also installs a global error bridge so uncaught errors/rejections are
// recorded (and visible in web dev). Thin seam, mirrors Ads/IAP/Analytics.
//
// IMPORTANT: a Capacitor registerPlugin() proxy is *thenable* (proxy.then is a
// callable that forwards to a native "then" method). So we must NEVER let the proxy
// become a promise resolution value (return it from an async fn / await it /
// Promise.resolve it) — that would invoke proxy.then -> "not implemented on android".
// `ensure()` therefore resolves to a boolean; callers use the module-scoped `plugin`.
//
// Collection switch (D-10.5). The manifest sets firebase_crashlytics_collection_enabled=false, which is the default of a FRESH
// install only: setCrashlyticsCollectionEnabled() is persisted by Crashlytics (DataCollectionArbiter, SharedPreferences) and takes
// precedence over the manifest, so once enable() has run, collection is already on at process start from the next launch, before
// UMP has answered. Loading the plugin (init, log, recordError) never changes collection. enable() / disable() are the only
// switches; bootServices calls enable() once consent has resolved, whatever the outcome, and disable() only when
// CRASH_REQUIRES_ANALYTICS_CONSENT is on and analytics_storage is denied (the legal check on that default is a STATUS gate).
import { Capacitor } from '@capacitor/core';

type Crashlytics = {
  setEnabled(o: { enabled: boolean }): Promise<void>;
  addLogMessage(o: { message: string }): Promise<void>;
  recordException(o: { message: string }): Promise<void>;
};

let plugin: Crashlytics | null = null;
let ready: Promise<boolean> | null = null;
// The last collection state asked for in this session (null = nothing asked yet). A repeat of the same state is not sent again.
let collection: boolean | null = null;

// Resolves true once the native plugin is available. Does NOT return the proxy.
// The in-flight promise is memoized, so every caller (init, log, recordError, enable) waits on the same load instead of
// seeing a half-initialised `plugin === null` and dropping its report. A failed load is not retried. It does NOT change
// collection: that is enable() / disable()'s job, after consent.
function ensure(): Promise<boolean> {
  if (!ready) {
    ready = (async () => {
      try {
        const m = await import('./native/firebaseCrashlytics');
        plugin = m.FirebaseCrashlytics as unknown as Crashlytics;
      } catch {
        plugin = null; // unavailable — fail silent
      }
      return plugin !== null;
    })();
  }
  return ready;
}

function setCollection(on: boolean): void {
  if (!Capacitor.isNativePlatform() || collection === on) return;
  collection = on;
  void ensure().then((ok) => {
    if (!ok) return;
    plugin?.setEnabled({ enabled: on }).catch(() => {
      if (collection === on) collection = null; // not applied: let the next call retry
    });
  });
}

export const Crash = {
  init(): void {
    if (Capacitor.isNativePlatform()) void ensure();
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (e: ErrorEvent) =>
        Crash.recordError(e.error ?? e.message, 'window.onerror'),
      );
      window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) =>
        Crash.recordError(e.reason, 'unhandledrejection'),
      );
    }
  },

  // Turns Crashlytics collection on (D-10.5). Called by bootServices after consent has resolved, in every outcome. Single-flight per
  // state: a repeat of the same state makes no second native call. Never throws; a failed native call is forgotten so the next
  // call tries again (the value Crashlytics holds is then whatever an earlier launch persisted).
  enable(): void {
    setCollection(true);
  },

  // Turns Crashlytics collection off. The off-switch for CRASH_REQUIRES_ANALYTICS_CONSENT: bootServices / Privacy choices call it
  // when analytics_storage is denied. Sent even if enable() never ran this session, because an earlier launch may have persisted
  // "on". Same guarantees as enable(): single-flight per state, never throws.
  disable(): void {
    setCollection(false);
  },

  log(message: string): void {
    if (Capacitor.isNativePlatform()) {
      void ensure().then((ok) => {
        if (ok) plugin?.addLogMessage({ message }).catch(() => {});
      });
    } else if (import.meta.env.DEV) console.debug('[crash:log]', message);
  },

  recordError(error: unknown, context?: string): void {
    const base = error instanceof Error ? error.message : String(error);
    const message = context ? `[${context}] ${base}` : base;
    if (Capacitor.isNativePlatform()) {
      // .catch swallows any native failure so the global error bridge can't recurse.
      void ensure().then((ok) => {
        if (ok) plugin?.recordException({ message }).catch(() => {});
      });
    } else if (import.meta.env.DEV) console.error('[crash]', message, error);
  },
};
