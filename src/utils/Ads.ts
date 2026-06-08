// Ads provider seam. Web build = stubs (so the reward flow is testable); native
// build = Capacitor AdMob, dynamically imported + guarded by isNativePlatform() so
// the web bundle never loads the plugin. Rewarded ads are always opt-in and never
// required to progress; interstitials are frequency-capped and suppressed for
// premium owners. Analytics events are emitted on both paths.
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
async function ensureAdMob(): Promise<AdMobPlugin | null> {
  if (!Capacitor.isNativePlatform()) return null;
  if (initStarted) return admob;
  initStarted = true;
  try {
    const m = await import('./native/admob');
    admob = m.AdMob;
    await admob.initialize();
  } catch {
    admob = null; // plugin unavailable — never block gameplay
  }
  return admob;
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
    const ad = await ensureAdMob();
    if (!ad) return false;
    try {
      await ad.prepareRewardVideoAd({ adId: ADMOB.rewardedAdId });
      const reward = await ad.showRewardVideoAd();
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
    const ad = await ensureAdMob();
    if (!ad) return;
    try {
      await ad.prepareInterstitial({ adId: ADMOB.interstitialAdId });
      await ad.showInterstitial();
      Analytics.track(interstitialShown());
    } catch {
      // ad failed to load/show — silently skip; never block gameplay
    }
  },
};
