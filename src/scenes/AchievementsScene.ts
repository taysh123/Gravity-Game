import Phaser from 'phaser';
import { THEME } from '../config/theme.config';
import { SPLASH } from '../config/splash.config';
import { CosmicBackground } from '../entities/CosmicBackground';
import { Button } from '../ui/Button';
import { drawGlass } from '../ui/glass';
import { fadeIn, fadeToScene } from '../utils/transitions';
import { reducedMotionActive, safeAreaInsetsScaled } from '../utils/a11y';
import { ACHIEVEMENTS } from '../utils/achievements';
import { AchievementStore } from '../utils/AchievementStore';
import { StatsStore } from '../utils/StatsStore';

const ROW_H = 56;
const ROW_GAP = 8;
const DRAG_THRESHOLD = 8;

// Scrollable list of all achievements (locked/unlocked) with a stats summary.
// Reuses the level-select scroll pattern (content container + mask + drag/wheel).
export class AchievementsScene extends Phaser.Scene {
  private cosmic!: CosmicBackground;
  private content!: Phaser.GameObjects.Container;
  private scrollMin = 0;
  private dragStartY = 0;
  private contentStartY = 0;
  private scrolling = false;

  constructor() {
    super({ key: 'AchievementsScene' });
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

    const snap = StatsStore.collectSnapshot();
    const unlocked = AchievementStore.unlockedCount();

    this.add
      .text(cx, Math.max(height * 0.07, insets.top + 38), 'ACHIEVEMENTS', {
        fontFamily: THEME.FONT_DISPLAY,
        fontSize: '22px',
        color: THEME.TEXT_PRIMARY,
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setLetterSpacing(3)
      .setDepth(10);

    this.add
      .text(cx, Math.max(height * 0.07, insets.top + 38) + 26,
        `${unlocked}/${ACHIEVEMENTS.length} unlocked  ·  ${snap.totalStars}★  ·  ${snap.levelsCompleted}/${snap.totalLevels} levels`, {
        fontFamily: THEME.FONT_BODY,
        fontSize: '12px',
        color: THEME.TEXT_MUTED,
      })
      .setOrigin(0.5)
      .setDepth(10);

    const rowW = Math.min(width * 0.88, 320);
    const viewTop = Math.max(height * 0.16, insets.top + 88);
    const backY = Math.min(height - Math.max(SPLASH.SAFE_AREA_MIN_PAD, insets.bottom) - 30, height * 0.95);
    const viewBottom = backY - 38;

    this.content = this.add.container(0, viewTop);
    let y = 6;
    ACHIEVEMENTS.forEach((a, i) => {
      const on = AchievementStore.isUnlocked(a.id);
      const row = this.add.graphics();
      if (on) {
        drawGlass(row, rowW, ROW_H, THEME.RADIUS_SM);
        row.lineStyle(1.5, THEME.ACCENT_GOLD, 0.45);
        row.strokeRoundedRect(-rowW / 2, -ROW_H / 2, rowW, ROW_H, THEME.RADIUS_SM);
      } else {
        row.fillStyle(0x0a0c16, 0.7);
        row.fillRoundedRect(-rowW / 2, -ROW_H / 2, rowW, ROW_H, THEME.RADIUS_SM);
      }
      const mark = this.add
        .text(-rowW / 2 + 22, 0, on ? '★' : '🔒', {
          fontFamily: THEME.FONT_BODY,
          fontSize: on ? '22px' : '16px',
          color: on ? '#ffd166' : '#3a4256',
        })
        .setOrigin(0.5);
      const name = this.add
        .text(-rowW / 2 + 46, -10, a.name, {
          fontFamily: THEME.FONT_DISPLAY,
          fontSize: '15px',
          color: on ? THEME.TEXT_PRIMARY : THEME.TEXT_MUTED,
          fontStyle: '600',
        })
        .setOrigin(0, 0.5);
      const desc = this.add
        .text(-rowW / 2 + 46, 11, a.desc, {
          fontFamily: THEME.FONT_BODY,
          fontSize: '11px',
          color: THEME.TEXT_MUTED,
        })
        .setOrigin(0, 0.5);
      const rowC = this.add.container(cx, y + ROW_H / 2, [row, mark, name, desc]);
      this.content.add(rowC);
      if (!reduced) {
        rowC.setAlpha(0).setX(cx + 16);
        this.tweens.add({ targets: rowC, alpha: 1, x: cx, delay: 40 + i * 22, duration: 280, ease: THEME.EASE });
      }
      y += ROW_H + ROW_GAP;
    });

    const maskShape = this.make.graphics({});
    maskShape.fillRect(0, viewTop, width, viewBottom - viewTop);
    this.content.setMask(maskShape.createGeometryMask());

    this.scrollMin = Math.min(0, viewBottom - viewTop - y);
    this.setupScroll(viewTop, viewBottom);

    new Button(this, cx, backY, '← Back', () => fadeToScene(this, 'MainMenuScene'), {
      width: 150,
      height: 46,
      fontSize: 18,
    }).container.setDepth(10);
  }

  private setupScroll(viewTop: number, viewBottom: number): void {
    const inView = (py: number) => py >= viewTop && py <= viewBottom;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!inView(p.y)) return;
      this.scrolling = false;
      this.dragStartY = p.y;
      this.contentStartY = this.content.y;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown || this.scrollMin === 0) return;
      const dy = p.y - this.dragStartY;
      if (Math.abs(dy) > DRAG_THRESHOLD) this.scrolling = true;
      if (this.scrolling) this.content.y = Phaser.Math.Clamp(this.contentStartY + dy, this.scrollMin, 0);
    });
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (this.scrollMin === 0) return;
      this.content.y = Phaser.Math.Clamp(this.content.y - dy, this.scrollMin, 0);
    });
  }

  update(): void {
    this.cosmic.update();
  }
}
