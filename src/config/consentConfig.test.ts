import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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

  // P00-T08: these checks hold on 8.0.0 and on 8.2.x, so the AdMob bump stays a pure package.json/lock commit. 8.1.0 added the
  // paid-event (impression revenue) events and 8.2.0 the rewarded click event; the app listens to none of them (it records no ad
  // revenue or clicks and grants a reward only from the Rewarded event), so they are named here instead of being silently ignored. A
  // plugin release that adds any OTHER event fails the "unaccounted" check below, which forces a deliberate listen-or-skip decision.
  // On 8.0.0 the real enums do not have these members at all, which is fine: the list only ever subtracts.
  const KNOWN_UNLISTENED = {
    REWARDED: ['onRewardedVideoAdClicked', 'onRewardedVideoAdImpression'],
    INTERSTITIAL: ['interstitialAdImpression'],
  } as const;

  function unaccounted(real: readonly string[], mirrored: readonly string[], unlistened: readonly string[]): string[] {
    return real.filter((name) => !mirrored.includes(name) && !unlistened.includes(name));
  }

  it('the mirror has no stale extras: every mirrored name is a real enum member (6 + 5)', () => {
    const realRewarded: string[] = Object.values(RewardAdPluginEvents);
    const realInterstitial: string[] = Object.values(InterstitialAdPluginEvents);
    expect(Object.values(ADMOB_EVENTS.REWARDED).filter((name) => !realRewarded.includes(name))).toEqual([]);
    expect(Object.values(ADMOB_EVENTS.INTERSTITIAL).filter((name) => !realInterstitial.includes(name))).toEqual([]);
    expect(Object.values(ADMOB_EVENTS.REWARDED)).toHaveLength(6);
    expect(Object.values(ADMOB_EVENTS.INTERSTITIAL)).toHaveLength(5);
  });

  it('every real plugin event is either mirrored (and listened to) or on the known-unlistened list', () => {
    expect(unaccounted(Object.values(RewardAdPluginEvents), Object.values(ADMOB_EVENTS.REWARDED), KNOWN_UNLISTENED.REWARDED)).toEqual([]);
    expect(unaccounted(Object.values(InterstitialAdPluginEvents), Object.values(ADMOB_EVENTS.INTERSTITIAL), KNOWN_UNLISTENED.INTERSTITIAL)).toEqual([]);
  });

  it('the accounting is not vacuous: an event that is neither mirrored nor on the list is reported', () => {
    expect(unaccounted(['a', 'b', 'c'], ['a'], ['b'])).toEqual(['c']);
    expect(unaccounted(['a'], ['a'], [])).toEqual([]);
    // 8.2.1's real rewarded enum has two members beyond the mirror: with an empty list both would be reported.
    expect(unaccounted(['onRewardedVideoAdLoaded', 'onRewardedVideoAdClicked'], ['onRewardedVideoAdLoaded'], [])).toEqual(['onRewardedVideoAdClicked']);
  });

  it('the known-unlistened list never overlaps the events the app listens to', () => {
    for (const name of KNOWN_UNLISTENED.REWARDED) expect(Object.values(ADMOB_EVENTS.REWARDED)).not.toContain(name);
    for (const name of KNOWN_UNLISTENED.INTERSTITIAL) expect(Object.values(ADMOB_EVENTS.INTERSTITIAL)).not.toContain(name);
  });
});

// P00-T08 / D-11: the plugin's own Android build.gradle falls back to a FLOATING Google Mobile Ads range ('25.4.+'), so a build on a later day
// could ship a different SDK. The project pins both exactly in android/variables.gradle, which the plugin reads through rootProject.ext.
// A plugin bump that stopped reading those names (or a variables.gradle edit back to a range) would silently un-pin the SDK: fail here.
const readFile = (rel: string): string => readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), 'utf8');
const isExactVersion = (v: string | undefined): boolean => v !== undefined && /^\d+\.\d+\.\d+$/.test(v); // no +, no range, no pre-release tag
function gradleExt(source: string, name: string): string | undefined {
  return new RegExp(`^\\s*${name}\\s*=\\s*'([^']*)'`, 'm').exec(source.replace(/\/\/.*$/gm, ''))?.[1];
}

describe('Android: the Google Mobile Ads SDK and UMP are pinned exactly (D-11)', () => {
  const variables = readFile('android/variables.gradle');
  const pluginGradle = readFile('node_modules/@capacitor-community/admob/android/build.gradle');

  it('android/variables.gradle pins playServicesAdsVersion and userMessagingPlatformVersion to exact x.y.z versions', () => {
    expect(isExactVersion(gradleExt(variables, 'playServicesAdsVersion'))).toBe(true);
    expect(isExactVersion(gradleExt(variables, 'userMessagingPlatformVersion'))).toBe(true);
  });

  it('the plugin reads both names from rootProject.ext, so the pins take effect', () => {
    expect(pluginGradle).toContain('rootProject.ext.playServicesAdsVersion');
    expect(pluginGradle).toContain('rootProject.ext.userMessagingPlatformVersion');
    expect(pluginGradle).toContain('implementation "com.google.android.gms:play-services-ads:$playServicesAdsVersion"');
    expect(pluginGradle).toContain('implementation "com.google.android.ump:user-messaging-platform:$userMessagingPlatformVersion"');
  });

  it('the check is not vacuous: ranges and missing values are not exact, a comment is not a pin', () => {
    expect(isExactVersion('25.4.+')).toBe(false);
    expect(isExactVersion('25.+')).toBe(false);
    expect(isExactVersion('[25.4.0,26.0.0)')).toBe(false);
    expect(isExactVersion('25.4.0-rc1')).toBe(false);
    expect(isExactVersion(undefined)).toBe(false);
    expect(isExactVersion('25.4.0')).toBe(true);
    expect(gradleExt("playServicesAdsVersion = '25.4.+'", 'playServicesAdsVersion')).toBe('25.4.+');
    expect(gradleExt("// playServicesAdsVersion = '25.4.0'", 'playServicesAdsVersion')).toBeUndefined();
    expect(gradleExt("other = '1.0.0'", 'playServicesAdsVersion')).toBeUndefined();
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
