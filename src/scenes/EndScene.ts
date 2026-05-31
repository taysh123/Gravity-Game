import Phaser from 'phaser';
import { LEVELS } from '../config/levels';
import { SPLASH } from '../config/splash.config';
import { THEME } from '../config/theme.config';
import { CosmicBackground } from '../entities/CosmicBackground';
import { Button } from '../ui/Button';
import { fadeIn, fadeToScene } from '../utils/transitions';
import { reducedMotionActive } from '../utils/a11y';

export class EndScene extends Phaser.Scene {
  private cosmic!: CosmicBackground;

  constructor() {
    super({ key: 'EndScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const reduced = reducedMotionActive();

    this.cosmic = new CosmicBackground(this);
    fadeIn(this);

    this.add
      .image(cx, cy - 120, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(THEME.ACCENT_PRIMARY)
      .setAlpha(0.32)
      .setDisplaySize(width * 1.1, width * 0.8);

    const title = this.add
      .text(cx, cy - 150, SPLASH.GAME_TITLE, {
        fontFamily: THEME.FONT_DISPLAY,
        fontSize: '38px',
        color: THEME.TEXT_PRIMARY,
        fontStyle: '700',
      })
      .setOrigin(0.5);
    title.setLetterSpacing(4);

    this.add
      .text(cx, cy - 92, 'You did it!', {
        fontFamily: THEME.FONT_BODY,
        fontSize: '28px',
        color: '#00e676',
        fontStyle: '600',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy - 52, `${LEVELS.length} / ${LEVELS.length} Levels Complete`, {
        fontFamily: THEME.FONT_BODY,
        fontSize: '17px',
        color: THEME.TEXT_MUTED,
      })
      .setOrigin(0.5);

    const again = new Button(this, cx, cy + 44, 'Play Again', () => fadeToScene(this, 'GameScene', { level: 1 }), {
      fill: THEME.ACCENT_PRIMARY,
      textColor: THEME.TEXT_ON_PRIMARY,
      fontFamily: THEME.FONT_DISPLAY,
      fontSize: 20,
      glow: true,
    });
    const menu = new Button(
      this,
      cx,
      cy + 44 + SPLASH.MENU_BTN_H + SPLASH.MENU_BTN_GAP,
      'Main Menu',
      () => fadeToScene(this, 'MainMenuScene'),
      { fill: SPLASH.MENU_FILL_SECONDARY, fontFamily: THEME.FONT_DISPLAY, fontSize: 18 },
    );

    if (reduced) return;

    // Staggered entrance.
    title.setAlpha(0).setY(title.y + 14);
    this.tweens.add({ targets: title, alpha: 1, y: title.y - 14, duration: 560, ease: THEME.EASE });
    [again, menu].forEach((b, i) => {
      b.container.setAlpha(0).setY(b.container.y + 20);
      this.tweens.add({
        targets: b.container,
        alpha: 1,
        y: b.container.y - 20,
        delay: 260 + i * 110,
        duration: 480,
        ease: THEME.EASE,
      });
    });
  }

  update(): void {
    this.cosmic.update();
  }
}
