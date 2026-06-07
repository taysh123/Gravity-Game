import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';

// A "constellation" orb — part of a multi-goal toy. Collect by overlapping the
// ball; on level win the collected orbs connect into a constellation. Playful and
// screenshot-worthy (distinct from the single gold gem, which grants a star).
export class Orb {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  collected = false;
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.radius = PHYSICS.ORB_RADIUS;
    this.graphics = scene.add.graphics().setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
    this.draw(0);
  }

  overlaps(bx: number, by: number, ballRadius: number): boolean {
    if (this.collected) return false;
    return Math.hypot(bx - this.x, by - this.y) < this.radius + ballRadius;
  }

  pulse(phase: number): void {
    if (this.collected) return;
    this.draw(phase);
  }

  collect(scene: Phaser.Scene): void {
    if (this.collected) return;
    this.collected = true;
    scene.tweens.add({
      targets: this.graphics,
      alpha: 0,
      scale: 2.2,
      duration: 240,
      ease: 'Back.easeOut',
      onComplete: () => this.graphics.destroy(),
    });
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private draw(phase: number): void {
    const r = this.radius * (1 + 0.1 * Math.sin(phase * 2));
    const g = this.graphics;
    g.clear();
    g.fillStyle(PHYSICS.COLOR_ORB, 0.35);
    g.fillCircle(this.x, this.y, r + 6);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(this.x, this.y, r * 0.6);
    g.lineStyle(2, PHYSICS.COLOR_ORB, 0.9);
    g.strokeCircle(this.x, this.y, r);
  }
}
