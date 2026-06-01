import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';
import type { HazardConfig } from '../types';

// A deadly object — touching it fails the level (GameScene wires overlap →
// triggerDeath). Circle = a pulsing spiked node; rect = a striped danger bar.
export class Hazard {
  readonly x: number;
  readonly y: number;
  private readonly isCircle: boolean;
  private readonly radius: number;
  private readonly hw: number;
  private readonly hh: number;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, cfg: HazardConfig) {
    this.x = x;
    this.y = y;
    this.isCircle = cfg.radius != null;
    this.radius = cfg.radius ?? 0;
    this.hw = (cfg.width ?? 0) / 2;
    this.hh = (cfg.height ?? 0) / 2;

    const glowSize = (this.isCircle ? this.radius * 2 : Math.max(this.hw, this.hh) * 2) + 30;
    this.glow = scene.add
      .image(x, y, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(PHYSICS.COLOR_DEATH)
      .setAlpha(0.3)
      .setDisplaySize(glowSize, glowSize)
      .setDepth(0);
    this.graphics = scene.add.graphics().setDepth(1);
    this.draw(0);
  }

  // Overlap test against the ball (slightly forgiving — collide on the visible body).
  overlaps(bx: number, by: number, ballRadius: number): boolean {
    if (this.isCircle) {
      return Math.hypot(bx - this.x, by - this.y) < this.radius + ballRadius;
    }
    const dx = Math.max(Math.abs(bx - this.x) - this.hw, 0);
    const dy = Math.max(Math.abs(by - this.y) - this.hh, 0);
    return Math.hypot(dx, dy) < ballRadius;
  }

  pulse(phase: number): void {
    this.draw(phase);
    this.glow.setAlpha(0.25 + 0.12 * Math.sin(phase * 2));
  }

  destroy(): void {
    this.graphics.destroy();
    this.glow.destroy();
  }

  private draw(phase: number): void {
    const g = this.graphics;
    g.clear();
    const c = PHYSICS.COLOR_DEATH;

    if (this.isCircle) {
      const r = this.radius;
      const cx = this.x;
      const cy = this.y;
      const spin = phase * 0.5;
      // Radiating spikes (absolute coords around the centre).
      g.fillStyle(c, 0.9);
      const spikes = 8;
      const base = Math.PI / spikes / 1.3;
      for (let k = 0; k < spikes; k++) {
        const a = spin + (k * Math.PI * 2) / spikes;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * r * 1.45, cy + Math.sin(a) * r * 1.45);
        g.lineTo(cx + Math.cos(a - base) * r * 0.9, cy + Math.sin(a - base) * r * 0.9);
        g.lineTo(cx + Math.cos(a + base) * r * 0.9, cy + Math.sin(a + base) * r * 0.9);
        g.closePath();
        g.fillPath();
      }
      // Core + ring.
      g.fillStyle(c, 0.22);
      g.fillCircle(cx, cy, r);
      g.lineStyle(2.5, c, 0.95);
      g.strokeCircle(cx, cy, r);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(cx, cy, r * 0.18);
    } else {
      const x = this.x - this.hw;
      const y = this.y - this.hh;
      const w = this.hw * 2;
      const h = this.hh * 2;
      g.fillStyle(c, 0.28);
      g.fillRect(x, y, w, h);
      g.lineStyle(2, c, 0.95);
      g.strokeRect(x, y, w, h);
      // Hazard stripes.
      g.lineStyle(3, c, 0.8);
      const step = 14;
      for (let sx = x - h; sx < x + w; sx += step) {
        g.beginPath();
        g.moveTo(Math.max(sx, x), Math.max(y, y));
        g.lineTo(Math.min(sx + h, x + w), Math.min(y + h, y + h));
        g.strokePath();
      }
    }
  }
}
