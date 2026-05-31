import Phaser from 'phaser';
import { IMAGES } from '../config/assets';
import { SPLASH } from '../config/splash.config';
import { fadeToScene } from '../utils/transitions';
import { prefersReducedMotion, safeAreaInsetsScaled } from '../utils/a11y';

// Stage 1 of the startup flow: the True Story Application brand moment.
// Black → fade-in + scale-up → soft orange glow pulse → fade out. ~1.9s.
// TODO(step 4): NEXT becomes 'IntroSplashScene' once that scene exists.
const NEXT = 'GameScene';

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

    const targetW = width * SPLASH.COMPANY_LOGO_W_RATIO;

    // Orange brand glow sits behind the logo (added first = lower depth).
    const glow = this.add
      .image(cx, cy, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(SPLASH.COMPANY_GLOW_COLOR)
      .setAlpha(0)
      .setDisplaySize(targetW * SPLASH.COMPANY_GLOW_SCALE, targetW * SPLASH.COMPANY_GLOW_SCALE);

    const logo = this.add.image(cx, cy, IMAGES.trueStoryLogo.key).setOrigin(0.5);
    const baseScale = targetW / logo.width;
    logo.setScale(baseScale).setAlpha(0);

    this.setupSkip(insets);

    const reduced = prefersReducedMotion();

    if (reduced) {
      // Accessible path: plain cross-fade, no scale/pulse.
      this.tweens.add({ targets: [logo, glow], alpha: { from: 0, to: 1 }, duration: SPLASH.REDUCED_MOTION_FADE_MS });
      glow.setAlpha(SPLASH.COMPANY_GLOW_ALPHA);
      this.time.delayedCall(SPLASH.REDUCED_MOTION_FADE_MS + SPLASH.REDUCED_MOTION_HOLD_MS, () => this.advance());
      return;
    }

    // Fade-in + subtle scale-up.
    logo.setScale(baseScale * 0.92);
    this.tweens.add({
      targets: logo,
      alpha: 1,
      scale: baseScale,
      duration: SPLASH.COMPANY_FADE_IN_MS,
      ease: 'Sine.Out',
    });
    this.tweens.add({
      targets: glow,
      alpha: SPLASH.COMPANY_GLOW_ALPHA,
      duration: SPLASH.COMPANY_FADE_IN_MS,
      ease: 'Sine.Out',
      onComplete: () => {
        // Premium "breathe" while the logo holds.
        this.tweens.add({
          targets: glow,
          alpha: SPLASH.COMPANY_GLOW_ALPHA_PEAK,
          duration: SPLASH.COMPANY_HOLD_MS,
          ease: 'Sine.InOut',
          yoyo: true,
        });
      },
    });

    this.time.delayedCall(
      SPLASH.COMPANY_FADE_IN_MS + SPLASH.COMPANY_HOLD_MS,
      () => this.advance(),
    );
  }

  private setupSkip(insets: { bottom: number }): void {
    const { width, height } = this.scale;
    const hint = this.add
      .text(width / 2, height - Math.max(SPLASH.SAFE_AREA_MIN_PAD, insets.bottom) - 14, SPLASH.SKIP_HINT_TEXT, {
        fontFamily: SPLASH.FONT,
        fontSize: '13px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({
      targets: hint,
      alpha: SPLASH.SKIP_HINT_ALPHA,
      delay: SPLASH.SKIP_HINT_DELAY_MS,
      duration: 400,
    });

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
