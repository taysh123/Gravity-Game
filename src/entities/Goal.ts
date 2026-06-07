import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';

// The goal = the lost star's "home". It breathes (alive), brightens as the ball
// nears (the journey paying off), and can drift (moving/chase levels) — x/y are
// the live capture center used by GameScene.checkWin.
export class Goal {
  x: number;
  y: number;
  readonly radius: number;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private near = 0; // 0..1 — how close the ball is (brightens the home)

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.graphics = scene.add.graphics();
    this.draw(0);
  }

  // Move the home (drifting / chase levels). Call before pulse/checkWin.
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  // phase: continuous (time/300). nearT 0..1 = ball proximity → home glows warmer.
  pulse(phase: number, nearT = 0): void {
    this.near = nearT;
    this.draw(Math.sin(phase));
  }

  private draw(beat: number): void {
    const n = this.near; // 0..1
    const haloR = this.radius + 12 + beat * 4 + n * 8; // beat ∈ [-1, 1]
    const haloA = 0.3 + beat * 0.12 + n * 0.25;
    this.graphics.clear();
    // A warm second halo that blooms as the ball approaches "home".
    if (n > 0.01) {
      this.graphics.lineStyle(2, PHYSICS.COLOR_BALL_GLOW, n * 0.5);
      this.graphics.strokeCircle(this.x, this.y, haloR + 8);
    }
    this.graphics.lineStyle(2, PHYSICS.COLOR_GOAL, haloA);
    this.graphics.strokeCircle(this.x, this.y, haloR);
    this.graphics.lineStyle(3, PHYSICS.COLOR_GOAL, 0.9);
    this.graphics.strokeCircle(this.x, this.y, this.radius);
    this.graphics.fillStyle(PHYSICS.COLOR_GOAL, 0.15 + n * 0.2);
    this.graphics.fillCircle(this.x, this.y, this.radius);
    this.graphics.fillStyle(PHYSICS.COLOR_GOAL, 0.8);
    this.graphics.fillCircle(this.x, this.y, 5 + n * 3);
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
