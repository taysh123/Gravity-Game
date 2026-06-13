import Phaser from 'phaser';
import { THEME } from '../config/theme.config';
import { CosmicBackground } from '../entities/CosmicBackground';
import { Button } from '../ui/Button';
import { drawGlass } from '../ui/glass';
import { fadeIn, fadeToScene } from '../utils/transitions';
import { reducedMotionActive, safeAreaInsetsScaled } from '../utils/a11y';
import { weekKey } from '../utils/endless';
import { Leaderboard } from '../utils/Leaderboard';

// GRAVITY RUN hub — choose a run mode. Built so future Daily / Event / Season rows
// just append (the mode flag on EndlessScene generalises). Endless = a fresh random
// run every time; Weekly Challenge = the shared weekly seed + the leaderboard.
export class RunSelectScene extends Phaser.Scene {
  private cosmic!: CosmicBackground;

  constructor() {
    super({ key: 'RunSelectScene' });
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
      .text(cx, Math.max(height * 0.1, insets.top + 44), 'GRAVITY RUN', {
        fontFamily: THEME.FONT_DISPLAY, fontSize: '24px', color: THEME.TEXT_PRIMARY, fontStyle: '700',
      })
      .setOrigin(0.5)
      .setLetterSpacing(3)
      .setDepth(10);

    // Endless — random each attempt; personal all-time best.
    const endlessBest = Leaderboard.bestEndless();
    const endlessCard = this.modeCard(
      cx, height * 0.34, 'ENDLESS', 'A fresh run every time',
      endlessBest > 0 ? `your best  ${endlessBest}` : 'set your first best',
      0x6a8cff, () => fadeToScene(this, 'EndlessScene', { mode: 'endless' }),
    );

    // Weekly Challenge — the shared weekly seed + the leaderboard.
    const week = weekKey(new Date());
    const weekBest = Leaderboard.bestRun(week);
    const daysLeft = this.daysLeftInWeek();
    const weeklyCard = this.modeCard(
      cx, height * 0.55, 'WEEKLY CHALLENGE', `Same run for everyone · resets in ${daysLeft}d`,
      weekBest > 0 ? `this week  ${weekBest}` : 'unbeaten this week',
      0xffd166, () => fadeToScene(this, 'EndlessScene', { mode: 'weekly' }),
    );

    const backY = Math.min(height - Math.max(28, insets.bottom) - 30, height * 0.9);
    new Button(this, cx, backY, '← Back', () => fadeToScene(this, 'MainMenuScene'), { width: 150, height: 46, fontSize: 18 });

    if (!reduced) {
      [endlessCard, weeklyCard].forEach((c, i) => {
        c.setAlpha(0).setY(c.y + 18);
        this.tweens.add({ targets: c, alpha: 1, y: c.y - 18, delay: 120 + i * 110, duration: 420, ease: THEME.EASE });
      });
    }
  }

  // A tappable glass mode card: title + blurb + a best line, accent-outlined.
  private modeCard(
    cx: number, cy: number, title: string, blurb: string, bestLine: string, accent: number, onTap: () => void,
  ): Phaser.GameObjects.Container {
    const w = Math.min(this.scale.width * 0.84, 320);
    const h = 104;
    const bg = this.add.graphics();
    drawGlass(bg, w, h, THEME.RADIUS);
    bg.lineStyle(2, accent, 0.7);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, THEME.RADIUS);
    const accentHex = `#${accent.toString(16).padStart(6, '0')}`;
    const name = this.add.text(0, -28, title, {
      fontFamily: THEME.FONT_DISPLAY, fontSize: '20px', color: accentHex, fontStyle: '700',
    }).setOrigin(0.5).setLetterSpacing(1);
    const desc = this.add.text(0, 4, blurb, {
      fontFamily: THEME.FONT_BODY, fontSize: '12.5px', color: THEME.TEXT_MUTED,
    }).setOrigin(0.5);
    const best = this.add.text(0, 30, bestLine, {
      fontFamily: THEME.FONT_BODY, fontSize: '13px', color: THEME.TEXT_PRIMARY, fontStyle: '600',
    }).setOrigin(0.5);
    const card = this.add.container(cx, cy, [bg, name, desc, best]).setDepth(10);
    card.setSize(w, h);
    card.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    card.on('pointerup', onTap);
    return card;
  }

  // Whole days until the weekly seed rolls over (buckets are floor(days/7)).
  private daysLeftInWeek(): number {
    const now = new Date();
    const days = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
    return 7 - (days % 7);
  }

  update(): void {
    this.cosmic.update();
  }
}
