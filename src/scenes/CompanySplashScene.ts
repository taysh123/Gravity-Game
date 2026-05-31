import Phaser from 'phaser';
import { IMAGES } from '../config/assets';
import { SPLASH } from '../config/splash.config';
import { THEME } from '../config/theme.config';
import { fadeToScene } from '../utils/transitions';
import { reducedMotionActive, safeAreaInsetsScaled } from '../utils/a11y';

// Stage 1: the True Story Labs brand moment. The transparent cosmic logo on a
// deep field with a soft glow and a premium fade/scale + glow breathe. ~1.9s.
const NEXT = 'IntroSplashScene';

export class CompanySplashScene extends Phaser.Scene {
  private isAdvancing = false;

  constructor() {
    super({ key: 'CompanySplashScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const sx = this.scale.displaySize.width / this.scale.gameSize.width;
    const sy = this.scale.displaySize.height / this.scale.gameSize.height;
    const insets = safeAreaInsetsScaled(sx, sy);

    // Soft cool halo behind the (cool-toned) logo.
    const glow = this.add
      .image(cx, cy, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xbfd8ff)
      .setAlpha(0)
      .setDisplaySize(width * 1.0, width * 1.0);

    const logo = this.add.image(cx, cy, IMAGES.trueStoryLabsLogo.key).setOrigin(0.5);
    const targetW = width * 0.74;
    const baseScale = targetW / logo.width;

    this.setupSkip(insets);

    if (reducedMotionActive()) {
      logo.setScale(baseScale);
      glow.setAlpha(SPLASH.COMPANY_GLOW_ALPHA);
      this.time.delayedCall(SPLASH.REDUCED_MOTION_FADE_MS + SPLASH.REDUCED_MOTION_HOLD_MS, () =>
        this.advance(),
      );
      return;
    }

    logo.setScale(baseScale * 0.92).setAlpha(0);
    this.tweens.add({ targets: logo, alpha: 1, scale: baseScale, duration: SPLASH.COMPANY_FADE_IN_MS, ease: THEME.EASE });
    this.tweens.add({
      targets: glow,
      alpha: SPLASH.COMPANY_GLOW_ALPHA,
      duration: SPLASH.COMPANY_FADE_IN_MS,
      ease: THEME.EASE,
      onComplete: () => {
        this.tweens.add({
          targets: glow,
          alpha: SPLASH.COMPANY_GLOW_ALPHA_PEAK,
          duration: SPLASH.COMPANY_HOLD_MS,
          ease: THEME.EASE_SOFT,
          yoyo: true,
        });
      },
    });

    this.time.delayedCall(SPLASH.COMPANY_FADE_IN_MS + SPLASH.COMPANY_HOLD_MS, () => this.advance());
  }

  private setupSkip(insets: { bottom: number }): void {
    const { width, height } = this.scale;
    const hint = this.add
      .text(width / 2, height - Math.max(SPLASH.SAFE_AREA_MIN_PAD, insets.bottom) - 14, SPLASH.SKIP_HINT_TEXT, {
        fontFamily: THEME.FONT_BODY,
        fontSize: '13px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({ targets: hint, alpha: SPLASH.SKIP_HINT_ALPHA, delay: SPLASH.SKIP_HINT_DELAY_MS, duration: 400 });

    this.input.once('pointerdown', () => this.advance(true));
    this.input.keyboard?.once('keydown', () => this.advance(true));
  }

  private advance(skipped = false): void {
    if (this.isAdvancing) return;
    this.isAdvancing = true;
    this.tweens.killAll();
    fadeToScene(this, NEXT, undefined, skipped ? SPLASH.SKIP_FADE_MS : SPLASH.SCENE_FADE_MS);
  }
}
