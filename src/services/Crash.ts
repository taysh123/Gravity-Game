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
// Consent-first (D-10.5): the manifest sets firebase_crashlytics_collection_enabled=false, so Crashlytics keeps what it records on
// the device and sends nothing. Loading the plugin (init, log, recordError) never changes that. Only enable() turns collection on;
// bootServices calls it once consent has resolved, whatever the outcome (the legal check on that default is a STATUS gate).
import { Capacitor } from '@capacitor/core';

type Crashlytics = {
  setEnabled(o: { enabled: boolean }): Promise<void>;
  addLogMessage(o: { message: string }): Promise<void>;
  recordException(o: { message: string }): Promise<void>;
};

let plugin: Crashlytics | null = null;
let ready: Promise<boolean> | null = null;
let enableRequested = false;

// Resolves true once the native plugin is available. Does NOT return the proxy.
// The in-flight promise is memoized, so every caller (init, log, recordError, enable) waits on the same load instead of
// seeing a half-initialised `plugin === null` and dropping its report. A failed load is not retried. It does NOT enable
// collection: that is enable()'s job, after consent.
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

  // Turns Crashlytics collection on (D-10.5). Called by bootServices after consent has resolved, in every outcome. Idempotent: the
  // native call is made once. Never throws; a native failure leaves collection off (the manifest default).
  enable(): void {
    if (!Capacitor.isNativePlatform() || enableRequested) return;
    enableRequested = true;
    void ensure().then((ok) => {
      if (ok) plugin?.setEnabled({ enabled: true }).catch(() => {});
    });
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
