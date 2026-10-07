import Phaser from 'phaser';
import { THEME } from '../config/theme.config';
import { SPLASH } from '../config/splash.config';
import { RARITY, type Rarity } from '../config/cosmetics.config';
import { BUNDLES, PACKAGES, PURCHASE_COPY, PURCHASE_UI, STORE, bundleById, type BundleDef } from '../config/monetization.config';
import { CosmicBackground } from '../entities/CosmicBackground';
import { Button } from '../ui/Button';
import { drawGlass } from '../ui/glass';
import {
  cardViewFor,
  celebrateRemoveAds,
  createCardNote,
  dimmer,
  isWebStore,
  makeLink,
  purchaseSignature,
  runBuy,
  runCheckStatus,
  runRestore,
  startPurchasePoll,
  tagColor,
  tagFontPx,
  type PurchaseSurface,
  type ToastMessage,
} from '../ui/purchaseUi';
import { addTapSink, outsideBand, setTapArea } from '../ui/hitArea';
import { showToast } from '../ui/toast';
import { fadeIn, fadeToScene } from '../utils/transitions';
import { reducedMotionActive, safeAreaInsetsScaled } from '../utils/a11y';
import { cosmeticsByCategory, cosmeticById, COSMETICS, type Cosmetic, type Category } from '../utils/cosmetics';
import { purchaseCost } from '../utils/cosmeticsLogic';
import { claimCollectionRewards } from '../utils/Rewards';
import { CosmeticStore } from '../utils/CosmeticStore';
import { sharedAudio } from '../utils/AudioSynth';
import { CurrencyStore } from '../utils/CurrencyStore';
import { FragmentStore } from '../utils/FragmentStore';
import { IAP } from '../services/IAP';
import { bundleNotOfferedNote, bundleValueLine } from '../services/purchaseView';
import { Ads } from '../services/Ads';
import { RewardStore } from '../utils/RewardStore';
import { Analytics } from '../services/Analytics';
import { shopOpen, storeTab, bundleCrossSell, cosmeticEquip, fragmentEarned, rewardedOffered } from '../services/analyticsEvents';

const FREE_FRAGMENTS = 5; // daily rewarded grant

type Tab = 'skin' | 'trail' | 'arrival' | 'bundle';
const TABS: { key: Tab; label: string }[] = [
  { key: 'skin', label: 'Skins' },
  { key: 'trail', label: 'Trails' },
  { key: 'arrival', label: 'Arrivals' },
  { key: 'bundle', label: 'Bundles' },
];
const CARD_H = 64;
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
  private enteredInternally = false; // true on an internal refresh restart (tab switch / post-purchase) — suppresses a redundant shop_open
  private highlightBundle?: string; // bundle id to pulse — set by a locked bundle-cosmetic cross-sell tap
  private readonly gate = { purchasing: false }; // a purchase / restore started here is running (or its fanfare): taps are ignored, no redraw
  private quiet = false; // a silent redraw (same content, new state): no entrance animation
  private scrollOffset = 0; // list scroll carried across a redraw (0 = top, negative = scrolled down)
  private pendingToast?: ToastMessage; // shown once after a redraw (the restart would destroy a live toast)
  private toastY = 0; // where this scene's toasts sit (just above the Back button)
  private listC?: Phaser.GameObjects.Container; // the scrolling card list
  private contentTop = 0; // the list's resting y (scroll offset 0)
  // What the shared purchase flow (ui/purchaseUi.ts) needs from this scene.
  private readonly surface: PurchaseSurface = {
    scene: this,
    gate: this.gate,
    toastY: () => this.toastY,
    blocked: () => this.dragging,
    // A completed purchase drops the cross-sell highlight (the card turns OWNED); every other quiet redraw keeps it.
    redraw: (toast, completed) => this.quietRestart(toast, !completed),
  };

  constructor() {
    super({ key: 'CosmeticsScene' });
  }

  init(data: { tab?: Tab; internal?: boolean; highlightBundle?: string; quiet?: boolean; scrollOffset?: number; toast?: ToastMessage }): void {
    this.tab = data?.tab ?? 'skin';
    this.enteredInternally = data?.internal ?? false;
    this.highlightBundle = data?.highlightBundle;
    this.gate.purchasing = false;
    this.quiet = data?.quiet ?? false;
    this.scrollOffset = data?.scrollOffset ?? 0;
    this.pendingToast = data?.toast;
  }

  create(): void {
    // shop_open marks a genuine store ENTRY only. Every INTERNAL refresh restart —
    // a tab switch, a cross-sell jump, or a post-purchase/claim redraw — passes
    // internal:true, so it fires storeTab (switches) or nothing, never a phantom
    // shop_open that would inflate the store-session count around conversions.
    if (!this.enteredInternally) Analytics.track(shopOpen(this.tab));
    const { width, height } = this.scale;
    const cx = width / 2;
    const sx = this.scale.displaySize.width / this.scale.gameSize.width;
    const sy = this.scale.displaySize.height / this.scale.gameSize.height;
    const insets = safeAreaInsetsScaled(sx, sy);

    this.cosmic = new CosmicBackground(this);
    if (!this.quiet) fadeIn(this); // a silent redraw must not flash the camera fade

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
        g.fillRoundedRect(-tabW / 2 + 3, -15, tabW - 6, 30, 8);
      }
      const txt = this.add.text(0, 0, t.label, {
        fontFamily: THEME.FONT_DISPLAY, fontSize: '14px',
        color: active ? STARDUST : THEME.TEXT_MUTED, fontStyle: '600',
      }).setOrigin(0.5);
      // The label is 18 px tall: the tab is a container so its tap area can be tabW x 44 (the drawing is unchanged). It sits above
      // the list's tap sinks (LIST_CHROME_DEPTH), so a row scrolled up under the tab bar never takes a tap meant for a tab.
      const tab = this.add.container(tx, tabY, [g, txt]).setDepth(THEME.LIST_CHROME_DEPTH);
      setTapArea(tab, tabW, THEME.MIN_TAP);
      if (tab.input) tab.input.cursor = 'pointer';
      tab.on('pointerup', () => {
        if (this.dragging || t.key === this.tab) return;
        Analytics.track(storeTab(t.key)); // tab-switch intent (Bundles = strongest IAP signal)
        this.scene.restart({ tab: t.key, internal: true });
      });
    });

    // Scrollable content viewport.
    const contentTop = tabY + 30;
    const backY = Math.min(height - Math.max(SPLASH.SAFE_AREA_MIN_PAD, insets.bottom) - 30, height * 0.95);
    const contentBottom = backY - 34;
    const viewportH = contentBottom - contentTop;
    const rowW = Math.min(width * 0.92, 360);

    this.toastY = backY - PURCHASE_UI.SHOP_TOAST_ABOVE_BACK;
    this.contentTop = contentTop;
    // A mask clips drawing, never input: a row scrolled out of the viewport keeps a live hit zone over the header, the tab bar and
    // the strip under the list. Tap sinks over everything OUTSIDE the viewport take those taps (the tabs and Back sit above them),
    // so a row is tappable on its visible part only. This also covers a link nested inside a row (Check status, Restore).
    for (const r of outsideBand(width, height, contentTop, contentBottom)) addTapSink(this, r, THEME.LIST_SINK_DEPTH);
    const listC = this.add.container(cx, contentTop);
    this.listC = listC;
    // Bundles: a card the store/entitlements hide (Starter once no_ads is owned, D-09) is not built at all.
    const shownBundles = BUNDLES.filter((b) => cardViewFor(b.packageId, b.hideWhenNoAds).visible);
    const cards = this.tab === 'bundle'
      ? [this.freeFragmentsCard(rowW, 0), this.removeAdsCard(rowW, 1), ...shownBundles.map((b, i) => this.bundleCard(b, rowW, i + 2, b.id === this.highlightBundle))]
      : cosmeticsByCategory(this.tab as Category).map((c, i) => this.itemCard(c, rowW, i));
    // Stack by each card's TOP edge so cards of different heights (Remove Ads, bundles, a card with a note) keep an even
    // gap; the half-card of padding below the last card is unchanged.
    let yy = 0;
    cards.forEach((card) => { card.y = yy + card.height / 2; listC.add(card); yy += card.height + PURCHASE_UI.CARD_GAP; });
    yy += CARD_H / 2;
    // Restore-purchases link (store requirement) on the Bundles tab. The web build has nothing to restore: no link.
    if (this.tab === 'bundle' && !isWebStore()) {
      const label = this.add.text(0, 0, 'Restore Purchases', {
        fontFamily: THEME.FONT_BODY, fontSize: `${PURCHASE_UI.RESTORE_FONT_PX}px`, color: THEME.TEXT_MUTED, fontStyle: '600',
      });
      // An explicit >=44px hit area (the text glyphs alone are about 16px tall).
      const restore = makeLink(this, 0, yy + 4, label, PURCHASE_UI.RESTORE_LINK_W, PURCHASE_UI.RESTORE_LINK_H, (link) => void runRestore(this.surface, dimmer(link)));
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
    listC.y = Phaser.Math.Clamp(contentTop + this.scrollOffset, minY, maxY); // a silent redraw keeps the player's place
    let dragStartPy = 0; let listStartY = 0;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { dragStartPy = p.y; listStartY = listC.y; this.dragging = false; });
    // The scene-level release fires AFTER the game objects' own pointerup handlers (which still see a scroll as a scroll, so a
    // drag never taps a card). Clearing it here keeps the flag from sticking after a scroll (review m2).
    const endGesture = (): void => { this.dragging = false; };
    this.input.on('pointerup', endGesture);
    this.input.on('pointerupoutside', endGesture);
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      const dy = p.y - dragStartPy;
      if (Math.abs(dy) > 6) this.dragging = true;
      listC.y = Phaser.Math.Clamp(listStartY + dy, minY, maxY);
    });
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dyy: number) => {
      listC.y = Phaser.Math.Clamp(listC.y - dyy * 0.5, minY, maxY);
    });

    new Button(this, cx, backY, '← Back', () => fadeToScene(this, 'MainMenuScene'), { width: 150, height: 46, fontSize: 18 })
      .container.setDepth(THEME.LIST_CHROME_DEPTH);

    if (this.tab === 'bundle') {
      // A "…" card, a pending payment that completes, a marker that times out: redraw when what the cards show changed,
      // never mid-gesture or mid-purchase, keeping the scroll position and the cross-sell highlight.
      startPurchasePoll(
        this.surface,
        () => purchaseSignature([{ packageId: PACKAGES.REMOVE_ADS }, ...BUNDLES]),
        () => this.quietRestart(),
      );
    }
    if (this.pendingToast) showToast(this, this.pendingToast.message, { tone: this.pendingToast.tone, y: this.toastY });
  }

  // A silent redraw of the Bundles tab (same content, new state): keeps the scroll position, carries `toast` across the restart
  // (it would destroy a live one) and, unless a purchase just completed, the pulsing cross-sell highlight (review m5).
  private quietRestart(toast?: ToastMessage, keepHighlight = true): void {
    this.scene.restart({
      tab: 'bundle', internal: true, quiet: true, scrollOffset: this.scrollOffsetNow(), toast,
      highlightBundle: keepHighlight ? this.highlightBundle : undefined,
    });
  }

  private scrollOffsetNow(): number {
    return this.listC ? this.listC.y - this.contentTop : 0;
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
    if (!equipped) {
      setTapArea(card, w, CARD_H);
      card.on('pointerup', () => {
        if (this.dragging) return;
        // Bundle-only cosmetics can't be bought/equipped directly — route to the
        // bundle that grants them instead of the generic cantAfford/locked shake.
        if (!owned && c.acquire === 'bundle' && c.bundleId) {
          // A bundle that is not on offer (Starter once Remove Ads is owned, A-24) has nothing to jump to: say why, and
          // record no purchase intent for a bundle nobody can buy.
          const bundle = bundleById(c.bundleId);
          if (bundle && !cardViewFor(bundle.packageId, bundle.hideWhenNoAds).visible) {
            showToast(this, bundleNotOfferedNote(bundle.name), { tone: 'info', y: this.toastY });
            return;
          }
          Analytics.track(bundleCrossSell(c.bundleId)); // per-item IAP intent — before the (internal) restart
          this.scene.restart({ tab: 'bundle', internal: true, highlightBundle: c.bundleId });
          return;
        }
        const result = CosmeticStore.buyOrEquip(c.id);
        if (result === 'cantAfford' || result === 'locked') { this.cameras.main.shake(110, 0.004); return; }
        Analytics.track(cosmeticEquip(c.id));
        claimCollectionRewards();
        // A new unlock gets a celebratory moment; a re-equip just refreshes.
        if (result === 'bought') this.playUnlockFanfare(c, () => this.scene.restart({ tab: this.tab, internal: true }));
        else this.scene.restart({ tab: this.tab, internal: true });
      });
    } else {
      card.setSize(w, CARD_H); // not tappable, but still sized like its neighbours
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
    if (!claimed) {
      Analytics.track(rewardedOffered('free_fragments')); // offer impression, fires once on render
      setTapArea(card, w, h);
      card.on('pointerup', async () => {
        if (this.dragging) return;
        const earned = await Ads.showRewarded('free_fragments');
        if (earned) {
          FragmentStore.add(FREE_FRAGMENTS);
          RewardStore.claim('free_fragments');
          Analytics.track(fragmentEarned(FREE_FRAGMENTS, 'rewarded'));
          this.scene.restart({ tab: 'bundle', internal: true });
        }
      });
    } else {
      card.setSize(w, h); // claimed: not tappable, but still sized like its neighbours
    }
    this.entrance(card, i);
    return card;
  }

  // Standalone Remove-Ads card (premium upsell, separate from the bundles). Its tag and tap come from the store state
  // (purchaseView): the store's price, OWNED, PENDING + Check status, "Available in the Android app" on web, or "…" / Unavailable.
  private removeAdsCard(w: number, i: number): Phaser.GameObjects.Container {
    const v = cardViewFor(PACKAGES.REMOVE_ADS);
    const owned = v.tone === 'owned';
    const note = createCardNote(this, v, w, () => void runCheckStatus(this.surface, PACKAGES.REMOVE_ADS, dimmer(card)));
    const h = CARD_H + 22 + (note?.extraH ?? 0);
    const top = -h / 2;
    const bg = this.add.graphics();
    drawGlass(bg, w, h, THEME.RADIUS_SM);
    bg.lineStyle(2, owned ? 0x7affb0 : THEME.ACCENT_GOLD, 0.6);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, THEME.RADIUS_SM);
    const name = this.add.text(-w / 2 + PURCHASE_UI.CARD_PAD_X, top + 16, PURCHASE_COPY.REMOVE_ADS, {
      fontFamily: THEME.FONT_DISPLAY, fontSize: '16px', color: STARDUST, fontStyle: '700',
    }).setOrigin(0, 0.5);
    const blurb = this.add.text(-w / 2 + PURCHASE_UI.CARD_PAD_X, top + PURCHASE_UI.REMOVE_ADS_BLURB_TOP, owned ? PURCHASE_COPY.ADS_REMOVED : 'No interstitials, ever. Rewarded ads stay optional.', {
      fontFamily: THEME.FONT_BODY, fontSize: '12px', color: THEME.TEXT_MUTED, wordWrap: { width: w - 120 },
    }).setOrigin(0, 0.5);
    const price = this.add.text(w / 2 - PURCHASE_UI.CARD_PAD_X, top + 18, v.label, {
      fontFamily: THEME.FONT_DISPLAY, fontSize: `${tagFontPx(v.label)}px`, color: tagColor(v.tone), fontStyle: '700',
    }).setOrigin(1, 0.5);
    const card = this.add.container(0, 0, [bg, name, blurb, price]);
    note?.place(card, h / 2);
    if (v.action === 'buy') {
      setTapArea(card, w, h);
      if (card.input) card.input.cursor = 'pointer';
      card.on('pointerup', () => void runBuy(this.surface, PACKAGES.REMOVE_ADS, dimmer(card), () => celebrateRemoveAds(this.surface)));
    } else {
      card.setSize(w, h);
    }
    this.entrance(card, i);
    return card;
  }

  // A truthful, one-line value summary of a bundle's real contents (e.g.
  // "2 Legendary items + Remove Ads") — derived from the actual catalog, never
  // invented numbers. Wave 3 Task 4 bundle-framing requirement. A premium bundle
  // tells a player who already has Remove Ads so (A.6 interim honesty).
  private bundleValueLine(b: BundleDef): string {
    const counts = new Map<Rarity, number>();
    for (const id of b.grants) {
      const c = cosmeticById(id);
      if (c) counts.set(c.rarity, (counts.get(c.rarity) ?? 0) + 1);
    }
    const parts = [...counts.entries()].map(
      ([rarity, n]) => `${n} ${RARITY[rarity].label} item${n > 1 ? 's' : ''}`,
    );
    const itemsStr = parts.join(' + ') || `${b.grants.length} item${b.grants.length === 1 ? '' : 's'}`;
    return bundleValueLine(itemsStr, b.premium, IAP.isPremium());
  }

  // A premium bundle card (store price -> IAP.buy(packageId); owned = its pack entitlement is active).
  // `highlighted` = arrived here via a locked bundle-cosmetic cross-sell tap —
  // pulses to draw the eye to the ONE bundle that grants the tapped item.
  private bundleCard(b: BundleDef, w: number, i: number, highlighted: boolean): Phaser.GameObjects.Container {
    const v = cardViewFor(b.packageId, b.hideWhenNoAds);
    const note = createCardNote(this, v, w, () => void runCheckStatus(this.surface, b.packageId, dimmer(card)));
    const h = CARD_H + 40 + (note?.extraH ?? 0); // + the value-framing line (+ the pending / web note)
    const top = -h / 2;
    const owned = v.tone === 'owned';
    const bg = this.add.graphics();
    drawGlass(bg, w, h, THEME.RADIUS_SM);
    bg.lineStyle(
      highlighted ? 3 : 2,
      highlighted ? THEME.ACCENT_CYAN : THEME.ACCENT_GOLD,
      owned ? 0.4 : highlighted ? 1 : 0.7,
    );
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, THEME.RADIUS_SM);

    const name = this.add.text(-w / 2 + PURCHASE_UI.CARD_PAD_X, top + 16, b.name, {
      fontFamily: THEME.FONT_DISPLAY, fontSize: '16px', color: STARDUST, fontStyle: '700',
    }).setOrigin(0, 0.5);
    const children: Phaser.GameObjects.GameObject[] = [bg, name];

    // The ONE truthful "BEST VALUE" tag (config-flagged) — no fake savings math.
    if (b.bestValue) {
      const tag = this.add.text(name.x + name.width + 10, name.y, STORE.BEST_VALUE_LABEL, {
        fontFamily: THEME.FONT_BODY, fontSize: '10px', color: '#0d0d1a',
        backgroundColor: STORE.BEST_VALUE_COLOR, fontStyle: '700', padding: { x: 5, y: 2 },
      }).setOrigin(0, 0.5);
      children.push(tag);
    }

    const blurb = this.add.text(-w / 2 + PURCHASE_UI.CARD_PAD_X, top + PURCHASE_UI.BUNDLE_BLURB_TOP, b.blurb, {
      fontFamily: THEME.FONT_BODY, fontSize: '12px', color: THEME.TEXT_MUTED,
      wordWrap: { width: w - 120 },
    }).setOrigin(0, 0.5);
    const valueLine = this.add.text(-w / 2 + PURCHASE_UI.CARD_PAD_X, top + PURCHASE_UI.BUNDLE_VALUE_TOP, this.bundleValueLine(b), {
      fontFamily: THEME.FONT_BODY, fontSize: '11px', color: THEME.TEXT_MUTED,
      wordWrap: { width: w - 120 },
    }).setOrigin(0, 0.5);
    const priceTxt = this.add.text(w / 2 - PURCHASE_UI.CARD_PAD_X, top + 18, v.label, {
      fontFamily: THEME.FONT_DISPLAY, fontSize: `${tagFontPx(v.label)}px`, color: tagColor(v.tone), fontStyle: '700',
    }).setOrigin(1, 0.5);
    children.push(blurb, valueLine, priceTxt);

    const card = this.add.container(0, 0, children);
    note?.place(card, h / 2);
    if (v.action === 'buy') {
      setTapArea(card, w, h);
      if (card.input) card.input.cursor = 'pointer';
      // Ownership is derived from the entitlement IAP.buy confirmed; a cancel is silent, every other outcome has its copy.
      card.on('pointerup', () => void runBuy(this.surface, b.packageId, dimmer(card), () => {
        claimCollectionRewards();
        const first = cosmeticById(b.grants[0]);
        const redraw = (): void => this.quietRestart(undefined, false); // the card turned OWNED: the highlight is done
        if (first) this.playUnlockFanfare(first, redraw);
        else redraw();
      }));
    } else {
      card.setSize(w, h);
    }
    if (highlighted) {
      card.setAlpha(1).setScale(1);
      if (!reducedMotionActive()) {
        this.tweens.add({ targets: card, scale: 1.035, duration: 420, yoyo: true, repeat: -1, ease: THEME.EASE_SOFT });
      }
    } else {
      this.entrance(card, i);
    }
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
    if (reducedMotionActive() || this.quiet) return;
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
