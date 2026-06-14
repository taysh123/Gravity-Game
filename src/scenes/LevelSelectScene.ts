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
import { themeForWorld } from '../config/worldThemes';
import { worldOf } from '../utils/world';

const COLS = 3;
const CELL_W = 84;
const CELL_H = 44; // >= 44 so each cell stays a valid touch target
const GAP_X = 12;
const GAP_Y = 6;
const SECTION_GAP = 10;
const DRAG_THRESHOLD = 8; // px of movement before a press counts as a scroll, not a tap

// Chapter-grouped level select: stacked world sections (level number + earned
// stars; locked levels dimmed). Vertically scrollable so it scales past one
// screen as worlds are added (40 -> 100 levels).
export class LevelSelectScene extends Phaser.Scene {
  private cosmic!: CosmicBackground;
  private content!: Phaser.GameObjects.Container;
  private scrollMin = 0; // most-negative content.y (content bottom reached)
  private scrolled = false; // true once a press has moved past the drag threshold
  private dragStartY = 0;
  private contentStartY = 0;
  private worldId = 1;

  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  init(data: { world?: number }): void {
    // Default to the world the player is currently progressing through.
    this.worldId = data?.world ?? worldOf(ProgressStore.nextLevel(LEVELS.length)).id;
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const sx = this.scale.displaySize.width / this.scale.gameSize.width;
    const sy = this.scale.displaySize.height / this.scale.gameSize.height;
    const insets = safeAreaInsetsScaled(sx, sy);
    const reduced = reducedMotionActive();

    const world = WORLDS[this.worldId - 1] ?? WORLDS[0];
    const t = themeForWorld(world.id);
    const accentHex = `#${t.accent.toString(16).padStart(6, '0')}`;

    // This world's own atmosphere — the destination recolors the cosmos.
    this.cosmic = new CosmicBackground(this, 1, t);
    fadeIn(this);

    const titleY = Math.max(height * 0.08, insets.top + 40);
    this.add
      .text(cx, titleY, `${t.roman} · ${world.name}`, {
        fontFamily: THEME.FONT_DISPLAY, fontSize: '22px', color: accentHex, fontStyle: '700',
      })
      .setOrigin(0.5)
      .setLetterSpacing(2)
      .setDepth(10);

    const levels: number[] = [];
    for (let n = world.from; n <= Math.min(world.to, LEVELS.length); n++) levels.push(n);
    const earned = levels.reduce((s, n) => s + ProgressStore.get(n).stars, 0);
    this.add
      .text(cx, titleY + 24, `${t.subtitle}   ·   ${earned}/${levels.length * 3}★`, {
        fontFamily: THEME.FONT_BODY, fontSize: '13px', color: THEME.TEXT_MUTED,
      })
      .setOrigin(0.5)
      .setDepth(10);

    const gridW = COLS * CELL_W + (COLS - 1) * GAP_X;
    const startX = cx - gridW / 2 + CELL_W / 2;

    const viewTop = Math.max(height * 0.18, insets.top + 96);
    const backY = Math.min(height - Math.max(SPLASH.SAFE_AREA_MIN_PAD, insets.bottom) - 30, height * 0.95);
    const viewBottom = backY - 38;

    this.content = this.add.container(0, viewTop);
    let y = 12;
    levels.forEach((level, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = startX + col * (CELL_W + GAP_X);
      const cyc = y + row * (CELL_H + GAP_Y) + CELL_H / 2;
      this.makeCell(x, cyc, level, t.accent, reduced, i);
    });
    const rows = Math.ceil(levels.length / COLS);
    y += rows * (CELL_H + GAP_Y) + SECTION_GAP;

    const maskShape = this.make.graphics({});
    maskShape.fillRect(0, viewTop, width, viewBottom - viewTop);
    this.content.setMask(maskShape.createGeometryMask());

    const viewH = viewBottom - viewTop;
    this.scrollMin = Math.min(0, viewH - y);
    this.setupScroll(viewTop, viewBottom);

    if (this.scrollMin < 0) {
      this.add
        .text(cx, viewBottom + 4, '▾ scroll', { fontFamily: THEME.FONT_BODY, fontSize: '11px', color: THEME.TEXT_MUTED })
        .setOrigin(0.5)
        .setDepth(10);
    }

    // Back to the Star Map (the journey overview).
    new Button(this, cx, backY, '← Map', () => fadeToScene(this, 'WorldMapScene'), {
      width: 150, height: 46, fontSize: 18,
    }).container.setDepth(10);
  }

  // Drag-to-scroll (touch + mouse) with clamping; wheel support for desktop.
  private setupScroll(viewTop: number, viewBottom: number): void {
    const inView = (py: number) => py >= viewTop && py <= viewBottom;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!inView(p.y)) return;
      this.scrolled = false;
      this.dragStartY = p.y;
      this.contentStartY = this.content.y;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown || this.scrollMin === 0) return;
      const dy = p.y - this.dragStartY;
      if (Math.abs(dy) > DRAG_THRESHOLD) this.scrolled = true;
      if (this.scrolled) {
        this.content.y = Phaser.Math.Clamp(this.contentStartY + dy, this.scrollMin, 0);
      }
    });
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (this.scrollMin === 0) return;
      this.content.y = Phaser.Math.Clamp(this.content.y - dy, this.scrollMin, 0);
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
      // Suppress navigation if the press was a scroll drag.
      cell.on('pointerup', () => {
        if (this.scrolled) return;
        fadeToScene(this, 'GameScene', { level });
      });
    } else {
      cell.setAlpha(0.6);
    }

    this.content.add(cell);

    if (!reduced) {
      cell.setAlpha(0).setScale(0.92);
      this.tweens.add({
        targets: cell,
        alpha: unlocked ? 1 : 0.6,
        scale: 1,
        delay: 60 + index * 24,
        duration: 320,
        ease: THEME.EASE,
      });
    }
  }

  update(): void {
    this.cosmic.update();
  }
}
