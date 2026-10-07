// Analytics seam. Web build = no-op (console in dev only); native build = Firebase
// Analytics, dynamically imported and guarded by Capacitor.isNativePlatform() so the
// web bundle never loads the native plugin. Mirrors the Ads/IAP seam shape — thin,
// not a manager. Event shapes live in analyticsEvents.ts (pure + tested).
//
// Consent (D-10): the manifest starts Firebase with all four Consent Mode defaults denied, but those defaults apply on a FRESH
// install (or after app data is cleared) only: Firebase persists every setConsent value, and the persisted value takes precedence
// over the manifest. So on a fresh install nothing is stored or linked before bootServices has the UMP outcome; from the second
// launch the last explicit choice applies from process start until the new UMP answer arrives (TECHNICAL-ARCHITECTURE 4.3).
// applyConsent(outcome) writes the four types (ANALYTICS_STORAGE, AD_STORAGE, AD_USER_DATA, AD_PERSONALIZATION) on every launch;
// the same call is how a later change from "Privacy choices" is applied.
//
// IMPORTANT: a Capacitor registerPlugin() proxy is *thenable*, so it is never returned from an async function or awaited:
// ensureNative() resolves to a boolean and callers use the module-scoped `plugin`.
import { Capacitor } from '@capacitor/core';
import type { AnalyticsEvent } from './analyticsEvents';
import { consentModeSettings, type ConsentOutcome } from './consentState';
import { Crash } from './Crash';
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
  // must never break boot. A rejected write is not silent: Firebase then keeps its previous value for that type (which persists
  // across launches), so each one leaves a Crash breadcrumb with the type and the status that was attempted, nothing else (no error
  // text, no ids). No-op on the web (no consent layer, no native plugin).
  async applyConsent(outcome: ConsentOutcome): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    if (!(await ensureNative()) || !plugin) return;
    const p = plugin;
    const settings = consentModeSettings(outcome);
    const results = await Promise.allSettled(settings.map((s) => p.setConsent(s)));
    results.forEach((r, i) => {
      if (r.status !== 'rejected') return;
      try {
        Crash.log(`consent: setConsent ${settings[i].type} ${settings[i].status} failed`);
      } catch {
        // a breadcrumb must never break boot
      }
    });
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
