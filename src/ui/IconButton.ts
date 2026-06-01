import Phaser from 'phaser';
import { THEME } from '../config/theme.config';
import { drawIcon, type IconName } from './icons';

export interface IconButtonOptions {
  size?: number; // touch target (≥44)
  iconSize?: number;
  iconColor?: number;
  round?: boolean; // pill/circle vs rounded square
  bare?: boolean; // no glass backing (sits inside a shared toolbar); press shows a highlight
}

// Glassmorphic icon button for HUD/nav. ≥44px touch target, Expo press feedback.
export class IconButton {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly size: number;
  private readonly radius: number;
  private readonly iconColor: number;
  private readonly bare: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    name: IconName,
    onClick: () => void,
    opts: IconButtonOptions = {},
  ) {
    this.scene = scene;
    const size = Math.max(44, opts.size ?? 46);
    const radius = opts.round ? size / 2 : THEME.RADIUS_SM;

    const half = size / 2;
    this.radius = radius;
    this.size = size;
    this.iconColor = opts.iconColor ?? THEME.ACCENT_CYAN;
    this.bare = !!opts.bare;

    this.bg = scene.add.graphics();
    this.drawBg(false);

    const icon = scene.add.graphics();
    drawIcon(icon, name, opts.iconSize ?? size * 0.5, this.iconColor);

    this.container = scene.add.container(x, y, [this.bg, icon]);
    this.container.setSize(size, size);
    // Hit area extends past the visible square so the full surface + a margin
    // for finger-drift is tappable.
    const pad = THEME.HIT_PADDING;
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-half - pad, -half - pad, size + pad * 2, size + pad * 2),
      Phaser.Geom.Rectangle.Contains,
    );
    if (this.container.input) this.container.input.cursor = 'pointer';

    this.container.on('pointerdown', () => {
      this.drawBg(true);
      this.press(THEME.PRESS_SCALE);
    });
    this.container.on('pointerup', () => {
      this.drawBg(false);
      this.press(1);
      onClick();
    });
    this.container.on('pointerout', () => {
      this.drawBg(false);
      this.press(1);
    });
    this.container.on('pointerupoutside', () => {
      this.drawBg(false);
      this.press(1);
    });
  }

  private drawBg(pressed: boolean): void {
    const half = this.size / 2;
    this.bg.clear();
    if (this.bare) {
      // No backing at rest; a soft highlight on press (sits in a shared toolbar).
      if (pressed) {
        this.bg.fillStyle(this.iconColor, 0.16);
        this.bg.fillRoundedRect(-half + 4, -half + 4, this.size - 8, this.size - 8, this.radius);
      }
      return;
    }
    this.bg.fillStyle(THEME.PANEL_FILL, THEME.PANEL_ALPHA);
    this.bg.fillRoundedRect(-half, -half, this.size, this.size, this.radius);
    this.bg.fillStyle(pressed ? this.iconColor : THEME.GLASS_FILL, pressed ? 0.14 : THEME.GLASS_ALPHA);
    this.bg.fillRoundedRect(-half, -half, this.size, this.size, this.radius);
    this.bg.lineStyle(1, pressed ? this.iconColor : THEME.HAIRLINE, pressed ? 0.5 : THEME.HAIRLINE_ALPHA);
    this.bg.strokeRoundedRect(-half, -half, this.size, this.size, this.radius);
  }

  setPosition(x: number, y: number): this {
    this.container.setPosition(x, y);
    return this;
  }

  destroy(): void {
    this.container.destroy();
  }

  private press(scale: number): void {
    this.scene.tweens.add({ targets: this.container, scale, duration: 110, ease: THEME.EASE });
  }
}
