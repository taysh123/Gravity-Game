import Phaser from 'phaser';
import { SPLASH } from '../config/splash.config';
import { THEME } from '../config/theme.config';
import { fadeToScene } from '../utils/transitions';
import { reducedMotionActive, safeAreaInsetsScaled } from '../utils/a11y';

// Stage 1: the True Story Labs brand moment. Text-only, premium — styled
// Orbitron wordmark with a gold glow, tracked caps, hairline rules, and a
// staggered reveal. (The old photo-card logo was off-brand and renamed.) ~1.9s.
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

    // Gold brand glow.
    const glow = this.add
      .image(cx, cy, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(THEME.ACCENT_GOLD)
      .setAlpha(0)
      .setDisplaySize(width * 1.1, width * 1.1);

    // Hairline rules above/below the wordmark.
    const ruleW = Math.min(width * 0.5, 220);
    const ruleTop = this.makeRule(cx, cy - 46, ruleW);
    const ruleBot = this.makeRule(cx, cy + 50, ruleW);

    const line1 = this.add
      .text(cx, cy - 14, 'TRUE STORY', {
        fontFamily: THEME.FONT_DISPLAY,
        fontSize: '34px',
        color: THEME.TEXT_PRIMARY,
        fontStyle: '700',
      })
      .setOrigin(0.5);
    line1.setLetterSpacing(6);

    const line2 = this.add
      .text(cx, cy + 24, 'L A B S', {
        fontFamily: THEME.FONT_DISPLAY,
        fontSize: '20px',
        color: '#ffd166',
        fontStyle: '600',
      })
      .setOrigin(0.5);
    line2.setLetterSpacing(10);

    this.setupSkip(insets);

    if (reducedMotionActive()) {
      [line1, line2, ruleTop, ruleBot].forEach((o) => o.setAlpha(1));
      ruleTop.setScale(1, 1);
      ruleBot.setScale(1, 1);
      glow.setAlpha(SPLASH.COMPANY_GLOW_ALPHA);
      this.time.delayedCall(SPLASH.REDUCED_MOTION_FADE_MS + SPLASH.REDUCED_MOTION_HOLD_MS, () =>
        this.advance(),
      );
      return;
    }

    // Staggered reveal.
    line1.setAlpha(0).setScale(0.96);
    line2.setAlpha(0);
    this.tweens.add({ targets: glow, alpha: SPLASH.COMPANY_GLOW_ALPHA, duration: SPLASH.COMPANY_FADE_IN_MS, ease: THEME.EASE });
    this.tweens.add({ targets: line1, alpha: 1, scale: 1, duration: SPLASH.COMPANY_FADE_IN_MS, ease: THEME.EASE });
    this.tweens.add({ targets: [ruleTop, ruleBot], scaleX: 1, alpha: 1, delay: 160, duration: 520, ease: THEME.EASE });
    this.tweens.add({ targets: line2, alpha: 1, delay: 240, duration: 520, ease: THEME.EASE });

    // Glow breathe during the hold.
    this.time.delayedCall(SPLASH.COMPANY_FADE_IN_MS, () => {
      this.tweens.add({
        targets: glow,
        alpha: SPLASH.COMPANY_GLOW_ALPHA_PEAK,
        duration: SPLASH.COMPANY_HOLD_MS,
        ease: THEME.EASE_SOFT,
        yoyo: true,
      });
    });

    this.time.delayedCall(SPLASH.COMPANY_FADE_IN_MS + SPLASH.COMPANY_HOLD_MS, () => this.advance());
  }

  // A thin centered rule that expands from the middle (scaleX 0→1).
  private makeRule(x: number, y: number, w: number): Phaser.GameObjects.Rectangle {
    return this.add
      .rectangle(x, y, w, 1, 0xffffff, 0.0)
      .setAlpha(0)
      .setScale(0, 1)
      .setFillStyle(0xffffff, 0.25);
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
