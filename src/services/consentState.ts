// Pure mapping from the UMP (User Messaging Platform) answer to what the app may do (D-10; TECHNICAL-ARCHITECTURE 4.3). No
// Capacitor, no Phaser, no DOM: Consent.ts asks the plugin, this file decides, bootServices.ts applies the result.
//
// The rule is "deny unless the answer is clear": a missing, malformed, unresolved (REQUIRED / UNKNOWN) or failed answer is
// ALL DENIED with canRequestAds=false, so nothing is requested or logged on a guess. UMP status strings come from the
// plugin's AdmobConsentStatus / PrivacyOptionsRequirementStatus enums (@capacitor-community/admob 8.0.0,
// dist/esm/consent/consent-status.enum.d.ts and privacy-options-requirement-status.enum.d.ts); the Android plugin returns
// them as these exact strings (AdConsentExecutor.getConsentStatusString, and ConsentInformation.PrivacyOptionsRequirementStatus.name()).

export type ConsentGrant = 'granted' | 'denied';

export interface ConsentOutcome {
  // UMP says an ad request is allowed (and only then is the ad SDK initialised).
  canRequestAds: boolean;
  // The "Privacy choices" entry point must be offered in Settings (privacyOptionsRequirementStatus === REQUIRED).
  privacyOptionsRequired: boolean;
  // The four Firebase Consent Mode types (FirebaseAnalytics.setConsent).
  analytics: ConsentGrant; // ANALYTICS_STORAGE
  adStorage: ConsentGrant; // AD_STORAGE
  adUserData: ConsentGrant; // AD_USER_DATA
  adPersonalization: ConsentGrant; // AD_PERSONALIZATION
}

// The subset of the plugin's AdmobConsentInfo this mapping reads. Everything is optional: the plugin's showConsentForm answer
// carries no isConsentFormAvailable, and a malformed answer must not throw.
export interface UmpInfoLike {
  status?: string;
  canRequestAds?: boolean;
  privacyOptionsRequirementStatus?: string;
}

// What the player actually chose, as the UMP SDK stores it for every ad / analytics SDK in the app's default SharedPreferences
// (IAB TCF v2 keys; read natively by the ConsentSignals plugin, android/.../ConsentSignalsPlugin.java):
//   gdprApplies      IABTCF_gdprApplies  (1 = GDPR / TCF applies, 0 = it does not, null = not stored or unreadable)
//   purposeConsents  IABTCF_PurposeConsents: one character per TCF purpose, purpose 1 first, '1' = the player consented to it
// UMP's own canRequestAds is NOT a substitute: after "Do not consent" it is still true (Google serves limited ads on legitimate
// interest) while purposeConsents is all zeros.
export interface TcfSignals {
  gdprApplies: number | null;
  purposeConsents: string;
}

export const UMP_STATUS = {
  NOT_REQUIRED: 'NOT_REQUIRED',
  OBTAINED: 'OBTAINED',
  REQUIRED: 'REQUIRED',
  UNKNOWN: 'UNKNOWN',
} as const;

export const PRIVACY_OPTIONS_REQUIRED = 'REQUIRED';

// Nothing granted, nothing requested, no privacy row. Frozen: copy it (outcomeFromUmp does) before changing a field.
export const CONSENT_DENIED: Readonly<ConsentOutcome> = Object.freeze({
  canRequestAds: false,
  privacyOptionsRequired: false,
  analytics: 'denied',
  adStorage: 'denied',
  adUserData: 'denied',
  adPersonalization: 'denied',
});

function uniform(grant: ConsentGrant, canRequestAds: boolean, privacyOptionsRequired: boolean): ConsentOutcome {
  return {
    canRequestAds,
    privacyOptionsRequired,
    analytics: grant,
    adStorage: grant,
    adUserData: grant,
    adPersonalization: grant,
  };
}

// TCF purposes (1-based) -> the four Consent Mode types (DECISIONS A-25). Google's published mapping is: P1 -> ad_storage and
// ad_user_data, P7 -> ad_user_data, P3 and P4 -> ad_personalization (the Firebase SDK itself logs AuthorizePurpose1 / 3 / 4 / 7).
// Two requirements go beyond Google and are this project's stricter choice: ad_personalization also needs P1, and analytics_storage,
// which Google does not map, needs P1 (store and/or access information on a device, ePrivacy Art. 5(3)). So here: analytics and
// ad_storage = P1; ad_user_data = P1 and P7; ad_personalization = P1, P3 and P4.
function purpose(purposeConsents: string, n: number): boolean {
  return purposeConsents.charAt(n - 1) === '1';
}

// A valid purpose string is only 0 and 1 and at least the ten purposes of TCF v2.0 long (UMP writes eleven). Anything else is
// treated as unreadable: nothing is granted from a string we cannot trust.
const VALID_PURPOSES = /^[01]{10,}$/;

export function consentFromPurposes(purposeConsents: string): Pick<ConsentOutcome, 'analytics' | 'adStorage' | 'adUserData' | 'adPersonalization'> {
  const grant = (ok: boolean): ConsentGrant => (ok ? 'granted' : 'denied');
  if (typeof purposeConsents !== 'string' || !VALID_PURPOSES.test(purposeConsents)) return { analytics: 'denied', adStorage: 'denied', adUserData: 'denied', adPersonalization: 'denied' };
  const p1 = purpose(purposeConsents, 1);
  return {
    analytics: grant(p1),
    adStorage: grant(p1),
    adUserData: grant(p1 && purpose(purposeConsents, 7)),
    adPersonalization: grant(p1 && purpose(purposeConsents, 3) && purpose(purposeConsents, 4)),
  };
}

// `tcf` is only needed for OBTAINED (the player answered a TCF form). It is the player's real per-purpose answer; without it (the
// native read failed) nothing can be verified, so the four Firebase types are denied. Ads still follow UMP's canRequestAds.
export function outcomeFromUmp(info: UmpInfoLike | null | undefined, tcf?: TcfSignals | null): ConsentOutcome {
  if (info === null || typeof info !== 'object') return { ...CONSENT_DENIED };
  const privacyOptionsRequired = info.privacyOptionsRequirementStatus === PRIVACY_OPTIONS_REQUIRED;
  // Ads need an explicit `true` from UMP itself, never a default.
  const canRequestAds = info.canRequestAds === true;
  switch (info.status) {
    case UMP_STATUS.NOT_REQUIRED:
      // Outside the regulated regions: all four Firebase types are granted. Ads still follow UMP's own canRequestAds.
      return uniform('granted', canRequestAds, privacyOptionsRequired);
    case UMP_STATUS.OBTAINED: {
      // The player answered the form. canRequestAds is not their answer (see TcfSignals); the purposes are.
      const base = { ...CONSENT_DENIED, canRequestAds, privacyOptionsRequired };
      if (!canRequestAds || !tcf) return base;
      if (tcf.gdprApplies === 0) return uniform('granted', canRequestAds, privacyOptionsRequired); // TCF does not apply: nothing to read
      if (tcf.gdprApplies !== 1) return base; // unset or unknown: cannot be verified
      return { ...base, ...consentFromPurposes(tcf.purposeConsents) };
    }
    default:
      // REQUIRED (the form did not complete), UNKNOWN or anything new: all denied, no ads. The privacy row stays offered
      // when UMP asks for it, so the player can retry from Settings.
      return { ...CONSENT_DENIED, privacyOptionsRequired };
  }
}

// The four Firebase Consent Mode settings for an outcome, in a fixed order (FirebaseAnalytics.setConsent, one call each). The
// strings are the plugin's ConsentType / ConsentStatus enum values; src/services/Analytics.test.ts pins them to the real enums.
export interface ConsentModeSetting {
  type: 'ANALYTICS_STORAGE' | 'AD_STORAGE' | 'AD_USER_DATA' | 'AD_PERSONALIZATION';
  status: 'GRANTED' | 'DENIED';
}

export function consentModeSettings(o: ConsentOutcome): ConsentModeSetting[] {
  const status = (g: ConsentGrant): ConsentModeSetting['status'] => (g === 'granted' ? 'GRANTED' : 'DENIED');
  return [
    { type: 'ANALYTICS_STORAGE', status: status(o.analytics) },
    { type: 'AD_STORAGE', status: status(o.adStorage) },
    { type: 'AD_USER_DATA', status: status(o.adUserData) },
    { type: 'AD_PERSONALIZATION', status: status(o.adPersonalization) },
  ];
}
