import Phaser from 'phaser';
import { IMAGES } from '../config/assets';
import { SPLASH } from '../config/splash.config';
import { CosmicBackground } from '../entities/CosmicBackground';
import { Button } from '../ui/Button';
import { fadeIn, fadeToScene } from '../utils/transitions';
import { safeAreaInsetsScaled } from '../utils/a11y';

// Stage 3: the home screen. Logo title (bobbing) + tagline + PLAY / LEVELS.
// Shares the cosmic backdrop with the intro so the world feels continuous.
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

    this.cosmic = new CosmicBackground(this);
    fadeIn(this);

    // Title logo + soft orange glow, gently bobbing.
    const titleY = Math.max(height * 0.28, insets.top + height * 0.18);
    const targetW = width * SPLASH.MENU_TITLE_W_RATIO;

    this.add
      .image(cx, titleY, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(SPLASH.INTRO_GLOW_COLOR)
      .setAlpha(0.4)
      .setDisplaySize(targetW * 1.5, targetW * 1.5);

    const logo = this.add.image(cx, titleY, IMAGES.gravityFlowLogo.key);
    logo.setScale(targetW / logo.width);
    this.tweens.add({
      targets: logo,
      y: titleY - SPLASH.IDLE_BOB_AMPLITUDE,
      duration: SPLASH.IDLE_BOB_MS,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });

    this.add
      .text(cx, titleY + targetW * 0.5 + 14, SPLASH.TAGLINE, {
        fontFamily: SPLASH.FONT,
        fontSize: '17px',
        color: '#aeb8d8',
      })
      .setOrigin(0.5);

    // Buttons. PLAY uses dark text on the bright green for ≥4.5:1 contrast.
    const btnY = Math.max(height * 0.64, titleY + targetW * 0.5 + 70);
    new Button(this, cx, btnY, 'PLAY', () => fadeToScene(this, 'GameScene', { level: 1 }), {
      fill: SPLASH.MENU_FILL_PRIMARY,
      textColor: '#0a2417',
    }).startBreathing();

    new Button(
      this,
      cx,
      btnY + SPLASH.MENU_BTN_H + SPLASH.MENU_BTN_GAP,
      'LEVELS',
      () => fadeToScene(this, 'LevelSelectScene'),
      { fill: SPLASH.MENU_FILL_SECONDARY },
    ).startBreathing(SPLASH.IDLE_BREATHE_MS / 2);
  }

  update(): void {
    this.cosmic.update();
  }
}
