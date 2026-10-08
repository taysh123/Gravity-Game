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
//   6. With a `gate` (the shop's purchase gate) the offer holds it from step 2 and releases it on EVERY way out: each outcome, the
//      scene gone, a grant that returns early, a handler that throws. A tap while the gate is already up is ignored.
export interface RewardedOfferHandlers {
  onEarned: () => void;
  onNotEarned?: (outcome: 'dismissed' | 'unavailable') => void;
  toastY?: number; // where the default "Ad unavailable" toast sits
  gate?: { purchasing: boolean };
}

// The one check for every action that would leave, reset or redraw a screen while a full-screen ad is requested or playing (the
// window between the tap and the ad actually appearing is up to 5 s, and the ad then plays over whatever the player walked to while
// the reward is dropped): RETRY, SHARE, Home, Settings, tab switches, Back. Android Back has the same rule in platform/backRouter.ts.
export function unlessAdShowing<A extends unknown[]>(action: (...args: A) => void): (...args: A) => void {
  return (...args: A): void => {
    if (Ads.isShowing()) return;
    action(...args);
  };
}

export async function runRewardedOffer(
  scene: Phaser.Scene,
  btn: Phaser.GameObjects.Container,
  source: string,
  handlers: RewardedOfferHandlers,
): Promise<void> {
  const gate = handlers.gate;
  if (Ads.isShowing() || gate?.purchasing) return;
  if (gate) gate.purchasing = true;
  try {
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
  } finally {
    if (gate) gate.purchasing = false;
  }
}
