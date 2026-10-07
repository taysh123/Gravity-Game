// Ads provider seam. Web build = stubs (so the reward flow is testable); native
// build = Capacitor AdMob, dynamically imported + guarded by isNativePlatform() so
// the web bundle never loads the plugin. Rewarded ads are always opt-in and never
// required to progress; interstitials are gated by interstitialDecision() (Wave 3
// Task 1) — premium / first-session grace / flow-protected (boss, 3★, hot streak)
// / frequency-capped, in that order — and the frequency cap PERSISTS across
// reloads (localStorage) so a cold start never re-arms a fresh player's cooldown.
// Analytics events are emitted on both the show and every suppression.
//
// Consent-first (D-10, P00-T18): this module never asks for consent and never initialises the SDK on its own. bootServices runs
// UMP (services/Consent.ts), applies the outcome to Analytics, and calls Ads.init(outcome) ONLY when UMP says canRequestAds.
// Until that init has succeeded, every native ad request here is refused as not ready: no prepare, no show, no UMP, no
// initialize. Ads.revoke() closes the gate again when the player withdraws consent in Settings > Privacy choices.
// D-25 / A-07: initialize() gets maxAdContentRating ParentalGuidance and no child-directed or under-age tag at all.
// (Preload, watchdog and readiness plumbing is P00-T19.)
//
// NOTE: a Capacitor registerPlugin() proxy is thenable, so the init promise must NOT
// resolve to the proxy (that would invoke proxy.then -> "AdMob.then is not implemented").
// It resolves to a boolean; callers use the module-scoped `admob`.
import { Capacitor } from '@capacitor/core';
import { IAP } from './IAP';
import { ADMOB, ADMOB_TARGETING } from '../config/monetization.config';
import { UMP_DEBUG } from '../config/consent.config';
import { Analytics } from './Analytics';
import { rewardedShown, rewardedEarned, interstitialShown, interstitialSuppressed } from './analyticsEvents';
import type { ConsentOutcome } from './consentState';
import { interstitialDecision } from './interstitial';
import type { AdMobInitializeOptions, AdMobPlugin } from './native/admob';
import { Saves } from '../platform/saves';

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
// Read at module load, i.e. before Saves.hydrate() settles: re-read if hydrate restores the key from the mirror.
Saves.onRestore(COOLDOWN_KEY, () => {
  lastShownMs = loadLastShownMs();
});

function persistLastShownMs(v: number): void {
  lastShownMs = v;
  try {
    Saves.write(COOLDOWN_KEY, JSON.stringify({ lastShownMs: v }));
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
let initPromise: Promise<boolean> | null = null;
// True from Ads.init(outcome) with canRequestAds until Ads.revoke(). The SDK being initialised is not enough on its own: after the
// player withdraws consent the SDK stays up for the session, but no further ad is requested or shown.
let consented = false;

// What AdMob.initialize() is told. D-25: no tagForChildDirectedTreatment / tagForUnderAgeOfConsent keys at all (13+ audience).
// initializeForTesting only in a debug-geography build, with the test device ids that build was made with.
function initializeOptions(): AdMobInitializeOptions {
  const options: AdMobInitializeOptions = { maxAdContentRating: ADMOB_TARGETING.MAX_AD_CONTENT_RATING };
  if (UMP_DEBUG.geography !== undefined) {
    options.initializeForTesting = true;
    options.testingDevices = [...UMP_DEBUG.testDeviceIds];
  }
  return options;
}

// Single-flight SDK init. Resolves true once initialize() answered. Does NOT return the proxy. A failure is not memoized, so a
// later Ads.init (e.g. after Privacy choices) may try again; it never throws and never blocks gameplay.
function initSdk(): Promise<boolean> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const m = await import('./native/admob');
        await m.AdMob.initialize(initializeOptions()); // a method CALL is fine (real promise)
        admob = m.AdMob;
      } catch {
        admob = null; // plugin unavailable — never block gameplay
        initPromise = null;
      }
      return admob !== null;
    })();
  }
  return initPromise;
}

// May a native ad be requested right now? Consent says yes AND the SDK came up.
function adsReady(): boolean {
  return Capacitor.isNativePlatform() && consented && admob !== null;
}

export const Ads = {
  // Called by bootServices after consent resolved, and only when the outcome allows ads (also by "Privacy choices" if the player
  // grants consent later). Idempotent. On the web there is nothing to initialise.
  async init(outcome: ConsentOutcome): Promise<void> {
    if (!outcome.canRequestAds) {
      consented = false;
      return;
    }
    if (!Capacitor.isNativePlatform()) return;
    consented = true;
    await initSdk();
  },

  // The player withdrew consent (Settings > Privacy choices): stop requesting and showing ads for the rest of the session.
  revoke(): void {
    consented = false;
  },

  isRewardedReady(): boolean {
    // Web stub: always. Native: only once consent allowed ads and the SDK is up (P00-T19 refines this to the real cache state).
    return !Capacitor.isNativePlatform() || adsReady();
  },

  // Resolves true if the player earned the reward. Web stub grants it.
  // `source` identifies the calling surface ('campaign_2x' | 'endless_2x' |
  // 'endless_revive' | 'free_fragments') so shown/earned are attributable
  // per-surface in analytics (Wave 3 Task 2). This is the ONLY call site for
  // rewardedShown/rewardedEarned, so every caller gets the attribution for free.
  async showRewarded(source: string): Promise<boolean> {
    // Consent gate: before a successful Ads.init a native request is refused as not ready, with no event and no native call.
    if (Capacitor.isNativePlatform() && !adsReady()) return false;
    Analytics.track(rewardedShown(source));
    if (!Capacitor.isNativePlatform()) {
      Analytics.track(rewardedEarned(source));
      return true;
    }
    const ad = admob;
    if (!ad) return false;
    try {
      await ad.prepareRewardVideoAd({ adId: ADMOB.rewardedAdId });
      const reward = await ad.showRewardVideoAd();
      const earned = reward != null;
      if (earned) Analytics.track(rewardedEarned(source));
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
    const ad = admob;
    if (!adsReady() || !ad) return; // consent gate: no request before Ads.init succeeded
    try {
      await ad.prepareInterstitial({ adId: ADMOB.interstitialAdId });
      await ad.showInterstitial();
      Analytics.track(interstitialShown());
    } catch {
      // ad failed to load/show — silently skip; never block gameplay
    }
  },
};
