// Analytics seam. Web build = no-op (console in dev only); native build = Firebase
// Analytics, dynamically imported and guarded by Capacitor.isNativePlatform() so the
// web bundle never loads the native plugin. Mirrors the Ads/IAP seam shape — thin,
// not a manager. Event shapes live in analyticsEvents.ts (pure + tested).
//
// Consent (D-10): the manifest starts Firebase with all four Consent Mode defaults denied, so nothing is stored or linked before
// bootServices has the UMP outcome. applyConsent(outcome) then writes the four types (ANALYTICS_STORAGE, AD_STORAGE, AD_USER_DATA,
// AD_PERSONALIZATION); the same call is how a later change from "Privacy choices" is applied.
//
// IMPORTANT: a Capacitor registerPlugin() proxy is *thenable*, so it is never returned from an async function or awaited:
// ensureNative() resolves to a boolean and callers use the module-scoped `plugin`.
import { Capacitor } from '@capacitor/core';
import type { AnalyticsEvent } from './analyticsEvents';
import { consentModeSettings, type ConsentOutcome } from './consentState';
import type { FirebaseAnalyticsPlugin } from './native/firebaseAnalytics';

let plugin: FirebaseAnalyticsPlugin | null = null;
let loading: Promise<boolean> | null = null;

// Resolves true once the native plugin is available (memoized; a failed load is not retried). Does NOT return the proxy.
function ensureNative(): Promise<boolean> {
  if (!loading) {
    loading = (async () => {
      try {
        const m = await import('./native/firebaseAnalytics');
        plugin = m.FirebaseAnalytics;
      } catch {
        plugin = null; // plugin unavailable — fail silent, never break gameplay
      }
      return plugin !== null;
    })();
  }
  return loading;
}

export const Analytics = {
  track(event: AnalyticsEvent): void {
    if (Capacitor.isNativePlatform()) {
      void ensureNative().then((ok) => {
        if (ok) void plugin?.logEvent({ name: event.name, params: event.params });
      });
    } else if (import.meta.env.DEV) {
      // Web dev: surface the funnel in the console; prod web is a true no-op.
      console.debug('[analytics]', event.name, event.params);
    }
  },

  // Writes the UMP outcome to Firebase Consent Mode. Never throws: one rejected type must not stop the other three, and analytics
  // must never break boot. No-op on the web (no consent layer, no native plugin).
  async applyConsent(outcome: ConsentOutcome): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    if (!(await ensureNative()) || !plugin) return;
    const p = plugin;
    await Promise.allSettled(consentModeSettings(outcome).map((s) => p.setConsent(s)));
    // P00-T23: flush the pre-consent analytics queue here, once, after the four types are set (and drop it when analytics is denied).
  },

  // Settings > "Reset analytics data" (D-10): clears Firebase's local analytics data and resets the app instance id. Resolves on
  // the web (nothing is stored there); rejects when the native call fails so the caller can say so.
  async resetData(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    if (!(await ensureNative()) || !plugin) throw new Error('analytics unavailable');
    await plugin.resetAnalyticsData();
  },
};
