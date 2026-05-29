import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';

const RING_RADIUS = 30;

export class Attractor {
  x: number;
  y: number;
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.graphics = scene.add.graphics();
    this.draw();
  }

  private draw(): void {
    this.graphics.clear();
    this.graphics.lineStyle(2, PHYSICS.COLOR_ATTRACTOR_PULSE, 0.5);
    this.graphics.strokeCircle(this.x, this.y, RING_RADIUS + 10);
    this.graphics.lineStyle(3, PHYSICS.COLOR_ATTRACTOR, 1);
    this.graphics.strokeCircle(this.x, this.y, RING_RADIUS);
    this.graphics.fillStyle(PHYSICS.COLOR_ATTRACTOR_PULSE, 0.8);
    this.graphics.fillCircle(this.x, this.y, 4);
  }

  moveTo(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.draw();
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
