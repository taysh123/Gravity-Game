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
    this.draw(0);
  }

  // phase: a continuous value (e.g. time/300). The outer halo breathes gently
  // so the goal reads as "alive" and draws the eye without being noisy.
  pulse(phase: number): void {
    this.draw(Math.sin(phase));
  }

  private draw(beat: number): void {
    const haloR = this.radius + 12 + beat * 4; // beat ∈ [-1, 1]
    const haloA = 0.3 + beat * 0.12;
    this.graphics.clear();
    this.graphics.lineStyle(2, PHYSICS.COLOR_GOAL, haloA);
    this.graphics.strokeCircle(this.x, this.y, haloR);
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
