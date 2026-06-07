import Phaser from 'phaser';
import { THEME } from '../config/theme.config';
import { SPLASH } from '../config/splash.config';
import { CosmicBackground } from '../entities/CosmicBackground';
import { Button } from '../ui/Button';
import { drawGlass } from '../ui/glass';
import { fadeIn, fadeToScene } from '../utils/transitions';
import { reducedMotionActive, safeAreaInsetsScaled } from '../utils/a11y';
import { COSMETICS } from '../utils/cosmetics';
import { CosmeticStore } from '../utils/CosmeticStore';
import { CurrencyStore } from '../utils/CurrencyStore';

const ROW_H = 58;
const ROW_GAP = 10;

// Cosmetics shop: equip owned ball themes, buy new ones with Stardust. (IAP is
// wired in the native sprint — same store, different funding source.)
export class CosmeticsScene extends Phaser.Scene {
  private cosmic!: CosmicBackground;

  constructor() {
    super({ key: 'CosmeticsScene' });
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

    const topY = Math.max(height * 0.07, insets.top + 38);
    this.add
      .text(cx, topY, 'COSMETICS', {
        fontFamily: THEME.FONT_DISPLAY, fontSize: '22px', color: THEME.TEXT_PRIMARY, fontStyle: '700',
      })
      .setOrigin(0.5)
      .setLetterSpacing(3);
    this.add
      .text(cx, topY + 26, `${CurrencyStore.balance()} ✦ Stardust`, {
        fontFamily: THEME.FONT_BODY, fontSize: '14px', color: '#ffd166',
      })
      .setOrigin(0.5);

    const rowW = Math.min(width * 0.88, 320);
    let y = Math.max(height * 0.18, insets.top + 92) + ROW_H / 2;
    const equippedId = CosmeticStore.equippedId();

    COSMETICS.forEach((c, i) => {
      const owned = CosmeticStore.isOwned(c.id);
      const equipped = equippedId === c.id;

      const bg = this.add.graphics();
      drawGlass(bg, rowW, ROW_H, THEME.RADIUS_SM);
      if (equipped) {
        bg.lineStyle(2, THEME.ACCENT_GOLD, 0.6);
        bg.strokeRoundedRect(-rowW / 2, -ROW_H / 2, rowW, ROW_H, THEME.RADIUS_SM);
      }

      // Swatch — the actual ball theme (fill + glow ring).
      const sw = this.add.graphics();
      sw.lineStyle(3, c.glow, 0.6);
      sw.strokeCircle(-rowW / 2 + 34, 0, 17);
      sw.fillStyle(c.fill, 1);
      sw.fillCircle(-rowW / 2 + 34, 0, 13);

      const name = this.add
        .text(-rowW / 2 + 62, 0, c.name, {
          fontFamily: THEME.FONT_DISPLAY, fontSize: '16px', color: THEME.TEXT_PRIMARY, fontStyle: '600',
        })
        .setOrigin(0, 0.5);

      const tagStr = equipped ? 'EQUIPPED' : owned ? 'EQUIP' : `${c.cost} ✦`;
      const tagColor = equipped ? '#ffd166' : owned ? THEME.TEXT_PRIMARY : '#9ad0ff';
      const tag = this.add
        .text(rowW / 2 - 18, 0, tagStr, {
          fontFamily: THEME.FONT_BODY, fontSize: '14px', color: tagColor, fontStyle: '600',
        })
        .setOrigin(1, 0.5);

      const row = this.add.container(cx, y, [bg, sw, name, tag]);
      row.setSize(rowW, ROW_H);
      if (!equipped) {
        row.setInteractive(new Phaser.Geom.Rectangle(-rowW / 2, -ROW_H / 2, rowW, ROW_H), Phaser.Geom.Rectangle.Contains);
        if (row.input) row.input.cursor = 'pointer';
        row.on('pointerup', () => {
          const result = CosmeticStore.buyOrEquip(c.id);
          if (result === 'cantAfford') {
            this.cameras.main.shake(120, 0.004); // can't afford — small nudge
          } else {
            this.scene.restart(); // refresh state (and the equipped ball updates next game)
          }
        });
      }
      if (!reduced) {
        row.setAlpha(0).setScale(0.96);
        this.tweens.add({ targets: row, alpha: 1, scale: 1, delay: 40 + i * 28, duration: 280, ease: THEME.EASE });
      }
      y += ROW_H + ROW_GAP;
    });

    const backY = Math.min(height - Math.max(SPLASH.SAFE_AREA_MIN_PAD, insets.bottom) - 30, height * 0.95);
    new Button(this, cx, backY, '← Back', () => fadeToScene(this, 'MainMenuScene'), {
      width: 150, height: 46, fontSize: 18,
    });
  }

  update(): void {
    this.cosmic.update();
  }
}
