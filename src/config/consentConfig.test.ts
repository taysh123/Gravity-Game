import { describe, it, expect } from 'vitest';
import { AdmobConsentDebugGeography, AdmobConsentStatus, InterstitialAdPluginEvents, MaxAdContentRating, RewardAdPluginEvents } from '@capacitor-community/admob';
// Not re-exported by the package root (consent/index.d.ts omits it), so it is imported from its file; the package has no exports map.
import { PrivacyOptionsRequirementStatus } from '@capacitor-community/admob/dist/esm/consent/privacy-options-requirement-status.enum';
import { CONSENT, CRASH_REQUIRES_ANALYTICS_CONSENT, PRIVACY_UI, UMP_DEBUG_GEOGRAPHY, parseDebugGeography, parseTestDeviceIds } from './consent.config';
import { ADMOB_EVENTS, ADMOB_TARGETING } from './monetization.config';
import { PLATFORM } from './platform.config';
import { PRIVACY_OPTIONS_REQUIRED, UMP_STATUS } from '../services/consentState';
import { THEME } from './theme.config';

// The web bundle never imports @capacitor-community/admob (services/native/admob.ts registers the plugin by name), so the few
// enum VALUES the app needs are mirrored in config. This file imports the real package and pins every mirrored value to it, so a
// plugin bump that renames or renumbers one fails here instead of silently sending the wrong string to the native layer.
describe('mirrored plugin enums match @capacitor-community/admob', () => {
  it('UMP debug geography numbers', () => {
    expect(UMP_DEBUG_GEOGRAPHY.DISABLED).toBe(AdmobConsentDebugGeography.DISABLED);
    expect(UMP_DEBUG_GEOGRAPHY.EEA).toBe(AdmobConsentDebugGeography.EEA);
    expect(UMP_DEBUG_GEOGRAPHY.NOT_EEA).toBe(AdmobConsentDebugGeography.NOT_EEA);
    expect(UMP_DEBUG_GEOGRAPHY.US).toBe(AdmobConsentDebugGeography.US);
    expect(UMP_DEBUG_GEOGRAPHY.OTHER).toBe(AdmobConsentDebugGeography.OTHER);
  });

  it('consent status and privacy-options strings', () => {
    expect(UMP_STATUS.NOT_REQUIRED).toBe(AdmobConsentStatus.NOT_REQUIRED);
    expect(UMP_STATUS.OBTAINED).toBe(AdmobConsentStatus.OBTAINED);
    expect(UMP_STATUS.REQUIRED).toBe(AdmobConsentStatus.REQUIRED);
    expect(UMP_STATUS.UNKNOWN).toBe(AdmobConsentStatus.UNKNOWN);
    expect(PRIVACY_OPTIONS_REQUIRED).toBe(PrivacyOptionsRequirementStatus.REQUIRED);
  });

  it('A-07: the ad content rating is the plugin enum value ParentalGuidance, not the string "PG"', () => {
    expect(ADMOB_TARGETING.MAX_AD_CONTENT_RATING).toBe(MaxAdContentRating.ParentalGuidance);
    expect(ADMOB_TARGETING.MAX_AD_CONTENT_RATING).not.toBe('PG');
  });
});

// P00-T19: the eleven listeners services/Ads.ts registers. Their names are mirrored in ADMOB_EVENTS (the web bundle never imports the
// package); a plugin bump that renames one fails here instead of silently leaving an ad event unheard.
describe('mirrored plugin event names match @capacitor-community/admob', () => {
  it('rewarded: dist/esm/reward/reward-ad-plugin-events.enum.d.ts', () => {
    expect(ADMOB_EVENTS.REWARDED.LOADED).toBe(RewardAdPluginEvents.Loaded);
    expect(ADMOB_EVENTS.REWARDED.FAILED_TO_LOAD).toBe(RewardAdPluginEvents.FailedToLoad);
    expect(ADMOB_EVENTS.REWARDED.SHOWED).toBe(RewardAdPluginEvents.Showed);
    expect(ADMOB_EVENTS.REWARDED.FAILED_TO_SHOW).toBe(RewardAdPluginEvents.FailedToShow);
    expect(ADMOB_EVENTS.REWARDED.DISMISSED).toBe(RewardAdPluginEvents.Dismissed);
    expect(ADMOB_EVENTS.REWARDED.REWARDED).toBe(RewardAdPluginEvents.Rewarded);
  });

  it('interstitial: dist/esm/interstitial/interstitial-ad-plugin-events.enum.d.ts', () => {
    expect(ADMOB_EVENTS.INTERSTITIAL.LOADED).toBe(InterstitialAdPluginEvents.Loaded);
    expect(ADMOB_EVENTS.INTERSTITIAL.FAILED_TO_LOAD).toBe(InterstitialAdPluginEvents.FailedToLoad);
    expect(ADMOB_EVENTS.INTERSTITIAL.SHOWED).toBe(InterstitialAdPluginEvents.Showed);
    expect(ADMOB_EVENTS.INTERSTITIAL.FAILED_TO_SHOW).toBe(InterstitialAdPluginEvents.FailedToShow);
    expect(ADMOB_EVENTS.INTERSTITIAL.DISMISSED).toBe(InterstitialAdPluginEvents.Dismissed);
  });

  it('the mirror has no stale extras: it holds exactly the enum members (6 + 5)', () => {
    expect(Object.values(ADMOB_EVENTS.REWARDED).sort()).toEqual(Object.values(RewardAdPluginEvents).sort());
    expect(Object.values(ADMOB_EVENTS.INTERSTITIAL).sort()).toEqual(Object.values(InterstitialAdPluginEvents).sort());
  });
});

describe('parseDebugGeography (VITE_UMP_DEBUG_GEOGRAPHY)', () => {
  it('maps the documented names, case-insensitively and trimmed', () => {
    expect(parseDebugGeography('EEA')).toBe(AdmobConsentDebugGeography.EEA);
    expect(parseDebugGeography('us')).toBe(AdmobConsentDebugGeography.US);
    expect(parseDebugGeography('  Other ')).toBe(AdmobConsentDebugGeography.OTHER);
    expect(parseDebugGeography('NOT_EEA')).toBe(AdmobConsentDebugGeography.NOT_EEA);
  });

  it('is undefined (the geography is not overridden) for unset, empty, DISABLED or unknown values', () => {
    for (const v of [undefined, '', '   ', 'DISABLED', 'disabled', 'EU', 'garbage', '1']) {
      expect(parseDebugGeography(v)).toBeUndefined();
    }
  });
});

describe('parseTestDeviceIds (VITE_UMP_TEST_DEVICE_IDS)', () => {
  it('splits on commas, trims and drops empty entries', () => {
    expect(parseTestDeviceIds('AAA, BBB ,,CCC')).toEqual(['AAA', 'BBB', 'CCC']);
    expect(parseTestDeviceIds('ONLYONE')).toEqual(['ONLYONE']);
  });

  it('is empty for unset or blank', () => {
    expect(parseTestDeviceIds(undefined)).toEqual([]);
    expect(parseTestDeviceIds('')).toEqual([]);
    expect(parseTestDeviceIds(' , ,')).toEqual([]);
  });
});

describe('privacy entry points: config values', () => {
  it('the privacy policy URL is the hosted GitHub Pages policy (the one entered in Play Console)', () => {
    expect(PLATFORM.PRIVACY_POLICY_URL).toBe('https://taysh123.github.io/Gravity-Game/');
  });

  it('every privacy row has a >= 44px tap area and a confirm window long enough to read and tap', () => {
    expect(PRIVACY_UI.LINK_H).toBeGreaterThanOrEqual(THEME.MIN_TAP);
    expect(PRIVACY_UI.LINK_W).toBeGreaterThanOrEqual(THEME.MIN_TAP);
    expect(PRIVACY_UI.RESET_CONFIRM_MS).toBeGreaterThanOrEqual(2000);
  });
});

describe('Crashlytics and form-watchdog switches', () => {
  // D-10.5 is "enabled in every consent outcome" until the owner's legal check (STATUS gate). Turning the flag on is a legal decision:
  // whoever does it updates this line on purpose, together with the STATUS row.
  it('CRASH_REQUIRES_ANALYTICS_CONSENT ships off (D-10.5: Crashlytics is enabled in every consent outcome)', () => {
    expect(CRASH_REQUIRES_ANALYTICS_CONSENT).toBe(false);
  });

  it('the consent form watchdog is 120 s and the external-flow source is "consent"', () => {
    expect(CONSENT.FORM_WATCHDOG_MS).toBe(120000);
    expect(CONSENT.EXTERNAL_FLOW_SOURCE).toBe('consent');
  });
});
