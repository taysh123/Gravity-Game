import Phaser from 'phaser';
import { PURCHASE_UI } from '../config/monetization.config';
import { THEME } from '../config/theme.config';
import { IAP } from '../services/IAP';
import { purchaseCardView, type CardView, type Feedback } from '../services/purchaseView';
import { showToast, type ToastTone } from './toast';

// Scene-facing glue between IAP (the truth) and the pure card / feedback view-model (services/purchaseView.ts), shared by
// the shop and Settings so the two always show the same thing.

// The card state for one package, from what IAP reports right now.
export function cardViewFor(packageId: string, hideWithNoAds = false): CardView {
  return purchaseCardView({
    owned: IAP.owns(packageId),
    pending: IAP.isPending(packageId),
    store: IAP.storeStatus(packageId),
    price: IAP.price(packageId),
    noAdsOwned: IAP.isPremium(),
    hideWithNoAds,
  });
}

// Purchases are only sold in the Android app: true on the web build (dev or production).
export function isWebStore(): boolean {
  return IAP.storeStatus('remove_ads') === 'web';
}

// A message carried across a scene.restart (the redraw after a purchase / restore would otherwise destroy the toast).
export interface ToastMessage {
  message: string;
  tone: ToastTone;
}

export function toastOf(fb: Feedback): ToastMessage | undefined {
  return fb.message ? { message: fb.message, tone: fb.kind === 'error' ? 'error' : 'info' } : undefined;
}

export function tagFontPx(label: string): number {
  return label.length > PURCHASE_UI.TAG_LONG_LEN ? PURCHASE_UI.TAG_FONT_SMALL_PX : PURCHASE_UI.TAG_FONT_PX;
}

export function tagColor(tone: CardView['tone']): string {
  if (tone === 'price') return PURCHASE_UI.PRICE_COLOR;
  if (tone === 'pending') return PURCHASE_UI.PENDING_COLOR;
  return THEME.TEXT_MUTED;
}

// The pending / web note under a card, plus (pending only) the "Check status" control. `onCheck` runs on a tap. Both are
// added to `parent` at the card's bottom edge (`bottomY` = the card's half height). Returns the objects it created.
export function addCardNote(
  scene: Phaser.Scene,
  view: CardView,
  w: number,
  bottomY: number,
  onCheck: () => void,
): Phaser.GameObjects.GameObject[] {
  const out: Phaser.GameObjects.GameObject[] = [];
  if (!view.note) return out;
  const y = bottomY - PURCHASE_UI.NOTE_BOTTOM_PAD;
  out.push(
    scene.add
      .text(-w / 2 + 18, y, view.note, {
        fontFamily: THEME.FONT_BODY,
        fontSize: `${PURCHASE_UI.NOTE_FONT_PX}px`,
        color: view.tone === 'pending' ? PURCHASE_UI.PENDING_COLOR : THEME.TEXT_MUTED,
      })
      .setOrigin(0, 0.5),
  );
  if (view.action === 'check' && view.actionLabel) {
    const label = scene.add
      .text(0, 0, view.actionLabel, {
        fontFamily: THEME.FONT_BODY,
        fontSize: `${PURCHASE_UI.NOTE_FONT_PX + 1}px`,
        color: PURCHASE_UI.PENDING_COLOR,
        fontStyle: '700',
      })
      .setOrigin(0.5);
    // A container with an explicit rectangle, the same proven pattern as every card and Button: >=44px to tap.
    const link = scene.add.container(w / 2 - 18 - PURCHASE_UI.CHECK_LINK_W / 2, y, [label]);
    link.setSize(PURCHASE_UI.CHECK_LINK_W, PURCHASE_UI.CHECK_LINK_H);
    link.setInteractive(
      new Phaser.Geom.Rectangle(-PURCHASE_UI.CHECK_LINK_W / 2, -PURCHASE_UI.CHECK_LINK_H / 2, PURCHASE_UI.CHECK_LINK_W, PURCHASE_UI.CHECK_LINK_H),
      Phaser.Geom.Rectangle.Contains,
    );
    if (link.input) link.input.cursor = 'pointer';
    link.on('pointerup', onCheck);
    out.push(link);
  }
  return out;
}

// A toast for a Feedback that stays on the current scene (info / error). 'none' and 'celebrate' show nothing here.
export function showFeedbackToast(scene: Phaser.Scene, fb: Feedback, y?: number): void {
  const t = toastOf(fb);
  if (t) showToast(scene, t.message, { tone: t.tone, y });
}
