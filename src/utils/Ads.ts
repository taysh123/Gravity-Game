// Ads provider seam. Web build = stubs (so the reward flow is testable); native
// build = Capacitor AdMob, dynamically imported + guarded by isNativePlatform() so
// the web bundle never loads the plugin. Rewarded ads are always opt-in and never
// required to progress; interstitials are frequency-capped and suppressed for
// premium owners. Analytics events are emitted on both paths.
//
// NOTE: a Capacitor registerPlugin() proxy is thenable, so `ensureAdMob()` must NOT
// return the proxy (that would invoke proxy.then -> "AdMob.then is not implemented").
// It resolves to a boolean; callers use the module-scoped `admob`.
import { Capacitor } from '@capacitor/core';
import { IAP } from './IAP';
import { ADMOB } from '../config/monetization.config';
import { Analytics } from './Analytics';
import { rewardedShown, rewardedEarned, interstitialShown } from './analyticsEvents';
import type { AdMobPlugin } from './native/admob';

let lastInterstitialMs = 0;
const INTERSTITIAL_MIN_GAP_MS = 180_000; // ≥3 min between interstitials

let admob: AdMobPlugin | null = null;
let initStarted = false;
// Resolves true once the native plugin is available. Does NOT return the proxy.
async function ensureAdMob(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  if (initStarted) return admob !== null;
  initStarted = true;
  try {
    const m = await import('./native/admob');
    const a = m.AdMob;
    // UMP consent (GDPR/EEA) BEFORE initialize. Best-effort + non-blocking: any
    // failure, NOT_REQUIRED, or an unconfigured form simply falls through to init.
    // The actual form is configured in the AdMob "Privacy & messaging" console.
    try {
      const consent = await a.requestConsentInfo();
      if (consent.status === 'REQUIRED' && consent.isConsentFormAvailable) {
        await a.showConsentForm();
      }
    } catch {
      // consent unavailable/not set up — proceed; ads SDK still initializes
    }
    await a.initialize(); // a method CALL is fine (real promise)
    admob = a;
  } catch {
    admob = null; // plugin unavailable — never block gameplay
  }
  return admob !== null;
}

export const Ads = {
  isRewardedReady(): boolean {
    return true; // web stub; native prepares on demand in showRewarded()
  },

  // Resolves true if the player earned the reward. Web stub grants it.
  async showRewarded(): Promise<boolean> {
    Analytics.track(rewardedShown());
    if (!Capacitor.isNativePlatform()) {
      Analytics.track(rewardedEarned());
      return true;
    }
    if (!(await ensureAdMob()) || !admob) return false;
    try {
      await admob.prepareRewardVideoAd({ adId: ADMOB.rewardedAdId });
      const reward = await admob.showRewardVideoAd();
      const earned = reward != null;
      if (earned) Analytics.track(rewardedEarned());
      return earned;
    } catch {
      return false;
    }
  },

  // Show an interstitial if eligible (not premium, past the frequency cap).
  // No-op on web; real ad on native.
  async maybeInterstitial(now: number = Date.now()): Promise<void> {
    if (IAP.isPremium()) return;
    if (now - lastInterstitialMs < INTERSTITIAL_MIN_GAP_MS) return;
    lastInterstitialMs = now;
    if (!Capacitor.isNativePlatform()) return;
    if (!(await ensureAdMob()) || !admob) return;
    try {
      await admob.prepareInterstitial({ adId: ADMOB.interstitialAdId });
      await admob.showInterstitial();
      Analytics.track(interstitialShown());
    } catch {
      // ad failed to load/show — silently skip; never block gameplay
    }
  },
};
