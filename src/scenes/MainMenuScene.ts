import Phaser from 'phaser';
import { IMAGES } from '../config/assets';
import { SPLASH } from '../config/splash.config';
import { THEME } from '../config/theme.config';
import { CosmicBackground } from '../entities/CosmicBackground';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { fadeIn, fadeToScene, warpToScene } from '../utils/transitions';
import { reducedMotionActive, safeAreaInsetsScaled, type SafeAreaInsets } from '../utils/a11y';
import { sharedAudio } from '../utils/AudioSynth';
import { ProgressStore } from '../utils/ProgressStore';
import { DailyStore } from '../utils/DailyStore';
import { LEVELS } from '../config/levels';
import { RETENTION } from '../config/retention.config';
import { drawGlass } from '../ui/glass';

// Stage 3: the home screen. Logo title (bobbing) + tagline + PLAY / LEVELS,
// with a staggered cinematic entrance. Shares the cosmic backdrop with the intro.
export class MainMenuScene extends Phaser.Scene {
  private cosmic!: CosmicBackground;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const sx = this.scale.displaySize.width / this.scale.gameSize.width;
    const sy = this.scale.displaySize.height / this.scale.gameSize.height;
    const insets = safeAreaInsetsScaled(sx, sy);
    const reduced = reducedMotionActive();

    this.cosmic = new CosmicBackground(this);
    fadeIn(this);

    // Settings gear (top-right, safe-area aware).
    const gearSize = 46;
    new IconButton(
      this,
      width - Math.max(12, insets.right) - 8 - gearSize / 2,
      Math.max(12, insets.top) + 8 + gearSize / 2,
      'settings',
      () => {
        if (this.scene.isActive('SettingsScene')) return; // no double-pause on double-tap
        this.scene.pause();
        this.scene.launch('SettingsScene', { caller: 'MainMenuScene' });
      },
      { size: gearSize },
    ).container.setDepth(30);

    // Achievements (top-left, mirrors the gear).
    new IconButton(
      this,
      Math.max(12, insets.left) + 8 + gearSize / 2,
      Math.max(12, insets.top) + 8 + gearSize / 2,
      'trophy',
      () => fadeToScene(this, 'AchievementsScene'),
      { size: gearSize },
    ).container.setDepth(30);

    // Cosmetics shop (top-left, next to achievements).
    new IconButton(
      this,
      Math.max(12, insets.left) + 8 + gearSize / 2 + gearSize + 8,
      Math.max(12, insets.top) + 8 + gearSize / 2,
      'palette',
      () => fadeToScene(this, 'CosmeticsScene'),
      { size: gearSize },
    ).container.setDepth(30);

    // DAILY REWARD chest (Task 5: daily login bonus) — top-right, one slot
    // left of the gear. Gold + glowing while claimable; dim once claimed
    // today (DailyStore.loginBonusClaimedToday — a read-only peek, since
    // claimLoginBonus() itself grants on first call). No new IconName is
    // added for this (icons.ts is a closed vocabulary out of scope here), so
    // this reuses the existing glass-panel look with a text glyph, same as
    // the ▶ GRAVITY RUN text-button below.
    this.createDailyRewardChest(width, insets, gearSize, reduced);

    // Start the ambient music pad on the first gesture (autoplay policy).
    this.input.once('pointerdown', () => {
      const audio = sharedAudio();
      audio.resume();
      audio.startAmbientPad();
    });

    const titleY = Math.max(height * 0.28, insets.top + height * 0.18);
    const targetW = width * SPLASH.MENU_TITLE_W_RATIO;

    const glow = this.add
      .image(cx, titleY, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(THEME.ACCENT_GOLD)
      .setAlpha(0)
      .setDisplaySize(targetW * 1.5, targetW * 1.5);

    const logo = this.add.image(cx, titleY, IMAGES.gravityFlowLogo.key);
    const logoScale = targetW / logo.width;

    const tagline = this.add
      .text(cx, titleY + targetW * 0.5 + 14, SPLASH.TAGLINE, {
        fontFamily: THEME.FONT_BODY,
        fontSize: '17px',
        color: THEME.TEXT_MUTED,
      })
      .setOrigin(0.5);
    tagline.setLetterSpacing(1);

    const btnY = Math.max(height * 0.64, titleY + targetW * 0.5 + 70);
    const resumeLevel = ProgressStore.nextLevel(LEVELS.length);
    const playLabel = resumeLevel > 1 ? 'CONTINUE' : 'PLAY';
    const play = new Button(this, cx, btnY, playLabel, () => warpToScene(this, 'GameScene', { level: resumeLevel }), {
      fill: THEME.ACCENT_PRIMARY,
      textColor: THEME.TEXT_ON_PRIMARY,
      fontFamily: THEME.FONT_DISPLAY,
      fontSize: 22,
      glow: true,
    });
    const levels = new Button(
      this,
      cx,
      btnY + SPLASH.MENU_BTN_H + SPLASH.MENU_BTN_GAP,
      'WORLDS',
      () => warpToScene(this, 'WorldMapScene', undefined, THEME.ACCENT_GOLD),
      { fill: SPLASH.MENU_FILL_SECONDARY, fontFamily: THEME.FONT_DISPLAY, fontSize: 20 },
    );

    // Daily Challenge 2.0: a curated daily level + rotating modifier + streak.
    // A gold badge nudges when today's run is still open.
    const today = DailyStore.todayChallenge();
    const doneToday = DailyStore.isDoneToday();
    const streak = DailyStore.currentStreak();
    const modLabel = today.modifier === 'timed'
      ? 'Time Attack'
      : today.modifier === 'gemRush'
        ? 'Gem Rush'
        : 'Classic';
    const dailyY = btnY + 2 * (SPLASH.MENU_BTN_H + SPLASH.MENU_BTN_GAP);
    const daily = new Button(
      this,
      cx,
      dailyY,
      'DAILY',
      () => fadeToScene(this, 'GameScene', { daily: true, dailyIndex: today.index, dailyModifier: today.modifier }),
      { fill: SPLASH.MENU_FILL_SECONDARY, fontFamily: THEME.FONT_DISPLAY, fontSize: 20 },
    );
    const badge = !doneToday ? this.add.graphics() : null;
    if (badge) {
      badge.fillStyle(THEME.ACCENT_GOLD, 1);
      badge.fillCircle(0, 0, 6);
      badge.setPosition(cx + SPLASH.MENU_BTN_W / 2 - 6, dailyY - SPLASH.MENU_BTN_H / 2 + 6);
      badge.setDepth(20);
    }
    // Streak-protection indicator (Task 5): surfaced right on the DAILY
    // caption, exactly like the streak count next to it — an earned-only
    // freeze token (never purchasable) is silently ready to forgive one
    // missed day, so a returning player sees their streak is safe.
    const protectedSuffix = DailyStore.hasFreeze() ? RETENTION.PROTECTED_SUFFIX : '';
    const capStr = doneToday
      ? `Done today · streak ${streak}${protectedSuffix}`
      : `Today: ${modLabel}${streak > 0 ? ` · streak ${streak}` : ''}${protectedSuffix}`;
    const dailyCap = this.add
      .text(cx, dailyY + SPLASH.MENU_BTN_H / 2 + 13, capStr, {
        fontFamily: THEME.FONT_BODY,
        fontSize: '12px',
        color: THEME.TEXT_MUTED,
      })
      .setOrigin(0.5);

    // GRAVITY RUN — the endless flagship. Compact tertiary entry (full 44px hit
    // area), clamped above the bottom safe area. (Proper menu layout lands in G4.)
    const runY = Math.min(
      height - Math.max(SPLASH.SAFE_AREA_MIN_PAD, insets.bottom) - 24,
      dailyY + SPLASH.MENU_BTN_H / 2 + 48,
    );
    const runBtn = this.add
      .text(cx, runY, '▶  GRAVITY RUN', {
        fontFamily: THEME.FONT_DISPLAY, fontSize: '16px', color: '#ffd166', fontStyle: '700',
      })
      .setOrigin(0.5)
      .setLetterSpacing(1);
    runBtn.setInteractive(new Phaser.Geom.Rectangle(-110, -22, 220, 44), Phaser.Geom.Rectangle.Contains);
    runBtn.on('pointerup', () => fadeToScene(this, 'RunSelectScene'));

    if (reduced) {
      logo.setScale(logoScale);
      glow.setAlpha(0.4);
      this.startBob(logo, titleY);
      play.startBreathing();
      levels.startBreathing(SPLASH.IDLE_BREATHE_MS / 2);
      daily.startBreathing(SPLASH.IDLE_BREATHE_MS / 2);
      return;
    }

    // Staggered cinematic entrance.
    logo.setScale(logoScale * 0.9).setAlpha(0).setY(titleY + 16);
    tagline.setAlpha(0).setY(tagline.y + 10);
    play.container.setAlpha(0).setY(play.container.y + 24);
    levels.container.setAlpha(0).setY(levels.container.y + 24);
    daily.container.setAlpha(0).setY(daily.container.y + 24);
    dailyCap.setAlpha(0);
    badge?.setAlpha(0);
    runBtn.setAlpha(0);

    this.tweens.add({ targets: glow, alpha: 0.4, duration: 700, ease: THEME.EASE });
    this.tweens.add({
      targets: logo,
      alpha: 1,
      scale: logoScale,
      y: titleY,
      duration: 640,
      ease: THEME.EASE,
      onComplete: () => this.startBob(logo, titleY),
    });
    this.tweens.add({ targets: tagline, alpha: 1, y: tagline.y - 10, delay: 220, duration: 520, ease: THEME.EASE });
    this.tweens.add({
      targets: play.container,
      alpha: 1,
      y: play.container.y - 24,
      delay: 320,
      duration: 520,
      ease: THEME.EASE,
      onComplete: () => play.startBreathing(),
    });
    this.tweens.add({
      targets: levels.container,
      alpha: 1,
      y: levels.container.y - 24,
      delay: 420,
      duration: 520,
      ease: THEME.EASE,
      onComplete: () => levels.startBreathing(SPLASH.IDLE_BREATHE_MS / 2),
    });
    this.tweens.add({
      targets: daily.container,
      alpha: 1,
      y: daily.container.y - 24,
      delay: 520,
      duration: 520,
      ease: THEME.EASE,
      onComplete: () => daily.startBreathing(SPLASH.IDLE_BREATHE_MS / 2),
    });
    const fadeTargets: Phaser.GameObjects.GameObject[] = badge ? [dailyCap, badge, runBtn] : [dailyCap, runBtn];
    this.tweens.add({ targets: fadeTargets, alpha: 1, delay: 620, duration: 420, ease: THEME.EASE });
  }

  private startBob(logo: Phaser.GameObjects.Image, baseY: number): void {
    this.tweens.add({
      targets: logo,
      y: baseY - SPLASH.IDLE_BOB_AMPLITUDE,
      duration: SPLASH.IDLE_BOB_MS,
      ease: THEME.EASE_SOFT,
      yoyo: true,
      repeat: -1,
    });
  }

  // DAILY REWARD chest (Task 5) — a glass toolbar button, gold+glowing while
  // claimable, dim once claimed today. Tapping claims via DailyStore
  // (idempotent — a second tap the same day is a harmless no-op) and plays a
  // claim flourish showing the granted amount. ≥44px touch target; reduced
  // motion drops the pop/rise to a calm static reveal.
  private createDailyRewardChest(width: number, insets: SafeAreaInsets, gearSize: number, reduced: boolean): void {
    const size = gearSize;
    const x = width - Math.max(12, insets.right) - 8 - gearSize / 2 - gearSize - 8;
    const y = Math.max(12, insets.top) + 8 + gearSize / 2;
    let claimed = DailyStore.loginBonusClaimedToday();

    const glow = this.add
      .image(0, 0, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(RETENTION.LOGIN_CHEST_GOLD)
      .setDisplaySize(size * RETENTION.LOGIN_CHEST_GLOW_SCALE, size * RETENTION.LOGIN_CHEST_GLOW_SCALE)
      .setAlpha(claimed ? 0 : RETENTION.LOGIN_CHEST_GLOW_ALPHA);
    const bg = this.add.graphics();
    const glyph = this.add
      .text(0, 0, '✦', {
        fontFamily: THEME.FONT_DISPLAY,
        fontSize: '20px',
        color: claimed ? RETENTION.LOGIN_CHEST_DIM_TEXT : RETENTION.LOGIN_CHEST_GOLD_TEXT,
      })
      .setOrigin(0.5);

    const drawBg = () => {
      bg.clear();
      drawGlass(bg, size, size, THEME.RADIUS_SM);
      bg.lineStyle(1.5, claimed ? RETENTION.LOGIN_CHEST_DIM : RETENTION.LOGIN_CHEST_GOLD, claimed ? 0.35 : 0.8);
      bg.strokeRoundedRect(-size / 2, -size / 2, size, size, THEME.RADIUS_SM);
    };
    drawBg();

    const chest = this.add.container(x, y, [glow, bg, glyph]).setDepth(30);
    chest.setSize(size, size);
    chest.setInteractive(new Phaser.Geom.Rectangle(-size / 2, -size / 2, size, size), Phaser.Geom.Rectangle.Contains);
    if (chest.input) chest.input.cursor = 'pointer';

    chest.on('pointerdown', () => this.tweens.add({ targets: chest, scale: THEME.PRESS_SCALE, duration: 100, ease: THEME.EASE }));
    chest.on('pointerupoutside', () => this.tweens.add({ targets: chest, scale: 1, duration: 100, ease: THEME.EASE }));
    chest.on('pointerup', () => {
      this.tweens.add({ targets: chest, scale: 1, duration: 100, ease: THEME.EASE });
      if (claimed) return; // already claimed today — no reward left to grant, tap is a no-op
      const reward = DailyStore.claimLoginBonus();
      if (!reward) return; // guarded — DailyStore itself says "already claimed"
      claimed = true;
      glyph.setColor(RETENTION.LOGIN_CHEST_DIM_TEXT);
      drawBg();
      if (reduced) {
        glow.setAlpha(0);
      } else {
        this.tweens.add({ targets: glow, alpha: 0, duration: 300, ease: THEME.EASE });
        this.tweens.add({ targets: chest, scale: RETENTION.LOGIN_CHEST_BOUNCE_SCALE, duration: 160, yoyo: true, ease: THEME.EASE_POP });
      }
      this.showLoginRewardFlourish(x, y, reward, reduced);
    });
  }

  // The "+N ✦" (and optional Fragments) toast after a chest claim. Non-blocking
  // (floats near the chest, never captures input) and honors reduced-motion
  // with a static hold+fade instead of the pop-in/rise-out.
  private showLoginRewardFlourish(x: number, y: number, reward: { sd: number; fr: number }, reduced: boolean): void {
    const label = reward.fr > 0 ? `+${reward.sd} ✦  +${reward.fr} ◆` : `+${reward.sd} ✦`;
    const text = this.add
      .text(x, y + RETENTION.LOGIN_CHEST_FLOURISH_OFFSET_Y, label, {
        fontFamily: THEME.FONT_DISPLAY,
        fontSize: '13px',
        color: RETENTION.LOGIN_CHEST_GOLD_TEXT,
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setDepth(40);

    if (reduced) {
      this.time.delayedCall(RETENTION.LOGIN_CHEST_HOLD_MS, () => {
        this.tweens.add({ targets: text, alpha: 0, duration: 200, onComplete: () => text.destroy() });
      });
      return;
    }

    text.setAlpha(0).setScale(RETENTION.LOGIN_CHEST_POP_START_SCALE);
    this.tweens.add({ targets: text, alpha: 1, scale: 1, duration: RETENTION.LOGIN_CHEST_CLAIM_POP_MS, ease: THEME.EASE_POP });
    this.tweens.add({
      targets: text,
      y: y + RETENTION.LOGIN_CHEST_FLOURISH_OFFSET_Y - RETENTION.LOGIN_CHEST_FLOURISH_RISE_PX,
      alpha: 0,
      delay: RETENTION.LOGIN_CHEST_HOLD_MS,
      duration: RETENTION.LOGIN_CHEST_EXIT_MS,
      ease: THEME.EASE,
      onComplete: () => text.destroy(),
    });
  }

  update(): void {
    this.cosmic.update();
  }
}
