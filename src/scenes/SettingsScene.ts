import Phaser from 'phaser';
import { THEME } from '../config/theme.config';
import { PACKAGES, PURCHASE_COPY, PURCHASE_UI } from '../config/monetization.config';
import { Toggle } from '../ui/Toggle';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { drawGlass } from '../ui/glass';
import { drawIcon, type IconName } from '../ui/icons';
import { sharedAudio } from '../utils/AudioSynth';
import { SettingsStore } from '../utils/SettingsStore';
import { reducedMotionActive } from '../utils/a11y';
import { IAP } from '../services/IAP';
import { purchaseFeedback, restoreFeedback, type Feedback } from '../services/purchaseView';
import { cardViewFor, isWebStore, showFeedbackToast, toastOf, type ToastMessage } from '../ui/purchaseUi';
import { showToast } from '../ui/toast';
import type { Dismissable } from '../platform/pausable';

interface Row {
  icon: IconName;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

// Settings overlay launched on top of a paused caller scene (game or menu).
// Lightweight glass panel: Sound / Music / Haptics / Reduce Motion + close.
export class SettingsScene extends Phaser.Scene implements Dismissable {
  private caller = 'MainMenuScene';
  private closing = false;
  private purchasing = false; // a purchase / restore started here is running: taps are ignored, no redraw
  private toastY = 0; // where this overlay's toasts sit (just under the panel)

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(data: { caller?: string; quiet?: boolean; toast?: ToastMessage }): void {
    this.caller = data?.caller ?? 'MainMenuScene';
    this.closing = false; // reset: this scene is reused (singleton) across re-opens
    this.purchasing = false;
    const quiet = data?.quiet ?? false; // a silent redraw (same panel, new purchase state): no pop-in
    // Render above the launching scene regardless of scene-list order
    // (the list places this before GameScene).
    this.scene.bringToTop();
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Scrim — taps outside the panel close the overlay.
    this.add
      .rectangle(0, 0, width, height, 0x000000, THEME.SCRIM_ALPHA)
      .setOrigin(0)
      .setInteractive()
      .on('pointerdown', () => this.close());

    const s = SettingsStore.get();
    const rows: Row[] = [
      {
        icon: 'sound',
        label: 'Sound',
        value: s.sound,
        onChange: (v) => {
          SettingsStore.set('sound', v);
          sharedAudio().settingsChanged();
        },
      },
      {
        icon: 'music',
        label: 'Music',
        value: s.music,
        onChange: (v) => {
          SettingsStore.set('music', v);
          const audio = sharedAudio();
          audio.resume();
          if (v) audio.startAmbientPad();
          else audio.stopAmbientPad();
          audio.settingsChanged();
        },
      },
      { icon: 'haptics', label: 'Haptics', value: s.haptics, onChange: (v) => SettingsStore.set('haptics', v) },
      {
        icon: 'motion',
        label: 'Reduce Motion',
        value: reducedMotionActive(),
        onChange: (v) => SettingsStore.set('reduceMotion', v ? 'on' : 'off'),
      },
    ];

    const panelW = Math.min(width * 0.86, 340);
    const rowH = 58;
    const headerH = 64;
    // Honest store shortcuts (Wave 3 Task 4) — Remove-Ads + Restore Purchases, a second surface for what the Bundles
    // tab sells: an ordinary settings row, never a popup, never nagged. The row shows what the store can really do
    // (P00-T17): the store's price as a button, OWNED, a pending payment with Check status, "Available in the Android
    // app" on web, or "…" / Unavailable. The web build has nothing to restore, so it has no Restore link.
    const adsView = cardViewFor(PACKAGES.REMOVE_ADS);
    const web = isWebStore();
    const dividerGapTop = 14;
    const dividerGapBottom = 20;
    const removeAdsRowH = 44; // >=44px touch-target minimum (ui-ux lens)
    const checkLineH = 30; // a pending row adds its Check-status line
    const removeAdsH = removeAdsRowH + (adsView.action === 'check' ? checkLineH : 0);
    const removeAdsGap = 14;
    const restoreH = 30;
    const webBottomPad = 14; // the web build has no Restore link: keep the note clear of the panel edge
    const extrasH = dividerGapTop + dividerGapBottom + removeAdsH + (web ? webBottomPad : removeAdsGap + restoreH);
    const panelH = headerH + rows.length * rowH + extrasH + 18;
    this.toastY = cy + panelH / 2 + 34;
    const left = -panelW / 2;
    const top = -panelH / 2;

    // Everything lives in one container so the panel pops as a unit.
    const card = this.add.container(cx, cy).setDepth(1);

    const panel = this.add.graphics();
    drawGlass(panel, panelW, panelH, THEME.RADIUS);
    card.add(panel);

    const title = this.add
      .text(left + 22, top + 30, 'SETTINGS', {
        fontFamily: THEME.FONT_DISPLAY,
        fontSize: '20px',
        color: THEME.TEXT_PRIMARY,
        fontStyle: '700',
      })
      .setOrigin(0, 0.5);
    title.setLetterSpacing(2);
    card.add(title);

    const close = new IconButton(this, panelW / 2 - 26, top + 26, 'close', () => this.close(), {
      size: 40,
      iconSize: 18,
      round: true,
    });
    card.add(close.container);

    rows.forEach((row, i) => {
      const ry = top + headerH + i * rowH + rowH / 2;

      const icon = this.add.graphics().setPosition(left + 32, ry);
      drawIcon(icon, row.icon, 22, THEME.ACCENT_CYAN);
      card.add(icon);

      const label = this.add
        .text(left + 58, ry, row.label, {
          fontFamily: THEME.FONT_BODY,
          fontSize: '17px',
          color: THEME.TEXT_PRIMARY,
        })
        .setOrigin(0, 0.5);
      card.add(label);

      const toggle = new Toggle(this, panelW / 2 - 44, ry, row.value, row.onChange);
      card.add(toggle.container);
    });

    // Divider, then the store shortcuts computed above.
    let extraY = top + headerH + rows.length * rowH + dividerGapTop;
    const divider = this.add.graphics();
    divider.lineStyle(1, THEME.HAIRLINE, THEME.HAIRLINE_ALPHA);
    divider.lineBetween(left + 22, extraY, left + panelW - 22, extraY);
    card.add(divider);
    extraY += dividerGapBottom;

    let removeAdsBtn: Button | null = null;
    if (adsView.action === 'buy') {
      removeAdsBtn = new Button(
        this,
        0,
        extraY + removeAdsRowH / 2,
        `${PURCHASE_COPY.REMOVE_ADS} · ${adsView.label}`, // the store's own price
        () => void this.buy(removeAdsBtn),
        { width: panelW - 44, height: removeAdsRowH, fontSize: 15, fill: THEME.ACCENT_GOLD, textColor: THEME.TEXT_ON_PRIMARY },
      );
      card.add(removeAdsBtn.container);
    } else {
      // Not buyable right now: a quiet status row, never a button.
      const main = adsView.label ? `${PURCHASE_COPY.REMOVE_ADS} · ${adsView.label}` : PURCHASE_COPY.REMOVE_ADS;
      const mainY = adsView.note ? extraY + 12 : extraY + removeAdsRowH / 2;
      card.add(
        this.add
          .text(0, mainY, main, { fontFamily: THEME.FONT_BODY, fontSize: '15px', color: THEME.TEXT_MUTED, fontStyle: '600' })
          .setOrigin(0.5),
      );
      if (adsView.note) {
        card.add(
          this.add
            .text(0, extraY + 31, adsView.note, {
              fontFamily: THEME.FONT_BODY,
              fontSize: `${PURCHASE_UI.NOTE_FONT_PX + 1}px`,
              color: adsView.tone === 'pending' ? PURCHASE_UI.PENDING_COLOR : THEME.TEXT_MUTED,
              align: 'center',
              wordWrap: { width: panelW - 44 },
            })
            .setOrigin(0.5),
        );
      }
      if (adsView.action === 'check' && adsView.actionLabel) {
        const label = this.add
          .text(0, 0, adsView.actionLabel, { fontFamily: THEME.FONT_BODY, fontSize: '14px', color: PURCHASE_UI.PENDING_COLOR, fontStyle: '700' })
          .setOrigin(0.5);
        const link = this.add.container(0, extraY + removeAdsRowH + checkLineH / 2 - 4, [label]);
        link.setSize(PURCHASE_UI.CHECK_LINK_W + 40, PURCHASE_UI.CHECK_LINK_H);
        link.setInteractive(
          new Phaser.Geom.Rectangle(-(PURCHASE_UI.CHECK_LINK_W + 40) / 2, -PURCHASE_UI.CHECK_LINK_H / 2, PURCHASE_UI.CHECK_LINK_W + 40, PURCHASE_UI.CHECK_LINK_H),
          Phaser.Geom.Rectangle.Contains,
        );
        if (link.input) link.input.cursor = 'pointer';
        link.on('pointerup', () => void this.checkStatus(link));
        card.add(link);
      }
    }
    extraY += removeAdsH + removeAdsGap;

    if (!web) {
      const restore = this.add
        .text(0, extraY + restoreH / 2, 'Restore Purchases', {
          fontFamily: THEME.FONT_BODY,
          fontSize: '13px',
          color: THEME.TEXT_MUTED,
          fontStyle: '600',
        })
        .setOrigin(0.5);
      // Explicit >=44px hit area — the text glyphs alone are shorter than that.
      restore.setInteractive(new Phaser.Geom.Rectangle(-110, -22, 220, 44), Phaser.Geom.Rectangle.Contains);
      if (restore.input) restore.input.cursor = 'pointer';
      restore.on('pointerup', () => void this.restorePurchases(restore));
      card.add(restore);
    }

    if (!reducedMotionActive() && !quiet) {
      card.setScale(0.85);
      this.tweens.add({ targets: card, scale: 1, duration: 320, ease: THEME.EASE_POP });
    }

    void IAP.refresh(); // a failed init / missing offerings are retried now, so a "…" row is never a dead end
    // Offerings arrive, a pending payment completes (listener / foreground), a pending marker times out: redraw only
    // when what the row shows changed, and never mid-purchase.
    const shown = this.purchaseSignature();
    this.time.addEvent({
      delay: PURCHASE_UI.POLL_MS,
      loop: true,
      callback: () => {
        if (this.purchasing || this.closing || this.purchaseSignature() === shown) return;
        this.scene.restart({ caller: this.caller, quiet: true });
      },
    });
    if (data?.toast) showToast(this, data.toast.message, { tone: data.toast.tone, y: this.toastY });

    this.input.keyboard?.once('keydown-ESC', () => this.close());
  }

  // What the Remove Ads row renders, as one string: equal means nothing visible changed.
  private purchaseSignature(): string {
    return JSON.stringify([IAP.isPremium(), cardViewFor(PACKAGES.REMOVE_ADS)]);
  }

  // The shared tail of a purchase / restore: redraw (carrying the message across the restart) or just toast in place.
  private finish(fb: Feedback, undim: () => void): void {
    this.purchasing = false;
    if (fb.refresh) {
      this.scene.restart({ caller: this.caller, quiet: true, toast: toastOf(fb) });
      return;
    }
    undim();
    showFeedbackToast(this, fb, this.toastY); // a cancel has no message: nothing at all
  }

  // The Remove Ads button. Disables synchronously on tap (A.11); every outcome has its copy, a cancel has none.
  private async buy(button: Button | null): Promise<void> {
    if (this.purchasing || IAP.inFlight()) return;
    this.purchasing = true;
    button?.container.setAlpha(PURCHASE_UI.BUSY_ALPHA);
    const outcome = await IAP.buy(PACKAGES.REMOVE_ADS);
    if (!this.scene.isActive()) return; // closed during the Play sheet: the entitlement is already applied
    const fb = purchaseFeedback(outcome, isWebStore());
    if (fb.kind === 'celebrate') {
      const audio = sharedAudio();
      audio.resume();
      audio.playLevelComplete();
      this.purchasing = false;
      this.scene.restart({ caller: this.caller, quiet: true, toast: { message: PURCHASE_COPY.ADS_REMOVED, tone: 'info' } satisfies ToastMessage });
      return;
    }
    this.finish(fb, () => button?.container.setAlpha(1));
  }

  // "Check status" on a pending Remove Ads: one restore of that product (A.5).
  private async checkStatus(link: Phaser.GameObjects.Container): Promise<void> {
    if (this.purchasing || IAP.inFlight()) return;
    this.purchasing = true;
    link.setAlpha(PURCHASE_UI.BUSY_ALPHA);
    const result = await IAP.restore({ recheck: PACKAGES.REMOVE_ADS });
    if (!this.scene.isActive()) return;
    this.finish(restoreFeedback(result, { web: isWebStore(), recheck: true, ownedNow: IAP.owns(PACKAGES.REMOVE_ADS) }), () => link.setAlpha(1));
  }

  // Restore Purchases: user-initiated, all entitlements (A.5), with a toast that lists what came back.
  private async restorePurchases(link: Phaser.GameObjects.Text): Promise<void> {
    if (this.purchasing || IAP.inFlight()) return;
    this.purchasing = true;
    link.setAlpha(PURCHASE_UI.BUSY_ALPHA);
    const result = await IAP.restore();
    if (!this.scene.isActive()) return;
    this.finish(restoreFeedback(result, { web: isWebStore(), recheck: false, ownedNow: false }), () => link.setAlpha(1));
  }

  // Public: the Android Back router closes this overlay through the Dismissable contract (src/platform/lifecycle.ts).
  close(): void {
    if (this.closing) return; // scrim + ✕ + ESC can all fire; resume the caller exactly once
    this.closing = true;
    this.scene.resume(this.caller);
    this.scene.stop();
  }
}
