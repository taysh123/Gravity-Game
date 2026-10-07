import Phaser from 'phaser';
import { THEME } from '../config/theme.config';
import { PACKAGES, PURCHASE_COPY, PURCHASE_UI } from '../config/monetization.config';
import { PRIVACY_UI } from '../config/consent.config';
import { PLATFORM } from '../config/platform.config';
import { Toggle } from '../ui/Toggle';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { drawGlass } from '../ui/glass';
import { setTapArea } from '../ui/hitArea';
import { drawIcon, type IconName } from '../ui/icons';
import { sharedAudio } from '../utils/AudioSynth';
import { SettingsStore } from '../utils/SettingsStore';
import { reducedMotionActive } from '../utils/a11y';
import {
  cardViewFor,
  celebrateRemoveAds,
  dimmer,
  isWebStore,
  makeLink,
  purchaseSignature,
  runBuy,
  runCheckStatus,
  runRestore,
  startPurchasePoll,
  type PurchaseSurface,
  type ToastMessage,
} from '../ui/purchaseUi';
import { showToast } from '../ui/toast';
import { Analytics } from '../services/Analytics';
import { openPrivacyChoices } from '../services/bootServices';
import { Consent } from '../services/Consent';
import type { Dismissable } from '../platform/pausable';

interface Row {
  icon: IconName;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

// "Privacy choices" is offered only when UMP's requirement status is REQUIRED (Consent.current() is null on the web, where it never is).
function privacyChoicesShown(): boolean {
  return Consent.current()?.privacyOptionsRequired === true;
}

// Opens the hosted privacy policy. On Android this reaches the system browser: window.open() falls through to the WebView navigation,
// which Capacitor's BridgeWebViewClient.shouldOverrideUrlLoading hands to Bridge.launchIntent, and a host other than the app's own is
// started as an ACTION_VIEW intent (node_modules/@capacitor/android .../Bridge.java launchIntent). On the web it opens a new tab.
function openPrivacyPolicy(): void {
  try {
    window.open(PLATFORM.PRIVACY_POLICY_URL, '_blank');
  } catch {
    // no window to open (blocked): nothing to do, the policy is also linked from the store listing
  }
}

// Settings overlay launched on top of a paused caller scene (game or menu).
// Lightweight glass panel: Sound / Music / Haptics / Reduce Motion + close.
export class SettingsScene extends Phaser.Scene implements Dismissable {
  private caller = 'MainMenuScene';
  private closing = false;
  private readonly gate = { purchasing: false }; // a purchase / restore started here is running: taps are ignored, no redraw
  private toastY = 0; // where this overlay's toasts sit (just under the panel)
  private resetArm: Phaser.Time.TimerEvent | null = null; // "Reset analytics data" is armed (first tap done) until this timer fires
  // What the shared purchase flow (ui/purchaseUi.ts) needs from this scene.
  private readonly surface: PurchaseSurface = {
    scene: this,
    gate: this.gate,
    toastY: () => this.toastY,
    blocked: () => this.closing,
    redraw: (toast) => this.scene.restart({ caller: this.caller, quiet: true, toast }),
  };

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(data: { caller?: string; quiet?: boolean; toast?: ToastMessage }): void {
    this.caller = data?.caller ?? 'MainMenuScene';
    this.closing = false; // reset: this scene is reused (singleton) across re-opens
    this.gate.purchasing = false;
    this.resetArm = null; // a restart destroyed the scene's timers with it
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
    const contentW = panelW - 44; // the panel's inner width (22px each side)
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
    // The pending / web note is created now: its measured height (it may wrap on a narrow screen) sizes the panel.
    const statusNote = adsView.note
      ? this.add
          .text(0, 0, adsView.note, {
            fontFamily: THEME.FONT_BODY,
            fontSize: `${PURCHASE_UI.NOTE_FONT_PX}px`,
            color: adsView.tone === 'pending' ? PURCHASE_UI.PENDING_COLOR : THEME.TEXT_MUTED,
            align: 'center',
            wordWrap: { width: contentW },
          })
          .setOrigin(0.5, 0)
      : null;
    const noteBottom = statusNote ? PURCHASE_UI.SETTINGS_NOTE_TOP + statusNote.height : 0; // from the top of the row
    const hasCheck = adsView.action === 'check' && !!adsView.actionLabel;
    const removeAdsH = adsView.action === 'buy' ? removeAdsRowH : Math.max(removeAdsRowH, noteBottom + (hasCheck ? PURCHASE_UI.CHECK_LINK_H : 0));
    const removeAdsGap = 14;
    const restoreH = 30;
    const extrasH = dividerGapTop + dividerGapBottom + removeAdsH + (web ? PURCHASE_UI.SETTINGS_WEB_BOTTOM_PAD : removeAdsGap + restoreH);
    // Privacy entry points (D-10): "Privacy choices" only when UMP says the requirement is REQUIRED (never on the web, which has
    // no consent layer), always "Privacy policy" and "Reset analytics data". Each is a PRIVACY_UI.LINK_H (>= 44px) tap row.
    const privacyChoices = privacyChoicesShown();
    const privacyRowCount = (privacyChoices ? 1 : 0) + 2;
    const privacyH = PRIVACY_UI.SECTION_DIVIDER_GAP + 1 + PRIVACY_UI.SECTION_GAP_TOP + privacyRowCount * PRIVACY_UI.LINK_H;
    const panelH = headerH + rows.length * rowH + extrasH + privacyH + 18;
    this.toastY = cy + panelH / 2 + PURCHASE_UI.SETTINGS_TOAST_BELOW_PANEL;
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

    if (adsView.action === 'buy') {
      const removeAdsBtn: Button = new Button(
        this,
        0,
        extraY + removeAdsRowH / 2,
        `${PURCHASE_COPY.REMOVE_ADS} · ${adsView.label}`, // the store's own price
        () => void runBuy(this.surface, PACKAGES.REMOVE_ADS, dimmer(removeAdsBtn.container), () => celebrateRemoveAds(this.surface)),
        { width: contentW, height: removeAdsRowH, fontSize: 15, fill: THEME.ACCENT_GOLD, textColor: THEME.TEXT_ON_PRIMARY },
      );
      card.add(removeAdsBtn.container);
    } else {
      // Not buyable right now: a quiet status row, never a button.
      const main = adsView.label ? `${PURCHASE_COPY.REMOVE_ADS} · ${adsView.label}` : PURCHASE_COPY.REMOVE_ADS;
      const mainY = statusNote ? extraY + PURCHASE_UI.SETTINGS_STATUS_TITLE_Y : extraY + removeAdsRowH / 2;
      card.add(
        this.add
          .text(0, mainY, main, {
            fontFamily: THEME.FONT_BODY,
            fontSize: `${PURCHASE_UI.SETTINGS_STATUS_FONT_PX}px`,
            color: THEME.TEXT_MUTED,
            fontStyle: '600',
          })
          .setOrigin(0.5),
      );
      if (statusNote) {
        statusNote.setPosition(0, extraY + PURCHASE_UI.SETTINGS_NOTE_TOP);
        card.add(statusNote);
      }
      if (hasCheck) {
        const label = this.add.text(0, 0, adsView.actionLabel!, {
          fontFamily: THEME.FONT_BODY,
          fontSize: `${PURCHASE_UI.CHECK_FONT_PX}px`,
          color: PURCHASE_UI.PENDING_COLOR,
          fontStyle: '700',
        });
        card.add(
          makeLink(
            this,
            0,
            extraY + noteBottom + PURCHASE_UI.CHECK_LINK_H / 2,
            label,
            PURCHASE_UI.SETTINGS_CHECK_LINK_W,
            PURCHASE_UI.CHECK_LINK_H,
            (link) => void runCheckStatus(this.surface, PACKAGES.REMOVE_ADS, dimmer(link)),
          ),
        );
      }
    }
    extraY += removeAdsH + removeAdsGap;

    if (!web) {
      const label = this.add.text(0, 0, 'Restore Purchases', {
        fontFamily: THEME.FONT_BODY,
        fontSize: `${PURCHASE_UI.RESTORE_FONT_PX}px`,
        color: THEME.TEXT_MUTED,
        fontStyle: '600',
      });
      // An explicit >=44px hit area — the text glyphs alone are shorter than that.
      card.add(
        makeLink(
          this,
          0,
          extraY + restoreH / 2,
          label,
          PURCHASE_UI.RESTORE_LINK_W,
          PURCHASE_UI.RESTORE_LINK_H,
          (link) => void runRestore(this.surface, dimmer(link)),
        ),
      );
    }

    // Privacy section: a hairline, then the rows edge to edge so no two tap areas overlap.
    let privacyY = top + headerH + rows.length * rowH + extrasH + PRIVACY_UI.SECTION_DIVIDER_GAP; // extrasH ends where the store rows end
    const privacyDivider = this.add.graphics();
    privacyDivider.lineStyle(1, THEME.HAIRLINE, THEME.HAIRLINE_ALPHA);
    privacyDivider.lineBetween(left + 22, privacyY, left + panelW - 22, privacyY);
    card.add(privacyDivider);
    privacyY += 1 + PRIVACY_UI.SECTION_GAP_TOP;
    const privacyLabel = (text: string): Phaser.GameObjects.Text =>
      this.add.text(0, 0, text, { fontFamily: THEME.FONT_BODY, fontSize: `${PRIVACY_UI.FONT_PX}px`, color: THEME.TEXT_MUTED, fontStyle: '600' });
    const addPrivacyRow = (label: Phaser.GameObjects.Text, onTap: (link: Phaser.GameObjects.Container) => void): void => {
      card.add(makeLink(this, 0, privacyY + PRIVACY_UI.LINK_H / 2, label, PRIVACY_UI.LINK_W, PRIVACY_UI.LINK_H, onTap));
      privacyY += PRIVACY_UI.LINK_H;
    };
    if (privacyChoices) addPrivacyRow(privacyLabel(PRIVACY_UI.LABEL_CHOICES), (link) => void this.runPrivacyChoices(link));
    addPrivacyRow(privacyLabel(PRIVACY_UI.LABEL_POLICY), () => openPrivacyPolicy());
    const resetLabel = privacyLabel(PRIVACY_UI.LABEL_RESET);
    addPrivacyRow(resetLabel, () => this.tapReset(resetLabel));

    // The panel body swallows taps: only the scrim OUTSIDE the panel closes the overlay. The card is interactive over the panel's
    // rectangle but has no handler; its controls are children of it, and a child sorts above its parent container, so they still
    // get their own taps. Without this, a tap on blank panel space (between two rows) fell through to the scrim and closed Settings.
    setTapArea(card, panelW, panelH);

    if (!reducedMotionActive() && !quiet) {
      card.setScale(0.85);
      this.tweens.add({ targets: card, scale: 1, duration: 320, ease: THEME.EASE_POP });
    }

    // Offerings arrive, a pending payment completes (listener / foreground), a pending marker times out: redraw only when
    // what the row shows changed, never mid-purchase and never between a press and its release.
    // The "Privacy choices" row appears when the consent answer arrives after Settings opened, so its visibility is part of the signature.
    startPurchasePoll(
      this.surface,
      () => `${purchaseSignature([{ packageId: PACKAGES.REMOVE_ADS }])}|${privacyChoicesShown()}`,
      () => this.surface.redraw(),
    );
    if (data?.toast) showToast(this, data.toast.message, { tone: data.toast.tone, y: this.toastY });

    this.input.keyboard?.once('keydown-ESC', () => this.close());
  }

  // "Privacy choices": the UMP privacy options form, then the answer is applied (analytics consent, ad gate). The purchase gate
  // is held for the duration so the poll cannot redraw the panel under the native form; afterwards a quiet redraw refreshes it.
  private async runPrivacyChoices(link: Phaser.GameObjects.Container): Promise<void> {
    if (this.closing || this.gate.purchasing) return;
    this.gate.purchasing = true;
    link.setAlpha(PURCHASE_UI.BUSY_ALPHA);
    try {
      await openPrivacyChoices();
    } finally {
      this.gate.purchasing = false;
    }
    if (this.closing || !this.scene.isActive()) return;
    this.surface.redraw();
  }

  // "Reset analytics data": an in-game two-tap confirm (native dialogs are unreliable in the WebView). The first tap arms the row for
  // PRIVACY_UI.RESET_CONFIRM_MS and changes its label; the second tap inside the window runs it; an armed row that is left alone
  // quietly disarms.
  private tapReset(label: Phaser.GameObjects.Text): void {
    if (this.closing) return;
    if (!this.resetArm) {
      label.setText(PRIVACY_UI.LABEL_RESET_CONFIRM).setColor(PRIVACY_UI.CONFIRM_COLOR);
      this.resetArm = this.time.delayedCall(PRIVACY_UI.RESET_CONFIRM_MS, () => {
        this.resetArm = null;
        label.setText(PRIVACY_UI.LABEL_RESET).setColor(THEME.TEXT_MUTED);
      });
      return;
    }
    this.resetArm.remove(false);
    this.resetArm = null;
    label.setText(PRIVACY_UI.LABEL_RESET).setColor(THEME.TEXT_MUTED);
    void this.runReset();
  }

  private async runReset(): Promise<void> {
    let failed = false;
    try {
      await Analytics.resetData();
    } catch {
      failed = true;
    }
    if (this.closing || !this.scene.isActive()) return;
    showToast(this, failed ? PRIVACY_UI.TOAST_RESET_FAILED : PRIVACY_UI.TOAST_RESET_DONE, { tone: failed ? 'error' : 'info', y: this.toastY });
  }

  // Public: the Android Back router closes this overlay through the Dismissable contract (src/platform/lifecycle.ts).
  close(): void {
    if (this.closing) return; // scrim + ✕ + ESC can all fire; resume the caller exactly once
    this.closing = true;
    this.scene.resume(this.caller);
    this.scene.stop();
  }
}
