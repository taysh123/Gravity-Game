import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';
import type { PortalConfig } from '../types';

// A linked pair of teleport mouths (A cyan, B amber). GameScene detects ball
// overlap and moves it to the partner (carrying velocity). Visual = a swirling
// ring per mouth + a faint link so the pairing reads at a glance.
export class Portal {
  readonly ax: number;
  readonly ay: number;
  readonly bx: number;
  readonly by: number;
  readonly radius: number;
  lastJumpMs = 0; // cooldown bookkeeping (set by GameScene)
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, ox: number, oy: number, cfg: PortalConfig) {
    this.ax = ox + cfg.a.x;
    this.ay = oy + cfg.a.y;
    this.bx = ox + cfg.b.x;
    this.by = oy + cfg.b.y;
    this.radius = cfg.radius ?? PHYSICS.PORTAL_RADIUS;
    this.graphics = scene.add.graphics().setDepth(-4);
    this.draw(0);
  }

  pulse(phase: number): void {
    this.draw(phase);
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private draw(phase: number): void {
    const g = this.graphics;
    g.clear();

    // Faint link between the paired mouths.
    g.lineStyle(1, 0xffffff, 0.08);
    g.lineBetween(this.ax, this.ay, this.bx, this.by);

    this.drawMouth(g, this.ax, this.ay, PHYSICS.COLOR_PORTAL_A, phase);
    this.drawMouth(g, this.bx, this.by, PHYSICS.COLOR_PORTAL_B, -phase);
  }

  private drawMouth(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    color: number,
    phase: number,
  ): void {
    const r = this.radius;
    // Dark well center + soft glow.
    g.fillStyle(0x05060f, 0.85);
    g.fillCircle(cx, cy, r * 0.7);
    g.fillStyle(color, 0.12);
    g.fillCircle(cx, cy, r);
    // Outer ring.
    g.lineStyle(2, color, 0.85);
    g.strokeCircle(cx, cy, r);
    // Two swirling arcs to read as a rift.
    const a0 = phase % (Math.PI * 2);
    g.lineStyle(2.5, color, 0.7);
    g.beginPath();
    g.arc(cx, cy, r * 0.62, a0, a0 + Math.PI * 0.9, false);
    g.strokePath();
    g.beginPath();
    g.arc(cx, cy, r * 0.62, a0 + Math.PI, a0 + Math.PI * 1.9, false);
    g.strokePath();
  }
}
