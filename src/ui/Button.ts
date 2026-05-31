import Phaser from 'phaser';
import { SPLASH } from '../config/splash.config';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  fill?: number;
  textColor?: string;
  fontFamily?: string;
}

const RADIUS = 14;

// Minimal rounded-rect button with pointer feedback. Touch target is at least
// the configured size (≥44px per ui-ux-pro-max). Caller picks textColor for
// contrast — use dark text on bright fills (e.g. the green PLAY) for ≥4.5:1.
export class Button {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly w: number;
  private readonly h: number;
  private readonly fill: number;
  private breathe?: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    opts: ButtonOptions = {},
  ) {
    this.scene = scene;
    this.w = Math.max(44, opts.width ?? SPLASH.MENU_BTN_W);
    this.h = Math.max(44, opts.height ?? SPLASH.MENU_BTN_H);
    this.fill = opts.fill ?? SPLASH.MENU_FILL_SECONDARY;

    this.bg = scene.add.graphics();
    this.drawBg(false);

    const text = scene.add
      .text(0, 0, label, {
        fontFamily: opts.fontFamily ?? SPLASH.FONT,
        fontSize: `${opts.fontSize ?? 22}px`,
        color: opts.textColor ?? SPLASH.MENU_TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.container = scene.add.container(x, y, [this.bg, text]);
    this.container.setSize(this.w, this.h);
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-this.w / 2, -this.h / 2, this.w, this.h),
      Phaser.Geom.Rectangle.Contains,
    );
    if (this.container.input) this.container.input.cursor = 'pointer';

    this.container.on('pointerover', () => {
      this.breathe?.pause();
      this.drawBg(true);
      this.tweenScale(1.04);
    });
    this.container.on('pointerout', () => {
      this.drawBg(false);
      this.tweenScale(1, () => this.breathe?.resume());
    });
    this.container.on('pointerdown', () => {
      this.breathe?.pause();
      this.tweenScale(0.96);
    });
    this.container.on('pointerup', () => {
      this.tweenScale(1.04);
      onClick();
    });
  }

  // Subtle idle "breathing" so the menu feels alive. Opt-in per button.
  startBreathing(delay = 0): this {
    this.breathe = this.scene.tweens.add({
      targets: this.container,
      scale: 1 + SPLASH.IDLE_BREATHE_SCALE,
      duration: SPLASH.IDLE_BREATHE_MS,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
      delay,
    });
    return this;
  }

  destroy(): void {
    this.breathe?.remove();
    this.container.destroy();
  }

  private tweenScale(scale: number, onComplete?: () => void): void {
    this.scene.tweens.add({
      targets: this.container,
      scale,
      duration: 120,
      ease: 'Sine.Out',
      onComplete,
    });
  }

  private drawBg(hover: boolean): void {
    const x = -this.w / 2;
    const y = -this.h / 2;
    this.bg.clear();
    this.bg.fillStyle(this.fill, 1);
    this.bg.fillRoundedRect(x, y, this.w, this.h, RADIUS);
    if (hover) {
      this.bg.lineStyle(2, 0xffffff, 0.5);
      this.bg.strokeRoundedRect(x, y, this.w, this.h, RADIUS);
    }
  }
}
