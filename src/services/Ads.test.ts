import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CONSENT_DENIED, type ConsentOutcome } from './consentState';
import {
  ADMOB,
  ADMOB_EVENTS,
  AD_EXTERNAL_FLOW_SOURCE,
  AD_LATE_REWARD_GRACE_MS,
  AD_MAX_AGE_MS,
  AD_RETRY_BACKOFF_MS,
  AD_SHOWING_MAX_MS,
  AD_SHOW_WATCHDOG_MS,
} from '../config/monetization.config';

// Ads is consent-gated (D-10, P00-T18): the ad SDK is initialised only by Ads.init(outcome) from bootServices, only when UMP says
// canRequestAds, with the A-07 content rating and no child-directed / under-age tags (D-25). Any ad request before a successful
// init is refused as not ready and NEVER triggers UMP or initialize.
// P00-T19 (D-24): once initialised, both formats are preloaded, the plugin's events drive a pure reducer (adState.ts), a rewarded
// outcome (earned | dismissed | unavailable) is read from events and a 5 s watchdog and never from the showRewardVideoAd() promise,
// every show is wrapped in the external-flow flag and mutes game audio, and the interstitial is awaited, never waited on to load.
// These tests run the native path against a fake plugin that emits the real event names.

const ALLOWED: ConsentOutcome = { canRequestAds: true, privacyOptionsRequired: false, analytics: 'granted', adStorage: 'granted', adUserData: 'granted', adPersonalization: 'granted' };
const START = new Date('2026-10-08T12:00:00Z');
const RW = ADMOB_EVENTS.REWARDED;
const IN = ADMOB_EVENTS.INTERSTITIAL;
const COOLDOWN_KEY = 'gravity-flow:interstitial:v1';

type Fmt = 'rewarded' | 'interstitial';
type LoadBehavior = 'ok' | 'fail' | 'hang';

interface LoadOptions {
  native?: boolean;
  initialize?: () => Promise<void>;
  debug?: { geography: number | undefined; testDeviceIds: string[] };
  load?: Partial<Record<Fmt, LoadBehavior>>; // what prepare does (mutable through `t.behavior` afterwards)
  show?: 'hang' | 'reject'; // what showRewardVideoAd / showInterstitial do ('hang' = like the real plugin: nothing until an event)
  failListenerAt?: number; // the Nth addListener call rejects
  wantsAudio?: boolean;
  settings?: { sound: boolean; music: boolean };
  decision?: { show: boolean; reason: string };
}

async function load(opts: LoadOptions = {}) {
  const native = opts.native ?? true;
  vi.resetModules();
  const listeners = new Map<string, Array<(payload?: unknown) => void>>();
  const behavior: Record<Fmt, LoadBehavior> = { rewarded: 'ok', interstitial: 'ok', ...opts.load };
  const showMode = { value: opts.show ?? 'hang' };
  const flowAtShow: boolean[] = [];
  const audioWanted = { value: opts.wantsAudio ?? true };
  let addListenerCalls = 0;
  // The real plugin reports a load through an event and also settles the prepare promise; events arrive asynchronously.
  const emit = (name: string, payload?: unknown) => {
    for (const fn of [...(listeners.get(name) ?? [])]) fn(payload);
  };
  const emitLater = (name: string, payload?: unknown) => {
    queueMicrotask(() => emit(name, payload));
  };
  const prepare = (fmt: Fmt) => async (_o: { adId: string }) => {
    const ev = fmt === 'rewarded' ? RW : IN;
    if (behavior[fmt] === 'hang') return new Promise(() => {});
    if (behavior[fmt] === 'fail') {
      emitLater(ev.FAILED_TO_LOAD, { code: 3, message: 'no fill' });
      throw new Error('no fill');
    }
    emitLater(ev.LOADED, { adUnitId: fmt === 'rewarded' ? ADMOB.rewardedAdId : ADMOB.interstitialAdId });
    return { adUnitId: 'x' };
  };
  const noShowPromise = (): Promise<never> => new Promise(() => {});
  const plugin = {
    initialize: vi.fn(async (_options?: Record<string, unknown>): Promise<void> => (opts.initialize ? opts.initialize() : undefined)),
    requestConsentInfo: vi.fn(async () => ({ status: 'NOT_REQUIRED', canRequestAds: true })),
    showConsentForm: vi.fn(async () => ({ status: 'OBTAINED', canRequestAds: true })),
    showPrivacyOptionsForm: vi.fn(async () => {}),
    addListener: vi.fn(async (name: string, fn: (payload?: unknown) => void) => {
      addListenerCalls += 1;
      if (opts.failListenerAt === addListenerCalls) throw new Error('bridge down');
      listeners.set(name, [...(listeners.get(name) ?? []), fn]);
      return { remove: vi.fn(async () => { listeners.set(name, (listeners.get(name) ?? []).filter((f) => f !== fn)); }) };
    }),
    prepareRewardVideoAd: vi.fn(prepare('rewarded')),
    showRewardVideoAd: vi.fn((): Promise<never> => {
      flowAtShow.push(flow.isExternalFlowActive());
      return showMode.value === 'reject' ? Promise.reject(new Error('No Reward Video Ad can be shown')) : noShowPromise();
    }),
    prepareInterstitial: vi.fn(prepare('interstitial')),
    showInterstitial: vi.fn((): Promise<void> => {
      flowAtShow.push(flow.isExternalFlowActive());
      return showMode.value === 'reject' ? Promise.reject(new Error('No Interstitial can be shown')) : noShowPromise();
    }),
  };
  const tracked: Array<{ name: string; params?: Record<string, unknown> }> = [];
  const writes: Array<[string, string]> = [];
  const decisions: Array<{ lastShownMs: number; sessionLevels: number; now: number }> = [];
  const settings = opts.settings ?? { sound: true, music: true };
  const audio = {
    get wantsAudio() { return audioWanted.value; },
    suspend: vi.fn(() => { audioWanted.value = false; }),
    resume: vi.fn(() => { audioWanted.value = true; }),
  };
  let adMobModuleLoads = 0;
  vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native } }));
  vi.doMock('./native/admob', () => {
    adMobModuleLoads += 1;
    return { AdMob: plugin };
  });
  vi.doMock('./IAP', () => ({ IAP: { isPremium: () => false } }));
  vi.doMock('./Analytics', () => ({ Analytics: { track: (e: { name: string; params?: Record<string, unknown> }) => tracked.push(e) } }));
  vi.doMock('../platform/saves', () => ({ Saves: { onRestore: () => {}, write: (k: string, v: string) => writes.push([k, v]) } }));
  vi.doMock('../utils/AudioSynth', () => ({ sharedAudio: () => audio }));
  vi.doMock('../utils/SettingsStore', () => ({ SettingsStore: { get: () => settings } }));
  vi.doMock('./interstitial', () => ({
    interstitialDecision: (ctx: { lastShownMs: number; sessionLevels: number; now: number }) => {
      decisions.push(ctx);
      return opts.decision ?? { show: true, reason: 'ok' };
    },
  }));
  if (opts.debug) {
    const debug = opts.debug;
    vi.doMock('../config/consent.config', async (orig) => ({ ...(await orig<Record<string, unknown>>()), UMP_DEBUG: debug }));
  }
  const flow = await import('../platform/externalFlow');
  const foreground = await import('../platform/foreground');
  const { Ads } = await import('./Ads');
  const flush = () => vi.advanceTimersByTimeAsync(0);
  return {
    Ads, plugin, tracked, writes, decisions, audio, settings, flow, foreground, behavior, showMode, flowAtShow, emit, flush,
    audioWanted, adMobModuleLoads: () => adMobModuleLoads, registered: () => [...listeners.keys()].sort(),
    listenerCount: () => [...listeners.values()].reduce((n, l) => n + l.length, 0),
  };
}

type T = Awaited<ReturnType<typeof load>>;

// Android: the host activity pauses and resumes (Capacitor App `pause` / `resume`). lifecycle.ts reports them as the "native" source of the
// activity state; on resume its onForeground() also notifies the merged foreground subscribers (the expiry re-check).
const pause = (t: T): void => {
  t.foreground.reportActivity('native', false);
};
const resume = (t: T): void => {
  t.foreground.reportActivity('native', true);
  t.foreground.notifyForeground();
};

// A booted app: consent allowed, SDK up, both formats loaded.
async function up(opts: LoadOptions = {}): Promise<T> {
  const t = await load(opts);
  await t.Ads.init(ALLOWED);
  await t.flush();
  return t;
}

function expectNoConsentOrInitCalls(plugin: T['plugin']): void {
  expect(plugin.initialize).not.toHaveBeenCalled();
  expect(plugin.requestConsentInfo).not.toHaveBeenCalled();
  expect(plugin.showConsentForm).not.toHaveBeenCalled();
  expect(plugin.showPrivacyOptionsForm).not.toHaveBeenCalled();
}

// performance is faked too: Ads reads performance.now() for every show timer (a monotonic clock, fix pass 1 m5), and
// vi.setSystemTime() moves the wall clock (Date) only, which is exactly what the clock tests below need to tell them apart.
const FAKE_CLOCKS = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'Date', 'performance'] as const;

beforeEach(() => {
  vi.useFakeTimers({ toFake: [...FAKE_CLOCKS] });
  vi.setSystemTime(START);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  for (const m of ['@capacitor/core', './native/admob', './IAP', './Analytics', '../platform/saves', './interstitial', '../config/consent.config', '../utils/AudioSynth', '../utils/SettingsStore']) vi.doUnmock(m);
});

describe('Ads before init (native): refused, and it never starts consent, the SDK or a load', () => {
  it('a rewarded request resolves unavailable without calling initialize, any consent API, prepare or show, and loads no plugin', async () => {
    const { Ads, plugin, tracked, adMobModuleLoads } = await load();
    expect(await Ads.showRewarded('campaign_2x')).toBe('unavailable');
    expectNoConsentOrInitCalls(plugin);
    expect(plugin.prepareRewardVideoAd).not.toHaveBeenCalled();
    expect(plugin.showRewardVideoAd).not.toHaveBeenCalled();
    expect(plugin.addListener).not.toHaveBeenCalled();
    expect(adMobModuleLoads()).toBe(0);
    expect(tracked).toEqual([]); // no rewarded_shown event for an ad that was never requested
  });

  it('an interstitial opportunity does not request or show anything', async () => {
    const { Ads, plugin, adMobModuleLoads } = await load();
    expect(await Ads.showInterstitialIfEligible({ flowProtected: false, now: Date.now() + 3_600_000 })).toBe('skipped');
    expectNoConsentOrInitCalls(plugin);
    expect(plugin.prepareInterstitial).not.toHaveBeenCalled();
    expect(plugin.showInterstitial).not.toHaveBeenCalled();
    expect(adMobModuleLoads()).toBe(0);
  });

  it('isRewardedReady() and isShowing() are false until init succeeds, and time passing loads nothing', async () => {
    const { Ads, plugin } = await load();
    expect(Ads.isRewardedReady()).toBe(false);
    expect(Ads.isShowing()).toBe(false);
    await vi.advanceTimersByTimeAsync(AD_MAX_AGE_MS * 2);
    expect(plugin.prepareRewardVideoAd).not.toHaveBeenCalled();
    expect(plugin.prepareInterstitial).not.toHaveBeenCalled();
  });
});

describe('Ads.init(outcome)', () => {
  it('initialises once with the A-07 rating and NO child-directed / under-age tags (D-25)', async () => {
    const { Ads, plugin } = await load();
    await Ads.init(ALLOWED);
    expect(plugin.initialize).toHaveBeenCalledTimes(1);
    const options = plugin.initialize.mock.calls[0][0] as Record<string, unknown>;
    expect(options).toEqual({ maxAdContentRating: 'ParentalGuidance' });
    expect(options).not.toHaveProperty('tagForChildDirectedTreatment');
    expect(options).not.toHaveProperty('tagForUnderAgeOfConsent');
    expect(options).not.toHaveProperty('initializeForTesting');
    expect(options.maxAdContentRating).not.toBe('PG');
    expect(plugin.requestConsentInfo).not.toHaveBeenCalled(); // consent lives in Consent.ts, never here
    expect(plugin.showConsentForm).not.toHaveBeenCalled();
  });

  it('initializeForTesting is on only when the debug geography is set, with the test device ids', async () => {
    const { Ads, plugin } = await load({ debug: { geography: 1, testDeviceIds: ['AAA', 'BBB'] } });
    await Ads.init(ALLOWED);
    expect(plugin.initialize).toHaveBeenCalledWith({ maxAdContentRating: 'ParentalGuidance', initializeForTesting: true, testingDevices: ['AAA', 'BBB'] });
  });

  it('an outcome that does not allow ads never initialises, registers nothing and loads nothing', async () => {
    const { Ads, plugin, adMobModuleLoads } = await load();
    await Ads.init({ ...CONSENT_DENIED });
    expect(plugin.initialize).not.toHaveBeenCalled();
    expect(plugin.addListener).not.toHaveBeenCalled();
    expect(plugin.prepareRewardVideoAd).not.toHaveBeenCalled();
    expect(adMobModuleLoads()).toBe(0);
    expect(await Ads.showRewarded('endless_revive')).toBe('unavailable');
    expect(Ads.isRewardedReady()).toBe(false);
  });

  it('is idempotent: concurrent and repeated calls initialise the SDK, register the listeners and preload once', async () => {
    const { Ads, plugin, flush } = await load();
    await Promise.all([Ads.init(ALLOWED), Ads.init(ALLOWED)]);
    await Ads.init(ALLOWED);
    await flush();
    expect(plugin.initialize).toHaveBeenCalledTimes(1);
    expect(plugin.addListener).toHaveBeenCalledTimes(11);
    expect(plugin.prepareRewardVideoAd).toHaveBeenCalledTimes(1);
    expect(plugin.prepareInterstitial).toHaveBeenCalledTimes(1);
  });

  it('a failing initialize leaves ads not ready, registers and loads nothing, and does not throw; a later init may try again', async () => {
    let fail = true;
    const { Ads, plugin, flush } = await load({
      initialize: async () => {
        if (fail) throw new Error('SDK failure');
      },
    });
    await expect(Ads.init(ALLOWED)).resolves.toBeUndefined();
    expect(Ads.isRewardedReady()).toBe(false);
    expect(await Ads.showRewarded('campaign_2x')).toBe('unavailable');
    expect(plugin.prepareRewardVideoAd).not.toHaveBeenCalled();
    expect(plugin.addListener).not.toHaveBeenCalled();
    fail = false;
    await Ads.init(ALLOWED);
    await flush();
    expect(plugin.initialize).toHaveBeenCalledTimes(2);
    expect(Ads.isRewardedReady()).toBe(true);
  });
});

describe('listeners: registered once, exactly the eleven the reducer needs', () => {
  it('registers every rewarded and interstitial event name once, before any load is requested', async () => {
    const t = await load();
    await t.Ads.init(ALLOWED);
    await t.flush();
    expect(t.plugin.addListener).toHaveBeenCalledTimes(11);
    expect(t.registered()).toEqual([...Object.values(RW), ...Object.values(IN)].sort());
    expect(t.listenerCount()).toBe(11);
    // all eleven were in place before the first prepare was called, so no load event can be missed
    const lastListener = Math.max(...t.plugin.addListener.mock.invocationCallOrder);
    const firstPrepare = Math.min(...t.plugin.prepareRewardVideoAd.mock.invocationCallOrder, ...t.plugin.prepareInterstitial.mock.invocationCallOrder);
    expect(lastListener).toBeLessThan(firstPrepare);
  });

  it('a revoke and a second init re-use them: still eleven registrations', async () => {
    const t = await up();
    t.Ads.revoke();
    await t.Ads.init(ALLOWED);
    await t.flush();
    expect(t.plugin.addListener).toHaveBeenCalledTimes(11);
    expect(t.listenerCount()).toBe(11);
    expect(t.plugin.initialize).toHaveBeenCalledTimes(1);
  });

  it('a registration that fails fails the init (not ready, nothing loaded), leaks no listener, and a retry registers cleanly', async () => {
    const t = await load({ failListenerAt: 5 });
    await expect(t.Ads.init(ALLOWED)).resolves.toBeUndefined();
    await t.flush();
    expect(t.Ads.isRewardedReady()).toBe(false);
    expect(t.plugin.prepareRewardVideoAd).not.toHaveBeenCalled();
    expect(t.listenerCount()).toBe(0); // the four that did register were removed again
    await t.Ads.init(ALLOWED);
    await t.flush();
    expect(t.listenerCount()).toBe(11);
    expect(t.Ads.isRewardedReady()).toBe(true);
  });
});

describe('preload and readiness', () => {
  it('init preloads both formats with the ad unit ids; nothing before it', async () => {
    const t = await load();
    expect(t.plugin.prepareRewardVideoAd).not.toHaveBeenCalled();
    expect(t.plugin.prepareInterstitial).not.toHaveBeenCalled();
    await t.Ads.init(ALLOWED);
    expect(t.plugin.prepareRewardVideoAd).toHaveBeenCalledWith({ adId: ADMOB.rewardedAdId });
    expect(t.plugin.prepareInterstitial).toHaveBeenCalledWith({ adId: ADMOB.interstitialAdId });
  });

  it('isRewardedReady() turns true only when the Loaded event arrives', async () => {
    const t = await load({ load: { rewarded: 'hang' } });
    await t.Ads.init(ALLOWED);
    await t.flush();
    expect(t.Ads.isRewardedReady()).toBe(false); // prepare is pending
    t.emit(RW.LOADED, { adUnitId: ADMOB.rewardedAdId });
    expect(t.Ads.isRewardedReady()).toBe(true);
  });

  it('a failed load retries after 30 s, 60 s, 120 s, 300 s (the last repeats), never in a tight loop', async () => {
    const t = await load({ load: { rewarded: 'fail' } });
    await t.Ads.init(ALLOWED);
    await t.flush();
    expect(t.plugin.prepareRewardVideoAd).toHaveBeenCalledTimes(1);
    expect(t.Ads.isRewardedReady()).toBe(false);
    let calls = 1;
    for (const wait of [...AD_RETRY_BACKOFF_MS, 300_000]) {
      await vi.advanceTimersByTimeAsync(wait - 1);
      expect(t.plugin.prepareRewardVideoAd).toHaveBeenCalledTimes(calls);
      await vi.advanceTimersByTimeAsync(1);
      calls += 1;
      expect(t.plugin.prepareRewardVideoAd).toHaveBeenCalledTimes(calls);
    }
    t.behavior.rewarded = 'ok';
    await vi.advanceTimersByTimeAsync(300_000);
    expect(t.Ads.isRewardedReady()).toBe(true);
  });

  it('a loaded ad older than 55 minutes is reloaded, never offered', async () => {
    const t = await up();
    expect(t.Ads.isRewardedReady()).toBe(true);
    await vi.advanceTimersByTimeAsync(AD_MAX_AGE_MS);
    expect(t.plugin.prepareRewardVideoAd).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await t.flush();
    expect(t.plugin.prepareRewardVideoAd).toHaveBeenCalledTimes(2);
    expect(t.plugin.prepareInterstitial).toHaveBeenCalledTimes(2);
    expect(t.Ads.isRewardedReady()).toBe(true); // the replacement loaded
  });

  it('returning to the foreground re-checks expiry even if the timer was held back while hidden', async () => {
    const t = await up();
    vi.setSystemTime(Date.now() + AD_MAX_AGE_MS + 60_000); // the clock moved, no timer callback ran
    expect(t.Ads.isRewardedReady()).toBe(false); // honest against the clock
    t.foreground.notifyForeground();
    await t.flush();
    expect(t.plugin.prepareRewardVideoAd).toHaveBeenCalledTimes(2);
  });
});

describe('revoke() (consent withdrawn): stops preloading, cancels retries, nothing is ready', () => {
  it('makes isRewardedReady() false and refuses shows without calling the plugin', async () => {
    const t = await up();
    t.Ads.revoke();
    expect(t.Ads.isRewardedReady()).toBe(false);
    expect(await t.Ads.showRewarded('endless_2x')).toBe('unavailable');
    expect(await t.Ads.showInterstitialIfEligible({ flowProtected: false, now: Date.now() + 3_600_000 })).toBe('skipped');
    expect(t.plugin.showRewardVideoAd).not.toHaveBeenCalled();
    expect(t.plugin.showInterstitial).not.toHaveBeenCalled();
  });

  it('cancels a pending load retry (control: without revoke the same retry fires)', async () => {
    const control = await load({ load: { rewarded: 'fail' } });
    await control.Ads.init(ALLOWED);
    await control.flush();
    await vi.advanceTimersByTimeAsync(AD_RETRY_BACKOFF_MS[0]);
    expect(control.plugin.prepareRewardVideoAd).toHaveBeenCalledTimes(2);

    const t = await load({ load: { rewarded: 'fail' } });
    await t.Ads.init(ALLOWED);
    await t.flush();
    expect(t.plugin.prepareRewardVideoAd).toHaveBeenCalledTimes(1);
    t.Ads.revoke();
    await vi.advanceTimersByTimeAsync(AD_MAX_AGE_MS * 2);
    expect(t.plugin.prepareRewardVideoAd).toHaveBeenCalledTimes(1);
    expect(t.plugin.prepareInterstitial).toHaveBeenCalledTimes(1); // nor does the expiry reload run
  });

  it('plugin events that are still in flight after the revoke change nothing, and init(allowed) preloads again without re-initialising', async () => {
    const t = await load({ load: { rewarded: 'hang' } });
    await t.Ads.init(ALLOWED);
    await t.flush();
    t.Ads.revoke();
    t.emit(RW.LOADED, { adUnitId: ADMOB.rewardedAdId }); // a load that finished after the withdrawal
    expect(t.Ads.isRewardedReady()).toBe(false);
    t.behavior.rewarded = 'ok';
    await t.Ads.init(ALLOWED);
    await t.flush();
    expect(t.plugin.initialize).toHaveBeenCalledTimes(1);
    expect(t.plugin.prepareRewardVideoAd).toHaveBeenCalledTimes(2);
    expect(t.Ads.isRewardedReady()).toBe(true);
  });

  it('a revoke that lands while the SDK is still coming up wins: the late init does not preload', async () => {
    let release: () => void = () => {};
    const t = await load({ initialize: () => new Promise<void>((r) => { release = r; }) });
    const pending = t.Ads.init(ALLOWED);
    await t.flush();
    t.Ads.revoke();
    release();
    await pending;
    await t.flush();
    expect(t.plugin.prepareRewardVideoAd).not.toHaveBeenCalled();
    expect(t.Ads.isRewardedReady()).toBe(false);
  });
});

describe('showRewarded: outcome from events, never from showRewardVideoAd()', () => {
  it('earned: Showed, Reward, Dismissed. Resolves although the plugin call never settles; tracks shown and earned once; reloads', async () => {
    const t = await up();
    expect(t.Ads.isRewardedReady()).toBe(true);
    const p = t.Ads.showRewarded('campaign_2x');
    expect(t.plugin.showRewardVideoAd).toHaveBeenCalledTimes(1);
    expect(t.Ads.isShowing()).toBe(true);
    expect(t.Ads.isRewardedReady()).toBe(false); // busy
    t.emit(RW.SHOWED);
    t.emit(RW.REWARDED, { type: 'coin', amount: 1 });
    t.emit(RW.DISMISSED);
    await expect(p).resolves.toBe('earned');
    expect(t.tracked.map((e) => e.name).filter((n) => n.startsWith('rewarded_'))).toEqual(['rewarded_shown', 'rewarded_earned']);
    expect(t.tracked[0].params).toEqual({ source: 'campaign_2x' });
    expect(t.Ads.isShowing()).toBe(false);
    await t.flush();
    expect(t.plugin.prepareRewardVideoAd).toHaveBeenCalledTimes(2); // the shown ad is spent: the next one is already loading
    expect(t.Ads.isRewardedReady()).toBe(true);
  });

  it('dismissed: closed before the reward. Resolves dismissed after the 300 ms grace, no earned event', async () => {
    const t = await up();
    const p = t.Ads.showRewarded('endless_revive');
    let done: string | undefined;
    void p.then((o) => { done = o; });
    t.emit(RW.SHOWED);
    t.emit(RW.DISMISSED);
    await vi.advanceTimersByTimeAsync(AD_LATE_REWARD_GRACE_MS - 1);
    expect(done).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe('dismissed');
    expect(t.tracked.map((e) => e.name)).not.toContain('rewarded_earned');
  });

  it('a reward landing within 300 ms after Dismissed still counts, exactly once', async () => {
    const t = await up();
    const p = t.Ads.showRewarded('endless_2x');
    t.emit(RW.SHOWED);
    t.emit(RW.DISMISSED);
    await vi.advanceTimersByTimeAsync(AD_LATE_REWARD_GRACE_MS - 50);
    t.emit(RW.REWARDED, { type: 'coin', amount: 1 });
    await expect(p).resolves.toBe('earned');
    await vi.advanceTimersByTimeAsync(AD_LATE_REWARD_GRACE_MS * 3);
    expect(t.tracked.filter((e) => e.name === 'rewarded_earned')).toHaveLength(1);
  });

  it('unavailable: FailedToShow resolves at once', async () => {
    const t = await up();
    const p = t.Ads.showRewarded('free_fragments');
    t.emit(RW.FAILED_TO_SHOW, { code: 0, message: 'internal' });
    await expect(p).resolves.toBe('unavailable');
    expect(t.tracked.map((e) => e.name)).not.toContain('rewarded_shown'); // it never reached the screen
  });

  it('unavailable: a show call the plugin rejects (no ad prepared) resolves at once, not after the watchdog', async () => {
    const t = await up({ show: 'reject' });
    const p = t.Ads.showRewarded('campaign_2x');
    await t.flush();
    await expect(p).resolves.toBe('unavailable');
    expect(Date.now()).toBe(START.getTime()); // no timer advanced
  });

  it('unavailable: no Showed within 5 s (the watchdog), and not before', async () => {
    const t = await up();
    const p = t.Ads.showRewarded('campaign_2x');
    let done: string | undefined;
    void p.then((o) => { done = o; });
    await vi.advanceTimersByTimeAsync(AD_SHOW_WATCHDOG_MS - 1);
    expect(done).toBeUndefined();
    expect(t.Ads.isShowing()).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe('unavailable');
    expect(t.Ads.isShowing()).toBe(false);
  });

  it('once Showed arrived the watchdog is off: a long ad is not cut off at 5 s', async () => {
    const t = await up();
    const p = t.Ads.showRewarded('campaign_2x');
    let done: string | undefined;
    void p.then((o) => { done = o; });
    t.emit(RW.SHOWED);
    await vi.advanceTimersByTimeAsync(AD_SHOW_WATCHDOG_MS * 4);
    expect(done).toBeUndefined();
    t.emit(RW.REWARDED, { type: 'coin', amount: 1 });
    t.emit(RW.DISMISSED);
    await expect(p).resolves.toBe('earned');
  });

  it('busy guard: a second request while one is in flight shows nothing and resolves unavailable; the first is untouched', async () => {
    const t = await up();
    const first = t.Ads.showRewarded('endless_revive');
    const second = await t.Ads.showRewarded('endless_2x');
    expect(second).toBe('unavailable');
    expect(t.plugin.showRewardVideoAd).toHaveBeenCalledTimes(1);
    expect(t.tracked.filter((e) => e.name === 'rewarded_shown')).toHaveLength(0); // neither has reached the screen yet
    t.emit(RW.SHOWED);
    t.emit(RW.REWARDED, { type: 'coin', amount: 1 });
    t.emit(RW.DISMISSED);
    await expect(first).resolves.toBe('earned');
    expect(t.tracked.filter((e) => e.name === 'rewarded_earned')).toHaveLength(1);
  });

  it('busy guard also holds against an interstitial while a rewarded ad is in flight (one full-screen ad at a time)', async () => {
    const t = await up();
    const rewarded = t.Ads.showRewarded('campaign_2x');
    expect(await t.Ads.showInterstitialIfEligible({ flowProtected: false, now: Date.now() + 3_600_000 })).toBe('skipped');
    expect(t.plugin.showInterstitial).not.toHaveBeenCalled();
    t.emit(RW.FAILED_TO_SHOW, { code: 0, message: 'x' });
    await rewarded;
  });

  it('a request while the ad is not loaded (still loading, or failed) is unavailable and calls nothing', async () => {
    const t = await load({ load: { rewarded: 'hang' } });
    await t.Ads.init(ALLOWED);
    await t.flush();
    expect(await t.Ads.showRewarded('campaign_2x')).toBe('unavailable');
    expect(t.plugin.showRewardVideoAd).not.toHaveBeenCalled();
    expect(t.tracked).toEqual([]);
  });

  it('never awaits the plugin call: the show promise is observed only for a rejection', async () => {
    const t = await up();
    const p = t.Ads.showRewarded('campaign_2x');
    // The fake never settles showRewardVideoAd (like the real plugin when the ad is closed early). The offer must still settle.
    t.emit(RW.SHOWED);
    t.emit(RW.DISMISSED);
    await vi.advanceTimersByTimeAsync(AD_LATE_REWARD_GRACE_MS);
    await expect(p).resolves.toBe('dismissed');
  });
});

describe('every show is wrapped in the external-flow flag and mutes game audio, whatever the outcome', () => {
  type Outcome = 'earned' | 'dismissed' | 'unavailable';
  const rewardedScenarios: Array<[string, Outcome, (t: T) => Promise<void>, LoadOptions?]> = [
    ['earned', 'earned', async (t) => { t.emit(RW.SHOWED); t.emit(RW.REWARDED, {}); t.emit(RW.DISMISSED); }],
    ['closed early', 'dismissed', async (t) => { t.emit(RW.SHOWED); t.emit(RW.DISMISSED); await vi.advanceTimersByTimeAsync(AD_LATE_REWARD_GRACE_MS); }],
    ['failedToShow', 'unavailable', async (t) => { t.emit(RW.FAILED_TO_SHOW, { code: 1, message: 'x' }); }],
    ['watchdog', 'unavailable', async () => { await vi.advanceTimersByTimeAsync(AD_SHOW_WATCHDOG_MS); }],
    ['the plugin rejects the call', 'unavailable', async (t) => { await t.flush(); }, { show: 'reject' }],
  ];

  for (const [name, expected, drive, opts] of rewardedScenarios) {
    it(`rewarded, ${name}: flag up before the ad is shown and down after; audio suspended, then restored`, async () => {
      const t = await up(opts);
      expect(t.flow.isExternalFlowActive()).toBe(false);
      const p = t.Ads.showRewarded('campaign_2x');
      expect(t.flow.isExternalFlowActive()).toBe(true);
      expect(t.flowAtShow).toEqual([true]); // already up when the native show is called
      expect(t.audio.suspend).toHaveBeenCalledTimes(1);
      expect(t.audio.resume).not.toHaveBeenCalled();
      await drive(t);
      await expect(p).resolves.toBe(expected);
      expect(t.flow.isExternalFlowActive()).toBe(false);
      expect(t.audio.resume).toHaveBeenCalledTimes(1);
      expect(t.audioWanted.value).toBe(true);
    });
  }

  it('the flag uses the ads source constant, so it cannot clear (or be cleared by) another flow', async () => {
    const t = await up();
    t.flow.setExternalFlowActive(true, 'iap');
    const p = t.Ads.showRewarded('campaign_2x');
    t.emit(RW.FAILED_TO_SHOW, { code: 1, message: 'x' });
    await p;
    expect(t.flow.isExternalFlowActive()).toBe(true); // iap still holds it
    t.flow.setExternalFlowActive(false, 'iap');
    expect(t.flow.isExternalFlowActive()).toBe(false);
    expect(AD_EXTERNAL_FLOW_SOURCE).toBe('ads');
  });

  it('audio the player did not want (already suspended) is not woken by the end of an ad', async () => {
    const t = await up({ wantsAudio: false });
    const p = t.Ads.showRewarded('campaign_2x');
    t.emit(RW.FAILED_TO_SHOW, { code: 1, message: 'x' });
    await p;
    expect(t.audio.resume).not.toHaveBeenCalled();
  });

  it('Sound and Music both off: the end of an ad does not resume audio; either one on does', async () => {
    const off = await up({ settings: { sound: false, music: false } });
    const p1 = off.Ads.showRewarded('campaign_2x');
    off.emit(RW.FAILED_TO_SHOW, { code: 1, message: 'x' });
    await p1;
    expect(off.audio.resume).not.toHaveBeenCalled();

    const musicOnly = await up({ settings: { sound: false, music: true } });
    const p2 = musicOnly.Ads.showRewarded('campaign_2x');
    musicOnly.emit(RW.FAILED_TO_SHOW, { code: 1, message: 'x' });
    await p2;
    expect(musicOnly.audio.resume).toHaveBeenCalledTimes(1);
  });

  it('interstitial: flag and audio are wrapped around Showed/Dismissed too, and FailedToShow and the watchdog clear them', async () => {
    const shown = await up();
    const p = shown.Ads.showInterstitialIfEligible({ flowProtected: false, now: Date.now() + 3_600_000 });
    expect(shown.flow.isExternalFlowActive()).toBe(true);
    expect(shown.audio.suspend).toHaveBeenCalledTimes(1);
    shown.emit(IN.SHOWED);
    shown.emit(IN.DISMISSED);
    await expect(p).resolves.toBe('shown');
    expect(shown.flow.isExternalFlowActive()).toBe(false);
    expect(shown.audio.resume).toHaveBeenCalledTimes(1);

    const failed = await up();
    const f = failed.Ads.showInterstitialIfEligible({ flowProtected: false, now: Date.now() + 3_600_000 });
    failed.emit(IN.FAILED_TO_SHOW, { code: 1, message: 'x' });
    await expect(f).resolves.toBe('skipped');
    expect(failed.flow.isExternalFlowActive()).toBe(false);
    expect(failed.audio.resume).toHaveBeenCalledTimes(1);

    const dog = await up();
    const d = dog.Ads.showInterstitialIfEligible({ flowProtected: false, now: Date.now() + 3_600_000 });
    await vi.advanceTimersByTimeAsync(AD_SHOW_WATCHDOG_MS);
    await expect(d).resolves.toBe('skipped');
    expect(dog.flow.isExternalFlowActive()).toBe(false);
    expect(dog.audio.resume).toHaveBeenCalledTimes(1);
  });
});

// ---- P00-T19 fix pass 1 -------------------------------------------------------------------------------------------------------
// I1: JS timers keep running while the app is hidden (Capacitor KeepRunning), so an ad the player merely left (Home, a paused video,
// an end card nobody looks at) must not be settled by wall time. The watchdog and the on-screen ceiling count FOREGROUND time only
// (lifecycle.ts reports it through platform/foreground.ts: visibilitychange + native pause / resume), and the end of an ad gives
// audio back only when the lifecycle's foreground path could.

describe('I1: the on-screen ceiling counts foreground time only', () => {
  // A rewarded ad on screen; `done` records the caller's outcome.
  async function onScreen(opts: LoadOptions = {}) {
    const t = await up(opts);
    const p = t.Ads.showRewarded('campaign_2x');
    const seen: { outcome?: string } = {};
    void p.then((o) => { seen.outcome = o; });
    t.emit(RW.SHOWED);
    return { t, p, seen };
  }

  it('hidden for ten minutes does not trip it: still in flight, the flag still up, no audio under the hidden app; a later finish is rewarded', async () => {
    const { t, p, seen } = await onScreen();
    pause(t);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(seen.outcome).toBeUndefined();
    expect(t.Ads.isShowing()).toBe(true);
    expect(t.flow.isExternalFlowActive()).toBe(true);
    expect(t.audio.resume).not.toHaveBeenCalled();
    resume(t);
    t.emit(RW.REWARDED, { type: 'coin', amount: 1 });
    t.emit(RW.DISMISSED);
    await expect(p).resolves.toBe('earned');
    expect(t.tracked.filter((e) => e.name === 'rewarded_earned')).toHaveLength(1);
    expect(t.flow.isExternalFlowActive()).toBe(false);
  });

  it('visible for longer than AD_SHOWING_MAX_MS trips it (a lost Dismissed): the caller is released and the flag cleared', async () => {
    const { t, seen } = await onScreen();
    await vi.advanceTimersByTimeAsync(AD_SHOWING_MAX_MS - 1);
    expect(seen.outcome).toBeUndefined();
    expect(t.flow.isExternalFlowActive()).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(seen.outcome).toBe('dismissed');
    expect(t.Ads.isShowing()).toBe(false);
    expect(t.flow.isExternalFlowActive()).toBe(false);
  });

  it('a reward that came before the lost Dismissed makes the ceiling settle earned', async () => {
    const { t, seen } = await onScreen();
    t.emit(RW.REWARDED, { type: 'coin', amount: 1 });
    await vi.advanceTimersByTimeAsync(AD_SHOWING_MAX_MS);
    expect(seen.outcome).toBe('earned');
  });

  it('the count restarts on return: ten hidden minutes, then the full ceiling of foreground time, to the millisecond', async () => {
    const { t, seen } = await onScreen();
    pause(t);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    resume(t);
    await vi.advanceTimersByTimeAsync(AD_SHOWING_MAX_MS - 1);
    expect(seen.outcome).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(seen.outcome).toBe('dismissed');
    expect(t.flow.isExternalFlowActive()).toBe(false);
  });

  it('foreground time spent before leaving counts: 100 s in front, ten minutes away, then 80 s trips it', async () => {
    const { t, seen } = await onScreen();
    await vi.advanceTimersByTimeAsync(100_000);
    pause(t);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    resume(t);
    await vi.advanceTimersByTimeAsync(AD_SHOWING_MAX_MS - 100_000 - 1);
    expect(seen.outcome).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(seen.outcome).toBe('dismissed');
  });

  it('the usual native order (the ad pauses the app, Dismissed arrives while it is still hidden, the app resumes) settles once, earned', async () => {
    const { t, p } = await onScreen();
    pause(t);
    t.emit(RW.REWARDED, { type: 'coin', amount: 1 });
    t.emit(RW.DISMISSED);
    await expect(p).resolves.toBe('earned');
    expect(t.flow.isExternalFlowActive()).toBe(false);
    resume(t);
    await vi.advanceTimersByTimeAsync(AD_SHOWING_MAX_MS * 2);
    expect(t.tracked.filter((e) => e.name === 'rewarded_earned')).toHaveLength(1);
  });

  it('an interstitial is held to the same rule', async () => {
    const t = await up();
    const p = t.Ads.showInterstitialIfEligible({ flowProtected: false, now: Date.now() + 3_600_000 });
    t.emit(IN.SHOWED);
    pause(t);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(t.Ads.isShowing()).toBe(true);
    resume(t);
    await vi.advanceTimersByTimeAsync(AD_SHOWING_MAX_MS);
    await expect(p).resolves.toBe('shown');
    expect(t.flow.isExternalFlowActive()).toBe(false);
  });

  it('a reward that lands after the ceiling settled is dropped (one settle per show): no second outcome, no earned event, no flag', async () => {
    const { t, seen } = await onScreen();
    await vi.advanceTimersByTimeAsync(AD_SHOWING_MAX_MS);
    expect(seen.outcome).toBe('dismissed');
    t.emit(RW.REWARDED, { type: 'coin', amount: 1 });
    t.emit(RW.DISMISSED);
    await vi.advanceTimersByTimeAsync(AD_LATE_REWARD_GRACE_MS * 3);
    expect(seen.outcome).toBe('dismissed');
    expect(t.tracked.map((e) => e.name)).not.toContain('rewarded_earned');
    expect(t.flow.isExternalFlowActive()).toBe(false);
    expect(t.Ads.isShowing()).toBe(false);
  });
});

// Fix pass 2 (3): AdMob's AdActivity is translucent. After Home -> return during an ad the WebView reports `visible` (visibilitychange,
// and the merged foreground notification) while the ad is still on top and MainActivity is still paused. The ceiling must follow the
// NATIVE activity state on Android, so it never starts counting while the ad is still showing. On the web visibilitychange drives it.
describe('fix pass 2: the ad timers follow the native activity state, not the WebView', () => {
  async function onScreen(opts: LoadOptions = {}) {
    const t = await up(opts);
    const p = t.Ads.showRewarded('campaign_2x');
    const seen: { outcome?: string } = {};
    void p.then((o) => { seen.outcome = o; });
    t.emit(RW.SHOWED);
    return { t, p, seen };
  }

  it('WebView visible + native paused: the ceiling does not count, however long the ad stays on top', async () => {
    const { t, p, seen } = await onScreen();
    pause(t); // the ad's activity paused ours
    await vi.advanceTimersByTimeAsync(30_000);
    t.foreground.reportActivity('visibility', true); // Home -> return: visibilitychange says visible, the ad is still on top
    t.foreground.notifyForeground(); // ... and the lifecycle's merged foreground notification
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(seen.outcome).toBeUndefined();
    expect(t.Ads.isShowing()).toBe(true);
    expect(t.flow.isExternalFlowActive()).toBe(true);
    expect(t.audio.resume).not.toHaveBeenCalled();
    // the ad closes: MainActivity resumes, Reward and Dismissed arrive, the player is rewarded
    resume(t);
    t.emit(RW.REWARDED, { type: 'coin', amount: 1 });
    t.emit(RW.DISMISSED);
    await expect(p).resolves.toBe('earned');
    expect(t.audio.resume).toHaveBeenCalledTimes(1);
  });

  it('the count starts at the NATIVE resume, not at the WebView becoming visible', async () => {
    const { t, seen } = await onScreen();
    pause(t);
    t.foreground.reportActivity('visibility', true);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    resume(t);
    await vi.advanceTimersByTimeAsync(AD_SHOWING_MAX_MS - 1);
    expect(seen.outcome).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(seen.outcome).toBe('dismissed');
  });

  it('a WebView hidden event cannot pause the count once the native state is in use', async () => {
    const { t, seen } = await onScreen();
    resume(t); // a native event proves the native signal is live
    t.foreground.reportActivity('visibility', false);
    await vi.advanceTimersByTimeAsync(AD_SHOWING_MAX_MS);
    expect(seen.outcome).toBe('dismissed');
  });

  it('on the web (no native event ever) visibilitychange drives the same timers', async () => {
    const { t, seen } = await onScreen();
    t.foreground.reportActivity('visibility', false);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(seen.outcome).toBeUndefined();
    t.foreground.reportActivity('visibility', true);
    await vi.advanceTimersByTimeAsync(AD_SHOWING_MAX_MS);
    expect(seen.outcome).toBe('dismissed');
  });

  it('an ad that ends while the activity is still paused leaves the audio to the lifecycle (its native resume follows)', async () => {
    const t = await up();
    const p = t.Ads.showRewarded('campaign_2x');
    t.emit(RW.SHOWED);
    pause(t);
    t.foreground.reportActivity('visibility', true); // the WebView says visible, the activity is not resumed yet
    t.emit(RW.REWARDED, { type: 'coin', amount: 1 });
    t.emit(RW.DISMISSED);
    await expect(p).resolves.toBe('earned');
    expect(t.audio.resume).not.toHaveBeenCalled();
    expect(t.flow.isExternalFlowActive()).toBe(false); // so the lifecycle's resume, which comes next, is no longer blocked by the ad flag
  });
});

// Fix pass 2 (1): lifecycle.ts no longer imports Ads; it asks the dependency-free external-flow flag for the ADS source instead. That is
// only equivalent to Ads.isShowing() if the flag is up exactly while a show is in flight (raised first in startShow, cleared first in
// finishShow). Pinned at every step of every path.
describe('fix pass 2: the ads external-flow source is up exactly while Ads.isShowing()', () => {
  const same = (t: T): void => {
    expect(t.flow.isExternalFlowActive(AD_EXTERNAL_FLOW_SOURCE)).toBe(t.Ads.isShowing());
  };

  it('rewarded, earned: requested, showing, reward, dismissed, and the grace', async () => {
    const t = await up();
    same(t);
    const p = t.Ads.showRewarded('campaign_2x');
    same(t);
    expect(t.Ads.isShowing()).toBe(true);
    t.emit(RW.SHOWED);
    same(t);
    t.emit(RW.REWARDED, { type: 'coin', amount: 1 });
    same(t);
    t.emit(RW.DISMISSED);
    await p;
    same(t);
    expect(t.Ads.isShowing()).toBe(false);
  });

  it('rewarded, closed early: the 300 ms grace keeps both up, then both go down together', async () => {
    const t = await up();
    const p = t.Ads.showRewarded('campaign_2x');
    t.emit(RW.SHOWED);
    t.emit(RW.DISMISSED);
    same(t);
    expect(t.Ads.isShowing()).toBe(true);
    await vi.advanceTimersByTimeAsync(AD_LATE_REWARD_GRACE_MS - 1);
    same(t);
    expect(t.Ads.isShowing()).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    await p;
    same(t);
    expect(t.Ads.isShowing()).toBe(false);
  });

  it('failed, rejected, refused, watchdog, ceiling, revoke: never out of step', async () => {
    const failed = await up();
    const f = failed.Ads.showRewarded('campaign_2x');
    same(failed);
    failed.emit(RW.FAILED_TO_SHOW, { code: 1, message: 'x' });
    await f;
    same(failed);

    const rejected = await up({ show: 'reject' });
    const r = rejected.Ads.showRewarded('campaign_2x');
    await rejected.flush();
    await r;
    same(rejected);

    const busy = await up();
    const first = busy.Ads.showRewarded('endless_revive');
    await busy.Ads.showRewarded('endless_2x'); // refused while the first is in flight: must not clear or raise anything
    same(busy);
    expect(busy.Ads.isShowing()).toBe(true);
    busy.emit(RW.FAILED_TO_SHOW, { code: 1, message: 'x' });
    await first;
    same(busy);

    const dog = await up();
    const d = dog.Ads.showRewarded('campaign_2x');
    await vi.advanceTimersByTimeAsync(AD_SHOW_WATCHDOG_MS);
    await d;
    same(dog);

    const ceiling = await up();
    const c = ceiling.Ads.showRewarded('campaign_2x');
    ceiling.emit(RW.SHOWED);
    await vi.advanceTimersByTimeAsync(AD_SHOWING_MAX_MS);
    await c;
    same(ceiling);

    const revoked = await up();
    const v = revoked.Ads.showRewarded('campaign_2x');
    revoked.emit(RW.SHOWED);
    revoked.Ads.revoke();
    await v;
    same(revoked);
  });

  it('interstitial: requested, showing, dismissed', async () => {
    const t = await up();
    const p = t.Ads.showInterstitialIfEligible({ flowProtected: false, now: Date.now() + 3_600_000 });
    same(t);
    expect(t.Ads.isShowing()).toBe(true);
    t.emit(IN.SHOWED);
    same(t);
    t.emit(IN.DISMISSED);
    await p;
    same(t);
  });

  it('the flag is already up when the native show is called (the plugin call sees it)', async () => {
    const t = await up();
    const p = t.Ads.showRewarded('campaign_2x');
    expect(t.flowAtShow).toEqual([true]);
    t.emit(RW.FAILED_TO_SHOW, { code: 1, message: 'x' });
    await p;
  });

  it('another flow alone (IAP, consent) is NOT an ad: Ads.isShowing() stays false, and the ads source stays down', async () => {
    const t = await up();
    t.flow.setExternalFlowActive(true, 'iap');
    expect(t.Ads.isShowing()).toBe(false);
    expect(t.flow.isExternalFlowActive(AD_EXTERNAL_FLOW_SOURCE)).toBe(false);
    t.flow.setExternalFlowActive(false, 'iap');
  });
});

describe('I1 (b): the end of an ad gives audio back only when the lifecycle could', () => {
  async function ended(t: T, how: 'dismissed' | 'failed' = 'dismissed') {
    const p = t.Ads.showRewarded('campaign_2x');
    t.emit(RW.SHOWED);
    if (how === 'dismissed') {
      t.emit(RW.REWARDED, { type: 'coin', amount: 1 });
      t.emit(RW.DISMISSED);
    }
    return p;
  }

  it('settled while visible: audio is resumed once', async () => {
    const t = await up();
    await expect(ended(t)).resolves.toBe('earned');
    expect(t.audio.resume).toHaveBeenCalledTimes(1);
  });

  it('settled while HIDDEN: not resumed (the foreground path owns it), the flag is cleared and the caller released', async () => {
    const t = await up();
    pause(t);
    await expect(ended(t)).resolves.toBe('earned');
    expect(t.audio.resume).not.toHaveBeenCalled();
    expect(t.flow.isExternalFlowActive()).toBe(false);
    resume(t); // the lifecycle's own foreground path would resume it here; Ads must not do it a second time
    expect(t.audio.resume).not.toHaveBeenCalled();
  });

  it('a failed show that settles while hidden leaves the audio alone too', async () => {
    const t = await up();
    const p = t.Ads.showRewarded('campaign_2x');
    pause(t);
    t.emit(RW.FAILED_TO_SHOW, { code: 1, message: 'x' });
    await expect(p).resolves.toBe('unavailable');
    expect(t.audio.resume).not.toHaveBeenCalled();
    expect(t.flow.isExternalFlowActive()).toBe(false);
  });

  it('settled under the pause overlay: not resumed (the overlay\'s CONTINUE does it)', async () => {
    const t = await up();
    t.foreground.setPauseOverlayReader(() => true);
    await expect(ended(t)).resolves.toBe('earned');
    expect(t.audio.resume).not.toHaveBeenCalled();
    expect(t.flow.isExternalFlowActive()).toBe(false);
  });

  it('still respects Sound / Music: both off, nothing is resumed even in front', async () => {
    const t = await up({ settings: { sound: false, music: false } });
    await expect(ended(t)).resolves.toBe('earned');
    expect(t.audio.resume).not.toHaveBeenCalled();
  });

  it('the ceiling settling while hidden is impossible; settling after the return resumes audio once, in front', async () => {
    const t = await up();
    const p = t.Ads.showRewarded('campaign_2x');
    t.emit(RW.SHOWED);
    pause(t);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(t.audio.resume).not.toHaveBeenCalled();
    resume(t);
    await vi.advanceTimersByTimeAsync(AD_SHOWING_MAX_MS);
    await expect(p).resolves.toBe('dismissed');
    expect(t.audio.resume).toHaveBeenCalledTimes(1);
  });
});

describe('I1: the external-flow flag is cleared on every path', () => {
  type Drive = (t: T) => Promise<void>;
  const rewardedPaths: Array<[string, Drive, LoadOptions?]> = [
    ['earned', async (t) => { t.emit(RW.SHOWED); t.emit(RW.REWARDED, {}); t.emit(RW.DISMISSED); }],
    ['closed early (after the grace)', async (t) => { t.emit(RW.SHOWED); t.emit(RW.DISMISSED); await vi.advanceTimersByTimeAsync(AD_LATE_REWARD_GRACE_MS); }],
    ['failedToShow', async (t) => { t.emit(RW.FAILED_TO_SHOW, { code: 1, message: 'x' }); }],
    ['the 5 s watchdog', async () => { await vi.advanceTimersByTimeAsync(AD_SHOW_WATCHDOG_MS); }],
    ['the plugin rejects the call', async (t) => { await t.flush(); }, { show: 'reject' }],
    ['the ceiling, in front', async (t) => { t.emit(RW.SHOWED); await vi.advanceTimersByTimeAsync(AD_SHOWING_MAX_MS); }],
    ['the ceiling, after a trip to the background', async (t) => {
      t.emit(RW.SHOWED);
      pause(t);
      await vi.advanceTimersByTimeAsync(10 * 60_000);
      resume(t);
      await vi.advanceTimersByTimeAsync(AD_SHOWING_MAX_MS);
    }],
    ['Dismissed while hidden', async (t) => { t.emit(RW.SHOWED); pause(t); t.emit(RW.REWARDED, {}); t.emit(RW.DISMISSED); }],
    ['FailedToShow while hidden', async (t) => { pause(t); t.emit(RW.FAILED_TO_SHOW, { code: 1, message: 'x' }); }],
    ['consent revoked mid-show', async (t) => { t.emit(RW.SHOWED); t.Ads.revoke(); }],
    ['consent revoked before Showed', async (t) => { t.Ads.revoke(); }],
  ];

  for (const [name, drive, opts] of rewardedPaths) {
    it(`rewarded, ${name}: up while the show is in flight, down once the caller has its outcome`, async () => {
      const t = await up(opts);
      const p = t.Ads.showRewarded('campaign_2x');
      expect(t.flow.isExternalFlowActive()).toBe(true);
      await drive(t);
      await p;
      expect(t.flow.isExternalFlowActive()).toBe(false);
      expect(t.Ads.isShowing()).toBe(false);
    });
  }

  it('interstitial: the same on the ceiling, Dismissed while hidden and a revoke', async () => {
    const run = async (drive: Drive) => {
      const t = await up();
      const p = t.Ads.showInterstitialIfEligible({ flowProtected: false, now: Date.now() + 3_600_000 });
      expect(t.flow.isExternalFlowActive()).toBe(true);
      await drive(t);
      await p;
      expect(t.flow.isExternalFlowActive()).toBe(false);
      expect(t.Ads.isShowing()).toBe(false);
    };
    await run(async (t) => { t.emit(IN.SHOWED); await vi.advanceTimersByTimeAsync(AD_SHOWING_MAX_MS); });
    await run(async (t) => { t.emit(IN.SHOWED); pause(t); t.emit(IN.DISMISSED); });
    await run(async (t) => { t.emit(IN.SHOWED); t.Ads.revoke(); });
  });
});

describe('m1: the 5 s watchdog counts foreground time only', () => {
  it('an ad that is already covering the app (the app went to the background) is not given up on after 5 s of wall time', async () => {
    const t = await up();
    const p = t.Ads.showRewarded('campaign_2x');
    let outcome: string | undefined;
    void p.then((o) => { outcome = o; });
    await vi.advanceTimersByTimeAsync(2000);
    pause(t); // the ad activity paused ours, a slow Showed is still on its way
    await vi.advanceTimersByTimeAsync(60_000);
    expect(outcome).toBeUndefined();
    t.emit(RW.SHOWED);
    t.emit(RW.REWARDED, { type: 'coin', amount: 1 });
    t.emit(RW.DISMISSED);
    await expect(p).resolves.toBe('earned');
  });

  it('the rest of the 5 s runs on return when no ad ever appeared', async () => {
    const t = await up();
    const p = t.Ads.showRewarded('campaign_2x');
    let outcome: string | undefined;
    void p.then((o) => { outcome = o; });
    await vi.advanceTimersByTimeAsync(2000);
    pause(t);
    await vi.advanceTimersByTimeAsync(60_000);
    resume(t);
    await vi.advanceTimersByTimeAsync(AD_SHOW_WATCHDOG_MS - 2000 - 1);
    expect(outcome).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(outcome).toBe('unavailable');
  });
});

describe('m5: show timers use a monotonic clock, not the wall clock', () => {
  it('a wall clock set BACK during the 5 s window does not stall the watchdog', async () => {
    const t = await up();
    const p = t.Ads.showRewarded('campaign_2x');
    let outcome: string | undefined;
    void p.then((o) => { outcome = o; });
    vi.setSystemTime(Date.now() - 3_600_000);
    await vi.advanceTimersByTimeAsync(AD_SHOW_WATCHDOG_MS);
    expect(outcome).toBe('unavailable');
    expect(t.flow.isExternalFlowActive()).toBe(false);
  });

  it('a wall clock set FORWARD (then a return to the app) does not trip the watchdog or the ceiling early', async () => {
    const t = await up();
    const p = t.Ads.showRewarded('campaign_2x');
    let outcome: string | undefined;
    void p.then((o) => { outcome = o; });
    vi.setSystemTime(Date.now() + 3_600_000);
    t.foreground.notifyForeground(); // a foreground re-check evaluates the timers against the clock
    await t.flush();
    expect(outcome).toBeUndefined();
    t.emit(RW.SHOWED);
    vi.setSystemTime(Date.now() + 3_600_000);
    t.foreground.notifyForeground();
    await t.flush();
    expect(outcome).toBeUndefined();
    expect(t.Ads.isShowing()).toBe(true);
    t.emit(RW.REWARDED, {});
    t.emit(RW.DISMISSED);
    await expect(p).resolves.toBe('earned');
  });

  it('the late-reward grace is measured on the same clock: a wall clock jump neither cuts it short nor stretches it', async () => {
    const t = await up();
    const p = t.Ads.showRewarded('campaign_2x');
    let outcome: string | undefined;
    void p.then((o) => { outcome = o; });
    t.emit(RW.SHOWED);
    t.emit(RW.DISMISSED);
    vi.setSystemTime(Date.now() - 3_600_000);
    await vi.advanceTimersByTimeAsync(AD_LATE_REWARD_GRACE_MS - 1);
    expect(outcome).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(outcome).toBe('dismissed');
  });

  it('but a loaded ad still ages through a device sleep (the wall clock moved, the monotonic one did not): not offered, reloaded', async () => {
    const t = await up();
    expect(t.Ads.isRewardedReady()).toBe(true);
    vi.setSystemTime(Date.now() + AD_MAX_AGE_MS + 1000);
    expect(t.Ads.isRewardedReady()).toBe(false); // honest before any timer or lifecycle event
    await vi.advanceTimersByTimeAsync(0);
    await t.flush();
    expect(t.plugin.prepareRewardVideoAd).toHaveBeenCalledTimes(2);
    expect(t.plugin.prepareInterstitial).toHaveBeenCalledTimes(2);
    expect(t.Ads.isRewardedReady()).toBe(true);
  });

  it('the persisted interstitial cooldown stays on the wall clock (it must survive a restart)', async () => {
    const t = await up();
    const p = t.Ads.showRewarded('campaign_2x');
    t.emit(RW.SHOWED);
    t.emit(RW.REWARDED, {});
    t.emit(RW.DISMISSED);
    await p;
    const stamps = t.writes.filter(([k]) => k === COOLDOWN_KEY);
    const stamp = JSON.parse(stamps[stamps.length - 1][1]) as { lastShownMs: number };
    expect(stamp.lastShownMs).toBe(Date.now());
    expect(stamp.lastShownMs).toBeGreaterThan(1_700_000_000_000);
  });
});

describe('showInterstitialIfEligible: awaited before the scene moves on, never waits on a load', () => {
  const eligible = () => ({ flowProtected: false, now: Date.now() + 3_600_000 });

  it('shows the preloaded interstitial and resolves when it is dismissed; tracks interstitial_shown; reloads', async () => {
    const t = await up();
    const p = t.Ads.showInterstitialIfEligible(eligible());
    let done: string | undefined;
    void p.then((o) => { done = o; });
    expect(t.plugin.showInterstitial).toHaveBeenCalledTimes(1);
    expect(t.plugin.prepareInterstitial).toHaveBeenCalledTimes(1); // preloaded at init: no load at the moment of showing
    t.emit(IN.SHOWED);
    await t.flush();
    expect(done).toBeUndefined(); // still on screen: the caller must wait
    t.emit(IN.DISMISSED);
    await expect(p).resolves.toBe('shown');
    expect(t.tracked.map((e) => e.name)).toContain('interstitial_shown');
    await t.flush();
    expect(t.plugin.prepareInterstitial).toHaveBeenCalledTimes(2);
  });

  it('skips at once when no interstitial is preloaded: no show call, no wait, no load on demand', async () => {
    const t = await load({ load: { interstitial: 'hang' } });
    await t.Ads.init(ALLOWED);
    await t.flush();
    expect(await t.Ads.showInterstitialIfEligible(eligible())).toBe('skipped');
    expect(t.plugin.showInterstitial).not.toHaveBeenCalled();
    expect(t.plugin.prepareInterstitial).toHaveBeenCalledTimes(1); // only the preload
    expect(Date.now()).toBe(START.getTime());
  });

  it('a failed preload is skipped too, and the failed attempt is not an interstitial_shown', async () => {
    const t = await load({ load: { interstitial: 'fail' } });
    await t.Ads.init(ALLOWED);
    await t.flush();
    expect(await t.Ads.showInterstitialIfEligible(eligible())).toBe('skipped');
    expect(t.tracked.map((e) => e.name)).not.toContain('interstitial_shown');
  });

  it('the cooldown is stamped when the ad is actually shown, not when it was skipped', async () => {
    const skipped = await load({ load: { interstitial: 'hang' } });
    await skipped.Ads.init(ALLOWED);
    await skipped.flush();
    await skipped.Ads.showInterstitialIfEligible(eligible());
    expect(skipped.writes.filter(([k]) => k === COOLDOWN_KEY)).toEqual([]);

    const shown = await up();
    const now = Date.now() + 3_600_000;
    const p = shown.Ads.showInterstitialIfEligible({ flowProtected: false, now });
    shown.emit(IN.SHOWED);
    shown.emit(IN.DISMISSED);
    await p;
    expect(shown.writes.filter(([k]) => k === COOLDOWN_KEY)).toHaveLength(1);
    expect(JSON.parse(shown.writes.find(([k]) => k === COOLDOWN_KEY)![1])).toEqual({ lastShownMs: Date.now() });
  });

  it('a "no" from the gate (premium / grace / cap / flow) shows nothing and is tracked as suppressed', async () => {
    const t = await up({ decision: { show: false, reason: 'capped' } });
    expect(await t.Ads.showInterstitialIfEligible(eligible())).toBe('skipped');
    expect(t.plugin.showInterstitial).not.toHaveBeenCalled();
    expect(t.tracked.find((e) => e.name === 'interstitial_suppressed')?.params).toEqual({ reason: 'capped' });
  });

  it('counts a completed campaign level on every call, shown or not (session grace input)', async () => {
    const t = await up({ decision: { show: false, reason: 'grace' } });
    await t.Ads.showInterstitialIfEligible(eligible());
    await t.Ads.showInterstitialIfEligible(eligible());
    expect(t.decisions.map((d) => d.sessionLevels)).toEqual([0, 1]);
  });

  // Fix pass 1 (m4): a win taken with the 2x skips the interstitial for its advance (one full-screen ad per win), but it is still a
  // completed level: it counts toward the session grace like any other, without showing, tracking or asking anything.
  it('noteLevelAdvance() counts a level whose interstitial was skipped (the 2x), without showing or tracking anything', async () => {
    const t = await up({ decision: { show: false, reason: 'grace' } });
    t.Ads.noteLevelAdvance();
    t.Ads.noteLevelAdvance();
    expect(t.plugin.showInterstitial).not.toHaveBeenCalled();
    expect(t.decisions).toEqual([]); // the eligibility rules were not even consulted
    expect(t.tracked).toEqual([]);
    await t.Ads.showInterstitialIfEligible(eligible());
    expect(t.decisions.map((d) => d.sessionLevels)).toEqual([2]);
  });

  it('a level won with the 2x counts toward the grace like any other: a player who always takes the 2x still leaves the grace', async () => {
    const t = await up({ decision: { show: false, reason: 'grace' } });
    await t.Ads.showInterstitialIfEligible(eligible()); // level 1: normal (decided with 0 levels behind it)
    t.Ads.noteLevelAdvance(); // level 2: won with the 2x
    await t.Ads.showInterstitialIfEligible(eligible()); // level 3: normal, decided with 2 levels behind it
    expect(t.decisions.map((d) => d.sessionLevels)).toEqual([0, 2]);
    for (let i = 0; i < 3; i++) t.Ads.noteLevelAdvance(); // five 2x wins in a row
    await t.Ads.showInterstitialIfEligible(eligible());
    expect(t.decisions[t.decisions.length - 1].sessionLevels).toBe(6);
  });

  it('works on the web and before init (it only counts)', async () => {
    const web = await load({ native: false });
    expect(() => web.Ads.noteLevelAdvance()).not.toThrow();
    const cold = await load();
    expect(() => cold.Ads.noteLevelAdvance()).not.toThrow();
    expect(cold.plugin.prepareInterstitial).not.toHaveBeenCalled();
  });
});

describe('a rewarded view resets the interstitial clock (D-24)', () => {
  it('the next interstitial decision sees lastShownMs = the moment the rewarded ad was viewed, and the stamp is persisted', async () => {
    const t = await up({ decision: { show: false, reason: 'capped' } }); // the gate says no: only the clock it was given is of interest
    const p = t.Ads.showRewarded('campaign_2x');
    await vi.advanceTimersByTimeAsync(1_000);
    const viewedAt = Date.now();
    t.emit(RW.SHOWED);
    t.emit(RW.REWARDED, {});
    t.emit(RW.DISMISSED);
    await p;
    expect(t.writes.filter(([k]) => k === COOLDOWN_KEY).map(([, v]) => JSON.parse(v))).toEqual([{ lastShownMs: viewedAt }]);
    await vi.advanceTimersByTimeAsync(60_000);
    await t.Ads.showInterstitialIfEligible({ flowProtected: false, now: Date.now() });
    expect(t.decisions[0].lastShownMs).toBe(viewedAt);
  });

  it('an offer that never reached the screen does not reset it', async () => {
    const t = await up();
    const p = t.Ads.showRewarded('campaign_2x');
    t.emit(RW.FAILED_TO_SHOW, { code: 1, message: 'x' });
    await p;
    expect(t.writes.filter(([k]) => k === COOLDOWN_KEY)).toEqual([]);
  });
});

describe('Ads (web / non-native)', () => {
  it('DEV: keeps the stub so the flows stay testable. Ready, reward granted, shown and earned tracked, no plugin loaded', async () => {
    vi.stubEnv('DEV', true);
    const { Ads, plugin, adMobModuleLoads, tracked } = await load({ native: false });
    await Ads.init(ALLOWED);
    expect(Ads.isRewardedReady()).toBe(true);
    expect(await Ads.showRewarded('campaign_2x')).toBe('earned');
    expect(tracked.map((e) => e.name)).toEqual(['rewarded_shown', 'rewarded_earned']);
    expect(Ads.isShowing()).toBe(false);
    expect(await Ads.showInterstitialIfEligible({ flowProtected: false, now: Date.now() + 3_600_000 })).toBe('skipped');
    expectNoConsentOrInitCalls(plugin);
    expect(adMobModuleLoads()).toBe(0);
  });

  it('production web build: rewarded is unavailable (offers hidden, no free reward), and the interstitial is a no-op', async () => {
    vi.stubEnv('DEV', false);
    const { Ads, plugin, adMobModuleLoads, tracked, flow, audio } = await load({ native: false });
    await Ads.init(ALLOWED);
    expect(Ads.isRewardedReady()).toBe(false);
    expect(await Ads.showRewarded('campaign_2x')).toBe('unavailable');
    expect(await Ads.showRewarded('free_fragments')).toBe('unavailable');
    expect(tracked.map((e) => e.name)).toEqual([]); // no shown / earned for an ad that cannot exist
    expect(await Ads.showInterstitialIfEligible({ flowProtected: false, now: Date.now() + 3_600_000 })).toBe('skipped');
    expectNoConsentOrInitCalls(plugin);
    expect(plugin.prepareRewardVideoAd).not.toHaveBeenCalled();
    expect(plugin.showRewardVideoAd).not.toHaveBeenCalled();
    expect(adMobModuleLoads()).toBe(0);
    expect(flow.isExternalFlowActive()).toBe(false);
    expect(audio.suspend).not.toHaveBeenCalled();
  });
});
