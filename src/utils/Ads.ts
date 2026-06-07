// Ads provider seam. The web build uses stubs so the reward flow is testable;
// Sprint 2 swaps in Capacitor AdMob behind this same interface. Rewarded ads are
// always opt-in and never required to progress; interstitials are frequency-capped
// and suppressed for premium owners.
import { IAP } from './IAP';

let lastInterstitialMs = 0;
const INTERSTITIAL_MIN_GAP_MS = 180_000; // ≥3 min between interstitials

export const Ads = {
  isRewardedReady(): boolean {
    return true; // web stub; real readiness check in Sprint 2
  },

  // Resolves true if the player earned the reward. Web stub grants it.
  async showRewarded(): Promise<boolean> {
    return true;
  },

  // Show an interstitial if eligible (not premium, past the frequency cap).
  // No-op on web; real ad in Sprint 2.
  async maybeInterstitial(now: number = Date.now()): Promise<void> {
    if (IAP.isPremium()) return;
    if (now - lastInterstitialMs < INTERSTITIAL_MIN_GAP_MS) return;
    lastInterstitialMs = now;
    // Sprint 2: await AdMob.showInterstitial();
  },
};
