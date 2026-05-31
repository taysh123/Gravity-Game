import Phaser from 'phaser';
import { LEVELS } from '../config/levels';
import { SPLASH } from '../config/splash.config';
import { CosmicBackground } from '../entities/CosmicBackground';
import { Button } from '../ui/Button';
import { fadeIn, fadeToScene } from '../utils/transitions';

export class EndScene extends Phaser.Scene {
  private cosmic!: CosmicBackground;

  constructor() {
    super({ key: 'EndScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.cosmic = new CosmicBackground(this);
    fadeIn(this);

    const title = this.add
      .text(cx, cy - 150, SPLASH.GAME_TITLE, {
        fontFamily: SPLASH.FONT,
        fontSize: '40px',
        color: SPLASH.MENU_TEXT,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    title.setLetterSpacing(4);

    this.add
      .text(cx, cy - 90, 'You did it!', {
        fontFamily: SPLASH.FONT,
        fontSize: '30px',
        color: '#00e676',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy - 50, `${LEVELS.length} / ${LEVELS.length} Levels Complete`, {
        fontFamily: SPLASH.FONT,
        fontSize: '18px',
        color: '#aeb8d8',
      })
      .setOrigin(0.5);

    new Button(this, cx, cy + 40, 'Play Again', () => fadeToScene(this, 'GameScene', { level: 1 }), {
      fill: SPLASH.MENU_FILL_PRIMARY,
      textColor: '#0a2417',
    });

    new Button(
      this,
      cx,
      cy + 40 + SPLASH.MENU_BTN_H + SPLASH.MENU_BTN_GAP,
      'Main Menu',
      () => fadeToScene(this, 'MainMenuScene'),
      { fill: SPLASH.MENU_FILL_SECONDARY },
    );
  }

  update(): void {
    this.cosmic.update();
  }
}
