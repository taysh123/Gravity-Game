import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';

export class Goal {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.graphics = scene.add.graphics();
    this.draw();
  }

  private draw(): void {
    this.graphics.clear();
    this.graphics.lineStyle(2, PHYSICS.COLOR_GOAL, 0.3);
    this.graphics.strokeCircle(this.x, this.y, this.radius + 12);
    this.graphics.lineStyle(3, PHYSICS.COLOR_GOAL, 0.9);
    this.graphics.strokeCircle(this.x, this.y, this.radius);
    this.graphics.fillStyle(PHYSICS.COLOR_GOAL, 0.15);
    this.graphics.fillCircle(this.x, this.y, this.radius);
    this.graphics.fillStyle(PHYSICS.COLOR_GOAL, 0.8);
    this.graphics.fillCircle(this.x, this.y, 5);
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
