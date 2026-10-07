import { describe, it, expect, afterEach } from 'vitest';
import { bootServices, openPrivacyChoices, type BootDeps } from './bootServices';
import { createConsent, type ConsentApi } from './Consent';
import { CONSENT_DENIED, type ConsentOutcome } from './consentState';
import { CONSENT } from '../config/consent.config';
import { isExternalFlowActive, setExternalFlowActive } from '../platform/externalFlow';
import type { AdMobConsentInfo } from './native/admob';

// bootServices is the one ordered boot function (D-10, data flow 5.1):
//   Consent.resolve -> Analytics.applyConsent -> Crash.enable -> Ads.init (only when canRequestAds)
// These tests inject recording fakes and pin the order, the canRequestAds gate, that Crash.enable runs on every path, and that
// nothing a native layer does can make bootServices throw. The default dependencies are the real seams (not touched here: the
// Consent / Ads / Analytics / Crash modules have their own tests).

const ALLOWED: ConsentOutcome = { canRequestAds: true, privacyOptionsRequired: true, analytics: 'granted', adStorage: 'granted', adUserData: 'granted', adPersonalization: 'granted' };
const DENIED_WITH_ROW: ConsentOutcome = { ...CONSENT_DENIED, privacyOptionsRequired: true };

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

interface Fakes {
  deps: BootDeps;
  log: string[];
  applied: ConsentOutcome[];
  inited: ConsentOutcome[];
}

function fakes(over: { resolve?: () => Promise<ConsentOutcome>; applyConsent?: (o: ConsentOutcome) => Promise<void>; init?: (o: ConsentOutcome) => Promise<void>; showPrivacyOptions?: () => Promise<ConsentOutcome> } = {}): Fakes {
  const log: string[] = [];
  const applied: ConsentOutcome[] = [];
  const inited: ConsentOutcome[] = [];
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
    },
  };
  return { deps, log, applied, inited };
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
