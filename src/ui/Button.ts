import Phaser from 'phaser';
import { SPLASH } from '../config/splash.config';
import { THEME } from '../config/theme.config';
import { drawIcon, type IconName } from './icons';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  fill?: number;
  textColor?: string;
  fontFamily?: string;
  glow?: boolean; // accent glow behind the button (primary CTAs)
  icon?: IconName; // optional leading icon
}

// Rounded-rect button with pointer feedback, theme radius/easing, an optional
// accent glow (primary CTAs) and leading icon. Touch target ≥44px. Caller picks
// textColor for contrast — dark text on bright fills (e.g. green PLAY) for ≥4.5:1.
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

    const children: Phaser.GameObjects.GameObject[] = [];

    // Accent glow behind the button (premium CTA emphasis).
    if (opts.glow) {
      const glow = scene.add
        .image(0, 0, 'glow')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(this.fill)
        .setAlpha(0.45)
        .setDisplaySize(this.w * 1.5, this.h * 2.6);
      children.push(glow);
    }

    this.bg = scene.add.graphics();
    this.drawBg(false);
    children.push(this.bg);

    const hasIcon = !!opts.icon;
    const textX = hasIcon ? 14 : 0;
    if (opts.icon) {
      const icon = scene.add.graphics();
      drawIcon(icon, opts.icon, this.h * 0.42, opts.textColor ? hexToNum(opts.textColor) : 0xffffff);
      icon.setPosition(-this.w / 2 + 30, 0);
      children.push(icon);
    }

    const text = scene.add
      .text(textX, 0, label, {
        fontFamily: opts.fontFamily ?? THEME.FONT_BODY,
        fontSize: `${opts.fontSize ?? 22}px`,
        color: opts.textColor ?? THEME.TEXT_PRIMARY,
        fontStyle: '600',
      })
      .setOrigin(0.5);
    children.push(text);

    this.container = scene.add.container(x, y, children);
    this.container.setSize(this.w, this.h);
    // Hit area extends past the visible edge so the whole surface + a margin
    // for finger-drift is tappable (and releases stay inside → onClick fires).
    const pad = THEME.HIT_PADDING;
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-this.w / 2 - pad, -this.h / 2 - pad, this.w + pad * 2, this.h + pad * 2),
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
      this.drawBg(true); // immediate visual feedback on press
      this.tweenScale(THEME.PRESS_SCALE);
    });
    this.container.on('pointerup', () => {
      this.drawBg(false);
      this.tweenScale(1.04);
      onClick();
    });
    this.container.on('pointerupoutside', () => {
      this.drawBg(false);
      this.tweenScale(1);
    });
  }

  // Subtle idle "breathing" so the menu feels alive. Opt-in per button.
  startBreathing(delay = 0): this {
    this.breathe = this.scene.tweens.add({
      targets: this.container,
      scale: 1 + SPLASH.IDLE_BREATHE_SCALE,
      duration: SPLASH.IDLE_BREATHE_MS,
      ease: THEME.EASE_SOFT,
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
      duration: 130,
      ease: THEME.EASE,
      onComplete,
    });
  }

  private drawBg(hover: boolean): void {
    const x = -this.w / 2;
    const y = -this.h / 2;
    this.bg.clear();
    this.bg.fillStyle(this.fill, 1);
    this.bg.fillRoundedRect(x, y, this.w, this.h, THEME.RADIUS);
    // Hairline for definition on the dark backdrop.
    this.bg.lineStyle(1, THEME.HAIRLINE, hover ? 0.45 : THEME.HAIRLINE_ALPHA);
    this.bg.strokeRoundedRect(x, y, this.w, this.h, THEME.RADIUS);
  }
}

function hexToNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}
