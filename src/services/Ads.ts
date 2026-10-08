// Ads provider seam. Web build = a DEV-only stub (so the reward flow is testable; a production web build has no rewarded ad and
// shows no offer); native build = Capacitor AdMob, dynamically imported + guarded by isNativePlatform() so the web bundle never
// loads the plugin. Rewarded ads are always opt-in and never required to progress; interstitials are gated by
// interstitialDecision() (Wave 3 Task 1) — premium / first-session grace / flow-protected (boss, 3★, hot streak) /
// frequency-capped, in that order — and the frequency cap PERSISTS across reloads (localStorage) so a cold start never
// re-arms a fresh player's cooldown. Analytics events are emitted on both the show and every suppression.
//
// Consent-first (D-10, P00-T18): this module never asks for consent and never initialises the SDK on its own. bootServices runs
// UMP (services/Consent.ts), applies the outcome to Analytics, and calls Ads.init(outcome) ONLY when UMP says canRequestAds.
// Until that init has succeeded, every native ad request here is refused as not ready: no listener, no prepare, no show, no UMP,
// no initialize. Ads.revoke() closes the gate again when the player withdraws consent in Settings > Privacy choices: it stops
// preloading and cancels every pending retry. D-25 / A-07: initialize() gets maxAdContentRating ParentalGuidance and no
// child-directed or under-age tag at all.
//
// Ad plumbing (D-24, P00-T19): after init the plugin's eleven events are listened to once and fed to the pure reducer in
// adState.ts; both formats are preloaded and reloaded after every show, failure (with backoff) and expiry. A rewarded outcome
// (earned | dismissed | unavailable) is read from those events and a 5 s watchdog, NEVER from the showRewardVideoAd() promise (the
// plugin settles it only on a reward). Every show is busy-guarded, wrapped in setExternalFlowActive (so the pause overlay stays
// shut while the ad covers the app) and mutes game audio, restoring it only if the player wants audio. Any rewarded view resets
// the interstitial clock. The interstitial is awaited by the caller, is skipped when it is not already preloaded, and never waits
// on a load.
//
// NOTE: a Capacitor registerPlugin() proxy is thenable, so the init promise must NOT
// resolve to the proxy (that would invoke proxy.then -> "AdMob.then is not implemented").
// It resolves to a boolean; callers use the module-scoped `admob`.
import { Capacitor } from '@capacitor/core';
import { IAP } from './IAP';
import { ADMOB, ADMOB_EVENTS, ADMOB_TARGETING, AD_EXTERNAL_FLOW_SOURCE, AD_SLEEP_MIN_MS } from '../config/monetization.config';
import { UMP_DEBUG } from '../config/consent.config';
import { Analytics } from './Analytics';
import { rewardedShown, rewardedEarned, interstitialShown, interstitialSuppressed } from './analyticsEvents';
import type { ConsentOutcome } from './consentState';
import { interstitialDecision } from './interstitial';
import { initialAdState, isBusy, isReady, nextDeadline, reduceAd, type AdEffect, type AdEvent, type AdFormat, type AdState, type ShowOutcome } from './adState';
import type { AdMobInitializeOptions, AdMobListenerHandle, AdMobPlugin } from './native/admob';
import { Saves } from '../platform/saves';
import { setExternalFlowActive } from '../platform/externalFlow';
import { isAppForeground, isPauseOverlayUp, onAppBackground, onAppForeground } from '../platform/foreground';
import { resumeAudioAfterAd } from '../platform/lifecycleDecision';
import { sharedAudio } from '../utils/AudioSynth';
import { SettingsStore } from '../utils/SettingsStore';

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

// ---- The reducer and its glue ----------------------------------------------------------------------------------------------

let adState: AdState = initialAdState();
let timer: ReturnType<typeof setTimeout> | null = null;
let visibilityTracked = false;
let listenersRegistered = false;

// The one show a caller is waiting on (the reducer's busy guard guarantees at most one).
interface Pending {
  format: AdFormat;
  source: string; // analytics attribution of a rewarded ad
  resolve: (outcome: ShowOutcome) => void;
}
let pending: Pending | null = null;
// Whether game audio was wanted when the current ad took over the screen (AudioSynth.wantsAudio, P00-T11); null = no ad showing.
let audioWasWanted: boolean | null = null;

// Clocks. Every reducer event is stamped with a MONOTONIC reading, so a change of the wall clock can neither stall nor fire a show
// timer (watchdog, grace, ceiling). Date.now() is kept only where a wall time is the point: the persisted interstitial cooldown and
// the session start.
function monoNow(): number {
  return performance.now();
}

// The monotonic clock stands still while the device sleeps (Android), the wall clock does not. The gap between them is time a loaded
// ad aged unseen: it is credited to the reducer (`aged`) whenever the reducer is about to be asked about an ad's age, so an ad that
// outlived its hour in a drawer is never offered. A gap under AD_SLEEP_MIN_MS is clock noise, not a sleep.
let clockMark = { wall: Date.now(), mono: monoNow() };
function creditSleep(): void {
  const wall = Date.now();
  const mono = monoNow();
  const slept = wall - clockMark.wall - (mono - clockMark.mono);
  clockMark = { wall, mono };
  if (slept >= AD_SLEEP_MIN_MS) apply({ type: 'aged', ms: slept });
}

function dispatch(event: AdEvent): AdEffect[] {
  creditSleep();
  return apply(event);
}

function apply(event: AdEvent): AdEffect[] {
  const reduction = reduceAd(adState, event);
  adState = reduction.state;
  for (const effect of reduction.effects) runEffect(effect);
  rearm();
  return reduction.effects;
}

// One timer, armed for the reducer's next deadline (watchdog, grace, retry, expiry). Re-armed after every event.
function rearm(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  const at = nextDeadline(adState);
  if (at === null) return;
  timer = setTimeout(() => {
    timer = null;
    dispatch({ type: 'tick', now: monoNow() });
  }, Math.max(0, at - monoNow()));
}

function runEffect(effect: AdEffect): void {
  switch (effect.type) {
    case 'load':
      startLoad(effect.format);
      return;
    case 'show':
      startShow(effect.format);
      return;
    case 'shown':
      if (effect.format === 'rewarded') {
        if (pending?.format === 'rewarded') Analytics.track(rewardedShown(pending.source));
      } else {
        persistLastShownMs(Date.now()); // the cooldown starts when the ad is really on screen, not when it was merely eligible
        Analytics.track(interstitialShown());
      }
      return;
    case 'resetInterstitialClock':
      persistLastShownMs(Date.now()); // D-24: a rewarded view counts as a full-screen ad for the interstitial cooldown
      return;
    case 'settle':
      finishShow(effect.format, effect.outcome);
      return;
    case 'refuse':
      return; // reported to the caller through the returned effects
  }
}

function startLoad(format: AdFormat): void {
  const ad = admob;
  if (!ad) return;
  // The outcome arrives as an event; a rejection is the fallback for a prepare the plugin failed before any event (a second
  // failedToLoad for the same attempt is ignored by the reducer).
  const failed = (): void => {
    dispatch({ type: 'failedToLoad', format, now: monoNow() });
  };
  try {
    if (format === 'rewarded') void ad.prepareRewardVideoAd({ adId: ADMOB.rewardedAdId }).catch(failed);
    else void ad.prepareInterstitial({ adId: ADMOB.interstitialAdId }).catch(failed);
  } catch {
    failed();
  }
}

// The native ad is about to cover the app: raise the external-flow flag (no pause overlay while we look hidden) and mute game audio.
function startShow(format: AdFormat): void {
  setExternalFlowActive(true, AD_EXTERNAL_FLOW_SOURCE);
  try {
    const audio = sharedAudio();
    audioWasWanted = audio.wantsAudio;
    audio.suspend();
  } catch {
    audioWasWanted = null; // audio unavailable: nothing to mute or restore
  }
  const ad = admob;
  const failed = (): void => {
    dispatch({ type: 'failedToShow', format, now: monoNow() });
  };
  if (!ad) {
    failed();
    return;
  }
  // NEVER awaited: the plugin resolves a rewarded show only on a reward and never when the ad is closed early. The outcome comes
  // from the events; a rejection (no ad prepared) just means the show did not happen.
  try {
    if (format === 'rewarded') void ad.showRewardVideoAd().catch(failed);
    else void ad.showInterstitial().catch(failed);
  } catch {
    failed();
  }
}

// Hand the reducer one show request on behalf of `next`, the caller waiting on it. A refusal (an ad already in flight: one full-screen
// ad at a time, the one in flight is untouched; or not loaded / stale) resolves it 'unavailable' at once and shows nothing.
function requestShow(next: Pending): void {
  if (isBusy(adState)) {
    next.resolve('unavailable');
    return;
  }
  pending = next;
  const effects = dispatch({ type: 'requestShow', format: next.format, now: monoNow() });
  if (effects.some((e) => e.type === 'refuse')) {
    pending = null;
    next.resolve('unavailable');
  }
}

// The show is over (dismissed, failed or abandoned by the watchdog): clear the flag, give the audio back, resolve the caller.
function finishShow(format: AdFormat, outcome: ShowOutcome): void {
  setExternalFlowActive(false, AD_EXTERNAL_FLOW_SOURCE);
  const wanted = audioWasWanted === true;
  audioWasWanted = null;
  if (wanted) {
    // Only when the foreground path (platform/lifecycleDecision.ts) could do the same: the app is in front, no pause overlay is up and
    // Sound or Music is on. A show that ends while the app is hidden, or under the overlay, leaves the audio to that path: it comes
    // back when the player does, never as sound behind a hidden app.
    try {
      const settings = SettingsStore.get();
      const give = resumeAudioAfterAd({
        wasWanted: wanted,
        foreground: isAppForeground(),
        pauseOverlayUp: isPauseOverlayUp(),
        sound: settings.sound,
        music: settings.music,
      });
      if (give) sharedAudio().resume();
    } catch {
      // audio unavailable: ignore
    }
  }
  const waiting = pending;
  pending = null;
  if (waiting && waiting.format === format) {
    if (format === 'rewarded' && outcome === 'earned') Analytics.track(rewardedEarned(waiting.source));
    waiting.resolve(outcome);
  }
}

// ---- SDK init and plugin listeners -----------------------------------------------------------------------------------------

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

// Registers the eleven listeners the reducer needs, once for the life of the page (a revoke and a later init re-use them: events
// after a revoke are ignored by the reducer). All-or-nothing: a failed registration removes the ones that did register, so the
// next init cannot double up.
async function registerListeners(ad: AdMobPlugin): Promise<void> {
  if (listenersRegistered) return;
  const handles: AdMobListenerHandle[] = [];
  const at = monoNow;
  const R = ADMOB_EVENTS.REWARDED;
  const I = ADMOB_EVENTS.INTERSTITIAL;
  try {
    handles.push(await ad.addListener(R.LOADED, () => { dispatch({ type: 'loaded', format: 'rewarded', now: at() }); }));
    handles.push(await ad.addListener(R.FAILED_TO_LOAD, () => { dispatch({ type: 'failedToLoad', format: 'rewarded', now: at() }); }));
    handles.push(await ad.addListener(R.SHOWED, () => { dispatch({ type: 'showed', format: 'rewarded', now: at() }); }));
    handles.push(await ad.addListener(R.FAILED_TO_SHOW, () => { dispatch({ type: 'failedToShow', format: 'rewarded', now: at() }); }));
    handles.push(await ad.addListener(R.DISMISSED, () => { dispatch({ type: 'dismissed', format: 'rewarded', now: at() }); }));
    handles.push(await ad.addListener(R.REWARDED, () => { dispatch({ type: 'reward', now: at() }); }));
    handles.push(await ad.addListener(I.LOADED, () => { dispatch({ type: 'loaded', format: 'interstitial', now: at() }); }));
    handles.push(await ad.addListener(I.FAILED_TO_LOAD, () => { dispatch({ type: 'failedToLoad', format: 'interstitial', now: at() }); }));
    handles.push(await ad.addListener(I.SHOWED, () => { dispatch({ type: 'showed', format: 'interstitial', now: at() }); }));
    handles.push(await ad.addListener(I.FAILED_TO_SHOW, () => { dispatch({ type: 'failedToShow', format: 'interstitial', now: at() }); }));
    handles.push(await ad.addListener(I.DISMISSED, () => { dispatch({ type: 'dismissed', format: 'interstitial', now: at() }); }));
    listenersRegistered = true;
  } catch (err) {
    await Promise.all(handles.map((h) => h.remove().catch(() => undefined)));
    throw err;
  }
}

// Single-flight SDK init. Resolves true once initialize() answered and the listeners are in. Does NOT return the proxy. A failure
// is not memoized, so a later Ads.init (e.g. after Privacy choices) may try again; it never throws and never blocks gameplay.
function initSdk(): Promise<boolean> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const m = await import('./native/admob');
        await m.AdMob.initialize(initializeOptions()); // a method CALL is fine (real promise)
        await registerListeners(m.AdMob); // before the first prepare, so no load event is missed
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

// The consent gate closes: no more loading, no pending retry or expiry, nothing ready; a show in flight is settled unavailable.
function closeGate(): void {
  consented = false;
  dispatch({ type: 'disable' });
}

// Follow the app to the background and back for good (the lifecycle reports both, platform/foreground.ts): the reducer's show timers
// count foreground time only, and a return re-checks expiry and any due retry, which a hidden app's timers may have held back.
function trackVisibility(): void {
  if (visibilityTracked) return;
  visibilityTracked = true;
  onAppBackground(() => {
    dispatch({ type: 'hidden', now: monoNow() });
  });
  onAppForeground(() => {
    dispatch({ type: 'visible', now: monoNow() });
    if (consented) dispatch({ type: 'tick', now: monoNow() });
  });
}

export type RewardedOutcome = ShowOutcome; // earned | dismissed | unavailable

export const Ads = {
  // Called by bootServices after consent resolved, and only when the outcome allows ads (also by "Privacy choices" if the player
  // grants consent later). Idempotent. On the web there is nothing to initialise. Preloads both formats once the SDK is up.
  async init(outcome: ConsentOutcome): Promise<void> {
    if (!outcome.canRequestAds) {
      closeGate();
      return;
    }
    if (!Capacitor.isNativePlatform()) return;
    consented = true;
    if (!(await initSdk())) return;
    if (!consented) return; // revoked while the SDK was coming up
    trackVisibility();
    dispatch({ type: isAppForeground() ? 'visible' : 'hidden', now: monoNow() }); // where the app is right now
    dispatch({ type: 'enable', now: monoNow() });
  },

  // The player withdrew consent (Settings > Privacy choices): stop preloading, cancel pending retries and refuse every ad for the
  // rest of the session (until a later init).
  revoke(): void {
    closeGate();
  },

  // Is a rewarded ad loaded, fresh and not in use? The offers render only when this is true (D-24). Web: DEV stub only; a
  // production web build has no rewarded ad.
  isRewardedReady(): boolean {
    if (!Capacitor.isNativePlatform()) return import.meta.env.DEV;
    if (!adsReady()) return false;
    creditSleep();
    return isReady(adState, 'rewarded', monoNow()) && !isBusy(adState);
  },

  // A native ad show is in flight (requested until it settles). Callers use it to ignore a second tap.
  isShowing(): boolean {
    return isBusy(adState);
  },

  // Resolves how the offer ended: 'earned' (grant the reward), 'dismissed' (the player closed the ad early: no reward) or
  // 'unavailable' (nothing was shown: not ready, busy, failed, or the 5 s watchdog). It never awaits showRewardVideoAd(): the
  // outcome comes from the plugin's events. `source` identifies the calling surface ('campaign_2x' | 'endless_2x' |
  // 'endless_revive' | 'free_fragments') so shown/earned are attributable per-surface in analytics (Wave 3 Task 2). This is the ONLY
  // call site for rewardedShown/rewardedEarned, so every caller gets the attribution for free.
  async showRewarded(source: string): Promise<RewardedOutcome> {
    if (!Capacitor.isNativePlatform()) {
      if (!import.meta.env.DEV) return 'unavailable'; // production web: no rewarded ad, no free reward
      Analytics.track(rewardedShown(source));
      Analytics.track(rewardedEarned(source));
      return 'earned';
    }
    // Consent gate: before a successful Ads.init a native request is refused as not ready, with no event and no native call.
    if (!adsReady()) return 'unavailable';
    return new Promise<ShowOutcome>((resolve) => {
      requestShow({ format: 'rewarded', source, resolve });
    });
  },

  // A campaign level was completed but no interstitial is considered for its advance: the 2x was this win's one full-screen ad
  // (GameScene sets skipInterstitial). The level still counts toward the session grace, exactly like one whose interstitial was
  // suppressed; nothing is shown, asked or tracked.
  noteLevelAdvance(): void {
    sessionLevels += 1;
  },

  // Show an interstitial if eligible, and resolve when it is gone, so the caller can move on (GameScene awaits this BEFORE
  // scene.restart). `ctx.flowProtected` is the ONLY thing the caller supplies (was the just-finished win a boss / 3★ / hot
  // streak?) — every other signal (premium, session grace, the persisted frequency cap) is owned here. It shows only an
  // interstitial that is already preloaded: never loads one on demand and never waits for a load. No-op on web. Suppressions
  // are tracked too, so the cadence is measurable even where no ad can actually show (web/DEV).
  async showInterstitialIfEligible(ctx: { flowProtected: boolean; now?: number } = { flowProtected: false }): Promise<'shown' | 'skipped'> {
    const now = ctx.now ?? Date.now();
    const decision = interstitialDecision({
      now,
      lastShownMs,
      isPremium: IAP.isPremium(),
      sessionLevels,
      sessionElapsedMs: now - sessionStartMs,
      flowProtected: ctx.flowProtected,
    });
    sessionLevels += 1; // this call = one more campaign level completed this session (noteLevelAdvance() is the same count without an ad)

    if (!decision.show) {
      Analytics.track(interstitialSuppressed(decision.reason));
      return 'skipped';
    }

    if (!Capacitor.isNativePlatform()) {
      // No ad on the web. In DEV the cap still reflects an "eligible" moment so the cadence can be exercised without a device.
      if (import.meta.env.DEV) persistLastShownMs(now);
      return 'skipped';
    }
    if (!adsReady()) return 'skipped'; // consent gate: no request before Ads.init succeeded
    creditSleep();
    if (isBusy(adState) || !isReady(adState, 'interstitial', monoNow())) {
      Analytics.track(interstitialSuppressed('not_ready')); // not preloaded: skip rather than make the player wait for a load
      return 'skipped';
    }
    return new Promise<'shown' | 'skipped'>((resolve) => {
      requestShow({ format: 'interstitial', source: '', resolve: (outcome) => resolve(outcome === 'unavailable' ? 'skipped' : 'shown') });
    });
  },
};
