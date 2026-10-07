import { describe, it, expect, vi, afterEach, type Mock } from 'vitest';
import { createConsent, type ConsentApi, type ConsentDeps } from './Consent';
import { CONSENT_DENIED, type TcfSignals } from './consentState';
import { CONSENT } from '../config/consent.config';
import { isExternalFlowActive, setExternalFlowActive } from '../platform/externalFlow';
import type { AdMobConsentInfo, AdMobConsentRequestOptions } from './native/admob';

// Consent talks to UMP through the AdMob plugin. These tests inject a fake plugin and the real external-flow flag, and pin: the
// order (request, then the form only when REQUIRED), that the debug values pass through and nothing else does (no age tags, D-25),
// that consent is never cached, that every failure degrades to all-denied without throwing, and that the "native sheet is up"
// flag is raised around both forms and always cleared.

const NOT_REQUIRED: AdMobConsentInfo = { status: 'NOT_REQUIRED', isConsentFormAvailable: false, canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' };
const REQUIRED: AdMobConsentInfo = { status: 'REQUIRED', isConsentFormAvailable: true, canRequestAds: false, privacyOptionsRequirementStatus: 'REQUIRED' };
const OBTAINED_YES: AdMobConsentInfo = { status: 'OBTAINED', canRequestAds: true, privacyOptionsRequirementStatus: 'REQUIRED' };
const OBTAINED_NO: AdMobConsentInfo = { status: 'OBTAINED', canRequestAds: false, privacyOptionsRequirementStatus: 'REQUIRED' };

interface FakeApi extends ConsentApi {
  requestConsentInfo: Mock<[options?: AdMobConsentRequestOptions], Promise<AdMobConsentInfo>>;
  showConsentForm: Mock<[], Promise<AdMobConsentInfo>>;
  showPrivacyOptionsForm: Mock<[], Promise<void>>;
}

function fakeApi(over: Partial<FakeApi> = {}): FakeApi {
  return {
    requestConsentInfo: vi.fn(async () => NOT_REQUIRED),
    showConsentForm: vi.fn(async () => OBTAINED_YES),
    showPrivacyOptionsForm: vi.fn(async () => undefined),
    ...over,
  } as FakeApi;
}

const ACCEPTED: TcfSignals = { gdprApplies: 1, purposeConsents: '11111111111' };
const DECLINED: TcfSignals = { gdprApplies: 1, purposeConsents: '00000000000' };

function make(api: ConsentApi, over: Partial<ConsentDeps> = {}) {
  const loadAdMob = vi.fn(async () => ({ AdMob: api }));
  const readTcf = vi.fn(async (): Promise<TcfSignals | null> => ACCEPTED);
  const consent = createConsent({
    native: true,
    loadAdMob,
    readTcf,
    debug: { geography: undefined, testDeviceIds: [] },
    setExternalFlow: setExternalFlowActive,
    ...over,
  });
  return { consent, loadAdMob, readTcf };
}

afterEach(() => {
  setExternalFlowActive(false, CONSENT.EXTERNAL_FLOW_SOURCE);
});

describe('Consent.resolve', () => {
  it('web (no native layer): all denied, the plugin is never loaded, no flag raised', async () => {
    const api = fakeApi();
    const { consent, loadAdMob } = make(api, { native: false });
    expect(await consent.resolve()).toEqual(CONSENT_DENIED);
    expect(loadAdMob).not.toHaveBeenCalled();
    expect(api.requestConsentInfo).not.toHaveBeenCalled();
    expect(isExternalFlowActive()).toBe(false);
  });

  it('NOT_REQUIRED: one request, no form, everything granted; current() holds the outcome', async () => {
    const api = fakeApi();
    const { consent } = make(api);
    expect(consent.current()).toBeNull();
    const outcome = await consent.resolve();
    expect(api.requestConsentInfo).toHaveBeenCalledTimes(1);
    expect(api.showConsentForm).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({ canRequestAds: true, privacyOptionsRequired: false, analytics: 'granted', adStorage: 'granted', adUserData: 'granted', adPersonalization: 'granted' });
    expect(consent.current()).toEqual(outcome);
  });

  it('OBTAINED already: no form again, the stored answer is used', async () => {
    const api = fakeApi({ requestConsentInfo: vi.fn(async () => OBTAINED_YES) });
    const { consent } = make(api);
    const outcome = await consent.resolve();
    expect(api.showConsentForm).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({ canRequestAds: true, privacyOptionsRequired: true, analytics: 'granted' });
  });

  it('REQUIRED: the form is shown after the request, with the external-flow flag up for exactly that call', async () => {
    const order: string[] = [];
    let flagDuringForm: boolean | null = null;
    const api = fakeApi({
      requestConsentInfo: vi.fn(async () => {
        order.push('request');
        return REQUIRED;
      }),
      showConsentForm: vi.fn(async () => {
        order.push('form');
        flagDuringForm = isExternalFlowActive();
        return OBTAINED_YES;
      }),
    });
    const { consent } = make(api);
    expect(isExternalFlowActive()).toBe(false);
    const outcome = await consent.resolve();
    expect(order).toEqual(['request', 'form']);
    expect(flagDuringForm).toBe(true);
    expect(isExternalFlowActive()).toBe(false);
    expect(outcome).toMatchObject({ canRequestAds: true, privacyOptionsRequired: true, analytics: 'granted' });
  });

  it('REQUIRED and the player refuses everything: all denied, no ads, the privacy row is offered', async () => {
    const api = fakeApi({
      requestConsentInfo: vi.fn(async () => REQUIRED),
      showConsentForm: vi.fn(async () => OBTAINED_NO),
    });
    const { consent } = make(api);
    expect(await consent.resolve()).toEqual({ ...CONSENT_DENIED, privacyOptionsRequired: true });
  });

  it('the form throws: all denied, privacy row kept (retry from Settings), the flag is still cleared', async () => {
    const api = fakeApi({
      requestConsentInfo: vi.fn(async () => REQUIRED),
      showConsentForm: vi.fn(async (): Promise<AdMobConsentInfo> => {
        throw new Error('no form configured');
      }),
    });
    const { consent } = make(api);
    await expect(consent.resolve()).resolves.toEqual({ ...CONSENT_DENIED, privacyOptionsRequired: true });
    expect(isExternalFlowActive()).toBe(false);
  });

  it('the form is pending for a while, then rejects: the flag is up meanwhile and cleared after', async () => {
    let reject!: (e: Error) => void;
    const api = fakeApi({
      requestConsentInfo: vi.fn(async () => REQUIRED),
      showConsentForm: vi.fn(() => new Promise<AdMobConsentInfo>((_res, rej) => (reject = rej))),
    });
    const { consent } = make(api);
    const pending = consent.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(isExternalFlowActive()).toBe(true);
    reject(new Error('dismissed by the system'));
    await pending;
    expect(isExternalFlowActive()).toBe(false);
  });

  it('requestConsentInfo throws: all denied, no form, no throw', async () => {
    const api = fakeApi({
      requestConsentInfo: vi.fn(async (): Promise<AdMobConsentInfo> => {
        throw new Error('network');
      }),
    });
    const { consent } = make(api);
    await expect(consent.resolve()).resolves.toEqual(CONSENT_DENIED);
    expect(api.showConsentForm).not.toHaveBeenCalled();
    expect(isExternalFlowActive()).toBe(false);
  });

  it('the plugin cannot be loaded: all denied, no throw', async () => {
    const consent = createConsent({
      native: true,
      loadAdMob: async () => {
        throw new Error('plugin missing');
      },
      readTcf: async () => ACCEPTED,
      debug: { geography: undefined, testDeviceIds: [] },
      setExternalFlow: setExternalFlowActive,
    });
    await expect(consent.resolve()).resolves.toEqual(CONSENT_DENIED);
  });

  it('a normal build sends no debug keys and never an age tag (D-25)', async () => {
    const api = fakeApi();
    const { consent } = make(api);
    await consent.resolve();
    expect(api.requestConsentInfo).toHaveBeenCalledWith({});
    const sent = api.requestConsentInfo.mock.calls[0][0] as Record<string, unknown>;
    expect(sent).not.toHaveProperty('tagForUnderAgeOfConsent');
    expect(sent).not.toHaveProperty('debugGeography');
  });

  it('a debug build passes the geography and the test device ids through, and nothing else', async () => {
    const api = fakeApi();
    const { consent } = make(api, { debug: { geography: 1, testDeviceIds: ['AAA', 'BBB'] } });
    await consent.resolve();
    expect(api.requestConsentInfo).toHaveBeenCalledWith({ debugGeography: 1, testDeviceIdentifiers: ['AAA', 'BBB'] });
  });

  it('is never cached by the app: every call re-requests the consent info', async () => {
    const api = fakeApi();
    const { consent } = make(api);
    await consent.resolve();
    await consent.resolve();
    expect(api.requestConsentInfo).toHaveBeenCalledTimes(2);
  });
});

describe('Consent.resolve reads what the player really chose (TCF purposes)', () => {
  // Found on an Android 16 emulator: after "Do not consent" UMP answers OBTAINED + canRequestAds true, the same as after "Consent".
  // Only IABTCF_PurposeConsents (read natively) tells them apart, so the four Firebase types must follow it.
  it('NOT_REQUIRED: there is nothing to read, so the native read is never made', async () => {
    const { consent, readTcf } = make(fakeApi());
    await consent.resolve();
    expect(readTcf).not.toHaveBeenCalled();
  });

  it('the player accepted in the form: everything granted', async () => {
    const api = fakeApi({ requestConsentInfo: vi.fn(async () => REQUIRED), showConsentForm: vi.fn(async () => OBTAINED_YES) });
    const { consent, readTcf } = make(api);
    const outcome = await consent.resolve();
    expect(readTcf).toHaveBeenCalledTimes(1);
    expect(outcome).toMatchObject({ canRequestAds: true, analytics: 'granted', adStorage: 'granted', adUserData: 'granted', adPersonalization: 'granted' });
  });

  it('the player tapped "Do not consent": UMP still allows (limited) ads, but no Firebase type is granted', async () => {
    const api = fakeApi({ requestConsentInfo: vi.fn(async () => REQUIRED), showConsentForm: vi.fn(async () => OBTAINED_YES) }); // OBTAINED + canRequestAds
    const { consent } = make(api, { readTcf: async () => DECLINED });
    const outcome = await consent.resolve();
    expect(outcome).toEqual({ canRequestAds: true, privacyOptionsRequired: true, analytics: 'denied', adStorage: 'denied', adUserData: 'denied', adPersonalization: 'denied' });
  });

  it('an earlier answer (OBTAINED at launch, no form this time) is read the same way', async () => {
    const api = fakeApi({ requestConsentInfo: vi.fn(async () => OBTAINED_YES) });
    const readTcf = vi.fn(async (): Promise<TcfSignals | null> => DECLINED);
    const { consent } = make(api, { readTcf });
    const outcome = await consent.resolve();
    expect(readTcf).toHaveBeenCalledTimes(1);
    expect(outcome).toMatchObject({ canRequestAds: true, analytics: 'denied', adPersonalization: 'denied' });
  });

  it('the native read fails (null or throws): nothing can be verified, so no Firebase type is granted', async () => {
    const api = fakeApi({ requestConsentInfo: vi.fn(async () => OBTAINED_YES) });
    for (const readTcf of [async () => null, async (): Promise<TcfSignals | null> => { throw new Error('plugin missing'); }]) {
      const { consent } = make(api, { readTcf });
      await expect(consent.resolve()).resolves.toMatchObject({ canRequestAds: true, analytics: 'denied', adStorage: 'denied', adUserData: 'denied', adPersonalization: 'denied' });
    }
  });

  it('the privacy options form re-reads the purposes, so a withdrawal is applied', async () => {
    const api = fakeApi({ requestConsentInfo: vi.fn(async () => OBTAINED_YES) });
    let tcf: TcfSignals = ACCEPTED;
    const { consent } = make(api, { readTcf: async () => tcf });
    expect((await consent.resolve()).analytics).toBe('granted');
    tcf = DECLINED; // the player withdrew in the privacy options form; UMP still answers OBTAINED + canRequestAds
    const after = await consent.showPrivacyOptions();
    expect(after).toMatchObject({ canRequestAds: true, analytics: 'denied', adStorage: 'denied', adUserData: 'denied', adPersonalization: 'denied' });
  });
});

describe('Consent.showPrivacyOptions', () => {
  it('shows the options form with the flag up, then re-requests the info and returns the new outcome', async () => {
    const order: string[] = [];
    let flagDuringForm: boolean | null = null;
    let call = 0;
    const api = fakeApi({
      requestConsentInfo: vi.fn(async () => {
        order.push('request');
        call += 1;
        return call === 1 ? OBTAINED_YES : OBTAINED_NO;
      }),
      showPrivacyOptionsForm: vi.fn(async () => {
        order.push('options');
        flagDuringForm = isExternalFlowActive();
      }),
    });
    const { consent } = make(api);
    await consent.resolve();
    const after = await consent.showPrivacyOptions();
    expect(order).toEqual(['request', 'options', 'request']);
    expect(flagDuringForm).toBe(true);
    expect(isExternalFlowActive()).toBe(false);
    // The player withdrew: the new outcome is all denied and is what current() reports now.
    expect(after).toEqual({ ...CONSENT_DENIED, privacyOptionsRequired: true });
    expect(consent.current()).toEqual(after);
    expect(api.showConsentForm).not.toHaveBeenCalled(); // never a second consent form right after the options form
  });

  it('the options form throws: the flag is cleared and the info is still re-requested', async () => {
    const api = fakeApi({
      requestConsentInfo: vi.fn(async () => OBTAINED_YES),
      showPrivacyOptionsForm: vi.fn(async (): Promise<void> => {
        throw new Error('Error when show privacy form');
      }),
    });
    const { consent } = make(api);
    const outcome = await consent.showPrivacyOptions();
    expect(isExternalFlowActive()).toBe(false);
    expect(api.requestConsentInfo).toHaveBeenCalledTimes(1);
    expect(outcome.canRequestAds).toBe(true);
  });

  it('the re-request fails after the form: all denied (a withdrawal is never missed) but the privacy row stays', async () => {
    let call = 0;
    const api = fakeApi({
      requestConsentInfo: vi.fn(async () => {
        call += 1;
        if (call === 1) return OBTAINED_YES;
        throw new Error('offline');
      }),
    });
    const { consent } = make(api);
    await consent.resolve();
    const after = await consent.showPrivacyOptions();
    expect(after).toEqual({ ...CONSENT_DENIED, privacyOptionsRequired: true });
  });

  it('web: nothing is loaded and the answer is all denied', async () => {
    const api = fakeApi();
    const { consent, loadAdMob } = make(api, { native: false });
    expect(await consent.showPrivacyOptions()).toEqual(CONSENT_DENIED);
    expect(loadAdMob).not.toHaveBeenCalled();
  });
});
