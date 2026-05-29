import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';
import { RawMatter } from '../utils/matter';
import type { Vec2 } from '../types';

export class Ball {
  readonly body: MatterJS.BodyType;
  readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, startVelocity: Vec2 = { x: 0, y: 0 }) {
    this.body = scene.matter.add.circle(x, y, PHYSICS.BALL_RADIUS, {
      restitution: PHYSICS.BALL_RESTITUTION,
      friction: PHYSICS.BALL_FRICTION,
      frictionAir: PHYSICS.BALL_FRICTION_AIR,
      label: 'ball',
    });

    RawMatter.Body.setVelocity(this.body, startVelocity);

    this.graphics = scene.add.graphics();
    this.draw();
  }

  private draw(): void {
    this.graphics.clear();
    this.graphics.lineStyle(3, PHYSICS.COLOR_BALL_GLOW, 0.35);
    this.graphics.strokeCircle(0, 0, PHYSICS.BALL_RADIUS + 7);
    this.graphics.fillStyle(PHYSICS.COLOR_BALL, 1);
    this.graphics.fillCircle(0, 0, PHYSICS.BALL_RADIUS);
  }

  update(): void {
    this.graphics.setPosition(this.body.position.x, this.body.position.y);
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
