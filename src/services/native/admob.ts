import { registerPlugin } from '@capacitor/core';

// Local proxy to the native @capacitor-community/admob plugin via the Capacitor
// bridge — by NAME, so the web build never imports the package (kept in
// package.json deps only for the synced Android module). Only the methods we use
// are declared. Reward is treated as earned when showRewardVideoAd resolves.
// (Native behavior is a device-verification gate.)
export interface AdMobRewardItem {
  type?: string;
  amount?: number;
}

// UMP (User Messaging Platform) consent — GDPR/EEA. Mirrors the plugin's
// AdmobConsentInfo; status is the plugin's string enum (NOT_REQUIRED / OBTAINED /
// REQUIRED / UNKNOWN). We only act on 'REQUIRED' + a form being available.
export interface AdMobConsentInfo {
  status: 'NOT_REQUIRED' | 'OBTAINED' | 'REQUIRED' | 'UNKNOWN';
  isConsentFormAvailable?: boolean;
}

export interface AdMobPlugin {
  initialize(options?: Record<string, unknown>): Promise<void>;
  requestConsentInfo(options?: Record<string, unknown>): Promise<AdMobConsentInfo>;
  showConsentForm(): Promise<AdMobConsentInfo>;
  prepareRewardVideoAd(options: { adId: string }): Promise<unknown>;
  showRewardVideoAd(): Promise<AdMobRewardItem>;
  prepareInterstitial(options: { adId: string }): Promise<unknown>;
  showInterstitial(): Promise<void>;
}

export const AdMob = registerPlugin<AdMobPlugin>('AdMob');
