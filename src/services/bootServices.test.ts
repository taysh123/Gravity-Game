import { describe, it, expect, afterEach } from 'vitest';
import { bootServices, openPrivacyChoices, type BootDeps } from './bootServices';
import { createConsent, type ConsentApi } from './Consent';
import { CONSENT_DENIED, type ConsentOutcome } from './consentState';
import { CONSENT } from '../config/consent.config';
import { isExternalFlowActive, setExternalFlowActive } from '../platform/externalFlow';
import type { AdMobConsentInfo } from './native/admob';

// bootServices is the one ordered boot function (D-10, data flow 5.1):
//   Consent.resolve -> Analytics.applyConsent -> Crash.enable (or disable) -> Ads.init (only when canRequestAds)
// These tests inject recording fakes and pin the order, the canRequestAds gate, that Crash.enable runs on every path while
// CRASH_REQUIRES_ANALYTICS_CONSENT is off (D-10.5 default) and follows analytics_storage when it is on, that Settings > Privacy
// choices never waits on the ad SDK and runs one flow at a time, and that nothing a native layer does can make bootServices throw.
// The default dependencies are the real seams (not touched here: the Consent / Ads / Analytics / Crash modules have their own tests).

const ALLOWED: ConsentOutcome = { canRequestAds: true, privacyOptionsRequired: true, analytics: 'granted', adStorage: 'granted', adUserData: 'granted', adPersonalization: 'granted' };
const DENIED_WITH_ROW: ConsentOutcome = { ...CONSENT_DENIED, privacyOptionsRequired: true };

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

interface Fakes {
  deps: BootDeps;
  log: string[];
  applied: ConsentOutcome[];
  inited: ConsentOutcome[];
  crashLogs: string[];
}

interface FakeOverrides {
  resolve?: () => Promise<ConsentOutcome>;
  applyConsent?: (o: ConsentOutcome) => Promise<void>;
  init?: (o: ConsentOutcome) => Promise<void>;
  showPrivacyOptions?: () => Promise<ConsentOutcome>;
  // CRASH_REQUIRES_ANALYTICS_CONSENT as injected through BootDeps (default: off, the shipped D-10.5 behaviour).
  crashRequiresAnalyticsConsent?: boolean;
}

function fakes(over: FakeOverrides = {}): Fakes {
  const log: string[] = [];
  const applied: ConsentOutcome[] = [];
  const inited: ConsentOutcome[] = [];
  const crashLogs: string[] = [];
  const deps: BootDeps = {
    consent: {
      resolve: async () => {
        log.push('consent.resolve:start');
        const o = await (over.resolve ? over.resolve() : Promise.resolve(ALLOWED));
        log.push('consent.resolve:end');
        return o;
      },
      showPrivacyOptions: async () => {
        log.push('consent.showPrivacyOptions');
        return over.showPrivacyOptions ? over.showPrivacyOptions() : ALLOWED;
      },
    },
    analytics: {
      applyConsent: async (o) => {
        log.push('analytics.applyConsent');
        applied.push(o);
        await over.applyConsent?.(o);
      },
    },
    ads: {
      init: async (o) => {
        log.push('ads.init');
        inited.push(o);
        await over.init?.(o);
      },
      revoke: () => {
        log.push('ads.revoke');
      },
    },
    crash: {
      enable: () => {
        log.push('crash.enable');
      },
      disable: () => {
        log.push('crash.disable');
      },
      log: (message) => {
        crashLogs.push(message);
      },
    },
    crashRequiresAnalyticsConsent: over.crashRequiresAnalyticsConsent ?? false,
  };
  return { deps, log, applied, inited, crashLogs };
}

afterEach(() => {
  setExternalFlowActive(false, CONSENT.EXTERNAL_FLOW_SOURCE);
});

describe('bootServices: order', () => {
  it('consent resolves before applyConsent, which comes before Ads.init', async () => {
    let finishConsent!: (o: ConsentOutcome) => void;
    const f = fakes({ resolve: () => new Promise<ConsentOutcome>((res) => (finishConsent = res)) });
    const done = bootServices(f.deps);
    await tick();
    // The consent answer is still pending: nothing downstream has started.
    expect(f.log).toEqual(['consent.resolve:start']);
    finishConsent(ALLOWED);
    await done;
    expect(f.log).toEqual(['consent.resolve:start', 'consent.resolve:end', 'analytics.applyConsent', 'crash.enable', 'ads.init']);
    expect(f.log.indexOf('consent.resolve:end')).toBeLessThan(f.log.indexOf('analytics.applyConsent'));
    expect(f.log.indexOf('analytics.applyConsent')).toBeLessThan(f.log.indexOf('ads.init'));
  });

  it('applyConsent finishes before Ads.init starts (a slow analytics write still comes first)', async () => {
    let finishApply!: () => void;
    const f = fakes({ applyConsent: () => new Promise<void>((res) => (finishApply = res)) });
    const done = bootServices(f.deps);
    await tick();
    expect(f.log).toContain('analytics.applyConsent');
    expect(f.log).not.toContain('ads.init');
    finishApply();
    await done;
    expect(f.log[f.log.length - 1]).toBe('ads.init');
  });

  it('applies the same outcome object to analytics and to Ads.init, and returns it', async () => {
    const f = fakes();
    const outcome = await bootServices(f.deps);
    expect(outcome).toBe(ALLOWED);
    expect(f.applied).toEqual([ALLOWED]);
    expect(f.inited).toEqual([ALLOWED]);
  });
});

describe('bootServices: the canRequestAds gate', () => {
  it('Ads.init is not called when canRequestAds is false; analytics is still applied (all denied) and Crash is still enabled', async () => {
    const f = fakes({ resolve: async () => DENIED_WITH_ROW });
    await bootServices(f.deps);
    expect(f.log).toEqual(['consent.resolve:start', 'consent.resolve:end', 'analytics.applyConsent', 'crash.enable']);
    expect(f.applied).toEqual([DENIED_WITH_ROW]);
    expect(f.inited).toEqual([]);
  });
});

describe('bootServices: Crash.enable runs on every path (D-10.5)', () => {
  it('after a consent that allows ads', async () => {
    const f = fakes();
    await bootServices(f.deps);
    expect(f.log.filter((e) => e === 'crash.enable')).toHaveLength(1);
  });

  it('after a consent that denies everything', async () => {
    const f = fakes({ resolve: async () => ({ ...CONSENT_DENIED }) });
    await bootServices(f.deps);
    expect(f.log.filter((e) => e === 'crash.enable')).toHaveLength(1);
  });

  it('when consent throws: the outcome degrades to all denied, no Ads.init, and it does not throw', async () => {
    const f = fakes({
      resolve: async () => {
        throw new Error('UMP exploded');
      },
    });
    await expect(bootServices(f.deps)).resolves.toEqual(CONSENT_DENIED);
    expect(f.applied).toEqual([CONSENT_DENIED]);
    expect(f.inited).toEqual([]);
    expect(f.log).toContain('crash.enable');
  });

  it('when applyConsent throws', async () => {
    const f = fakes({
      applyConsent: async () => {
        throw new Error('setConsent failed');
      },
    });
    await expect(bootServices(f.deps)).resolves.toBe(ALLOWED);
    expect(f.log).toContain('crash.enable');
    expect(f.log).toContain('ads.init'); // consent allows ads; an analytics failure does not take ads down
  });

  it('when Ads.init throws', async () => {
    const f = fakes({
      init: async () => {
        throw new Error('SDK failure');
      },
    });
    await expect(bootServices(f.deps)).resolves.toBe(ALLOWED);
    expect(f.log).toContain('crash.enable');
  });

  it('even if Ads.init never settles (Crash.enable does not wait for the ad SDK)', async () => {
    const f = fakes({ init: () => new Promise<void>(() => {}) });
    void bootServices(f.deps);
    await tick();
    await tick();
    expect(f.log).toContain('crash.enable');
  });

  it('when Crash.enable itself throws, bootServices still resolves', async () => {
    const f = fakes();
    f.deps.crash.enable = () => {
      throw new Error('crash seam');
    };
    await expect(bootServices(f.deps)).resolves.toBe(ALLOWED);
    expect(f.log).toContain('ads.init');
  });
});

describe('bootServices: CRASH_REQUIRES_ANALYTICS_CONSENT off (default, D-10.5): enabled in every outcome, never disabled', () => {
  const OUTCOMES: Array<[string, ConsentOutcome]> = [
    ['everything granted', ALLOWED],
    ['everything denied', { ...CONSENT_DENIED }],
    ['denied with the privacy row', DENIED_WITH_ROW],
    ['analytics denied but ads allowed (limited ads after "Do not consent")', { ...ALLOWED, analytics: 'denied', adStorage: 'denied', adUserData: 'denied', adPersonalization: 'denied' }],
  ];
  for (const [name, outcome] of OUTCOMES) {
    it(`${name}: Crash.enable once, Crash.disable never`, async () => {
      const f = fakes({ resolve: async () => outcome });
      await bootServices(f.deps);
      expect(f.log.filter((e) => e === 'crash.enable')).toHaveLength(1);
      expect(f.log).not.toContain('crash.disable');
    });
  }
});

describe('bootServices: CRASH_REQUIRES_ANALYTICS_CONSENT on: Crashlytics follows analytics_storage', () => {
  it('analytics granted: Crash.enable, no disable', async () => {
    const f = fakes({ crashRequiresAnalyticsConsent: true });
    await bootServices(f.deps);
    expect(f.log).toEqual(['consent.resolve:start', 'consent.resolve:end', 'analytics.applyConsent', 'crash.enable', 'ads.init']);
  });

  it('analytics denied (the player refused): Crash.disable, no enable; ads still follow canRequestAds', async () => {
    const refused: ConsentOutcome = { ...ALLOWED, analytics: 'denied', adStorage: 'denied', adUserData: 'denied', adPersonalization: 'denied' };
    const f = fakes({ crashRequiresAnalyticsConsent: true, resolve: async () => refused });
    await bootServices(f.deps);
    expect(f.log).toEqual(['consent.resolve:start', 'consent.resolve:end', 'analytics.applyConsent', 'crash.disable', 'ads.init']);
  });

  it('it is analytics_storage that decides, not ad storage: analytics denied + ad storage granted disables, the reverse enables', async () => {
    const f1 = fakes({ crashRequiresAnalyticsConsent: true, resolve: async () => ({ ...ALLOWED, analytics: 'denied' }) });
    await bootServices(f1.deps);
    expect(f1.log).toContain('crash.disable');
    expect(f1.log).not.toContain('crash.enable');
    const f2 = fakes({ crashRequiresAnalyticsConsent: true, resolve: async () => ({ ...ALLOWED, adStorage: 'denied', adUserData: 'denied', adPersonalization: 'denied' }) });
    await bootServices(f2.deps);
    expect(f2.log).toContain('crash.enable');
    expect(f2.log).not.toContain('crash.disable');
  });

  it('consent unresolved / thrown (all denied): Crash.disable, so a collection persisted by an earlier launch is switched off', async () => {
    const f = fakes({
      crashRequiresAnalyticsConsent: true,
      resolve: async () => {
        throw new Error('UMP exploded');
      },
    });
    await bootServices(f.deps);
    expect(f.log).toContain('crash.disable');
    expect(f.log).not.toContain('crash.enable');
  });

  it('runs after applyConsent and does not wait for the ad SDK (disable even if Ads.init never settles)', async () => {
    const f = fakes({ crashRequiresAnalyticsConsent: true, resolve: async () => ({ ...ALLOWED, analytics: 'denied' }), init: () => new Promise<void>(() => {}) });
    void bootServices(f.deps);
    await tick();
    await tick();
    expect(f.log.indexOf('analytics.applyConsent')).toBeLessThan(f.log.indexOf('crash.disable'));
    expect(f.log.indexOf('crash.disable')).toBeLessThan(f.log.indexOf('ads.init'));
  });

  it('Crash.disable itself throwing does not break boot', async () => {
    const f = fakes({ crashRequiresAnalyticsConsent: true, resolve: async () => ({ ...CONSENT_DENIED }) });
    f.deps.crash.disable = () => {
      throw new Error('crash seam');
    };
    await expect(bootServices(f.deps)).resolves.toEqual(CONSENT_DENIED);
  });
});

describe('bootServices with the real Consent seam over a fake UMP plugin', () => {
  const REQUIRED: AdMobConsentInfo = { status: 'REQUIRED', isConsentFormAvailable: true, canRequestAds: false, privacyOptionsRequirementStatus: 'REQUIRED' };

  function realConsent(api: ConsentApi) {
    return createConsent({
      native: true,
      loadAdMob: async () => ({ AdMob: api }),
      readTcf: async () => ({ gdprApplies: 1, purposeConsents: '11111111111' }),
      debug: { geography: undefined, testDeviceIds: [] },
      setExternalFlow: setExternalFlowActive,
    });
  }

  it('the consent form throws: boot degrades to all denied, the external-flow flag is cleared, Crash is enabled, nothing throws', async () => {
    const api: ConsentApi = {
      requestConsentInfo: async () => REQUIRED,
      showConsentForm: async () => {
        throw new Error('form failed to show');
      },
      showPrivacyOptionsForm: async () => {},
    };
    const f = fakes();
    f.deps.consent = realConsent(api);
    const outcome = await bootServices(f.deps);
    expect(outcome).toEqual(DENIED_WITH_ROW);
    expect(isExternalFlowActive()).toBe(false);
    expect(f.applied).toEqual([DENIED_WITH_ROW]);
    expect(f.inited).toEqual([]);
    expect(f.log).toContain('crash.enable');
  });

  it('the flag is raised while the consent form is up, and boot waits for the answer before applying anything', async () => {
    let answer!: (i: AdMobConsentInfo) => void;
    let flagWhileUp: boolean | null = null;
    const api: ConsentApi = {
      requestConsentInfo: async () => REQUIRED,
      showConsentForm: () => {
        flagWhileUp = isExternalFlowActive();
        return new Promise<AdMobConsentInfo>((res) => (answer = res));
      },
      showPrivacyOptionsForm: async () => {},
    };
    const f = fakes();
    f.deps.consent = realConsent(api);
    const done = bootServices(f.deps);
    await tick();
    await tick();
    expect(flagWhileUp).toBe(true);
    expect(f.applied).toEqual([]); // the player has not answered: nothing is applied, requested or logged yet
    answer({ status: 'OBTAINED', canRequestAds: true, privacyOptionsRequirementStatus: 'REQUIRED' });
    const outcome = await done;
    expect(isExternalFlowActive()).toBe(false);
    expect(outcome.canRequestAds).toBe(true);
    expect(f.log.indexOf('analytics.applyConsent')).toBeLessThan(f.log.indexOf('ads.init'));
  });
});

describe('openPrivacyChoices (Settings > Privacy choices)', () => {
  it('shows the options, applies the new outcome to analytics, and re-opens ads when they are allowed', async () => {
    const f = fakes({ showPrivacyOptions: async () => ALLOWED });
    await expect(openPrivacyChoices(f.deps)).resolves.toBe(ALLOWED);
    expect(f.log).toEqual(['consent.showPrivacyOptions', 'analytics.applyConsent', 'ads.init']);
  });

  it('a withdrawal denies analytics and closes the ad gate (no Ads.init)', async () => {
    const f = fakes({ showPrivacyOptions: async () => DENIED_WITH_ROW });
    await openPrivacyChoices(f.deps);
    expect(f.log).toEqual(['consent.showPrivacyOptions', 'analytics.applyConsent', 'ads.revoke']);
    expect(f.applied).toEqual([DENIED_WITH_ROW]);
  });

  it('never throws, even when every layer fails', async () => {
    const f = fakes({
      showPrivacyOptions: async () => {
        throw new Error('form');
      },
      applyConsent: async () => {
        throw new Error('analytics');
      },
    });
    await expect(openPrivacyChoices(f.deps)).resolves.toEqual({ ...CONSENT_DENIED });
    expect(f.log).toContain('ads.revoke');
  });
});

describe('openPrivacyChoices: Crashlytics follows the withdrawal only when CRASH_REQUIRES_ANALYTICS_CONSENT is on', () => {
  const WITHDRAWN: ConsentOutcome = { ...ALLOWED, analytics: 'denied', adStorage: 'denied', adUserData: 'denied', adPersonalization: 'denied' };

  it('off (default): a withdrawal makes no Crashlytics call at all (D-10.5 behaviour unchanged)', async () => {
    const f = fakes({ showPrivacyOptions: async () => WITHDRAWN });
    await openPrivacyChoices(f.deps);
    expect(f.log.filter((e) => e.startsWith('crash.'))).toEqual([]);
  });

  it('on: a withdrawal calls Crash.disable after applyConsent and before the ad gate; no enable', async () => {
    const f = fakes({ crashRequiresAnalyticsConsent: true, showPrivacyOptions: async () => WITHDRAWN });
    await openPrivacyChoices(f.deps);
    expect(f.log).toEqual(['consent.showPrivacyOptions', 'analytics.applyConsent', 'crash.disable', 'ads.init']);
  });

  it('on: a full denial (no ads either) calls Crash.disable and closes the ad gate', async () => {
    const f = fakes({ crashRequiresAnalyticsConsent: true, showPrivacyOptions: async () => DENIED_WITH_ROW });
    await openPrivacyChoices(f.deps);
    expect(f.log).toEqual(['consent.showPrivacyOptions', 'analytics.applyConsent', 'crash.disable', 'ads.revoke']);
  });

  it('on: a new grant calls Crash.enable, no disable', async () => {
    const f = fakes({ crashRequiresAnalyticsConsent: true, showPrivacyOptions: async () => ALLOWED });
    await openPrivacyChoices(f.deps);
    expect(f.log).toEqual(['consent.showPrivacyOptions', 'analytics.applyConsent', 'crash.enable', 'ads.init']);
  });

  it('on: Crash.disable throwing does not break the flow', async () => {
    const f = fakes({ crashRequiresAnalyticsConsent: true, showPrivacyOptions: async () => WITHDRAWN });
    f.deps.crash.disable = () => {
      throw new Error('crash seam');
    };
    await expect(openPrivacyChoices(f.deps)).resolves.toBe(WITHDRAWN);
    expect(f.log).toContain('ads.init');
  });
});

describe('openPrivacyChoices does not wait on the ad SDK', () => {
  it('resolves with the outcome even when Ads.init never settles (a hung AdMob.initialize cannot hold the Settings gate)', async () => {
    const f = fakes({ init: () => new Promise<void>(() => {}) });
    const result = await Promise.race([openPrivacyChoices(f.deps), new Promise<string>((r) => setTimeout(() => r('hung'), 50))]);
    expect(result).toBe(ALLOWED);
    expect(f.log).toContain('ads.init'); // it was started, just not awaited
  });

  it('an Ads.init rejection is caught and left as a Crash breadcrumb, never thrown', async () => {
    const f = fakes({
      init: async () => {
        throw new Error('SDK failure');
      },
    });
    await expect(openPrivacyChoices(f.deps)).resolves.toBe(ALLOWED);
    await tick();
    expect(f.crashLogs).toHaveLength(1);
    expect(f.crashLogs[0]).toMatch(/ads/i);
    expect(f.crashLogs[0]).not.toContain('SDK failure'); // the breadcrumb names the step, not the error text
  });

  it('an Ads.init that throws synchronously is handled the same way', async () => {
    const f = fakes();
    f.deps.ads.init = () => {
      throw new Error('sync failure');
    };
    await expect(openPrivacyChoices(f.deps)).resolves.toBe(ALLOWED);
    await tick();
    expect(f.crashLogs).toHaveLength(1);
  });

  it('a withdrawal still closes the gate synchronously (revoke is not deferred)', async () => {
    const f = fakes({ showPrivacyOptions: async () => DENIED_WITH_ROW });
    await openPrivacyChoices(f.deps);
    expect(f.log).toContain('ads.revoke');
    expect(f.crashLogs).toEqual([]);
  });
});

describe('openPrivacyChoices is single-flight', () => {
  it('a second call while the first is running returns the same promise and runs nothing twice', async () => {
    let finish!: (o: ConsentOutcome) => void;
    const f = fakes({ showPrivacyOptions: () => new Promise<ConsentOutcome>((res) => (finish = res)) });
    const first = openPrivacyChoices(f.deps);
    const second = openPrivacyChoices(f.deps);
    expect(second).toBe(first);
    await tick();
    expect(f.log.filter((e) => e === 'consent.showPrivacyOptions')).toHaveLength(1);
    finish(ALLOWED);
    await expect(first).resolves.toBe(ALLOWED);
    expect(f.log.filter((e) => e === 'analytics.applyConsent')).toHaveLength(1);
    expect(f.applied).toEqual([ALLOWED]);
  });

  it('a call from a re-opened Settings (a different deps object) also joins the running flow', async () => {
    let finish!: (o: ConsentOutcome) => void;
    const a = fakes({ showPrivacyOptions: () => new Promise<ConsentOutcome>((res) => (finish = res)) });
    const b = fakes();
    const first = openPrivacyChoices(a.deps);
    const second = openPrivacyChoices(b.deps);
    expect(second).toBe(first);
    finish(ALLOWED);
    await first;
    expect(b.log).toEqual([]);
  });

  it('once the flow has finished the next call runs a fresh one (the gate is not stuck)', async () => {
    const f = fakes();
    await openPrivacyChoices(f.deps);
    await openPrivacyChoices(f.deps);
    expect(f.log.filter((e) => e === 'consent.showPrivacyOptions')).toHaveLength(2);
  });

  it('a flow that failed everywhere also releases the gate', async () => {
    const f = fakes({
      showPrivacyOptions: async () => {
        throw new Error('form');
      },
    });
    await openPrivacyChoices(f.deps);
    await openPrivacyChoices(f.deps);
    expect(f.log.filter((e) => e === 'consent.showPrivacyOptions')).toHaveLength(2);
  });
});
