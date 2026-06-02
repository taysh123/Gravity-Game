import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';
import type { MagnetConfig } from '../types';

// A static force well. While the ball is within `maxDist`, GameScene applies an
// inverse-square force toward (attract) or away from (repel) this point — the
// same model as the attractor, just always-on. Visual = glowing core + an
// influence ring + rings drifting inward (attract) or outward (repel).
export class Magnet {
  readonly x: number;
  readonly y: number;
  readonly strength: number; // signed: + pulls toward, - pushes away
  readonly maxDist: number;
  private readonly attract: boolean;
  private readonly color: number;
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, cx: number, cy: number, cfg: MagnetConfig) {
    this.x = cx;
    this.y = cy;
    this.attract = (cfg.polarity ?? 'attract') === 'attract';
    const mag = cfg.strength ?? PHYSICS.MAGNET_STRENGTH;
    this.strength = this.attract ? mag : -mag;
    this.maxDist = cfg.radius ?? PHYSICS.MAGNET_MAX_DIST;
    this.color = this.attract ? PHYSICS.COLOR_MAGNET_ATTRACT : PHYSICS.COLOR_MAGNET_REPEL;

    this.graphics = scene.add.graphics().setDepth(-4);
    this.draw(0);
  }

  // Animate the rings. phase is a continuous value (e.g. time/600).
  pulse(phase: number): void {
    this.draw(phase);
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private draw(phase: number): void {
    const g = this.graphics;
    g.clear();

    // Faint influence boundary (teaches the well's reach, like the attractor ring).
    g.lineStyle(1.5, this.color, 0.12);
    g.strokeCircle(this.x, this.y, this.maxDist);

    // Three rings travelling between the core and the influence edge.
    const core = PHYSICS.MAGNET_CORE_RADIUS;
    const span = this.maxDist - core;
    const rings = 3;
    for (let i = 0; i < rings; i++) {
      let t = (phase * 0.12 + i / rings) % 1; // 0..1 along the span
      // Attract pulls rings inward (edge → core); repel pushes them outward.
      if (this.attract) t = 1 - t;
      const r = core + t * span;
      const alpha = 0.45 * (this.attract ? 1 - t : t); // fade as they approach the edge
      g.lineStyle(2, this.color, Math.max(0.05, alpha));
      g.strokeCircle(this.x, this.y, r);
    }

    // Glowing core.
    g.fillStyle(this.color, 0.18);
    g.fillCircle(this.x, this.y, core);
    g.fillStyle(this.color, 0.9);
    g.fillCircle(this.x, this.y, core * 0.42);
    g.lineStyle(2, this.color, 0.8);
    g.strokeCircle(this.x, this.y, core);

    // Polarity glyph: '+' for attract, '−' for repel (drawn as bars).
    g.lineStyle(2.5, 0xffffff, 0.85);
    const b = core * 0.5;
    g.beginPath();
    g.moveTo(this.x - b, this.y);
    g.lineTo(this.x + b, this.y);
    g.strokePath();
    if (this.attract) {
      g.beginPath();
      g.moveTo(this.x, this.y - b);
      g.lineTo(this.x, this.y + b);
      g.strokePath();
    }
  }
}
