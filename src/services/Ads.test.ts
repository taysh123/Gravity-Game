import { describe, it, expect, vi, afterEach } from 'vitest';
import { CONSENT_DENIED, type ConsentOutcome } from './consentState';

// Ads is consent-gated (D-10, P00-T18): the ad SDK is initialised only by Ads.init(outcome) from bootServices, only when UMP says
// canRequestAds, with the A-07 content rating and no child-directed / under-age tags (D-25). Any ad request before a successful
// init is refused as not ready and NEVER triggers UMP or initialize. These tests run the native path against a fake plugin.

const ALLOWED: ConsentOutcome = { canRequestAds: true, privacyOptionsRequired: false, analytics: 'granted', adStorage: 'granted', adUserData: 'granted', adPersonalization: 'granted' };

interface LoadOptions {
  native?: boolean;
  initialize?: () => Promise<void>;
  debug?: { geography: number | undefined; testDeviceIds: string[] };
}

async function load(opts: LoadOptions = {}) {
  const native = opts.native ?? true;
  vi.resetModules();
  const plugin = {
    initialize: vi.fn(async (_options?: Record<string, unknown>): Promise<void> => (opts.initialize ? opts.initialize() : undefined)),
    requestConsentInfo: vi.fn(async () => ({ status: 'NOT_REQUIRED', canRequestAds: true })),
    showConsentForm: vi.fn(async () => ({ status: 'OBTAINED', canRequestAds: true })),
    showPrivacyOptionsForm: vi.fn(async () => {}),
    prepareRewardVideoAd: vi.fn(async () => ({})),
    showRewardVideoAd: vi.fn(async () => ({ type: 'coin', amount: 1 })),
    prepareInterstitial: vi.fn(async () => ({})),
    showInterstitial: vi.fn(async () => {}),
  };
  const tracked: string[] = [];
  let adMobModuleLoads = 0;
  vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native } }));
  vi.doMock('./native/admob', () => {
    adMobModuleLoads += 1;
    return { AdMob: plugin };
  });
  vi.doMock('./IAP', () => ({ IAP: { isPremium: () => false } }));
  vi.doMock('./Analytics', () => ({ Analytics: { track: (e: { name: string }) => tracked.push(e.name) } }));
  vi.doMock('../platform/saves', () => ({ Saves: { onRestore: () => {}, write: () => {} } }));
  vi.doMock('./interstitial', () => ({ interstitialDecision: () => ({ show: true }) }));
  if (opts.debug) {
    const debug = opts.debug;
    vi.doMock('../config/consent.config', async (orig) => ({ ...(await orig<Record<string, unknown>>()), UMP_DEBUG: debug }));
  }
  const { Ads } = await import('./Ads');
  return { Ads, plugin, tracked, adMobModuleLoads: () => adMobModuleLoads };
}

function expectNoConsentOrInitCalls(plugin: Awaited<ReturnType<typeof load>>['plugin']): void {
  expect(plugin.initialize).not.toHaveBeenCalled();
  expect(plugin.requestConsentInfo).not.toHaveBeenCalled();
  expect(plugin.showConsentForm).not.toHaveBeenCalled();
  expect(plugin.showPrivacyOptionsForm).not.toHaveBeenCalled();
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const m of ['@capacitor/core', './native/admob', './IAP', './Analytics', '../platform/saves', './interstitial', '../config/consent.config']) vi.doUnmock(m);
});

describe('Ads before init (native): refused, and it never starts consent or the SDK', () => {
  it('a rewarded request returns not-earned without calling initialize or any consent API, and loads no plugin', async () => {
    const { Ads, plugin, tracked, adMobModuleLoads } = await load();
    expect(await Ads.showRewarded('campaign_2x')).toBe(false);
    expectNoConsentOrInitCalls(plugin);
    expect(plugin.prepareRewardVideoAd).not.toHaveBeenCalled();
    expect(plugin.showRewardVideoAd).not.toHaveBeenCalled();
    expect(adMobModuleLoads()).toBe(0);
    expect(tracked).toEqual([]); // no rewarded_shown event for an ad that was never requested
  });

  it('an interstitial opportunity does not request or show anything', async () => {
    const { Ads, plugin, adMobModuleLoads } = await load();
    await Ads.maybeInterstitial({ flowProtected: false, now: Date.now() + 3_600_000 });
    expectNoConsentOrInitCalls(plugin);
    expect(plugin.prepareInterstitial).not.toHaveBeenCalled();
    expect(plugin.showInterstitial).not.toHaveBeenCalled();
    expect(adMobModuleLoads()).toBe(0);
  });

  it('isRewardedReady() is false until init succeeds', async () => {
    const { Ads } = await load();
    expect(Ads.isRewardedReady()).toBe(false);
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

  it('an outcome that does not allow ads never initialises', async () => {
    const { Ads, plugin, adMobModuleLoads } = await load();
    await Ads.init({ ...CONSENT_DENIED });
    expect(plugin.initialize).not.toHaveBeenCalled();
    expect(adMobModuleLoads()).toBe(0);
    expect(await Ads.showRewarded('endless_revive')).toBe(false);
    expect(Ads.isRewardedReady()).toBe(false);
  });

  it('is idempotent: concurrent and repeated calls initialise the SDK once', async () => {
    const { Ads, plugin } = await load();
    await Promise.all([Ads.init(ALLOWED), Ads.init(ALLOWED)]);
    await Ads.init(ALLOWED);
    expect(plugin.initialize).toHaveBeenCalledTimes(1);
  });

  it('a failing initialize leaves ads not ready and does not throw; a later init may try again', async () => {
    let fail = true;
    const { Ads, plugin } = await load({
      initialize: async () => {
        if (fail) throw new Error('SDK failure');
      },
    });
    await expect(Ads.init(ALLOWED)).resolves.toBeUndefined();
    expect(Ads.isRewardedReady()).toBe(false);
    expect(await Ads.showRewarded('campaign_2x')).toBe(false);
    expect(plugin.prepareRewardVideoAd).not.toHaveBeenCalled();
    fail = false;
    await Ads.init(ALLOWED);
    expect(plugin.initialize).toHaveBeenCalledTimes(2);
    expect(Ads.isRewardedReady()).toBe(true);
  });
});

describe('Ads after a successful init', () => {
  it('a rewarded request prepares and shows, and reports earned', async () => {
    const { Ads, plugin, tracked } = await load();
    await Ads.init(ALLOWED);
    expect(Ads.isRewardedReady()).toBe(true);
    expect(await Ads.showRewarded('campaign_2x')).toBe(true);
    expect(plugin.prepareRewardVideoAd).toHaveBeenCalledTimes(1);
    expect(plugin.showRewardVideoAd).toHaveBeenCalledTimes(1);
    expect(tracked).toContain('rewarded_shown');
    expect(tracked).toContain('rewarded_earned');
    expect(plugin.requestConsentInfo).not.toHaveBeenCalled();
  });

  it('an interstitial opportunity shows', async () => {
    const { Ads, plugin } = await load();
    await Ads.init(ALLOWED);
    await Ads.maybeInterstitial({ flowProtected: false, now: Date.now() + 3_600_000 });
    expect(plugin.prepareInterstitial).toHaveBeenCalledTimes(1);
    expect(plugin.showInterstitial).toHaveBeenCalledTimes(1);
  });

  it('revoke() (the player withdrew consent in Privacy choices) closes the gate again without re-initialising', async () => {
    const { Ads, plugin } = await load();
    await Ads.init(ALLOWED);
    Ads.revoke();
    expect(Ads.isRewardedReady()).toBe(false);
    expect(await Ads.showRewarded('endless_2x')).toBe(false);
    expect(plugin.prepareRewardVideoAd).not.toHaveBeenCalled();
    await Ads.init(ALLOWED); // consent given again: the gate reopens, the SDK is not initialised twice
    expect(plugin.initialize).toHaveBeenCalledTimes(1);
    expect(Ads.isRewardedReady()).toBe(true);
  });
});

describe('Ads (web / non-native)', () => {
  it('keeps the dev stub: no plugin is ever loaded, init is a no-op, the reward is granted so the flows stay testable', async () => {
    const { Ads, plugin, adMobModuleLoads } = await load({ native: false });
    await Ads.init(ALLOWED);
    expect(Ads.isRewardedReady()).toBe(true);
    expect(await Ads.showRewarded('campaign_2x')).toBe(true);
    await Ads.maybeInterstitial({ flowProtected: false, now: Date.now() + 3_600_000 });
    expectNoConsentOrInitCalls(plugin);
    expect(adMobModuleLoads()).toBe(0);
  });
});
