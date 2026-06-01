import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';
import type { GravityZoneConfig } from '../types';

// A directional force field: while the ball is inside, a constant force pushes
// it along `dir`. Visual = tinted field + drifting chevrons showing the flow.
// Reuses the same applyForce model as the attractor (GameScene applies it).
export class GravityZone {
  readonly force: { x: number; y: number };
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly cx: number;
  private readonly cy: number;
  private readonly w: number;
  private readonly h: number;
  private readonly dir: { x: number; y: number };
  private readonly color: number;

  constructor(scene: Phaser.Scene, cx: number, cy: number, cfg: GravityZoneConfig) {
    this.cx = cx;
    this.cy = cy;
    this.w = cfg.width;
    this.h = cfg.height;

    const len = Math.hypot(cfg.dir.x, cfg.dir.y) || 1;
    this.dir = { x: cfg.dir.x / len, y: cfg.dir.y / len };
    this.force = { x: this.dir.x * cfg.strength, y: this.dir.y * cfg.strength };
    this.color = this.tint();

    this.graphics = scene.add.graphics().setDepth(-5);
    this.draw(0);
  }

  // Axis-aligned containment test.
  contains(px: number, py: number): boolean {
    return (
      px >= this.cx - this.w / 2 &&
      px <= this.cx + this.w / 2 &&
      py >= this.cy - this.h / 2 &&
      py <= this.cy + this.h / 2
    );
  }

  // Drift the flow chevrons. phase is a continuous value (e.g. time/600).
  pulse(phase: number): void {
    this.draw(phase);
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private tint(): number {
    if (Math.abs(this.dir.y) >= Math.abs(this.dir.x)) {
      return this.dir.y < 0 ? PHYSICS.COLOR_ZONE_UP : PHYSICS.COLOR_ZONE_DOWN;
    }
    return PHYSICS.COLOR_ZONE_SIDE;
  }

  private draw(phase: number): void {
    const g = this.graphics;
    const x = this.cx - this.w / 2;
    const y = this.cy - this.h / 2;
    g.clear();
    g.fillStyle(this.color, 0.1);
    g.fillRect(x, y, this.w, this.h);
    g.lineStyle(1.5, this.color, 0.35);
    g.strokeRect(x, y, this.w, this.h);

    // Flow chevrons drifting along `dir` to telegraph the force direction.
    const along = this.dir;
    const travel = Math.abs(along.x) > Math.abs(along.y) ? this.w : this.h;
    const perpLen = Math.abs(along.x) > Math.abs(along.y) ? this.h : this.w;
    const lanes = Math.max(1, Math.min(4, Math.round(perpLen / 36)));
    const spacing = 46;
    const drift = ((phase * 14) % spacing);

    g.lineStyle(2, this.color, 0.5);
    for (let lane = 0; lane < lanes; lane++) {
      const laneOff = (lane - (lanes - 1) / 2) * (perpLen / (lanes + 1));
      const px = -along.y * laneOff; // perpendicular offset
      const py = along.x * laneOff;
      for (let s = -1; s * spacing < travel + spacing; s++) {
        const t = s * spacing + drift - travel / 2;
        const acx = this.cx + along.x * t + px;
        const acy = this.cy + along.y * t + py;
        this.drawChevron(g, acx, acy, along, 7);
      }
    }
  }

  private drawChevron(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    dir: { x: number; y: number },
    size: number,
  ): void {
    const ang = Math.atan2(dir.y, dir.x);
    const back = ang + Math.PI;
    const spread = 0.6;
    // Tip at (x,y), two wings trailing behind along -dir.
    g.beginPath();
    g.moveTo(x + Math.cos(back + spread) * size, y + Math.sin(back + spread) * size);
    g.lineTo(x, y);
    g.lineTo(x + Math.cos(back - spread) * size, y + Math.sin(back - spread) * size);
    g.strokePath();
  }
}
