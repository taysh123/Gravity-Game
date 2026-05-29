import Phaser from 'phaser';
import { Ball } from '../entities/Ball';
import { Attractor } from '../entities/Attractor';
import { PHYSICS } from '../config/physics.config';
import { normalize, clamp, distance } from '../utils/MathUtils';
import { RawMatter } from '../utils/matter';

export class GameScene extends Phaser.Scene {
  private ball!: Ball;
  private attractor: Attractor | null = null;
  private restartKey!: Phaser.Input.Keyboard.Key;

  private get playX(): number {
    return (this.scale.width - PHYSICS.PLAY_WIDTH) / 2;
  }

  private get playY(): number {
    return (this.scale.height - PHYSICS.PLAY_HEIGHT) / 2;
  }

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.createWorldBounds();
    this.createBall();
    this.setupInput();
    this.restartKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.R,
    );
  }

  private createWorldBounds(): void {
    const ox = this.playX;
    const oy = this.playY;
    const pw = PHYSICS.PLAY_WIDTH;
    const ph = PHYSICS.PLAY_HEIGHT;
    const t = PHYSICS.WALL_THICKNESS;
    const opts = {
      isStatic: true,
      restitution: PHYSICS.WALL_RESTITUTION,
      friction: 0,
      label: 'wall',
    };

    this.matter.add.rectangle(ox + pw / 2, oy - t / 2, pw, t, opts);
    this.matter.add.rectangle(ox + pw / 2, oy + ph + t / 2, pw, t, opts);
    this.matter.add.rectangle(ox - t / 2, oy + ph / 2, t, ph, opts);
    this.matter.add.rectangle(ox + pw + t / 2, oy + ph / 2, t, ph, opts);

    const g = this.add.graphics();
    g.lineStyle(1, PHYSICS.COLOR_WALL, 0.6);
    g.strokeRect(ox, oy, pw, ph);
  }

  private createBall(): void {
    const x = this.playX + PHYSICS.PLAY_WIDTH / 2;
    const y = this.playY + PHYSICS.PLAY_HEIGHT / 2;
    this.ball = new Ball(this, x, y);
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.attractor?.destroy();
      this.attractor = new Attractor(this, pointer.x, pointer.y);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        this.attractor?.moveTo(pointer.x, pointer.y);
      }
    });

    this.input.on('pointerup', () => {
      this.attractor?.destroy();
      this.attractor = null;
    });
  }

  update(_time: number, _delta: number): void {
    this.ball.update();
    this.applyAttractorForce();
    this.checkDeath();

    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.triggerRestart();
    }
  }

  private applyAttractorForce(): void {
    if (!this.attractor) return;
    const bx = this.ball.body.position.x;
    const by = this.ball.body.position.y;
    const dist = clamp(
      distance(bx, by, this.attractor.x, this.attractor.y),
      PHYSICS.ATTRACTOR_MIN_DIST,
      Infinity,
    );
    const dir = normalize(this.attractor.x - bx, this.attractor.y - by);
    const mag = PHYSICS.ATTRACTOR_STRENGTH / (dist * dist);

    RawMatter.Body.applyForce(
      this.ball.body,
      this.ball.body.position,
      { x: dir.x * mag, y: dir.y * mag },
    );
  }

  private checkDeath(): void {
    const margin = 60;
    const bx = this.ball.body.position.x;
    const by = this.ball.body.position.y;
    const ox = this.playX;
    const oy = this.playY;

    if (
      bx < ox - margin ||
      bx > ox + PHYSICS.PLAY_WIDTH + margin ||
      by < oy - margin ||
      by > oy + PHYSICS.PLAY_HEIGHT + margin
    ) {
      this.triggerRestart();
    }
  }

  private triggerRestart(): void {
    this.attractor?.destroy();
    this.attractor = null;
    this.scene.restart();
  }
}
