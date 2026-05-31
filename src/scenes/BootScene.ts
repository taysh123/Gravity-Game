import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.generateSparkTexture();
    this.scene.start('GameScene');
  }

  // Runtime-generated particle texture — keeps the "no image assets" rule.
  // A small white disc; the emitter tints it per use.
  private generateSparkTexture(): void {
    const size = 8;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(size / 2, size / 2, size / 2);
    g.generateTexture('spark', size, size);
    g.destroy();
  }
}
