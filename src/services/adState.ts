// Pure ad cache / show state machine (D-24, P00-T19; TECHNICAL-ARCHITECTURE §4). No Capacitor, no timers, no clock of its own:
// services/Ads.ts feeds it the plugin's events (each stamped with `now`), executes the effects it returns and arms ONE timer
// for nextDeadline(). Keeping it pure makes every row of the policy a unit test (adState.test.ts).
//
// Per format (rewarded, interstitial): { ready, loading, loadedAt, retryIdx, retryAt }. At most ONE show is in flight across
// both formats (`show`, which is also the busy guard): requested -> showing -> (rewarded only) closing.
//
//   enable            ready for ads (consent allowed, SDK up)    -> load both formats
//   disable           consent withdrawn                           -> everything reset, a show in flight settles unavailable
//   loaded            the plugin has an ad                        -> ready, backoff reset
//   failedToLoad      the load failed                             -> retry after AD_RETRY_BACKOFF_MS[idx], last value repeats
//   requestShow       the caller wants to show                    -> show | refuse (disabled / busy / not_ready)
//   showed            the ad is on screen                         -> shown (+ resetInterstitialClock for a rewarded view)
//   failedToShow      the ad could not be shown                   -> settle unavailable, reload
//   dismissed         the ad was closed                           -> interstitial: settle dismissed; rewarded: settle earned if
//                                                                    the reward came, else wait AD_LATE_REWARD_GRACE_MS; reload
//   reward            the player earned the reward                -> earned (settles at once if already inside the grace window)
//   watchdog          the show timer fired                        -> no `showed` yet: settle unavailable, reload
//   tick(now)         time passed                                 -> watchdog / grace / on-screen ceiling, retry due, expired ad
//
// A show settles exactly once: outcome `earned | dismissed | unavailable` (an interstitial only ever dismissed | unavailable).
import { AD_LATE_REWARD_GRACE_MS, AD_MAX_AGE_MS, AD_RETRY_BACKOFF_MS, AD_SHOWING_MAX_MS, AD_SHOW_WATCHDOG_MS } from '../config/monetization.config';

export type AdFormat = 'rewarded' | 'interstitial';
export type ShowOutcome = 'earned' | 'dismissed' | 'unavailable';
export type RefuseReason = 'disabled' | 'busy' | 'not_ready';

const FORMATS: readonly AdFormat[] = ['rewarded', 'interstitial'];

export interface FormatState {
  ready: boolean; // an ad is loaded (it may still be stale: see isReady)
  loading: boolean; // a prepare call is in flight
  loadedAt: number; // when the ad loaded (0 = never)
  retryIdx: number; // consecutive failed loads (index into AD_RETRY_BACKOFF_MS, capped)
  retryAt: number | null; // when the next load is due after a failure
}

export type ShowPhase = 'requested' | 'showing' | 'closing';

export interface ShowState {
  format: AdFormat;
  phase: ShowPhase;
  requestedAt: number;
  showedAt: number; // valid from phase `showing`
  earned: boolean; // the reward event arrived (rewarded only)
  graceUntil: number; // valid in phase `closing`
}

export interface AdState {
  enabled: boolean;
  rewarded: FormatState;
  interstitial: FormatState;
  show: ShowState | null; // the one show in flight (null = none): the busy guard
}

export type AdEvent =
  | { type: 'enable'; now: number }
  | { type: 'disable' }
  | { type: 'loaded'; format: AdFormat; now: number }
  | { type: 'failedToLoad'; format: AdFormat; now: number }
  | { type: 'requestShow'; format: AdFormat; now: number }
  | { type: 'showed'; format: AdFormat; now: number }
  | { type: 'failedToShow'; format: AdFormat; now: number }
  | { type: 'dismissed'; format: AdFormat; now: number }
  | { type: 'reward'; now: number }
  | { type: 'watchdog'; now: number }
  | { type: 'tick'; now: number };

export type AdEffect =
  | { type: 'load'; format: AdFormat } // call prepare for this format
  | { type: 'show'; format: AdFormat } // call show for this format
  | { type: 'settle'; format: AdFormat; outcome: ShowOutcome } // the show in flight is over
  | { type: 'refuse'; format: AdFormat; reason: RefuseReason } // a requestShow was not accepted
  | { type: 'shown'; format: AdFormat } // the ad is on screen (analytics)
  | { type: 'resetInterstitialClock' }; // a rewarded ad was viewed (D-24)

export interface AdReduction {
  state: AdState;
  effects: AdEffect[];
}

const freshFormat = (): FormatState => ({ ready: false, loading: false, loadedAt: 0, retryIdx: 0, retryAt: null });

export function initialAdState(): AdState {
  return { enabled: false, rewarded: freshFormat(), interstitial: freshFormat(), show: null };
}

// ---- Selectors ------------------------------------------------------------------------------------------------------------

// A usable ad is loaded AND not older than AD_MAX_AGE_MS. Judged against `now`, so it stays honest if the timer fires late.
export function isReady(s: AdState, format: AdFormat, now: number): boolean {
  const f = s[format];
  return s.enabled && f.ready && now - f.loadedAt <= AD_MAX_AGE_MS;
}

// A show has been requested and has not settled (the busy guard).
export function isBusy(s: AdState): boolean {
  return s.show !== null;
}

// An ad is on screen (Showed received, not yet settled).
export function isShowing(s: AdState): boolean {
  return s.show !== null && s.show.phase !== 'requested';
}

// The next instant tick(now) has something to do: the soonest of the show timers, the expiry of a loaded ad and a due retry.
// null when nothing is pending (the glue then arms no timer).
export function nextDeadline(s: AdState): number | null {
  if (!s.enabled) return null;
  const due: number[] = [];
  if (s.show) {
    if (s.show.phase === 'requested') due.push(s.show.requestedAt + AD_SHOW_WATCHDOG_MS);
    else if (s.show.phase === 'showing') due.push(s.show.showedAt + AD_SHOWING_MAX_MS);
    else due.push(s.show.graceUntil);
  }
  for (const format of FORMATS) {
    const f = s[format];
    if (f.ready) due.push(f.loadedAt + AD_MAX_AGE_MS + 1);
    else if (!f.loading && f.retryAt !== null) due.push(f.retryAt);
  }
  return due.length ? Math.min(...due) : null;
}

// ---- Transitions ----------------------------------------------------------------------------------------------------------

function patch(s: AdState, format: AdFormat, p: Partial<FormatState>): AdState {
  return { ...s, [format]: { ...s[format], ...p } } as AdState;
}

// Request a (re)load of `format`: no-op when one is already in flight.
function reload(s: AdState, format: AdFormat): AdReduction {
  if (s[format].loading) return { state: s, effects: [] };
  return { state: patch(s, format, { ready: false, loading: true, retryAt: null }), effects: [{ type: 'load', format }] };
}

function andThen(r: AdReduction, next: (s: AdState) => AdReduction): AdReduction {
  const n = next(r.state);
  return { state: n.state, effects: [...r.effects, ...n.effects] };
}

// The show in flight is over: clear the busy guard and report the outcome.
function settle(s: AdState, outcome: ShowOutcome): AdReduction {
  if (!s.show) return { state: s, effects: [] };
  return { state: { ...s, show: null }, effects: [{ type: 'settle', format: s.show.format, outcome }] };
}

function ignore(s: AdState): AdReduction {
  return { state: s, effects: [] };
}

function onTick(s: AdState, now: number, forceWatchdog: boolean): AdReduction {
  let r: AdReduction = { state: s, effects: [] };
  const show = s.show;
  if (show) {
    if (show.phase === 'requested' && (forceWatchdog || now - show.requestedAt >= AD_SHOW_WATCHDOG_MS)) {
      // The ad never reported Showed: give up on it. Its loaded ad is spent either way, so fetch the next one.
      r = andThen(settle(s, 'unavailable'), (n) => reload(n, show.format));
    } else if (show.phase === 'closing' && now >= show.graceUntil) {
      r = settle(s, 'dismissed'); // the reload already went out at Dismissed
    } else if (show.phase === 'showing' && now - show.showedAt >= AD_SHOWING_MAX_MS) {
      r = andThen(settle(s, show.earned ? 'earned' : 'dismissed'), (n) => reload(n, show.format)); // a lost Dismissed
    }
  }
  if (forceWatchdog) return r;
  for (const format of FORMATS) {
    const f = r.state[format];
    if (f.ready && now - f.loadedAt > AD_MAX_AGE_MS) r = andThen(r, (n) => reload(n, format));
    else if (!f.ready && !f.loading && f.retryAt !== null && now >= f.retryAt) r = andThen(r, (n) => reload(n, format));
  }
  return r;
}

export function reduceAd(s: AdState, e: AdEvent): AdReduction {
  if (e.type === 'enable') {
    if (s.enabled) return ignore(s);
    const fresh: AdState = { ...initialAdState(), enabled: true };
    return andThen(reload(fresh, 'rewarded'), (n) => reload(n, 'interstitial'));
  }
  if (e.type === 'disable') {
    const open = s.show ? settle(s, 'unavailable').effects : [];
    return { state: initialAdState(), effects: open };
  }
  if (!s.enabled) {
    // Consent withdrawn (or never given): plugin events that are still in flight change nothing and a show is refused.
    return e.type === 'requestShow' ? { state: s, effects: [{ type: 'refuse', format: e.format, reason: 'disabled' }] } : ignore(s);
  }

  switch (e.type) {
    case 'loaded': {
      if (!s[e.format].loading) return ignore(s); // a duplicate, or one that outlived a disable/enable cycle
      return { state: patch(s, e.format, { ready: true, loading: false, loadedAt: e.now, retryIdx: 0, retryAt: null }), effects: [] };
    }
    case 'failedToLoad': {
      const f = s[e.format];
      if (!f.loading) return ignore(s); // e.g. the plugin reports a missing ad when a show is called with none prepared
      const wait = AD_RETRY_BACKOFF_MS[Math.min(f.retryIdx, AD_RETRY_BACKOFF_MS.length - 1)];
      return { state: patch(s, e.format, { ready: false, loading: false, retryIdx: f.retryIdx + 1, retryAt: e.now + wait }), effects: [] };
    }
    case 'requestShow': {
      if (s.show) return { state: s, effects: [{ type: 'refuse', format: e.format, reason: 'busy' }] };
      if (!isReady(s, e.format, e.now)) return { state: s, effects: [{ type: 'refuse', format: e.format, reason: 'not_ready' }] };
      const show: ShowState = { format: e.format, phase: 'requested', requestedAt: e.now, showedAt: 0, earned: false, graceUntil: 0 };
      // The loaded ad is consumed by the show attempt, whatever happens: it is not ready and nothing is loading until it settles.
      return { state: { ...patch(s, e.format, { ready: false }), show }, effects: [{ type: 'show', format: e.format }] };
    }
    case 'showed': {
      const show = s.show;
      if (!show || show.format !== e.format || show.phase !== 'requested') {
        // Showed after the watchdog already gave up on it: the offer was reported unavailable, but a rewarded ad WAS viewed.
        return !show && e.format === 'rewarded' ? { state: s, effects: [{ type: 'resetInterstitialClock' }] } : ignore(s);
      }
      const effects: AdEffect[] = [{ type: 'shown', format: e.format }];
      if (e.format === 'rewarded') effects.push({ type: 'resetInterstitialClock' });
      return { state: { ...s, show: { ...show, phase: 'showing', showedAt: e.now } }, effects };
    }
    case 'failedToShow': {
      if (!s.show || s.show.format !== e.format || s.show.phase !== 'requested') return ignore(s);
      return andThen(settle(s, 'unavailable'), (n) => reload(n, e.format));
    }
    case 'dismissed': {
      const show = s.show;
      if (!show || show.format !== e.format || show.phase === 'closing') return ignore(s);
      if (e.format === 'interstitial') return andThen(settle(s, 'dismissed'), (n) => reload(n, 'interstitial'));
      if (show.earned) return andThen(settle(s, 'earned'), (n) => reload(n, 'rewarded'));
      // Closed without a reward (yet): the reward callback can land just after Dismissed, so wait a moment before saying so.
      const closing: AdState = { ...s, show: { ...show, phase: 'closing', graceUntil: e.now + AD_LATE_REWARD_GRACE_MS } };
      return reload(closing, 'rewarded'); // the ad just shown is spent
    }
    case 'reward': {
      const show = s.show;
      if (!show || show.format !== 'rewarded') return ignore(s);
      if (show.phase === 'closing') return settle(s, 'earned'); // inside the grace window
      return { state: { ...s, show: { ...show, earned: true } }, effects: [] };
    }
    case 'watchdog':
      return onTick(s, e.now, true);
    case 'tick':
      return onTick(s, e.now, false);
  }
}
