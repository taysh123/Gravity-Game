import Phaser from 'phaser';
import { LEVELS } from '../config/levels';
import { WORLDS } from '../config/worlds';
import { SPLASH } from '../config/splash.config';
import { THEME } from '../config/theme.config';
import { CosmicBackground } from '../entities/CosmicBackground';
import { Button } from '../ui/Button';
import { drawGlass } from '../ui/glass';
import { fadeIn, fadeToScene } from '../utils/transitions';
import { reducedMotionActive, safeAreaInsetsScaled } from '../utils/a11y';
import { ProgressStore } from '../utils/ProgressStore';

const COLS = 3;
// Compact enough to stack 5 worlds (27 levels) on one screen. CELL_H stays ≥44
// so each cell remains a valid touch target.
const CELL_W = 84;
const CELL_H = 44;
const GAP_X = 12;
const GAP_Y = 5;
const HEADER_H = 20;
const SECTION_GAP = 6;

// Chapter-grouped level select: stacked world sections, each cell showing its
// level number + earned stars; locked levels are dimmed (sequential unlock).
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

    this.add
      .text(cx, Math.max(height * 0.08, insets.top + 44), 'SELECT LEVEL', {
        fontFamily: THEME.FONT_DISPLAY,
        fontSize: '22px',
        color: THEME.TEXT_PRIMARY,
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setLetterSpacing(3);

    const gridW = COLS * CELL_W + (COLS - 1) * GAP_X;
    const startX = cx - gridW / 2 + CELL_W / 2;
    let y = Math.max(height * 0.16, insets.top + 84);

    for (const world of WORLDS) {
      const levels: number[] = [];
      for (let n = world.from; n <= Math.min(world.to, LEVELS.length); n++) levels.push(n);
      if (levels.length === 0) continue;

      // Section header + star tally.
      const earned = levels.reduce((s, n) => s + ProgressStore.get(n).stars, 0);
      this.add
        .text(startX - CELL_W / 2, y, world.name, {
          fontFamily: THEME.FONT_DISPLAY,
          fontSize: '15px',
          color: Phaser.Display.Color.IntegerToColor(world.theme).rgba,
          fontStyle: '600',
        })
        .setOrigin(0, 0.5)
        .setLetterSpacing(2);
      this.add
        .text(startX - CELL_W / 2 + gridW, y, `${earned}/${levels.length * 3}★`, {
          fontFamily: THEME.FONT_BODY,
          fontSize: '13px',
          color: THEME.TEXT_MUTED,
        })
        .setOrigin(1, 0.5);
      y += HEADER_H;

      levels.forEach((level, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x = startX + col * (CELL_W + GAP_X);
        const cyc = y + row * (CELL_H + GAP_Y) + CELL_H / 2;
        this.makeCell(x, cyc, level, world.theme, reduced, i);
      });

      const rows = Math.ceil(levels.length / COLS);
      y += rows * (CELL_H + GAP_Y) + SECTION_GAP;
    }

    const backY = Math.min(height - Math.max(SPLASH.SAFE_AREA_MIN_PAD, insets.bottom) - 32, height * 0.94);
    new Button(this, cx, backY, '← Back', () => fadeToScene(this, 'MainMenuScene'), {
      width: 150,
      height: 46,
      fontSize: 18,
    });
  }

  private makeCell(
    x: number,
    y: number,
    level: number,
    theme: number,
    reduced: boolean,
    index: number,
  ): void {
    const unlocked = ProgressStore.isUnlocked(level);
    const stars = ProgressStore.get(level).stars;

    const bg = this.add.graphics();
    if (unlocked) {
      drawGlass(bg, CELL_W, CELL_H, THEME.RADIUS_SM);
      bg.lineStyle(1.5, theme, 0.4);
      bg.strokeRoundedRect(-CELL_W / 2, -CELL_H / 2, CELL_W, CELL_H, THEME.RADIUS_SM);
    } else {
      bg.fillStyle(0x0a0c16, 0.7);
      bg.fillRoundedRect(-CELL_W / 2, -CELL_H / 2, CELL_W, CELL_H, THEME.RADIUS_SM);
    }

    const label = this.add
      .text(0, unlocked ? -8 : 0, String(level), {
        fontFamily: THEME.FONT_DISPLAY,
        fontSize: '22px',
        color: unlocked ? THEME.TEXT_PRIMARY : THEME.TEXT_MUTED,
        fontStyle: '700',
      })
      .setOrigin(0.5);

    const children: Phaser.GameObjects.GameObject[] = [bg, label];

    // Three mini star pips at the bottom.
    if (unlocked) {
      for (let s = 0; s < 3; s++) {
        const pip = this.add
          .text((s - 1) * 16, 15, '★', {
            fontFamily: THEME.FONT_BODY,
            fontSize: '13px',
            color: s < stars ? '#ffd166' : '#3a4256',
          })
          .setOrigin(0.5);
        children.push(pip);
      }
    }

    const cell = this.add.container(x, y, children);
    cell.setSize(CELL_W, CELL_H);

    if (unlocked) {
      cell.setInteractive(
        new Phaser.Geom.Rectangle(-CELL_W / 2, -CELL_H / 2, CELL_W, CELL_H),
        Phaser.Geom.Rectangle.Contains,
      );
      if (cell.input) cell.input.cursor = 'pointer';
      cell.on('pointerup', () => fadeToScene(this, 'GameScene', { level }));
    } else {
      cell.setAlpha(0.6);
    }

    if (!reduced) {
      cell.setAlpha(0).setScale(0.92);
      this.tweens.add({
        targets: cell,
        alpha: unlocked ? 1 : 0.6,
        scale: 1,
        delay: 100 + index * 40,
        duration: 360,
        ease: THEME.EASE,
      });
    }
  }

  update(): void {
    this.cosmic.update();
  }
}
