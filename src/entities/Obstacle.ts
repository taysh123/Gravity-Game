import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';

export class Obstacle {
  readonly body: MatterJS.BodyType;
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    angle = 0,
  ) {
    this.body = scene.matter.add.rectangle(x, y, width, height, {
      isStatic: true,
      restitution: 0.4,
      friction: 0.05,
      label: 'obstacle',
      angle: Phaser.Math.DegToRad(angle),
    });

    this.graphics = scene.add.graphics();
    this.graphics.fillStyle(PHYSICS.COLOR_OBSTACLE, 1);
    this.graphics.fillRect(x - width / 2, y - height / 2, width, height);
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
