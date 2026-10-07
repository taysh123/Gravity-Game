import { describe, it, expect } from 'vitest';
import { CONSENT_DENIED, consentFromPurposes, outcomeFromUmp, type ConsentOutcome, type TcfSignals } from './consentState';

// The pure UMP -> ConsentOutcome mapping (D-10, P00-foundation.md Step 4, TECHNICAL-ARCHITECTURE 4.3). Everything that is not a clear
// "not required" or a verified per-purpose answer degrades to ALL DENIED for the four Firebase types: nothing is requested or logged
// on a guess.
//
// WHY OBTAINED NEEDS THE TCF PURPOSES (found on an Android 16 emulator, P00-T18): after the player taps "Do not consent" in an EEA
// form UMP answers { status: OBTAINED, canRequestAds: true } (Google still serves limited ads on legitimate interest), exactly like
// after "Consent", while IABTCF_PurposeConsents is "00000000000". So canRequestAds says nothing about analytics consent; the player's
// real answer is the TCF purpose string (Consent.ts reads it through the ConsentSignals plugin).

const ALL_GRANTED: ConsentOutcome = {
  canRequestAds: true,
  privacyOptionsRequired: false,
  analytics: 'granted',
  adStorage: 'granted',
  adUserData: 'granted',
  adPersonalization: 'granted',
};

const EEA_ACCEPTED: TcfSignals = { gdprApplies: 1, purposeConsents: '11111111111' };
const EEA_DECLINED: TcfSignals = { gdprApplies: 1, purposeConsents: '00000000000' };

describe('outcomeFromUmp: NOT_REQUIRED', () => {
  it('outside the regulated regions: all four Firebase types granted, ads allowed', () => {
    expect(outcomeFromUmp({ status: 'NOT_REQUIRED', canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' })).toEqual(ALL_GRANTED);
  });

  it('needs no TCF signals (none exist), and ignores them if they are there', () => {
    const info = { status: 'NOT_REQUIRED', canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' };
    expect(outcomeFromUmp(info, null)).toEqual(ALL_GRANTED);
    expect(outcomeFromUmp(info, EEA_DECLINED)).toEqual(ALL_GRANTED);
  });

  it('a regulated US state: NOT_REQUIRED but the privacy options entry point is required', () => {
    expect(outcomeFromUmp({ status: 'NOT_REQUIRED', canRequestAds: true, privacyOptionsRequirementStatus: 'REQUIRED' })).toEqual({
      ...ALL_GRANTED,
      privacyOptionsRequired: true,
    });
  });
});

describe('outcomeFromUmp: OBTAINED follows what the player really chose (the TCF purposes)', () => {
  const info = { status: 'OBTAINED', canRequestAds: true, privacyOptionsRequirementStatus: 'REQUIRED' };

  it('"Consent": every purpose accepted -> all four granted, privacy row offered', () => {
    expect(outcomeFromUmp(info, EEA_ACCEPTED)).toEqual({ ...ALL_GRANTED, privacyOptionsRequired: true });
  });

  it('"Do not consent": UMP still says canRequestAds (limited ads), but nothing is granted to Firebase', () => {
    expect(outcomeFromUmp(info, EEA_DECLINED)).toEqual({
      canRequestAds: true, // Google's own call (legitimate interest, limited ads); the ad SDK reads the TCF string itself
      privacyOptionsRequired: true,
      analytics: 'denied',
      adStorage: 'denied',
      adUserData: 'denied',
      adPersonalization: 'denied',
    });
  });

  it('Manage options, storage only: analytics and ad storage granted, the personalisation types not', () => {
    // purpose 1 (store / access information) yes; 3, 4 (personalised ads) and 7 (ad measurement) no
    expect(outcomeFromUmp(info, { gdprApplies: 1, purposeConsents: '10000000000' })).toMatchObject({
      analytics: 'granted',
      adStorage: 'granted',
      adUserData: 'denied',
      adPersonalization: 'denied',
    });
  });

  it('OBTAINED but canRequestAds false: every type denied and no ads, whatever the purposes say', () => {
    expect(outcomeFromUmp({ ...info, canRequestAds: false }, EEA_ACCEPTED)).toEqual({
      canRequestAds: false,
      privacyOptionsRequired: true,
      analytics: 'denied',
      adStorage: 'denied',
      adUserData: 'denied',
      adPersonalization: 'denied',
    });
  });

  it('the purposes could not be read (null / missing): all four denied, ads follow UMP', () => {
    for (const tcf of [null, undefined]) {
      expect(outcomeFromUmp(info, tcf)).toEqual({ ...CONSENT_DENIED, canRequestAds: true, privacyOptionsRequired: true });
    }
    expect(outcomeFromUmp(info)).toEqual({ ...CONSENT_DENIED, canRequestAds: true, privacyOptionsRequired: true });
  });

  it('gdprApplies unset or unknown cannot be trusted: denied', () => {
    expect(outcomeFromUmp(info, { gdprApplies: null, purposeConsents: '11111111111' })).toMatchObject({ analytics: 'denied', adStorage: 'denied' });
    expect(outcomeFromUmp(info, { gdprApplies: 2, purposeConsents: '11111111111' })).toMatchObject({ analytics: 'denied' });
  });

  it('GDPR does not apply (gdprApplies 0): there is no purpose string to read, the answer is UMP\'s canRequestAds', () => {
    expect(outcomeFromUmp(info, { gdprApplies: 0, purposeConsents: '' })).toEqual({ ...ALL_GRANTED, privacyOptionsRequired: true });
  });

  it('a malformed or short purpose string is not a consent', () => {
    for (const purposeConsents of ['', '1', 'abc', '1 1', '   ']) {
      expect(outcomeFromUmp(info, { gdprApplies: 1, purposeConsents })).toMatchObject({ analytics: 'denied', adStorage: 'denied', adUserData: 'denied', adPersonalization: 'denied' });
    }
  });

  it('privacyOptionsRequired is true only for the exact REQUIRED requirement status', () => {
    const base = { status: 'OBTAINED', canRequestAds: true };
    expect(outcomeFromUmp({ ...base, privacyOptionsRequirementStatus: 'REQUIRED' }, EEA_ACCEPTED).privacyOptionsRequired).toBe(true);
    expect(outcomeFromUmp({ ...base, privacyOptionsRequirementStatus: 'NOT_REQUIRED' }, EEA_ACCEPTED).privacyOptionsRequired).toBe(false);
    expect(outcomeFromUmp({ ...base, privacyOptionsRequirementStatus: 'UNKNOWN' }, EEA_ACCEPTED).privacyOptionsRequired).toBe(false);
    expect(outcomeFromUmp({ ...base }, EEA_ACCEPTED).privacyOptionsRequired).toBe(false);
  });
});

describe('consentFromPurposes (TCF purposes -> the four Consent Mode types)', () => {
  // TCF purposes are 1-based; the string is one char per purpose. Google's mapping (the same four purposes the Firebase SDK logs as
  // AuthorizePurpose1/3/4/7): storage = 1, ad_user_data = 1 and 7, ad_personalization = 1, 3 and 4.
  it('all accepted / all refused', () => {
    expect(consentFromPurposes('11111111111')).toEqual({ analytics: 'granted', adStorage: 'granted', adUserData: 'granted', adPersonalization: 'granted' });
    expect(consentFromPurposes('00000000000')).toEqual({ analytics: 'denied', adStorage: 'denied', adUserData: 'denied', adPersonalization: 'denied' });
  });

  it('every type needs purpose 1: without it nothing is granted even if the others are accepted', () => {
    expect(consentFromPurposes('01111111111')).toEqual({ analytics: 'denied', adStorage: 'denied', adUserData: 'denied', adPersonalization: 'denied' });
  });

  it('ad_user_data needs 1 and 7', () => {
    expect(consentFromPurposes('10000010000')).toMatchObject({ adUserData: 'granted', adPersonalization: 'denied' });
    expect(consentFromPurposes('11111100000')).toMatchObject({ adUserData: 'denied' });
  });

  it('ad_personalization needs 1, 3 and 4', () => {
    expect(consentFromPurposes('10110000000')).toMatchObject({ adPersonalization: 'granted', adUserData: 'denied' });
    expect(consentFromPurposes('10100000000')).toMatchObject({ adPersonalization: 'denied' });
    expect(consentFromPurposes('10010000000')).toMatchObject({ adPersonalization: 'denied' });
  });

  it('a string that is not 0/1 characters, or shorter than the ten purposes of TCF v2.0, is untrusted: all denied', () => {
    const none = { analytics: 'denied', adStorage: 'denied', adUserData: 'denied', adPersonalization: 'denied' };
    for (const bad of ['', '1', '1011', '111111111', '1111111111x', '1111 111111', 'abc'] as const) expect(consentFromPurposes(bad)).toEqual(none);
    expect(consentFromPurposes(undefined as unknown as string)).toEqual(none);
    expect(consentFromPurposes('1111111111')).toMatchObject({ analytics: 'granted' }); // exactly ten purposes is enough
  });
});

describe('outcomeFromUmp: unresolved, errors and malformed answers degrade to all-denied', () => {
  it('REQUIRED and unresolved (the form did not complete): all denied and canRequestAds is false, even if the plugin says true', () => {
    for (const canRequestAds of [false, true]) {
      expect(outcomeFromUmp({ status: 'REQUIRED', canRequestAds, privacyOptionsRequirementStatus: 'REQUIRED' }, EEA_ACCEPTED)).toEqual({
        ...CONSENT_DENIED,
        privacyOptionsRequired: true, // the player can retry from Settings
      });
    }
  });

  it('UNKNOWN status is treated like unresolved', () => {
    expect(outcomeFromUmp({ status: 'UNKNOWN', canRequestAds: true, privacyOptionsRequirementStatus: 'UNKNOWN' }, EEA_ACCEPTED)).toEqual(CONSENT_DENIED);
  });

  it('null / undefined (the request threw, or the plugin is missing)', () => {
    expect(outcomeFromUmp(null)).toEqual(CONSENT_DENIED);
    expect(outcomeFromUmp(undefined)).toEqual(CONSENT_DENIED);
  });

  it('an unknown status string or a missing status', () => {
    expect(outcomeFromUmp({ status: 'SOMETHING_NEW', canRequestAds: true })).toEqual(CONSENT_DENIED);
    expect(outcomeFromUmp({ canRequestAds: true })).toEqual(CONSENT_DENIED);
  });

  it('a non-object answer', () => {
    expect(outcomeFromUmp('OBTAINED' as unknown as null)).toEqual(CONSENT_DENIED);
  });

  it('NOT_REQUIRED or OBTAINED without an explicit canRequestAds === true never allows ads', () => {
    expect(outcomeFromUmp({ status: 'OBTAINED' }, EEA_ACCEPTED).canRequestAds).toBe(false);
    expect(outcomeFromUmp({ status: 'NOT_REQUIRED', canRequestAds: 'yes' as unknown as boolean }).canRequestAds).toBe(false);
  });

  it('the denied constant itself: nothing granted, nothing requested, no privacy row', () => {
    expect(CONSENT_DENIED).toEqual({
      canRequestAds: false,
      privacyOptionsRequired: false,
      analytics: 'denied',
      adStorage: 'denied',
      adUserData: 'denied',
      adPersonalization: 'denied',
    });
    expect(Object.isFrozen(CONSENT_DENIED)).toBe(true);
  });

  it('returns a fresh object each call, so a caller cannot corrupt the shared constant', () => {
    const a = outcomeFromUmp(null);
    const b = outcomeFromUmp(null);
    expect(a).not.toBe(CONSENT_DENIED);
    expect(a).not.toBe(b);
  });
});
