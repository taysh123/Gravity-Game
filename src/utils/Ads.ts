// Ads provider seam. Web build = stubs (so the reward flow is testable); native
// build = Capacitor AdMob, dynamically imported + guarded by isNativePlatform() so
// the web bundle never loads the plugin. Rewarded ads are always opt-in and never
// required to progress; interstitials are gated by interstitialDecision() (Wave 3
// Task 1) — premium / first-session grace / flow-protected (boss, 3★, hot streak)
// / frequency-capped, in that order — and the frequency cap PERSISTS across
// reloads (localStorage) so a cold start never re-arms a fresh player's cooldown.
// Analytics events are emitted on both the show and every suppression.
//
// NOTE: a Capacitor registerPlugin() proxy is thenable, so `ensureAdMob()` must NOT
// return the proxy (that would invoke proxy.then -> "AdMob.then is not implemented").
// It resolves to a boolean; callers use the module-scoped `admob`.
import { Capacitor } from '@capacitor/core';
import { IAP } from './IAP';
import { ADMOB } from '../config/monetization.config';
import { Analytics } from './Analytics';
import { rewardedShown, rewardedEarned, interstitialShown, interstitialSuppressed } from './analyticsEvents';
import { interstitialDecision } from './interstitial';
import type { AdMobPlugin } from './native/admob';

// Persisted cooldown — survives a reload/cold start, unlike the old in-memory
// `let` (which reset every launch, leaving a brand-new player's first win the
// LEAST protected). Read once on module load, rewritten on every eligible show.
const COOLDOWN_KEY = 'gravity-flow:interstitial:v1';

function loadLastShownMs(): number {
  try {
    const raw = localStorage.getItem(COOLDOWN_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { lastShownMs?: unknown };
    return typeof parsed.lastShownMs === 'number' ? parsed.lastShownMs : 0;
  } catch {
    return 0; // storage disabled/corrupt — behave like a first-ever show
  }
}

let lastShownMs = loadLastShownMs();

function persistLastShownMs(v: number): void {
  lastShownMs = v;
  try {
    localStorage.setItem(COOLDOWN_KEY, JSON.stringify({ lastShownMs: v }));
  } catch {
    // storage disabled — cooldown still holds for the rest of this session
  }
}

// Session-scoped (reset every app load, by design): a returning player's new
// session gets the same first-few-levels grace as a brand-new one — that's
// protective, not a loophole. The cross-session cap is the persisted value above.
const sessionStartMs = Date.now();
let sessionLevels = 0;

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

  // Show an interstitial if eligible. `ctx.flowProtected` is the ONLY thing the
  // caller supplies (was the just-finished win a boss / 3★ / hot streak?) — every
  // other signal (premium, session grace, the persisted frequency cap) is owned
  // here. No-op on web; real ad on native. Suppressions are tracked too, so the
  // cadence is measurable even where no ad can actually show (web/DEV).
  async maybeInterstitial(ctx: { flowProtected: boolean; now?: number } = { flowProtected: false }): Promise<void> {
    const now = ctx.now ?? Date.now();
    const decision = interstitialDecision({
      now,
      lastShownMs,
      isPremium: IAP.isPremium(),
      sessionLevels,
      sessionElapsedMs: now - sessionStartMs,
      flowProtected: ctx.flowProtected,
    });
    sessionLevels += 1; // this call = one more campaign level completed this session

    if (!decision.show) {
      Analytics.track(interstitialSuppressed(decision.reason));
      return;
    }

    persistLastShownMs(now); // pre-native-guard, matching the old pre-guard write — the
    // cap must reflect an "eligible" moment even where no real ad can show (web).
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
