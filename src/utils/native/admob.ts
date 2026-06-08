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

export interface AdMobPlugin {
  initialize(options?: Record<string, unknown>): Promise<void>;
  prepareRewardVideoAd(options: { adId: string }): Promise<unknown>;
  showRewardVideoAd(): Promise<AdMobRewardItem>;
  prepareInterstitial(options: { adId: string }): Promise<unknown>;
  showInterstitial(): Promise<void>;
}

export const AdMob = registerPlugin<AdMobPlugin>('AdMob');
