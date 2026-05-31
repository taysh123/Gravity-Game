import Phaser from 'phaser';
import { Ball } from '../entities/Ball';
import { Attractor } from '../entities/Attractor';
import { Goal } from '../entities/Goal';
import { Obstacle } from '../entities/Obstacle';
import { PHYSICS } from '../config/physics.config';
import { normalize, clamp, distance } from '../utils/MathUtils';
import { RawMatter } from '../utils/matter';
import { AudioSynth } from '../utils/AudioSynth';
import { level1 } from '../config/levels/level1';
import { level2 } from '../config/levels/level2';
import { level3 } from '../config/levels/level3';
import type { LevelConfig } from '../types';

const LEVELS: LevelConfig[] = [level1, level2, level3];

export class GameScene extends Phaser.Scene {
  private ball!: Ball;
  private goal!: Goal;
  private attractor: Attractor | null = null;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private currentLevel = 1;
  private isWon = false;
  private isDying = false;
  private hintText: Phaser.GameObjects.Text | null = null;
  private pullLine!: Phaser.GameObjects.Graphics;

  // One AudioContext for the whole game — recreating it per scene.restart()
  // would leak contexts and browsers cap how many you can open.
  private static audio: AudioSynth | null = null;

  private get playX(): number {
    return (this.scale.width - PHYSICS.PLAY_WIDTH) / 2;
  }

  private get playY(): number {
    return (this.scale.height - PHYSICS.PLAY_HEIGHT) / 2;
  }

  constructor() {
    super({ key: 'GameScene' });
  }

  private getAudio(): AudioSynth {
    if (!GameScene.audio) {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      GameScene.audio = new AudioSynth(new Ctx());
    }
    return GameScene.audio;
  }

  private haptics(ms: number): void {
    if (!PHYSICS.HAPTICS_ENABLED) return;
    navigator.vibrate?.(ms);
  }

  create(): void {
    const data = this.scene.settings.data as { level?: number } | undefined;
    this.currentLevel = data?.level ?? 1;
    this.isWon = false;
    this.isDying = false;

    const config = LEVELS[this.currentLevel - 1] ?? level1;

    this.createWorldBounds();
    this.createFromConfig(config);
    this.pullLine = this.add.graphics();
    this.setupInput();
    this.showLevelLabel();
    this.hintText = null;
    this.showHint(config.hint);

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

  private createFromConfig(config: LevelConfig): void {
    const ox = this.playX;
    const oy = this.playY;
    const sv = config.startVelocity ?? { x: 0, y: 0 };

    this.ball = new Ball(this, ox + config.ball.x, oy + config.ball.y, sv);

    this.goal = new Goal(
      this,
      ox + config.goal.x,
      oy + config.goal.y,
      config.goal.radius,
    );

    config.obstacles.forEach(
      (o) => new Obstacle(this, ox + o.x, oy + o.y, o.width, o.height, o.angle),
    );
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isWon) return;
      this.dismissHint();
      const audio = this.getAudio();
      audio.resume();
      audio.playGravityActivate();
      audio.startHum();
      this.attractor?.destroy();
      this.attractor = new Attractor(this, pointer.x, pointer.y);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && !this.isWon) {
        this.attractor?.moveTo(pointer.x, pointer.y);
      }
    });

    this.input.on('pointerup', () => {
      this.getAudio().stopHum();
      this.attractor?.destroy();
      this.attractor = null;
    });
  }

  private showLevelLabel(): void {
    this.add.text(16, 16, `Level ${this.currentLevel}`, {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
    });
  }

  // Onboarding tip near the bottom. Auto-fades, or dismisses on first touch.
  private showHint(hint?: string): void {
    if (!hint) return;
    this.hintText = this.add
      .text(this.scale.width / 2, this.scale.height - 70, hint, {
        fontSize: '17px',
        color: PHYSICS.COLOR_HINT_TEXT,
        fontFamily: 'Arial, sans-serif',
        align: 'center',
      })
      .setOrigin(0.5);
    this.time.delayedCall(PHYSICS.HINT_DURATION_MS, () => this.dismissHint());
  }

  private dismissHint(): void {
    if (!this.hintText) return;
    const text = this.hintText;
    this.hintText = null;
    this.tweens.add({
      targets: text,
      alpha: 0,
      duration: 300,
      onComplete: () => text.destroy(),
    });
  }

  // Faint line from the ball to the active attractor — shows the pull at a glance.
  private drawPullLine(): void {
    this.pullLine.clear();
    if (!this.attractor) return;
    this.pullLine.lineStyle(2, PHYSICS.COLOR_ATTRACTOR, PHYSICS.PULL_LINE_ALPHA);
    this.pullLine.lineBetween(
      this.ball.body.position.x,
      this.ball.body.position.y,
      this.attractor.x,
      this.attractor.y,
    );
  }

  update(time: number, _delta: number): void {
    if (this.isWon || this.isDying) return;

    this.ball.update();
    this.goal.pulse(time / 300);
    this.attractor?.pulse(time / 150);
    this.drawPullLine();
    this.applyAttractorForce();
    this.checkWin();
    this.checkDeath();

    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.triggerRestart();
    }
  }

  private applyAttractorForce(): void {
    if (!this.attractor) return;
    const bx = this.ball.body.position.x;
    const by = this.ball.body.position.y;
    const rawDist = distance(bx, by, this.attractor.x, this.attractor.y);

    if (rawDist > PHYSICS.ATTRACTOR_MAX_DIST) return;

    const dist = clamp(rawDist, PHYSICS.ATTRACTOR_MIN_DIST, Infinity);
    const dir = normalize(this.attractor.x - bx, this.attractor.y - by);
    const mag = PHYSICS.ATTRACTOR_STRENGTH / (dist * dist);

    RawMatter.Body.applyForce(
      this.ball.body,
      this.ball.body.position,
      { x: dir.x * mag, y: dir.y * mag },
    );
  }

  private checkWin(): void {
    const dist = distance(
      this.ball.body.position.x,
      this.ball.body.position.y,
      this.goal.x,
      this.goal.y,
    );
    if (dist < this.goal.radius) {
      this.triggerWin();
    }
  }

  private triggerWin(): void {
    this.isWon = true;
    const audio = this.getAudio();
    audio.stopHum();
    audio.playGoalCapture();
    this.haptics(PHYSICS.HAPTIC_WIN_MS);
    this.attractor?.destroy();
    this.attractor = null;
    this.matter.world.pause();
    this.emitGoalBurst();
    this.cameras.main.shake(PHYSICS.SHAKE_WIN_MS, PHYSICS.SHAKE_WIN_INTENSITY);

    this.tweens.add({
      targets: this.ball.graphics,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => this.showWinOverlay(),
    });

    const nextLevel = this.currentLevel + 1;
    this.time.delayedCall(1550, () => {
      if (nextLevel > LEVELS.length) {
        this.scene.start('EndScene');
      } else {
        this.scene.restart({ level: nextLevel });
      }
    });
  }

  private showWinOverlay(): void {
    this.getAudio().playLevelComplete();
    const { width, height } = this.scale;
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.45);
    overlay.fillRect(0, 0, width, height);

    this.add
      .text(width / 2, height / 2, 'Level Complete!', {
        fontSize: '34px',
        color: '#00e676',
        fontFamily: 'Arial, sans-serif',
      })
      .setOrigin(0.5);
  }

  // One-shot particle burst at the goal. Auto-destroys after the burst so
  // emitters never accumulate across the scene's lifetime.
  private emitGoalBurst(): void {
    const emitter = this.add.particles(this.goal.x, this.goal.y, 'spark', {
      speed: { min: 40, max: 150 },
      lifespan: 600,
      scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: PHYSICS.COLOR_PARTICLE,
      blendMode: 'ADD',
      emitting: false,
    });
    emitter.explode(PHYSICS.PARTICLE_COUNT);
    this.time.delayedCall(700, () => emitter.destroy());
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
      this.triggerDeath();
    }
  }

  // Death: shake first so the loss is felt, then restart the current level.
  private triggerDeath(): void {
    if (this.isDying) return;
    this.isDying = true;
    this.getAudio().stopHum();
    this.haptics(PHYSICS.HAPTIC_TAP_MS);
    this.attractor?.destroy();
    this.attractor = null;
    this.cameras.main.shake(
      PHYSICS.SHAKE_DEATH_MS,
      PHYSICS.SHAKE_DEATH_INTENSITY,
    );
    this.time.delayedCall(PHYSICS.SHAKE_DEATH_MS, () =>
      this.scene.restart({ level: this.currentLevel }),
    );
  }

  // Instant restart (keyboard R) — no death animation.
  private triggerRestart(): void {
    this.getAudio().stopHum();
    this.attractor?.destroy();
    this.attractor = null;
    this.scene.restart({ level: this.currentLevel });
  }
}
