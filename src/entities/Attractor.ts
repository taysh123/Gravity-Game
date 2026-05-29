import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';

const RING_RADIUS = 30;

export class Attractor {
  readonly x: number;
  readonly y: number;
  private remainingMs: number;
  private readonly totalMs: number;
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.totalMs = PHYSICS.ATTRACTOR_DURATION_MS;
    this.remainingMs = this.totalMs;
    this.graphics = scene.add.graphics();
    this.draw(1.0);
  }

  private draw(fraction: number): void {
    const r = RING_RADIUS * fraction;
    this.graphics.clear();
    this.graphics.lineStyle(2, PHYSICS.COLOR_ATTRACTOR_PULSE, fraction * 0.5);
    this.graphics.strokeCircle(this.x, this.y, r + 10);
    this.graphics.lineStyle(3, PHYSICS.COLOR_ATTRACTOR, fraction);
    this.graphics.strokeCircle(this.x, this.y, r);
    this.graphics.fillStyle(PHYSICS.COLOR_ATTRACTOR_PULSE, fraction * 0.8);
    this.graphics.fillCircle(this.x, this.y, 4);
  }

  update(deltaMs: number): void {
    this.remainingMs -= deltaMs;
    const fraction = Math.max(0, this.remainingMs / this.totalMs);
    this.draw(fraction);
  }

  isExpired(): boolean {
    return this.remainingMs <= 0;
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
