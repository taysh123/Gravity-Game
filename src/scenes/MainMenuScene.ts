import Phaser from 'phaser';
import { IMAGES } from '../config/assets';
import { SPLASH } from '../config/splash.config';
import { THEME } from '../config/theme.config';
import { CosmicBackground } from '../entities/CosmicBackground';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { fadeIn, fadeToScene, warpToScene } from '../utils/transitions';
import { reducedMotionActive, safeAreaInsetsScaled } from '../utils/a11y';
import { sharedAudio } from '../utils/AudioSynth';
import { ProgressStore } from '../utils/ProgressStore';
import { DailyStore } from '../utils/DailyStore';
import { LEVELS } from '../config/levels';

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
    const capStr = doneToday
      ? `Done today · streak ${streak}`
      : `Today: ${modLabel}${streak > 0 ? ` · streak ${streak}` : ''}`;
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

  update(): void {
    this.cosmic.update();
  }
}
