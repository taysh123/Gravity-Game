import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';
import type { Vec2 } from '../types';

// A one-way gate: a solid static barrier that GameScene opens (isSensor=true) only
// while the ball moves along `dir`. Visual = a teal bar + chevrons pointing the
// allowed way; the bar reads as a membrane when open, solid when closed.
export class Gate {
  readonly body: MatterJS.BodyType;
  readonly nx: number; // normalized allowed direction
  readonly ny: number;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly w: number;
  private readonly h: number;
  private open = false;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, dir: Vec2, angle = 0) {
    const len = Math.hypot(dir.x, dir.y) || 1;
    this.nx = dir.x / len;
    this.ny = dir.y / len;
    this.w = w;
    this.h = h;

    this.body = scene.matter.add.rectangle(x, y, w, h, {
      isStatic: true,
      restitution: 0.4,
      friction: 0.05,
      label: 'gate',
      angle: Phaser.Math.DegToRad(angle),
    });

    // Graphics centered on the gate, rotated to match the body — draw in local space.
    this.graphics = scene.add.graphics({ x, y }).setRotation(Phaser.Math.DegToRad(angle));
    this.draw(0);
  }

  get isOpen(): boolean {
    return this.open;
  }

  // Toggle passability. Setting isSensor lets the ball pass without collision.
  setOpen(open: boolean): void {
    this.open = open;
    (this.body as unknown as { isSensor: boolean }).isSensor = open;
  }

  // Axis-aligned proximity test (gates are mostly unrotated) for hysteresis.
  overlaps(px: number, py: number, r: number): boolean {
    const b = this.body.position;
    return Math.abs(px - b.x) <= this.w / 2 + r && Math.abs(py - b.y) <= this.h / 2 + r;
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
    const color = PHYSICS.COLOR_GATE;
    const x = -this.w / 2;
    const y = -this.h / 2;

    // Bar — translucent membrane when open, more solid when closed.
    g.fillStyle(color, this.open ? 0.12 : 0.5);
    g.fillRect(x, y, this.w, this.h);
    g.lineStyle(2, color, this.open ? 0.4 : 0.85);
    g.strokeRect(x, y, this.w, this.h);

    // Chevrons pointing the allowed way (dir), spread along the bar's long axis.
    const along = { x: -this.ny, y: this.nx }; // perpendicular to dir = the bar's length axis
    const span = Math.max(this.w, this.h);
    const lanes = Math.max(1, Math.min(5, Math.round(span / 28)));
    const drift = (phase * 6) % 10;
    g.lineStyle(2.5, color, 0.9);
    for (let i = 0; i < lanes; i++) {
      const t = (i - (lanes - 1) / 2) * (span / (lanes + 1));
      const px = along.x * t + this.nx * (drift - 5);
      const py = along.y * t + this.ny * (drift - 5);
      this.drawChevron(g, px, py, 7);
    }
  }

  private drawChevron(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
    const ang = Math.atan2(this.ny, this.nx);
    const back = ang + Math.PI;
    const spread = 0.6;
    g.beginPath();
    g.moveTo(x + Math.cos(back + spread) * size, y + Math.sin(back + spread) * size);
    g.lineTo(x, y);
    g.lineTo(x + Math.cos(back - spread) * size, y + Math.sin(back - spread) * size);
    g.strokePath();
  }
}
