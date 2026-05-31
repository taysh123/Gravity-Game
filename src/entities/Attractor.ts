import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';

const RING_RADIUS = 30;

export class Attractor {
  x: number;
  y: number;
  private phase = 0;
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.graphics = scene.add.graphics();
    this.draw();
  }

  private draw(): void {
    const beat = Math.sin(this.phase); // ∈ [-1, 1]
    this.graphics.clear();
    // Influence boundary — shows the exact reach of the gravity field
    this.graphics.lineStyle(1, PHYSICS.COLOR_ATTRACTOR, 0.18);
    this.graphics.strokeCircle(this.x, this.y, PHYSICS.ATTRACTOR_MAX_DIST);
    // Outer pulse ring — expands/contracts to signal the field is live
    this.graphics.lineStyle(2, PHYSICS.COLOR_ATTRACTOR_PULSE, 0.4 + beat * 0.2);
    this.graphics.strokeCircle(this.x, this.y, RING_RADIUS + 10 + beat * 4);
    // Core ring
    this.graphics.lineStyle(3, PHYSICS.COLOR_ATTRACTOR, 1);
    this.graphics.strokeCircle(this.x, this.y, RING_RADIUS);
    // Center dot
    this.graphics.fillStyle(PHYSICS.COLOR_ATTRACTOR_PULSE, 0.8);
    this.graphics.fillCircle(this.x, this.y, 4);
  }

  // Animate the live pulse. phase is a continuous value (e.g. time/150).
  pulse(phase: number): void {
    this.phase = phase;
    this.draw();
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
