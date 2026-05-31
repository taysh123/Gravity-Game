import Phaser from 'phaser';
import { THEME } from '../config/theme.config';
import { drawIcon, type IconName } from './icons';

export interface IconButtonOptions {
  size?: number; // touch target (≥44)
  iconSize?: number;
  iconColor?: number;
  round?: boolean; // pill/circle vs rounded square
}

// Glassmorphic icon button for HUD/nav. ≥44px touch target, Expo press feedback.
export class IconButton {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;

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

    const bg = scene.add.graphics();
    const half = size / 2;
    bg.fillStyle(THEME.PANEL_FILL, THEME.PANEL_ALPHA);
    bg.fillRoundedRect(-half, -half, size, size, radius);
    bg.fillStyle(THEME.GLASS_FILL, THEME.GLASS_ALPHA);
    bg.fillRoundedRect(-half, -half, size, size, radius);
    bg.lineStyle(1, THEME.HAIRLINE, THEME.HAIRLINE_ALPHA);
    bg.strokeRoundedRect(-half, -half, size, size, radius);

    const icon = scene.add.graphics();
    drawIcon(icon, name, opts.iconSize ?? size * 0.5, opts.iconColor ?? THEME.ACCENT_CYAN);

    this.container = scene.add.container(x, y, [bg, icon]);
    this.container.setSize(size, size);
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-half, -half, size, size),
      Phaser.Geom.Rectangle.Contains,
    );
    if (this.container.input) this.container.input.cursor = 'pointer';

    this.container.on('pointerdown', () => this.press(THEME.PRESS_SCALE));
    this.container.on('pointerup', () => {
      this.press(1);
      onClick();
    });
    this.container.on('pointerout', () => this.press(1));
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
