import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';
import { RawMatter } from '../utils/matter';
import { CosmeticStore } from '../utils/CosmeticStore';
import type { Vec2 } from '../types';

export class Ball {
  readonly body: MatterJS.BodyType;
  readonly graphics: Phaser.GameObjects.Graphics;
  private readonly trailGraphics: Phaser.GameObjects.Graphics;
  private readonly trail: Array<{ x: number; y: number }> = [];
  private readonly fill: number; // equipped cosmetic colors
  private readonly glow: number;

  constructor(scene: Phaser.Scene, x: number, y: number, startVelocity: Vec2 = { x: 0, y: 0 }) {
    const skin = CosmeticStore.equipped();
    this.fill = skin.fill;
    this.glow = skin.glow;
    this.body = scene.matter.add.circle(x, y, PHYSICS.BALL_RADIUS, {
      restitution: PHYSICS.BALL_RESTITUTION,
      friction: PHYSICS.BALL_FRICTION,
      frictionAir: PHYSICS.BALL_FRICTION_AIR,
      label: 'ball',
    });

    RawMatter.Body.setVelocity(this.body, {
      x: startVelocity.x || PHYSICS.BALL_START_VX,
      y: startVelocity.y || PHYSICS.BALL_START_VY,
    });

    // Trail is drawn beneath the ball (added to scene first).
    this.trailGraphics = scene.add.graphics();
    this.graphics = scene.add.graphics();
    this.draw();
  }

  private draw(): void {
    this.graphics.clear();
    this.graphics.lineStyle(3, this.glow, 0.35);
    this.graphics.strokeCircle(0, 0, PHYSICS.BALL_RADIUS + 7);
    this.graphics.fillStyle(this.fill, 1);
    this.graphics.fillCircle(0, 0, PHYSICS.BALL_RADIUS);
  }

  update(): void {
    const bx = this.body.position.x;
    const by = this.body.position.y;

    // Newest position at front; drop the oldest beyond TRAIL_LENGTH.
    this.trail.unshift({ x: bx, y: by });
    if (this.trail.length > PHYSICS.TRAIL_LENGTH) {
      this.trail.pop();
    }

    // Each older segment is smaller and fainter — a soft taper behind the ball.
    this.trailGraphics.clear();
    this.trail.forEach((pos, i) => {
      const t = 1 - i / PHYSICS.TRAIL_LENGTH; // 1 = newest, → 0 = oldest
      const alpha = t * PHYSICS.TRAIL_MAX_ALPHA;
      const radius = PHYSICS.BALL_RADIUS * t * 0.55;
      this.trailGraphics.fillStyle(this.glow, alpha);
      this.trailGraphics.fillCircle(pos.x, pos.y, radius);
    });

    this.graphics.setPosition(bx, by);
  }

  destroy(): void {
    this.trailGraphics.destroy();
    this.graphics.destroy();
  }
}
