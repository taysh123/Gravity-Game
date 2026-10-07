import Phaser from 'phaser';
import { PACKAGES, PURCHASE_COPY, PURCHASE_UI } from '../config/monetization.config';
import { THEME } from '../config/theme.config';
import { IAP } from '../services/IAP';
import { purchaseCardView, purchaseFeedback, restoreFeedback, type CardView, type Feedback } from '../services/purchaseView';
import { sharedAudio } from '../utils/AudioSynth';
import { showToast, type ToastTone } from './toast';

// Scene-facing glue between IAP (the truth) and the pure card / feedback view-model (services/purchaseView.ts), shared by
// the shop and Settings so the two always show the same thing, and run the same purchase / restore sequence (P00-T17).
// Plain functions over callbacks: the scenes keep their own layout and lend this module only what differs between them.

// ---- Card state ---------------------------------------------------------------------------------------------------

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
  return IAP.storeStatus(PACKAGES.REMOVE_ADS) === 'web';
}

// Everything the purchase cards of a surface render, as one string: equal means nothing visible changed.
export function purchaseSignature(cards: ReadonlyArray<{ packageId: string; hideWhenNoAds?: boolean }>): string {
  return JSON.stringify([IAP.isPremium(), cards.map((c) => cardViewFor(c.packageId, c.hideWhenNoAds))]);
}

// ---- Toasts -------------------------------------------------------------------------------------------------------

// A message carried across a scene.restart (the redraw after a purchase / restore would otherwise destroy the toast).
export interface ToastMessage {
  message: string;
  tone: ToastTone;
}

export function toastOf(fb: Feedback): ToastMessage | undefined {
  return fb.message ? { message: fb.message, tone: fb.kind === 'error' ? 'error' : 'info' } : undefined;
}

// A toast for a Feedback that stays on the current scene (info / error). 'none' and 'celebrate' show nothing here.
export function showFeedbackToast(scene: Phaser.Scene, fb: Feedback, y?: number): void {
  const t = toastOf(fb);
  if (t) showToast(scene, t.message, { tone: t.tone, y });
}

// ---- Tags, notes, tap areas ---------------------------------------------------------------------------------------

export function tagFontPx(label: string): number {
  return label.length > PURCHASE_UI.TAG_LONG_LEN ? PURCHASE_UI.TAG_FONT_SMALL_PX : PURCHASE_UI.TAG_FONT_PX;
}

export function tagColor(tone: CardView['tone']): string {
  if (tone === 'price') return PURCHASE_UI.PRICE_COLOR;
  if (tone === 'pending') return PURCHASE_UI.PENDING_COLOR;
  return THEME.TEXT_MUTED;
}

// Make a container tappable over exactly its own size. Phaser tests a container's hit rectangle in a frame whose origin is
// the container's TOP-LEFT corner (its display origin is half its size), so the rectangle starts at (0, 0): a rectangle
// centred on the container (-w/2, -h/2) would leave the right half and the bottom half dead and tappable outside the card.
export function setTapArea(container: Phaser.GameObjects.Container, w: number, h: number): void {
  container.setSize(w, h);
  container.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
  if (container.input) container.input.cursor = 'pointer';
}

// A text link with an explicit hit area of w x h (>=44px each way) centred on the label. `onTap` receives the link so the
// caller can dim it while the call runs.
export function makeLink(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: Phaser.GameObjects.Text,
  w: number,
  h: number,
  onTap: (link: Phaser.GameObjects.Container) => void,
): Phaser.GameObjects.Container {
  label.setOrigin(0.5).setPosition(0, 0);
  const link = scene.add.container(x, y, [label]);
  setTapArea(link, w, h);
  link.on('pointerup', () => onTap(link));
  return link;
}

// The pending / web note under a card, plus (pending only) the "Check status" control. Create it first: `extraH` says how
// much taller the card must be to hold the note (it wraps beside the control, so its height is measured, not guessed);
// then `place` adds it to the card at the bottom edge (`bottomY` = the card's half height).
export interface CardNote {
  extraH: number;
  place(parent: Phaser.GameObjects.Container, bottomY: number): void;
}

export function createCardNote(
  scene: Phaser.Scene,
  view: CardView,
  w: number,
  onCheck: (link: Phaser.GameObjects.Container) => void,
): CardNote | null {
  if (!view.note) return null;
  const hasCheck = view.action === 'check' && !!view.actionLabel;
  const text = scene.add
    .text(0, 0, view.note, {
      fontFamily: THEME.FONT_BODY,
      fontSize: `${PURCHASE_UI.NOTE_FONT_PX}px`,
      color: view.tone === 'pending' ? PURCHASE_UI.PENDING_COLOR : THEME.TEXT_MUTED,
      wordWrap: { width: w - 2 * PURCHASE_UI.CARD_PAD_X - (hasCheck ? PURCHASE_UI.CHECK_LINK_W : 0) },
    })
    .setOrigin(0, 1);
  const label = hasCheck
    ? scene.add.text(0, 0, view.actionLabel!, {
        fontFamily: THEME.FONT_BODY,
        fontSize: `${PURCHASE_UI.CHECK_FONT_PX}px`,
        color: PURCHASE_UI.PENDING_COLOR,
        fontStyle: '700',
      })
    : null;
  return {
    extraH: Math.max(0, text.height + PURCHASE_UI.NOTE_GAP + PURCHASE_UI.NOTE_BOTTOM_PAD - PURCHASE_UI.NOTE_SLACK),
    place(parent, bottomY) {
      const y = bottomY - PURCHASE_UI.NOTE_BOTTOM_PAD;
      text.setPosition(-w / 2 + PURCHASE_UI.CARD_PAD_X, y);
      parent.add(text);
      if (label) {
        const x = w / 2 - PURCHASE_UI.CARD_PAD_X - PURCHASE_UI.CHECK_LINK_W / 2;
        parent.add(makeLink(scene, x, y - text.height / 2, label, PURCHASE_UI.CHECK_LINK_W, PURCHASE_UI.CHECK_LINK_H, onCheck));
      }
    },
  };
}

// ---- The purchase / restore sequence shared by the shop and Settings (review I1) ---------------------------------------

// What a surface lends the flow. `gate.purchasing` is the A.11 guard: set synchronously on tap, before any await, and also
// read by the surface's own redraw poll.
export interface PurchaseSurface {
  scene: Phaser.Scene; // for isActive() after the await, the toast, and the poll
  gate: { purchasing: boolean };
  toastY: () => number; // where this surface's toasts sit
  blocked?: () => boolean; // a surface-specific reason to ignore a tap or hold the poll (the shop mid-scroll; Settings closing)
  // A quiet restart of the surface carrying the toast across it (the restart would destroy a live one). `completed`: a
  // purchase just finished, so a cross-sell highlight need not survive the redraw.
  redraw: (toast?: ToastMessage, completed?: boolean) => void;
}

// The control the tap came from: dimmed while the call runs, restored when nothing changed.
export interface TapTarget {
  dim: () => void;
  undim: () => void;
}

export function dimmer(target: { setAlpha(alpha: number): unknown }): TapTarget {
  return {
    dim: () => void target.setAlpha(PURCHASE_UI.BUSY_ALPHA),
    undim: () => void target.setAlpha(1),
  };
}

// Guard and disable synchronously (A.11); false = ignore this tap.
function begin(s: PurchaseSurface, target: TapTarget): boolean {
  if (s.blocked?.() || s.gate.purchasing || IAP.inFlight()) return false;
  s.gate.purchasing = true;
  target.dim();
  return true;
}

// The shared tail of a purchase / restore: redraw (carrying the message across the restart) or just toast in place.
function finish(s: PurchaseSurface, fb: Feedback, target: TapTarget): void {
  s.gate.purchasing = false;
  if (fb.refresh) {
    s.redraw(toastOf(fb));
    return;
  }
  target.undim();
  showFeedbackToast(s.scene, fb, s.toastY()); // a cancel has no message: nothing at all
}

// A tap on a buyable card or button. Every outcome has its copy (A.4), a cancel has none. `onCelebrate` runs the surface's
// own fanfare and redraw after a purchase; the gate stays closed until that redraw resets the scene.
export async function runBuy(s: PurchaseSurface, packageId: string, target: TapTarget, onCelebrate: () => void): Promise<void> {
  if (!begin(s, target)) return;
  const outcome = await IAP.buy(packageId);
  if (!s.scene.scene.isActive()) return; // the player left during the Play sheet: the entitlement is already applied
  const fb = purchaseFeedback(outcome, isWebStore());
  if (fb.kind === 'celebrate') {
    onCelebrate();
    return;
  }
  finish(s, fb, target);
}

// "Check status" on a pending card: one restore of that product (the only way its marker is cleared early, A.5).
export async function runCheckStatus(s: PurchaseSurface, packageId: string, target: TapTarget): Promise<void> {
  if (!begin(s, target)) return;
  const result = await IAP.restore({ recheck: packageId });
  if (!s.scene.scene.isActive()) return;
  finish(s, restoreFeedback(result, { web: isWebStore(), recheck: true, ownedNow: IAP.owns(packageId) }), target);
}

// The Restore Purchases link: a user-initiated restore of everything (A.5), with a toast that lists what came back.
export async function runRestore(s: PurchaseSurface, target: TapTarget): Promise<void> {
  if (!begin(s, target)) return;
  const result = await IAP.restore();
  if (!s.scene.scene.isActive()) return;
  finish(s, restoreFeedback(result, { web: isWebStore(), recheck: false, ownedNow: false }), target);
}

// Remove Ads has no cosmetic to unveil: the level-complete chord and a thank-you toast carried across the redraw.
export function celebrateRemoveAds(s: PurchaseSurface): void {
  const audio = sharedAudio();
  audio.resume();
  audio.playLevelComplete();
  s.redraw({ message: PURCHASE_COPY.ADS_REMOVED, tone: 'info' }, true);
}

// May the surface redraw itself right now? Never mid-purchase, never while the surface is blocked (the shop mid-scroll) and
// never between a press and its release: a restart landing between pointerdown and pointerup would swallow that tap
// (review m3). It is not "sticky": it re-opens the moment the finger lifts.
export function pollMayRedraw(s: PurchaseSurface): boolean {
  return !s.gate.purchasing && !s.blocked?.() && !s.scene.input.activePointer.isDown;
}

// Offerings arrive, a pending payment completes (listener / foreground), a pending marker times out: poll what the cards
// show and redraw only when it changed. Also retries a failed init / missing offerings now, so a "…" card is never a dead
// end. Call once from the surface's create().
export function startPurchasePoll(s: PurchaseSurface, signature: () => string, redraw: () => void): void {
  void IAP.refresh();
  const shown = signature();
  s.scene.time.addEvent({
    delay: PURCHASE_UI.POLL_MS,
    loop: true,
    callback: () => {
      if (!pollMayRedraw(s) || signature() === shown) return;
      redraw();
    },
  });
}
