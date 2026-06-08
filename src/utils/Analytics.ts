// Analytics seam. Web build = no-op (console in dev only); native build = Firebase
// Analytics, dynamically imported and guarded by Capacitor.isNativePlatform() so the
// web bundle never loads the native plugin. Mirrors the Ads/IAP seam shape — thin,
// not a manager. Event shapes live in analyticsEvents.ts (pure + tested).
import { Capacitor } from '@capacitor/core';
import type { AnalyticsEvent } from './analyticsEvents';

type LogFn = (e: AnalyticsEvent) => void;
let nativeLog: LogFn | null = null;
let loaded = false;

async function ensureNative(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const { FirebaseAnalytics } = await import('./native/firebaseAnalytics');
    nativeLog = (e) => {
      void FirebaseAnalytics.logEvent({ name: e.name, params: e.params });
    };
  } catch {
    nativeLog = null; // plugin unavailable — fail silent, never break gameplay
  }
}

export const Analytics = {
  track(event: AnalyticsEvent): void {
    if (Capacitor.isNativePlatform()) {
      void ensureNative().then(() => nativeLog?.(event));
    } else if (import.meta.env.DEV) {
      // Web dev: surface the funnel in the console; prod web is a true no-op.
      console.debug('[analytics]', event.name, event.params);
    }
  },
};
