import Phaser from 'phaser';
import { THEME } from '../config/theme.config';
import { SPLASH } from '../config/splash.config';
import { RARITY } from '../config/cosmetics.config';
import { BUNDLES, type BundleDef } from '../config/monetization.config';
import { CosmicBackground } from '../entities/CosmicBackground';
import { Button } from '../ui/Button';
import { drawGlass } from '../ui/glass';
import { fadeIn, fadeToScene } from '../utils/transitions';
import { reducedMotionActive, safeAreaInsetsScaled } from '../utils/a11y';
import { cosmeticsByCategory, cosmeticById, COSMETICS, type Cosmetic, type Category } from '../utils/cosmetics';
import { purchaseCost } from '../utils/cosmeticsLogic';
import { claimCollectionRewards } from '../utils/Rewards';
import { CosmeticStore } from '../utils/CosmeticStore';
import { sharedAudio } from '../utils/AudioSynth';
import { CurrencyStore } from '../utils/CurrencyStore';
import { FragmentStore } from '../utils/FragmentStore';
import { IAP } from '../utils/IAP';
import { Ads } from '../utils/Ads';
import { RewardStore } from '../utils/RewardStore';
import { Analytics } from '../utils/Analytics';
import { shopOpen, storeTab, cosmeticEquip, fragmentEarned, rewardedOffered } from '../utils/analyticsEvents';

const FREE_FRAGMENTS = 5; // daily rewarded grant

type Tab = 'skin' | 'trail' | 'arrival' | 'bundle';
const TABS: { key: Tab; label: string }[] = [
  { key: 'skin', label: 'Skins' },
  { key: 'trail', label: 'Trails' },
  { key: 'arrival', label: 'Arrivals' },
  { key: 'bundle', label: 'Bundles' },
];
const CARD_H = 64;
const CARD_GAP = 9;
const STARDUST = '#ffd166';
const FRAGMENT = '#c9a8ff';
const SD = '✦'; // ✦ stardust
const FR = '◆'; // ◆ fragment

// The store: a tabbed, scrollable shop for skins / trails / arrivals + premium
// bundles. Rarity badges, locked previews, owned/equipped indicators, dual currency.
export class CosmeticsScene extends Phaser.Scene {
  private cosmic!: CosmicBackground;
  private tab: Tab = 'skin';
  private dragging = false;

  constructor() {
    super({ key: 'CosmeticsScene' });
  }

  init(data: { tab?: Tab }): void {
    this.tab = data?.tab ?? 'skin';
  }

  create(): void {
    Analytics.track(shopOpen(this.tab));
    const { width, height } = this.scale;
    const cx = width / 2;
    const sx = this.scale.displaySize.width / this.scale.gameSize.width;
    const sy = this.scale.displaySize.height / this.scale.gameSize.height;
    const insets = safeAreaInsetsScaled(sx, sy);

    this.cosmic = new CosmicBackground(this);
    fadeIn(this);

    // Header: title + dual-currency chips.
    const topY = Math.max(height * 0.055, insets.top + 30);
    this.add.text(cx, topY, 'STORE', {
      fontFamily: THEME.FONT_DISPLAY, fontSize: '22px', color: THEME.TEXT_PRIMARY, fontStyle: '700',
    }).setOrigin(0.5).setLetterSpacing(3);
    this.add.text(cx, topY + 26, `${CurrencyStore.balance()} ${SD}    ${FragmentStore.balance()} ${FR}`, {
      fontFamily: THEME.FONT_BODY, fontSize: '15px', color: '#cfe0ff', fontStyle: '600',
    }).setOrigin(0.5);
    // Collection progress (retention): total cosmetics unlocked. Completing the
    // whole collection earns a gold flourish — personality + a reason to chase 100%.
    const unlocked = CosmeticStore.ownedIds().filter((id) => cosmeticById(id)).length;
    const complete = unlocked === COSMETICS.length;
    this.add.text(cx, topY + 44, complete ? '✦ COLLECTION COMPLETE ✦' : `${unlocked} / ${COSMETICS.length} unlocked`, {
      fontFamily: THEME.FONT_BODY, fontSize: '11px',
      color: complete ? STARDUST : THEME.TEXT_MUTED, fontStyle: complete ? '700' : '400',
    }).setOrigin(0.5);

    // Tabs.
    const tabY = topY + 58;
    const tabW = Math.min(width * 0.92, 360) / TABS.length;
    TABS.forEach((t, i) => {
      const tx = cx - (tabW * (TABS.length - 1)) / 2 + i * tabW;
      const active = t.key === this.tab;
      const g = this.add.graphics();
      if (active) {
        g.fillStyle(THEME.ACCENT_GOLD, 0.16);
        g.fillRoundedRect(tx - tabW / 2 + 3, tabY - 15, tabW - 6, 30, 8);
      }
      const txt = this.add.text(tx, tabY, t.label, {
        fontFamily: THEME.FONT_DISPLAY, fontSize: '14px',
        color: active ? STARDUST : THEME.TEXT_MUTED, fontStyle: '600',
      }).setOrigin(0.5);
      txt.setInteractive({ useHandCursor: true });
      txt.on('pointerup', () => {
        if (this.dragging || t.key === this.tab) return;
        Analytics.track(storeTab(t.key)); // tab-switch intent (Bundles = strongest IAP signal)
        this.scene.restart({ tab: t.key });
      });
    });

    // Scrollable content viewport.
    const contentTop = tabY + 30;
    const backY = Math.min(height - Math.max(SPLASH.SAFE_AREA_MIN_PAD, insets.bottom) - 30, height * 0.95);
    const contentBottom = backY - 34;
    const viewportH = contentBottom - contentTop;
    const rowW = Math.min(width * 0.92, 360);

    const listC = this.add.container(cx, contentTop);
    const cards = this.tab === 'bundle'
      ? [this.freeFragmentsCard(rowW, 0), this.removeAdsCard(rowW, 1), ...BUNDLES.map((b, i) => this.bundleCard(b, rowW, i + 2))]
      : cosmeticsByCategory(this.tab as Category).map((c, i) => this.itemCard(c, rowW, i));
    let yy = CARD_H / 2;
    cards.forEach((card) => { card.y = yy; listC.add(card); yy += card.height + CARD_GAP; });
    // Restore-purchases link (store requirement) on the Bundles tab.
    if (this.tab === 'bundle') {
      const restore = this.add.text(0, yy + 4, 'Restore Purchases', {
        fontFamily: THEME.FONT_BODY, fontSize: '13px', color: THEME.TEXT_MUTED, fontStyle: '600',
      }).setOrigin(0.5);
      restore.setInteractive({ useHandCursor: true });
      restore.on('pointerup', async () => { if (this.dragging) return; await IAP.restorePurchases(); this.scene.restart({ tab: 'bundle' }); });
      listC.add(restore); yy += 36;
    }
    const totalH = yy;

    // Mask the content to the viewport so cards don't bleed over header/back.
    const maskG = this.make.graphics({}, false);
    maskG.fillRect(0, contentTop, width, viewportH);
    listC.setMask(maskG.createGeometryMask());

    // Drag / wheel scroll.
    const minY = contentTop - Math.max(0, totalH - viewportH);
    const maxY = contentTop;
    let dragStartPy = 0; let listStartY = 0;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { dragStartPy = p.y; listStartY = listC.y; this.dragging = false; });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      const dy = p.y - dragStartPy;
      if (Math.abs(dy) > 6) this.dragging = true;
      listC.y = Phaser.Math.Clamp(listStartY + dy, minY, maxY);
    });
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dyy: number) => {
      listC.y = Phaser.Math.Clamp(listC.y - dyy * 0.5, minY, maxY);
    });

    new Button(this, cx, backY, '← Back', () => fadeToScene(this, 'MainMenuScene'), { width: 150, height: 46, fontSize: 18 });
  }

  // A cosmetic row: preview + name + rarity badge + status/price.
  private itemCard(c: Cosmetic, w: number, i: number): Phaser.GameObjects.Container {
    const owned = CosmeticStore.isOwned(c.id);
    const equipped = CosmeticStore.equippedId(c.category) === c.id;
    const price = purchaseCost(c);
    const locked = !owned && !price; // bundle / achievement only

    const bg = this.add.graphics();
    drawGlass(bg, w, CARD_H, THEME.RADIUS_SM);
    if (equipped) {
      bg.lineStyle(2, THEME.ACCENT_GOLD, 0.7);
      bg.strokeRoundedRect(-w / 2, -CARD_H / 2, w, CARD_H, THEME.RADIUS_SM);
    }

    const preview = this.add.graphics().setAlpha(locked ? 0.35 : 1);
    this.drawPreview(preview, c, -w / 2 + 34, 0);

    const name = this.add.text(-w / 2 + 64, -9, c.name, {
      fontFamily: THEME.FONT_DISPLAY, fontSize: '15px', color: locked ? THEME.TEXT_MUTED : THEME.TEXT_PRIMARY, fontStyle: '600',
    }).setOrigin(0, 0.5);

    const r = RARITY[c.rarity];
    const badge = this.add.text(-w / 2 + 64, 11, r.label.toUpperCase(), {
      fontFamily: THEME.FONT_BODY, fontSize: '10px', color: '#0d0d1a',
      backgroundColor: `#${r.color.toString(16).padStart(6, '0')}`, fontStyle: '700',
      padding: { x: 5, y: 2 },
    }).setOrigin(0, 0.5);

    const status = equipped ? 'EQUIPPED' : owned ? 'EQUIP' : locked ? 'LOCKED'
      : `${price!.cost} ${price!.currency === 'fragments' ? FR : SD}`;
    const statusColor = equipped ? STARDUST : owned ? THEME.TEXT_PRIMARY : locked ? THEME.TEXT_MUTED
      : price!.currency === 'fragments' ? FRAGMENT : '#9ad0ff';
    const tag = this.add.text(w / 2 - 16, -7, status, {
      fontFamily: THEME.FONT_BODY, fontSize: '13px', color: statusColor, fontStyle: '700',
    }).setOrigin(1, 0.5);
    const children: Phaser.GameObjects.GameObject[] = [bg, preview, name, badge, tag];
    if (locked && c.unlockHint) {
      children.push(this.add.text(w / 2 - 16, 11, c.unlockHint, {
        fontFamily: THEME.FONT_BODY, fontSize: '10px', color: THEME.TEXT_MUTED,
      }).setOrigin(1, 0.5));
    }

    const card = this.add.container(0, 0, children);
    card.setSize(w, CARD_H);
    if (!equipped) {
      card.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -CARD_H / 2, w, CARD_H), Phaser.Geom.Rectangle.Contains);
      card.on('pointerup', () => {
        if (this.dragging) return;
        const result = CosmeticStore.buyOrEquip(c.id);
        if (result === 'cantAfford' || result === 'locked') { this.cameras.main.shake(110, 0.004); return; }
        Analytics.track(cosmeticEquip(c.id));
        claimCollectionRewards();
        // A new unlock gets a celebratory moment; a re-equip just refreshes.
        if (result === 'bought') this.playUnlockFanfare(c, () => this.scene.restart({ tab: this.tab }));
        else this.scene.restart({ tab: this.tab });
      });
    }
    this.entrance(card, i);
    return card;
  }

  // Free Fragments — an optional, daily-capped rewarded ad (never required).
  private freeFragmentsCard(w: number, i: number): Phaser.GameObjects.Container {
    const claimed = RewardStore.claimedToday('free_fragments');
    const h = CARD_H;
    const bg = this.add.graphics();
    drawGlass(bg, w, h, THEME.RADIUS_SM);
    bg.lineStyle(2, claimed ? 0x8a8f98 : 0xc9a8ff, 0.5);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, THEME.RADIUS_SM);
    const name = this.add.text(-w / 2 + 18, -9, 'Free Fragments', {
      fontFamily: THEME.FONT_DISPLAY, fontSize: '15px', color: FRAGMENT, fontStyle: '700',
    }).setOrigin(0, 0.5);
    const blurb = this.add.text(-w / 2 + 18, 11, claimed ? 'Claimed — come back tomorrow' : 'Watch a short ad (optional)', {
      fontFamily: THEME.FONT_BODY, fontSize: '11px', color: THEME.TEXT_MUTED,
    }).setOrigin(0, 0.5);
    const tag = this.add.text(w / 2 - 16, 0, claimed ? 'DONE' : `▶ +${FREE_FRAGMENTS} ◆`, {
      fontFamily: THEME.FONT_BODY, fontSize: '13px', color: claimed ? THEME.TEXT_MUTED : '#7affb0', fontStyle: '700',
    }).setOrigin(1, 0.5);
    const card = this.add.container(0, 0, [bg, name, blurb, tag]);
    card.setSize(w, h);
    if (!claimed) {
      Analytics.track(rewardedOffered('free_fragments')); // offer impression, fires once on render
      card.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
      card.on('pointerup', async () => {
        if (this.dragging) return;
        const earned = await Ads.showRewarded('free_fragments');
        if (earned) {
          FragmentStore.add(FREE_FRAGMENTS);
          RewardStore.claim('free_fragments');
          Analytics.track(fragmentEarned(FREE_FRAGMENTS, 'rewarded'));
          this.scene.restart({ tab: 'bundle' });
        }
      });
    }
    this.entrance(card, i);
    return card;
  }

  // Standalone Remove-Ads card (premium upsell, separate from the bundles).
  private removeAdsCard(w: number, i: number): Phaser.GameObjects.Container {
    const premium = IAP.isPremium();
    const h = CARD_H + 22;
    const bg = this.add.graphics();
    drawGlass(bg, w, h, THEME.RADIUS_SM);
    bg.lineStyle(2, premium ? 0x7affb0 : THEME.ACCENT_GOLD, 0.6);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, THEME.RADIUS_SM);
    const name = this.add.text(-w / 2 + 18, -h / 2 + 16, 'Remove Ads', {
      fontFamily: THEME.FONT_DISPLAY, fontSize: '16px', color: STARDUST, fontStyle: '700',
    }).setOrigin(0, 0.5);
    const blurb = this.add.text(-w / 2 + 18, 6, premium ? 'Ads removed — thank you!' : 'No interstitials, ever. Rewarded ads stay optional.', {
      fontFamily: THEME.FONT_BODY, fontSize: '12px', color: THEME.TEXT_MUTED, wordWrap: { width: w - 120 },
    }).setOrigin(0, 0.5);
    const price = this.add.text(w / 2 - 18, -h / 2 + 18, premium ? 'OWNED' : '$1.99', {
      fontFamily: THEME.FONT_DISPLAY, fontSize: '15px', color: premium ? THEME.TEXT_MUTED : '#7affb0', fontStyle: '700',
    }).setOrigin(1, 0.5);
    const card = this.add.container(0, 0, [bg, name, blurb, price]);
    card.setSize(w, h);
    if (!premium) {
      card.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
      card.on('pointerup', async () => {
        if (this.dragging) return;
        const ok = await IAP.buyRemoveAds();
        if (ok) this.scene.restart({ tab: 'bundle' });
        else this.cameras.main.shake(110, 0.004);
      });
    }
    this.entrance(card, i);
    return card;
  }

  // A premium bundle card (price button -> IAP.buyBundle; web stub grants).
  private bundleCard(b: BundleDef, w: number, i: number): Phaser.GameObjects.Container {
    const h = CARD_H + 22;
    const owned = b.grants.every((id) => CosmeticStore.isOwned(id));
    const bg = this.add.graphics();
    drawGlass(bg, w, h, THEME.RADIUS_SM);
    bg.lineStyle(2, THEME.ACCENT_GOLD, owned ? 0.4 : 0.7);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, THEME.RADIUS_SM);

    const name = this.add.text(-w / 2 + 18, -h / 2 + 16, b.name, {
      fontFamily: THEME.FONT_DISPLAY, fontSize: '16px', color: STARDUST, fontStyle: '700',
    }).setOrigin(0, 0.5);
    const blurb = this.add.text(-w / 2 + 18, 6, b.blurb, {
      fontFamily: THEME.FONT_BODY, fontSize: '12px', color: THEME.TEXT_MUTED,
      wordWrap: { width: w - 120 },
    }).setOrigin(0, 0.5);
    const priceTxt = this.add.text(w / 2 - 18, -h / 2 + 18, owned ? 'OWNED' : b.priceLabel, {
      fontFamily: THEME.FONT_DISPLAY, fontSize: '15px', color: owned ? THEME.TEXT_MUTED : '#7affb0', fontStyle: '700',
    }).setOrigin(1, 0.5);

    const card = this.add.container(0, 0, [bg, name, blurb, priceTxt]);
    card.setSize(w, h);
    if (!owned) {
      card.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
      card.on('pointerup', async () => {
        if (this.dragging) return;
        const ok = await IAP.buyBundle(b.id);
        if (ok) { claimCollectionRewards(); this.scene.restart({ tab: 'bundle' }); }
        else this.cameras.main.shake(110, 0.004);
      });
    }
    this.entrance(card, i);
    return card;
  }

  // Category-specific preview drawn at (x,y).
  private drawPreview(g: Phaser.GameObjects.Graphics, c: Cosmetic, x: number, y: number): void {
    if (c.category === 'skin') {
      g.lineStyle(3, c.glow ?? 0xffffff, 0.6); g.strokeCircle(x, y, 16);
      g.fillStyle(c.fill ?? 0xffffff, 1); g.fillCircle(x, y, 12);
      if (c.accent) { g.fillStyle(c.accent, 0.9); g.fillCircle(x + 4, y - 4, 6); }
    } else if (c.category === 'trail' && c.trail) {
      const cols = c.trail.colors.length ? c.trail.colors : [0xffd166];
      if (c.trail.style === 'lightning') {
        g.lineStyle(2, cols[0], 0.9);
        g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x - 4, y - 6); g.lineTo(x + 4, y + 6); g.lineTo(x + 14, y); g.strokePath();
      } else {
        for (let k = 0; k < 5; k++) {
          g.fillStyle(cols[k % cols.length], 0.85 - k * 0.13);
          g.fillCircle(x + 13 - k * 6.5, y, 6 - k * 0.7);
        }
      }
    } else if (c.category === 'arrival' && c.arrival) {
      g.fillStyle(c.arrival.particle, 0.95);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        g.fillCircle(x + Math.cos(a) * 12, y + Math.sin(a) * 12, 2.4);
      }
      g.fillStyle(c.arrival.flash, 0.9); g.fillCircle(x, y, 4);
    }
  }

  private entrance(card: Phaser.GameObjects.Container, i: number): void {
    if (reducedMotionActive()) return;
    card.setAlpha(0).setScale(0.97);
    this.tweens.add({ targets: card, alpha: 1, scale: 1, delay: 30 + i * 26, duration: 260, ease: THEME.EASE });
  }

  // Celebratory overlay when a NEW cosmetic is unlocked (the audit's missing "unlock
  // fanfare"): a rarity-tinted burst, a scaled-up preview, and an "UNLOCKED" card,
  // with the level-complete chord. Input is gated until it dismisses to onDone.
  private playUnlockFanfare(c: Cosmetic, onDone: () => void): void {
    this.input.enabled = false;
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const rarity = RARITY[c.rarity];
    const rarityHex = `#${rarity.color.toString(16).padStart(6, '0')}`;
    const reduced = reducedMotionActive();

    const audio = sharedAudio();
    audio.resume();
    audio.playLevelComplete();

    const scrim = this.add.graphics().setDepth(60);
    scrim.fillStyle(0x000000, 0.6);
    scrim.fillRect(0, 0, width, height);

    const panelW = Math.min(width * 0.8, 300);
    const panelH = 156;
    const panel = this.add.graphics();
    drawGlass(panel, panelW, panelH, THEME.RADIUS);
    panel.lineStyle(2, rarity.color, 0.8);
    panel.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, THEME.RADIUS);

    const head = this.add.text(0, -54, 'UNLOCKED', {
      fontFamily: THEME.FONT_DISPLAY, fontSize: '16px', color: rarityHex, fontStyle: '700',
    }).setOrigin(0.5).setLetterSpacing(3);
    const preview = this.add.graphics();
    this.drawPreview(preview, c, 0, 0);
    preview.setScale(reduced ? 1.6 : 2.0);
    const name = this.add.text(0, 38, c.name, {
      fontFamily: THEME.FONT_DISPLAY, fontSize: '18px', color: THEME.TEXT_PRIMARY, fontStyle: '700',
    }).setOrigin(0.5);
    const rlabel = this.add.text(0, 60, rarity.label.toUpperCase(), {
      fontFamily: THEME.FONT_BODY, fontSize: '11px', color: rarityHex,
    }).setOrigin(0.5).setLetterSpacing(2);

    const card = this.add.container(cx, cy, [panel, head, preview, name, rlabel]).setDepth(61);
    if (!reduced) {
      card.setScale(0.8).setAlpha(0);
      this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 320, ease: THEME.EASE_POP });
      const burst = this.add.particles(cx, cy - 2, 'spark', {
        tint: rarity.color, blendMode: 'ADD', emitting: false,
        speed: { min: 60, max: 220 }, lifespan: 700,
        scale: { start: 0.9, end: 0 }, alpha: { start: 1, end: 0 },
      }).setDepth(62);
      burst.explode(28);
      this.time.delayedCall(900, () => burst.destroy());
    }

    this.time.delayedCall(reduced ? 700 : 1250, onDone);
  }

  update(): void {
    this.cosmic.update();
  }
}
