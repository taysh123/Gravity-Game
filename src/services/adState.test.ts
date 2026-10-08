import { describe, it, expect } from 'vitest';
import {
  initialAdState,
  isBusy,
  isReady,
  nextDeadline,
  reduceAd,
  type AdEffect,
  type AdEvent,
  type AdFormat,
  type AdState,
} from './adState';
import { AD_LATE_REWARD_GRACE_MS, AD_MAX_AGE_MS, AD_RETRY_BACKOFF_MS, AD_SHOWING_MAX_MS, AD_SHOW_WATCHDOG_MS } from '../config/monetization.config';

// The pure ad cache / show state machine (D-24, P00-T19). Per format { ready, loading, loadedAt, retryIdx } plus one show in
// flight (busy / showing). Events: loaded, failedToLoad, showed, failedToShow, dismissed, reward, watchdog, tick(now) (plus the
// commands enable, disable and requestShow). Effects are data the Ads glue executes: load, show, settle, refuse, shown,
// resetInterstitialClock. No timers, no plugin, no clock of its own: every event carries `now`.

const T0 = 1_000_000;

interface Run {
  state: AdState;
  effects: AdEffect[]; // the effects of the LAST step
  all: AdEffect[]; // every effect so far, in order
}

function start(): Run {
  return { state: initialAdState(), effects: [], all: [] };
}

function step(run: Run, event: AdEvent): Run {
  const r = reduceAd(run.state, event);
  return { state: r.state, effects: r.effects, all: [...run.all, ...r.effects] };
}

function steps(run: Run, ...events: AdEvent[]): Run {
  return events.reduce(step, run);
}

const enable = (now = T0): AdEvent => ({ type: 'enable', now });
const loaded = (format: AdFormat, now = T0): AdEvent => ({ type: 'loaded', format, now });
const failedToLoad = (format: AdFormat, now: number): AdEvent => ({ type: 'failedToLoad', format, now });
const request = (format: AdFormat, now: number): AdEvent => ({ type: 'requestShow', format, now });
const showed = (format: AdFormat, now: number): AdEvent => ({ type: 'showed', format, now });
const failedToShow = (format: AdFormat, now: number): AdEvent => ({ type: 'failedToShow', format, now });
const dismissed = (format: AdFormat, now: number): AdEvent => ({ type: 'dismissed', format, now });
const reward = (now: number): AdEvent => ({ type: 'reward', now });
const tick = (now: number): AdEvent => ({ type: 'tick', now });

// Enabled with both formats loaded at T0.
function ready(): Run {
  return steps(start(), enable(), loaded('rewarded'), loaded('interstitial'));
}

const settles = (effects: AdEffect[]): Array<Extract<AdEffect, { type: 'settle' }>> =>
  effects.filter((e): e is Extract<AdEffect, { type: 'settle' }> => e.type === 'settle');
const loads = (effects: AdEffect[]): AdFormat[] => effects.filter((e) => e.type === 'load').map((e) => (e as { format: AdFormat }).format);

describe('constants (the plan values)', () => {
  it('are exactly the D-24 numbers', () => {
    expect(AD_SHOW_WATCHDOG_MS).toBe(5000);
    expect(AD_LATE_REWARD_GRACE_MS).toBe(300);
    expect([...AD_RETRY_BACKOFF_MS]).toEqual([30_000, 60_000, 120_000, 300_000]);
    expect(AD_MAX_AGE_MS).toBe(55 * 60 * 1000);
  });
});

describe('load: enable preloads both formats', () => {
  it('starts disabled with nothing ready, loading or busy', () => {
    const s = initialAdState();
    expect(s.enabled).toBe(false);
    expect(isReady(s, 'rewarded', T0)).toBe(false);
    expect(isReady(s, 'interstitial', T0)).toBe(false);
    expect(isBusy(s)).toBe(false);
    expect(nextDeadline(s)).toBeNull();
  });

  it('enable loads rewarded and interstitial, once', () => {
    const run = step(start(), enable());
    expect(run.effects).toEqual([
      { type: 'load', format: 'rewarded' },
      { type: 'load', format: 'interstitial' },
    ]);
    expect(run.state.rewarded.loading).toBe(true);
    expect(run.state.interstitial.loading).toBe(true);
    expect(isReady(run.state, 'rewarded', T0)).toBe(false);
    // a second enable (Ads.init is idempotent) loads nothing more
    expect(step(run, enable(T0 + 5)).effects).toEqual([]);
  });

  it('nothing happens before enable: events are ignored and a show is refused as disabled', () => {
    let run = start();
    run = steps(run, loaded('rewarded'), failedToLoad('interstitial', T0), tick(T0 + 10 * AD_MAX_AGE_MS));
    expect(run.state).toEqual(initialAdState());
    expect(run.effects).toEqual([]);
    const r = step(run, request('rewarded', T0));
    expect(r.effects).toEqual([{ type: 'refuse', format: 'rewarded', reason: 'disabled' }]);
  });

  it('loaded marks the format ready and stamps loadedAt; each format is independent', () => {
    let run = step(start(), enable());
    run = step(run, loaded('rewarded', T0 + 700));
    expect(isReady(run.state, 'rewarded', T0 + 700)).toBe(true);
    expect(run.state.rewarded.loadedAt).toBe(T0 + 700);
    expect(run.state.rewarded.loading).toBe(false);
    expect(isReady(run.state, 'interstitial', T0 + 700)).toBe(false);
  });

  it('a duplicate loaded event (no load in flight) changes nothing', () => {
    const run = ready();
    const again = step(run, loaded('rewarded', T0 + 9));
    expect(again.state).toEqual(run.state);
    expect(again.effects).toEqual([]);
  });
});

describe('load: failure backoff', () => {
  it('retries after 30 s, 60 s, 120 s, 300 s, 300 s ... and a success resets the sequence', () => {
    let run = step(start(), enable());
    let now = T0;
    for (const wait of [30_000, 60_000, 120_000, 300_000, 300_000]) {
      run = step(run, failedToLoad('rewarded', now));
      expect(run.effects).toEqual([]); // no immediate retry loop
      expect(run.state.rewarded.retryAt).toBe(now + wait);
      expect(run.state.rewarded.loading).toBe(false);
      // one ms early: nothing; on the dot: reload
      expect(loads(step(run, tick(now + wait - 1)).effects)).toEqual([]);
      run = step(run, tick(now + wait));
      expect(loads(run.effects)).toEqual(['rewarded']);
      expect(run.state.rewarded.loading).toBe(true);
      now += wait;
    }
    run = step(run, loaded('rewarded', now));
    expect(run.state.rewarded.retryIdx).toBe(0);
    // the success also left nothing loading, so a stray failure after it changes nothing
    run = step(run, failedToLoad('rewarded', now + 10));
    expect(run.state.rewarded.retryAt).toBeNull();
  });

  it('after a success the next failure starts again at 30 s', () => {
    let run = step(start(), enable());
    run = steps(run, failedToLoad('interstitial', T0), tick(T0 + 30_000), failedToLoad('interstitial', T0 + 30_000));
    expect(run.state.interstitial.retryAt).toBe(T0 + 30_000 + 60_000);
    run = steps(run, tick(T0 + 90_000), loaded('interstitial', T0 + 91_000));
    expect(run.state.interstitial.retryIdx).toBe(0);
    expect(run.state.interstitial.retryAt).toBeNull();
    // loaded => ready; expire; reload fails => the first backoff again
    run = steps(run, tick(T0 + 91_000 + AD_MAX_AGE_MS + 1));
    run = step(run, failedToLoad('interstitial', T0 + 91_000 + AD_MAX_AGE_MS + 2));
    expect(run.state.interstitial.retryAt).toBe(T0 + 91_000 + AD_MAX_AGE_MS + 2 + 30_000);
  });

  it('a failedToLoad with no load in flight (the plugin also rejects a show with no ad) is ignored', () => {
    const run = ready();
    const r = step(run, failedToLoad('rewarded', T0 + 5));
    expect(r.state).toEqual(run.state);
    expect(isReady(r.state, 'rewarded', T0 + 5)).toBe(true);
  });

  it('formats back off independently', () => {
    let run = step(start(), enable());
    run = steps(run, failedToLoad('rewarded', T0), loaded('interstitial', T0 + 1));
    expect(isReady(run.state, 'interstitial', T0 + 1)).toBe(true);
    expect(run.state.rewarded.retryAt).toBe(T0 + 30_000);
    expect(run.state.interstitial.retryAt).toBeNull();
  });
});

describe('load: expiry', () => {
  it('an ad is fresh up to and including 55 min, stale after, and tick reloads it', () => {
    const run = ready();
    expect(isReady(run.state, 'rewarded', T0 + AD_MAX_AGE_MS)).toBe(true);
    expect(isReady(run.state, 'rewarded', T0 + AD_MAX_AGE_MS + 1)).toBe(false); // honest even before the timer fires
    const early = step(run, tick(T0 + AD_MAX_AGE_MS));
    expect(early.effects).toEqual([]);
    const late = step(run, tick(T0 + AD_MAX_AGE_MS + 1));
    expect(late.effects).toEqual([
      { type: 'load', format: 'rewarded' },
      { type: 'load', format: 'interstitial' },
    ]);
    expect(late.state.rewarded.ready).toBe(false);
    expect(late.state.rewarded.loading).toBe(true);
    // a request for a stale ad is refused, never shown
    const refused = step(run, request('rewarded', T0 + AD_MAX_AGE_MS + 1));
    expect(refused.effects).toEqual([{ type: 'refuse', format: 'rewarded', reason: 'not_ready' }]);
  });

  it('nextDeadline reports the soonest timer the glue must arm', () => {
    let run = step(start(), enable());
    expect(nextDeadline(run.state)).toBeNull(); // loading: the plugin events drive it
    run = steps(run, loaded('rewarded', T0 + 100), failedToLoad('interstitial', T0 + 50));
    // rewarded expires at loaded + 55 min + 1; interstitial retries at +30 s
    expect(nextDeadline(run.state)).toBe(T0 + 50 + 30_000);
    run = step(run, tick(T0 + 50 + 30_000));
    run = step(run, loaded('interstitial', T0 + 31_000));
    expect(nextDeadline(run.state)).toBe(T0 + 100 + AD_MAX_AGE_MS + 1);
  });
});

describe('request: readiness and the busy guard', () => {
  it('a ready format shows; the loaded ad is spent (not ready, not loading) until the show settles', () => {
    const run = step(ready(), request('rewarded', T0 + 10));
    expect(run.effects).toEqual([{ type: 'show', format: 'rewarded' }]);
    expect(isBusy(run.state)).toBe(true);
    expect(run.state.show?.phase).toBe('requested'); // not yet on screen
    expect(isReady(run.state, 'rewarded', T0 + 10)).toBe(false);
    expect(nextDeadline(run.state)).toBe(T0 + 10 + AD_SHOW_WATCHDOG_MS);
  });

  it('a format that is loading or failed is refused as not ready', () => {
    const loading = step(start(), enable());
    expect(step(loading, request('rewarded', T0)).effects).toEqual([{ type: 'refuse', format: 'rewarded', reason: 'not_ready' }]);
    const failed = step(loading, failedToLoad('interstitial', T0));
    expect(step(failed, request('interstitial', T0 + 1)).effects).toEqual([{ type: 'refuse', format: 'interstitial', reason: 'not_ready' }]);
  });

  it('busy guard: a second request while one is in flight is refused and leaves the first untouched', () => {
    const first = step(ready(), request('rewarded', T0 + 10));
    const second = step(first, request('rewarded', T0 + 11));
    expect(second.effects).toEqual([{ type: 'refuse', format: 'rewarded', reason: 'busy' }]);
    expect(second.state).toEqual(first.state);
    // it covers the other format too: one full-screen ad at a time
    const other = step(first, request('interstitial', T0 + 12));
    expect(other.effects).toEqual([{ type: 'refuse', format: 'interstitial', reason: 'busy' }]);
    expect(other.state).toEqual(first.state);
    // ... for the whole life of the show, including the late-reward grace
    const closing = steps(first, showed('rewarded', T0 + 100), dismissed('rewarded', T0 + 5000));
    expect(step(closing, request('rewarded', T0 + 5100)).effects).toEqual([{ type: 'refuse', format: 'rewarded', reason: 'busy' }]);
  });
});

describe('rewarded outcome: earned (reward, then dismiss)', () => {
  it('settles earned on Dismissed, reloads, and clears busy', () => {
    let run = steps(ready(), request('rewarded', T0 + 10), showed('rewarded', T0 + 200));
    expect(run.state.show?.phase).toBe('showing');
    run = step(run, reward(T0 + 9000));
    expect(run.effects).toEqual([]); // the reward alone does not resolve the offer: the ad is still on screen
    expect(isBusy(run.state)).toBe(true);
    run = step(run, dismissed('rewarded', T0 + 9500));
    expect(settles(run.effects)).toEqual([{ type: 'settle', format: 'rewarded', outcome: 'earned' }]);
    expect(loads(run.effects)).toEqual(['rewarded']); // reload after dismissed
    expect(isBusy(run.state)).toBe(false);
    expect(run.state.rewarded.loading).toBe(true);
    expect(nextDeadline(run.state)).toBe(T0 + AD_MAX_AGE_MS + 1); // only the interstitial's expiry is left: nothing show-related
    // a second settle never appears
    expect(settles(step(run, tick(T0 + 99_999)).effects)).toEqual([]);
  });

  it('showed is reported as shown (analytics) and a rewarded view resets the interstitial clock', () => {
    const run = steps(ready(), request('rewarded', T0 + 10));
    const r = step(run, showed('rewarded', T0 + 200));
    expect(r.effects).toEqual([
      { type: 'shown', format: 'rewarded' },
      { type: 'resetInterstitialClock' },
    ]);
  });

  it('the clock is reset by the view itself, whatever the outcome (closed early included); no view, no reset', () => {
    const early = steps(ready(), request('rewarded', T0), showed('rewarded', T0 + 100), dismissed('rewarded', T0 + 1000), tick(T0 + 1000 + AD_LATE_REWARD_GRACE_MS));
    expect(early.all.filter((e) => e.type === 'resetInterstitialClock')).toHaveLength(1);
    // no view, no reset
    const none = steps(ready(), request('rewarded', T0), failedToShow('rewarded', T0 + 50));
    expect(none.all.filter((e) => e.type === 'resetInterstitialClock')).toHaveLength(0);
  });

  it('an interstitial view does not touch the clock through this path (Ads stamps its own show)', () => {
    const run = steps(ready(), request('interstitial', T0), showed('interstitial', T0 + 100));
    expect(run.all).not.toContainEqual({ type: 'resetInterstitialClock' });
    expect(run.effects).toEqual([{ type: 'shown', format: 'interstitial' }]);
  });
});

describe('rewarded outcome: dismissed (closed early)', () => {
  it('Dismissed without a reward waits the grace window, then settles dismissed', () => {
    let run = steps(ready(), request('rewarded', T0), showed('rewarded', T0 + 100));
    run = step(run, dismissed('rewarded', T0 + 4000));
    expect(settles(run.effects)).toEqual([]); // not yet: a late reward may still land
    expect(isBusy(run.state)).toBe(true);
    expect(nextDeadline(run.state)).toBe(T0 + 4000 + AD_LATE_REWARD_GRACE_MS);
    expect(step(run, tick(T0 + 4000 + AD_LATE_REWARD_GRACE_MS - 1)).effects).toEqual([]);
    const done = step(run, tick(T0 + 4000 + AD_LATE_REWARD_GRACE_MS));
    expect(settles(done.effects)).toEqual([{ type: 'settle', format: 'rewarded', outcome: 'dismissed' }]);
    expect(isBusy(done.state)).toBe(false);
    // the replacement ad was already requested at Dismissed (the used ad is spent)
    expect(loads(run.effects)).toEqual(['rewarded']);
  });

  it('a reward that lands within 300 ms AFTER Dismissed still counts: earned, exactly once', () => {
    let run = steps(ready(), request('rewarded', T0), showed('rewarded', T0 + 100), dismissed('rewarded', T0 + 4000));
    run = step(run, reward(T0 + 4000 + AD_LATE_REWARD_GRACE_MS - 1));
    expect(settles(run.effects)).toEqual([{ type: 'settle', format: 'rewarded', outcome: 'earned' }]);
    expect(isBusy(run.state)).toBe(false);
    const later = step(run, tick(T0 + 4000 + AD_LATE_REWARD_GRACE_MS + 1));
    expect(settles(later.effects)).toEqual([]);
    expect(loads(run.effects)).toEqual([]); // the reload already went out at Dismissed: not a second one
  });

  it('a reward after the grace window has settled is ignored (nothing is granted for an offer already reported dismissed)', () => {
    let run = steps(ready(), request('rewarded', T0), showed('rewarded', T0 + 100), dismissed('rewarded', T0 + 4000), tick(T0 + 4000 + AD_LATE_REWARD_GRACE_MS));
    const before = run.state;
    run = step(run, reward(T0 + 4000 + AD_LATE_REWARD_GRACE_MS + 50));
    expect(run.effects).toEqual([]);
    expect(run.state).toEqual(before);
  });

  it('a reward with no show in flight is ignored', () => {
    const run = ready();
    const r = step(run, reward(T0 + 1));
    expect(r.effects).toEqual([]);
    expect(r.state).toEqual(run.state);
  });
});

describe('rewarded outcome: unavailable', () => {
  it('failedToShow settles unavailable at once, reloads, and clears busy', () => {
    const run = steps(ready(), request('rewarded', T0 + 10), failedToShow('rewarded', T0 + 60));
    expect(settles(run.effects)).toEqual([{ type: 'settle', format: 'rewarded', outcome: 'unavailable' }]);
    expect(loads(run.effects)).toEqual(['rewarded']);
    expect(isBusy(run.state)).toBe(false);
  });

  it('the 5 s watchdog: no Showed within AD_SHOW_WATCHDOG_MS settles unavailable', () => {
    let run = steps(ready(), request('rewarded', T0 + 10));
    expect(step(run, tick(T0 + 10 + AD_SHOW_WATCHDOG_MS - 1)).effects).toEqual([]);
    run = step(run, tick(T0 + 10 + AD_SHOW_WATCHDOG_MS));
    expect(settles(run.effects)).toEqual([{ type: 'settle', format: 'rewarded', outcome: 'unavailable' }]);
    expect(loads(run.effects)).toEqual(['rewarded']);
    expect(isBusy(run.state)).toBe(false);
  });

  it('the explicit watchdog event does the same, and is a no-op once the ad has shown', () => {
    let run = steps(ready(), request('rewarded', T0 + 10));
    const fired = step(run, { type: 'watchdog', now: T0 + 10 + AD_SHOW_WATCHDOG_MS });
    expect(settles(fired.effects)).toEqual([{ type: 'settle', format: 'rewarded', outcome: 'unavailable' }]);
    run = step(run, showed('rewarded', T0 + 300));
    const late = step(run, { type: 'watchdog', now: T0 + 10 + AD_SHOW_WATCHDOG_MS });
    expect(late.effects).toEqual([]);
    expect(isBusy(late.state)).toBe(true);
    // ... and a watchdog with nothing in flight is a no-op
    expect(step(ready(), { type: 'watchdog', now: T0 + 1 }).effects).toEqual([]);
  });

  it('once Showed arrived the 5 s watchdog is disarmed: a long ad is not cut off', () => {
    let run = steps(ready(), request('rewarded', T0 + 10), showed('rewarded', T0 + 400));
    run = step(run, tick(T0 + 10 + AD_SHOW_WATCHDOG_MS + 25_000));
    expect(run.effects).toEqual([]);
    expect(isBusy(run.state)).toBe(true);
    expect(nextDeadline(run.state)).toBe(T0 + 400 + AD_SHOWING_MAX_MS);
  });

  it('a Showed that arrives after the watchdog gave up is ignored (the offer was already reported unavailable)', () => {
    let run = steps(ready(), request('rewarded', T0 + 10), tick(T0 + 10 + AD_SHOW_WATCHDOG_MS));
    const before = run.state;
    run = step(run, showed('rewarded', T0 + 10 + AD_SHOW_WATCHDOG_MS + 800));
    expect(run.state).toEqual(before);
    expect(settles(run.effects)).toEqual([]);
    // but it WAS a rewarded view: the interstitial clock still resets
    expect(run.effects).toEqual([{ type: 'resetInterstitialClock' }]);
  });

  it('a lost Dismissed (the ad has been "showing" for AD_SHOWING_MAX_MS) is closed out, never hangs', () => {
    const run = steps(ready(), request('rewarded', T0), showed('rewarded', T0 + 100));
    expect(step(run, tick(T0 + 100 + AD_SHOWING_MAX_MS - 1)).effects).toEqual([]);
    const out = step(run, tick(T0 + 100 + AD_SHOWING_MAX_MS));
    expect(settles(out.effects)).toEqual([{ type: 'settle', format: 'rewarded', outcome: 'dismissed' }]);
    expect(isBusy(out.state)).toBe(false);
    // had the reward arrived, it is earned
    const paid = steps(run, reward(T0 + 5000), tick(T0 + 100 + AD_SHOWING_MAX_MS));
    expect(settles(paid.effects)).toEqual([{ type: 'settle', format: 'rewarded', outcome: 'earned' }]);
  });
});

describe('interstitial show', () => {
  it('shown then dismissed settles, reloads, and clears busy', () => {
    let run = steps(ready(), request('interstitial', T0 + 10));
    expect(run.effects).toEqual([{ type: 'show', format: 'interstitial' }]);
    run = step(run, showed('interstitial', T0 + 200));
    expect(run.effects).toEqual([{ type: 'shown', format: 'interstitial' }]);
    run = step(run, dismissed('interstitial', T0 + 9000));
    expect(settles(run.effects)).toEqual([{ type: 'settle', format: 'interstitial', outcome: 'dismissed' }]); // no grace: there is no reward
    expect(loads(run.effects)).toEqual(['interstitial']);
    expect(isBusy(run.state)).toBe(false);
  });

  it('failedToShow and the watchdog resolve it as unavailable', () => {
    const failed = steps(ready(), request('interstitial', T0), failedToShow('interstitial', T0 + 20));
    expect(settles(failed.effects)).toEqual([{ type: 'settle', format: 'interstitial', outcome: 'unavailable' }]);
    expect(loads(failed.effects)).toEqual(['interstitial']);
    const dog = steps(ready(), request('interstitial', T0), tick(T0 + AD_SHOW_WATCHDOG_MS));
    expect(settles(dog.effects)).toEqual([{ type: 'settle', format: 'interstitial', outcome: 'unavailable' }]);
    expect(isBusy(dog.state)).toBe(false);
  });

  it('events of the other format never settle a show', () => {
    const run = steps(ready(), request('interstitial', T0), showed('interstitial', T0 + 100));
    const stray = steps(run, dismissed('rewarded', T0 + 200), failedToShow('rewarded', T0 + 210), reward(T0 + 220));
    expect(settles(stray.effects)).toEqual([]);
    expect(isBusy(stray.state)).toBe(true);
  });

  it('does not wait on a load: an interstitial still loading is refused', () => {
    const run = steps(start(), enable(), loaded('rewarded'));
    expect(step(run, request('interstitial', T0 + 1)).effects).toEqual([{ type: 'refuse', format: 'interstitial', reason: 'not_ready' }]);
  });
});

describe('disable (consent withdrawn)', () => {
  it('resets everything: not ready, no retries pending, no deadline', () => {
    const run = steps(step(start(), enable()), failedToLoad('rewarded', T0));
    expect(nextDeadline(run.state)).toBe(T0 + 30_000);
    const off = step(run, { type: 'disable' });
    expect(off.state).toEqual(initialAdState());
    expect(nextDeadline(off.state)).toBeNull();
    expect(step(off, tick(T0 + 10 * 60_000)).effects).toEqual([]); // the retry that was pending never fires
    expect(isReady(step(ready(), { type: 'disable' }).state, 'rewarded', T0)).toBe(false);
  });

  it('settles a show that was in flight as unavailable so no caller hangs', () => {
    const off = steps(ready(), request('rewarded', T0), { type: 'disable' });
    expect(settles(off.effects)).toEqual([{ type: 'settle', format: 'rewarded', outcome: 'unavailable' }]);
    expect(off.state).toEqual(initialAdState());
  });

  it('events arriving after a disable are ignored; enabling again preloads again', () => {
    let run = steps(step(start(), enable()), { type: 'disable' }, loaded('rewarded', T0 + 5));
    expect(run.state).toEqual(initialAdState());
    run = step(run, enable(T0 + 10));
    expect(loads(run.effects)).toEqual(['rewarded', 'interstitial']);
  });
});

describe('purity', () => {
  it('never mutates the state it is given', () => {
    const run = ready();
    const frozen = JSON.parse(JSON.stringify(run.state)) as AdState;
    const deepFreeze = <T>(o: T): T => {
      if (o && typeof o === 'object') {
        Object.freeze(o);
        Object.values(o as Record<string, unknown>).forEach(deepFreeze);
      }
      return o;
    };
    deepFreeze(run.state);
    const events: AdEvent[] = [
      request('rewarded', T0 + 1),
      showed('rewarded', T0 + 2),
      reward(T0 + 3),
      dismissed('rewarded', T0 + 4),
      tick(T0 + 5),
      failedToLoad('interstitial', T0 + 6),
      { type: 'disable' },
    ];
    for (const e of events) expect(() => reduceAd(run.state, e)).not.toThrow();
    expect(run.state).toEqual(frozen);
  });
});
