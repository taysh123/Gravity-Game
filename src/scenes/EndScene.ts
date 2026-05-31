import Phaser from 'phaser';
import { LEVELS } from '../config/levels';

export class EndScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.add
      .text(cx, cy - 80, 'You did it!', {
        fontSize: '42px',
        color: '#00e676',
        fontFamily: 'Arial, sans-serif',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy - 20, `${LEVELS.length} / ${LEVELS.length} Levels Complete`, {
        fontSize: '20px',
        color: '#aaaaaa',
        fontFamily: 'Arial, sans-serif',
      })
      .setOrigin(0.5);

    const btn = this.add
      .text(cx, cy + 60, 'Play Again', {
        fontSize: '22px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#7c5cff',
        padding: { x: 28, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      this.scene.start('GameScene', { level: 1 });
    });

    btn.on('pointerover', () => {
      btn.setStyle({ backgroundColor: '#9b7dff' });
    });

    btn.on('pointerout', () => {
      btn.setStyle({ backgroundColor: '#7c5cff' });
    });
  }
}
