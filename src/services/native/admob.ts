import { registerPlugin } from '@capacitor/core';
import type { ADMOB_EVENTS } from '../../config/monetization.config';

// Local proxy to the native @capacitor-community/admob plugin via the Capacitor
// bridge — by NAME, so the web build never imports the package (kept in
// package.json deps only for the synced Android module). Only the methods and listeners we use are declared.
// The outcome of a rewarded ad is read from its EVENTS (services/adState.ts), never from the showRewardVideoAd() promise: the plugin
// resolves that only when the reward is earned (AdRewardExecutor.java / RewardedAdCallbackAndListeners.kt) and never settles it when
// the player closes the ad early. (Native behavior is a device-verification gate.)
//
// Shapes below mirror @capacitor-community/admob 8.0.0 (dist/esm/consent/*.d.ts, dist/esm/definitions.d.ts) and what the Android
// plugin really returns (android/.../consent/AdConsentExecutor.java, AdMob.java setRequestConfiguration). The enum values the
// app sends are mirrored in src/config (consent.config.ts, monetization.config.ts ADMOB_TARGETING) and pinned to the real
// enums by src/config/consentConfig.test.ts.
export interface AdMobRewardItem {
  type?: string;
  amount?: number;
}

// UMP (User Messaging Platform) consent — GDPR/EEA. Mirrors the plugin's AdmobConsentInfo; status is the plugin's string enum
// (NOT_REQUIRED / OBTAINED / REQUIRED / UNKNOWN). requestConsentInfo returns all four fields; showConsentForm returns the same
// minus isConsentFormAvailable (AdConsentExecutor.showConsentForm), so every field but status is optional here.
export interface AdMobConsentInfo {
  status: 'NOT_REQUIRED' | 'OBTAINED' | 'REQUIRED' | 'UNKNOWN';
  isConsentFormAvailable?: boolean;
  canRequestAds?: boolean;
  privacyOptionsRequirementStatus?: 'NOT_REQUIRED' | 'REQUIRED' | 'UNKNOWN';
}

// D-25: no `tagForUnderAgeOfConsent` here (the audience is 13+, no age tags), so the type does not even offer it.
export interface AdMobConsentRequestOptions {
  debugGeography?: number; // AdmobConsentDebugGeography: 0 DISABLED, 1 EEA, 2 NOT_EEA, 3 US, 4 OTHER (debug builds only)
  testDeviceIdentifiers?: string[];
}

// D-25: no `tagForChildDirectedTreatment` and no `tagForUnderAgeOfConsent`: when the keys are absent the plugin sends
// UNSPECIFIED for both (AdMob.java setRequestConfiguration), which is what a 13+ app wants.
export interface AdMobInitializeOptions {
  maxAdContentRating?: 'General' | 'ParentalGuidance' | 'Teen' | 'MatureAudience'; // MaxAdContentRating enum values (A-07)
  initializeForTesting?: boolean;
  testingDevices?: string[];
}

// Listener payloads, mirrored from dist/esm/shared/admob-error.interface.d.ts and ad-load-info.interface.d.ts.
export interface AdMobError {
  code: number;
  message: string;
}
export interface AdMobLoadInfo {
  adUnitId: string;
}
export interface AdMobListenerHandle {
  remove(): Promise<void>;
}

// Exactly the eleven listeners services/Ads.ts registers, once. Event names are config (ADMOB_EVENTS) and pinned to the plugin's
// enums by src/config/consentConfig.test.ts. Signatures: dist/esm/reward/reward-definitions.interface.d.ts (RewardDefinitions.addListener,
// 6 overloads) and dist/esm/interstitial/interstitial-definitions.interface.d.ts (InterstitialDefinitions.addListener, 5 overloads).
export interface AdMobListeners {
  addListener(eventName: typeof ADMOB_EVENTS.REWARDED.LOADED, listener: (info: AdMobLoadInfo) => void): Promise<AdMobListenerHandle>;
  addListener(eventName: typeof ADMOB_EVENTS.REWARDED.FAILED_TO_LOAD, listener: (error: AdMobError) => void): Promise<AdMobListenerHandle>;
  addListener(eventName: typeof ADMOB_EVENTS.REWARDED.SHOWED, listener: () => void): Promise<AdMobListenerHandle>;
  addListener(eventName: typeof ADMOB_EVENTS.REWARDED.FAILED_TO_SHOW, listener: (error: AdMobError) => void): Promise<AdMobListenerHandle>;
  addListener(eventName: typeof ADMOB_EVENTS.REWARDED.DISMISSED, listener: () => void): Promise<AdMobListenerHandle>;
  addListener(eventName: typeof ADMOB_EVENTS.REWARDED.REWARDED, listener: (reward: AdMobRewardItem) => void): Promise<AdMobListenerHandle>;
  addListener(eventName: typeof ADMOB_EVENTS.INTERSTITIAL.LOADED, listener: (info: AdMobLoadInfo) => void): Promise<AdMobListenerHandle>;
  addListener(eventName: typeof ADMOB_EVENTS.INTERSTITIAL.FAILED_TO_LOAD, listener: (error: AdMobError) => void): Promise<AdMobListenerHandle>;
  addListener(eventName: typeof ADMOB_EVENTS.INTERSTITIAL.SHOWED, listener: () => void): Promise<AdMobListenerHandle>;
  addListener(eventName: typeof ADMOB_EVENTS.INTERSTITIAL.FAILED_TO_SHOW, listener: (error: AdMobError) => void): Promise<AdMobListenerHandle>;
  addListener(eventName: typeof ADMOB_EVENTS.INTERSTITIAL.DISMISSED, listener: () => void): Promise<AdMobListenerHandle>;
}

export interface AdMobPlugin extends AdMobListeners {
  initialize(options?: AdMobInitializeOptions): Promise<void>;
  requestConsentInfo(options?: AdMobConsentRequestOptions): Promise<AdMobConsentInfo>;
  showConsentForm(): Promise<AdMobConsentInfo>;
  // Rejects when the form fails to show (AdConsentExecutor: "Error when show privacy form"); resolves with no value.
  showPrivacyOptionsForm(): Promise<void>;
  prepareRewardVideoAd(options: { adId: string }): Promise<unknown>;
  showRewardVideoAd(): Promise<AdMobRewardItem>;
  prepareInterstitial(options: { adId: string }): Promise<unknown>;
  showInterstitial(): Promise<void>;
}

export const AdMob = registerPlugin<AdMobPlugin>('AdMob');
