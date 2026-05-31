import Phaser from 'phaser';
import { LEVELS } from '../config/levels';
import { SPLASH } from '../config/splash.config';
import { THEME } from '../config/theme.config';
import { CosmicBackground } from '../entities/CosmicBackground';
import { Button } from '../ui/Button';
import { fadeIn, fadeToScene } from '../utils/transitions';
import { reducedMotionActive, safeAreaInsetsScaled } from '../utils/a11y';

// Level picker: one cell per entry in LEVELS (count is the single source of
// truth — never hard-coded). Cells route into GameScene at the chosen level.
const CELL_W = 96;
const CELL_H = 72;
const GAP = 18;

export class LevelSelectScene extends Phaser.Scene {
  private cosmic!: CosmicBackground;

  constructor() {
    super({ key: 'LevelSelectScene' });
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

    const title = this.add
      .text(cx, Math.max(height * 0.16, insets.top + 60), 'SELECT LEVEL', {
        fontFamily: THEME.FONT_DISPLAY,
        fontSize: '24px',
        color: THEME.TEXT_PRIMARY,
        fontStyle: '700',
      })
      .setOrigin(0.5);
    title.setLetterSpacing(3);

    const cols = SPLASH.LEVEL_COLS;
    const rows = Math.ceil(LEVELS.length / cols);
    const gridW = cols * CELL_W + (cols - 1) * GAP;
    const gridH = rows * CELL_H + (rows - 1) * GAP;
    const startX = cx - gridW / 2 + CELL_W / 2;
    const startY = height * 0.5 - gridH / 2 + CELL_H / 2;

    for (let i = 0; i < LEVELS.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (CELL_W + GAP);
      const y = startY + row * (CELL_H + GAP);
      const level = i + 1;
      const cell = new Button(this, x, y, String(level), () => fadeToScene(this, 'GameScene', { level }), {
        width: CELL_W,
        height: CELL_H,
        fontSize: 26,
        fontFamily: THEME.FONT_DISPLAY,
        fill: SPLASH.MENU_FILL_SECONDARY,
      });
      if (!reduced) {
        cell.container.setAlpha(0).setY(y + 16);
        this.tweens.add({
          targets: cell.container,
          alpha: 1,
          y,
          delay: 120 + i * 55,
          duration: 420,
          ease: THEME.EASE,
        });
      }
    }

    const backY = Math.min(height - Math.max(SPLASH.SAFE_AREA_MIN_PAD, insets.bottom) - 40, height * 0.88);
    new Button(this, cx, backY, '← Back', () => fadeToScene(this, 'MainMenuScene'), {
      width: 160,
      height: 50,
      fontSize: 19,
    });
  }

  update(): void {
    this.cosmic.update();
  }
}
