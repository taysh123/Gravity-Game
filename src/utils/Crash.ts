// Crash-reporting seam. Web build = console (dev) / no-op (prod); native build =
// Firebase Crashlytics, dynamically imported and guarded by Capacitor.isNativePlatform().
// init() also installs a global error bridge so uncaught errors/rejections are
// recorded (and visible in web dev). Thin seam, mirrors Ads/IAP/Analytics.
import { Capacitor } from '@capacitor/core';

type Crashlytics = {
  setEnabled(o: { enabled: boolean }): Promise<void>;
  addLogMessage(o: { message: string }): Promise<void>;
  recordException(o: { message: string }): Promise<void>;
};

let plugin: Crashlytics | null = null;
let loaded = false;

async function ensure(): Promise<Crashlytics | null> {
  if (loaded) return plugin;
  loaded = true;
  try {
    const m = await import('./native/firebaseCrashlytics');
    plugin = m.FirebaseCrashlytics as unknown as Crashlytics;
    await plugin.setEnabled({ enabled: true });
  } catch {
    plugin = null; // unavailable — fail silent
  }
  return plugin;
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
    if (Capacitor.isNativePlatform()) void ensure().then((c) => c?.addLogMessage({ message }));
    else if (import.meta.env.DEV) console.debug('[crash:log]', message);
  },

  recordError(error: unknown, context?: string): void {
    const base = error instanceof Error ? error.message : String(error);
    const message = context ? `[${context}] ${base}` : base;
    if (Capacitor.isNativePlatform()) void ensure().then((c) => c?.recordException({ message }));
    else if (import.meta.env.DEV) console.error('[crash]', message, error);
  },
};
