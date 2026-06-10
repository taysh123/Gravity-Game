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
import { Capacitor } from '@capacitor/core';

type Crashlytics = {
  setEnabled(o: { enabled: boolean }): Promise<void>;
  addLogMessage(o: { message: string }): Promise<void>;
  recordException(o: { message: string }): Promise<void>;
};

let plugin: Crashlytics | null = null;
let loaded = false;

// Resolves true once the native plugin is available. Does NOT return the proxy.
async function ensure(): Promise<boolean> {
  if (loaded) return plugin !== null;
  loaded = true;
  try {
    const m = await import('./native/firebaseCrashlytics');
    const p = m.FirebaseCrashlytics as unknown as Crashlytics;
    await p.setEnabled({ enabled: true }); // a method CALL is fine (real promise)
    plugin = p;
  } catch {
    plugin = null; // unavailable — fail silent
  }
  return plugin !== null;
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
