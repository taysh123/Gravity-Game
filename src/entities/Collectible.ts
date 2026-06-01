import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';

// Optional gem — collected by overlapping the ball. Grants the 2nd star and
// usually sits off the safe route, creating an optional risk/route decision.
export class Collectible {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  collected = false;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.radius = PHYSICS.GEM_RADIUS;

    this.glow = scene.add
      .image(x, y, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(PHYSICS.COLOR_GEM_GLOW)
      .setAlpha(0.5)
      .setDisplaySize(this.radius * 4, this.radius * 4)
      .setDepth(2);
    this.graphics = scene.add.graphics().setDepth(3);
    this.draw(0);
  }

  // Distance overlap test against the ball.
  overlaps(bx: number, by: number, ballRadius: number): boolean {
    const dx = bx - this.x;
    const dy = by - this.y;
    return Math.hypot(dx, dy) < this.radius + ballRadius;
  }

  // phase: continuous (e.g. time/300). Gentle spin + breathe.
  pulse(phase: number): void {
    if (this.collected) return;
    this.draw(phase);
    this.glow.setAlpha(0.4 + 0.15 * Math.sin(phase));
  }

  collect(scene: Phaser.Scene): void {
    if (this.collected) return;
    this.collected = true;
    scene.tweens.add({
      targets: [this.graphics, this.glow],
      alpha: 0,
      scale: 1.8,
      duration: 260,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.graphics.destroy();
        this.glow.destroy();
      },
    });
  }

  destroy(): void {
    this.graphics.destroy();
    this.glow.destroy();
  }

  // A small rotating diamond.
  private draw(phase: number): void {
    const r = this.radius * (1 + 0.06 * Math.sin(phase * 2));
    const a = phase * 0.6;
    const g = this.graphics;
    g.clear();
    g.fillStyle(PHYSICS.COLOR_GEM, 0.95);
    g.lineStyle(2, 0xffffff, 0.7);
    const pts = [0, 1, 2, 3].map((i) => {
      const ang = a + (i * Math.PI) / 2;
      return new Phaser.Geom.Point(this.x + Math.cos(ang) * r, this.y + Math.sin(ang) * r);
    });
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach((p) => g.lineTo(p.x, p.y));
    g.closePath();
    g.fillPath();
    g.strokePath();
  }
}
