import type Phaser from 'phaser';
import { AD_UI } from '../config/monetization.config';
import { Ads } from '../services/Ads';
import { showToast } from './toast';

// One tap on a rewarded offer (D-24 / audit H.4): the win overlay's 2x Stardust, Endless revive and 2x, the shop's Free Fragments.
// The offer itself is drawn by its scene, and only when Ads.isRewardedReady().
//
//   1. Another ad already on screen: ignore the tap (the busy guard in Ads is the backstop).
//   2. Disable and dim the button BEFORE the ad is awaited, so a double tap can never reach the ad, or the grant, twice.
//   3. Await the outcome (earned | dismissed | unavailable) from Ads.showRewarded.
//   4. If the scene was left or restarted meanwhile (the button is destroyed, or the scene is neither running nor paused),
//      grant and draw nothing: no double grant, nothing into a destroyed world.
//   5. earned -> onEarned(). Otherwise onNotEarned(outcome) when given; by default the offer is hidden (a spent ad takes a while
//      to be replaced) and an unavailable ad says so ("Ad unavailable", device row A3).
export interface RewardedOfferHandlers {
  onEarned: () => void;
  onNotEarned?: (outcome: 'dismissed' | 'unavailable') => void;
  toastY?: number; // where the default "Ad unavailable" toast sits
}

export async function runRewardedOffer(
  scene: Phaser.Scene,
  btn: Phaser.GameObjects.Container,
  source: string,
  handlers: RewardedOfferHandlers,
): Promise<void> {
  if (Ads.isShowing()) return;
  const alpha = btn.alpha;
  btn.disableInteractive();
  btn.setAlpha(AD_UI.BUSY_ALPHA);
  const outcome = await Ads.showRewarded(source);
  if (!btn.active || !(scene.scene.isActive() || scene.scene.isPaused())) return;
  if (outcome === 'earned') {
    btn.setAlpha(alpha);
    handlers.onEarned();
    return;
  }
  if (handlers.onNotEarned) {
    handlers.onNotEarned(outcome);
    return;
  }
  btn.setVisible(false);
  if (outcome === 'unavailable') showToast(scene, AD_UI.UNAVAILABLE, { tone: 'info', y: handlers.toastY });
}
