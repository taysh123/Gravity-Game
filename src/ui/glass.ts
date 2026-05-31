import Phaser from 'phaser';
import { THEME } from '../config/theme.config';

// Draw a frosted-glass panel (fill + sheen + hairline) centered at (0,0) into a
// Graphics. Shared by the HUD chip, win overlay, and settings panel.
export function drawGlass(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  radius: number = THEME.RADIUS,
): void {
  const x = -w / 2;
  const y = -h / 2;
  g.fillStyle(THEME.PANEL_FILL, THEME.PANEL_ALPHA);
  g.fillRoundedRect(x, y, w, h, radius);
  g.fillStyle(THEME.GLASS_FILL, THEME.GLASS_ALPHA);
  g.fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(1, THEME.HAIRLINE, THEME.HAIRLINE_ALPHA);
  g.strokeRoundedRect(x, y, w, h, radius);
}
