import Phaser from 'phaser';
import { Ball } from '../entities/Ball';
import { Attractor } from '../entities/Attractor';
import { Goal } from '../entities/Goal';
import { Obstacle } from '../entities/Obstacle';
import { PHYSICS } from '../config/physics.config';
import { THEME } from '../config/theme.config';
import { normalize, clamp, distance } from '../utils/MathUtils';
import { RawMatter } from '../utils/matter';
import { sharedAudio } from '../utils/AudioSynth';
import { SettingsStore } from '../utils/SettingsStore';
import { LEVELS } from '../config/levels';
import type { LevelConfig } from '../types';
import { CosmicBackground } from '../entities/CosmicBackground';
import { CoachMark } from '../entities/CoachMark';
import { GravityZone } from '../entities/GravityZone';
import { MovingPlatform } from '../entities/MovingPlatform';
import { Collectible } from '../entities/Collectible';
import { IconButton } from '../ui/IconButton';
import { drawGlass } from '../ui/glass';
import { fadeToScene } from '../utils/transitions';
import { safeAreaInsetsScaled, reducedMotionActive } from '../utils/a11y';
import { computeStars, type StarResult } from '../utils/scoring';
import { ProgressStore } from '../utils/ProgressStore';

const SAFE_PAD = 12; // minimum padding from any screen edge for HUD/nav

function fmtTime(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

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
  private cosmic!: CosmicBackground;
  private coachMark: CoachMark | null = null;
  private zones: GravityZone[] = [];
  private collectible: Collectible | null = null;
  // Interactive HUD/nav regions where a tap must NOT spawn an attractor.
  private uiBlockers: Phaser.GameObjects.Container[] = [];
  // Scoring (stars)
  private levelStartMs = 0;
  private parTimeMs: number = PHYSICS.STAR_PAR_DEFAULT_MS;
  private gemCollected = false;
  private winResult: StarResult | null = null;
  private winTimeMs = 0;

  private get playX(): number {
    return (this.scale.width - PHYSICS.PLAY_WIDTH) / 2;
  }

  private get playY(): number {
    return (this.scale.height - PHYSICS.PLAY_HEIGHT) / 2;
  }

  constructor() {
    super({ key: 'GameScene' });
  }

  private getAudio() {
    return sharedAudio();
  }

  private haptics(pattern: number | number[]): void {
    if (!PHYSICS.HAPTICS_ENABLED) return;
    if (!SettingsStore.get().haptics) return;
    navigator.vibrate?.(pattern);
  }

  create(): void {
    const data = this.scene.settings.data as { level?: number } | undefined;
    this.currentLevel = data?.level ?? 1;
    this.isWon = false;
    this.isDying = false;

    const config = LEVELS[this.currentLevel - 1] ?? LEVELS[0];
    this.levelStartMs = this.time.now;
    this.parTimeMs = config.parTimeMs ?? PHYSICS.STAR_PAR_DEFAULT_MS;
    this.gemCollected = false;
    this.winResult = null;

    this.uiBlockers = [];
    this.cosmic = new CosmicBackground(this, 0.5); // dim atmosphere behind play
    this.createWorldBounds();
    this.createFromConfig(config);
    this.pullLine = this.add.graphics();
    this.setupInput();
    this.createHud();
    this.createNav();
    this.hintText = null;
    this.showHint(config.hint);
    this.coachMark = null;
    this.maybeShowCoach();

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

    this.zones = (config.gravityZones ?? []).map(
      (z) => new GravityZone(this, ox + z.x, oy + z.y, z),
    );

    this.collectible = config.collectible
      ? new Collectible(this, ox + config.collectible.x, oy + config.collectible.y)
      : null;

    (config.movingPlatforms ?? []).forEach(
      (p) =>
        new MovingPlatform(
          this,
          ox + p.x,
          oy + p.y,
          ox + p.to.x,
          oy + p.to.y,
          p.width,
          p.height,
          p.durationMs,
          p.angle,
        ),
    );
  }

  private applyZoneForces(): void {
    if (!this.zones.length) return;
    const bx = this.ball.body.position.x;
    const by = this.ball.body.position.y;
    for (const z of this.zones) {
      if (z.contains(bx, by)) {
        RawMatter.Body.applyForce(this.ball.body, this.ball.body.position, z.force);
      }
    }
  }

  private setupInput(): void {
    // Stop the browser context menu on long-press / right-click.
    this.input.mouse?.disableContextMenu();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isWon) return;
      // Ignore taps on HUD/nav so they don't also spawn an attractor.
      if (this.isOverUi(pointer)) return;
      this.dismissHint();
      this.dismissCoach();
      const audio = this.getAudio();
      audio.resume();
      audio.playGravityActivate();
      audio.startHum();
      this.haptics(PHYSICS.HAPTIC_TAP_MS); // light "grab" on spawn
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

  private get safeInsets(): { top: number; left: number; right: number; bottom: number } {
    const sx = this.scale.displaySize.width / this.scale.gameSize.width;
    const sy = this.scale.displaySize.height / this.scale.gameSize.height;
    return safeAreaInsetsScaled(sx, sy);
  }

  // Glass HUD chip showing the current level (top-left, safe-area aware).
  private createHud(): void {
    const insets = this.safeInsets;
    const padX = Math.max(SAFE_PAD, insets.left) + 8;
    const padY = Math.max(SAFE_PAD, insets.top) + 8;

    const label = this.add
      .text(0, 0, `LEVEL ${this.currentLevel}`, {
        fontFamily: THEME.FONT_DISPLAY,
        fontSize: '14px',
        color: THEME.TEXT_PRIMARY,
        fontStyle: '600',
      })
      .setOrigin(0.5);
    label.setLetterSpacing(2);

    const w = label.width + 28;
    const h = 34;
    const chip = this.add.graphics();
    drawGlass(chip, w, h, h / 2);

    const container = this.add.container(padX + w / 2, padY + h / 2, [chip, label]).setDepth(20);
    this.uiBlockers.push(container);
  }

  // Top-right nav cluster: Home + Restart (Settings inserted in the settings
  // milestone). >=44px targets, 8px gaps, safe-area aware.
  private createNav(): void {
    const insets = this.safeInsets;
    const size = 46;
    const gap = 8;
    const rightPad = Math.max(SAFE_PAD, insets.right) + 8;
    const topPad = Math.max(SAFE_PAD, insets.top) + 8;

    const defs: Array<{ icon: 'home' | 'settings' | 'restart'; onClick: () => void }> = [
      { icon: 'home', onClick: () => this.goHome() },
      { icon: 'settings', onClick: () => this.openSettings() },
      { icon: 'restart', onClick: () => { if (!this.isWon && !this.isDying) this.triggerRestart(); } },
    ];
    const total = defs.length * size + (defs.length - 1) * gap;
    const startX = this.scale.width - rightPad - total + size / 2;
    const y = topPad + size / 2;

    defs.forEach((d, i) => {
      const btn = new IconButton(this, startX + i * (size + gap), y, d.icon, d.onClick, { size });
      btn.container.setDepth(20);
      this.uiBlockers.push(btn.container);
    });
  }

  private isOverUi(pointer: Phaser.Input.Pointer): boolean {
    return this.uiBlockers.some((c) => c.getBounds().contains(pointer.x, pointer.y));
  }

  private goHome(): void {
    this.getAudio().stopHum();
    this.attractor?.destroy();
    this.attractor = null;
    fadeToScene(this, 'MainMenuScene');
  }

  // Pause gameplay and open the settings overlay on top.
  private openSettings(): void {
    this.getAudio().stopHum();
    this.attractor?.destroy();
    this.attractor = null;
    this.scene.pause();
    this.scene.launch('SettingsScene', { caller: 'GameScene' });
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

  // First-play gesture demo on Level 1 only, shown once (persisted).
  private maybeShowCoach(): void {
    if (this.currentLevel !== 1) return;
    if (SettingsStore.get().seenTutorial) return;
    this.coachMark = new CoachMark(
      this,
      this.ball.body.position.x,
      this.ball.body.position.y,
      this.goal.x,
      this.goal.y,
      reducedMotionActive(),
    );
  }

  private dismissCoach(): void {
    if (!this.coachMark) return;
    this.coachMark.destroy();
    this.coachMark = null;
    if (!SettingsStore.get().seenTutorial) SettingsStore.set('seenTutorial', true);
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

  // Faint line from the ball to the active attractor - shows the pull at a glance.
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
    this.cosmic.update();
    if (this.isWon || this.isDying) return;

    this.ball.update();
    this.goal.pulse(time / 300);
    this.attractor?.pulse(time / 150);
    this.zones.forEach((z) => z.pulse(time / 600));
    this.collectible?.pulse(time / 300);
    this.drawPullLine();
    this.applyAttractorForce();
    this.applyZoneForces();
    this.checkGem();
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

  private checkGem(): void {
    const gem = this.collectible;
    if (!gem || gem.collected) return;
    if (gem.overlaps(this.ball.body.position.x, this.ball.body.position.y, PHYSICS.BALL_RADIUS)) {
      gem.collect(this);
      this.gemCollected = true;
      this.getAudio().playGem();
      this.haptics(PHYSICS.HAPTIC_TAP_MS);
    }
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

    // Score the run and persist the best result.
    this.winTimeMs = Math.round(this.time.now - this.levelStartMs);
    this.winResult = computeStars({
      completed: true,
      gem: this.gemCollected,
      timeMs: this.winTimeMs,
      parMs: this.parTimeMs,
    });
    ProgressStore.record(this.currentLevel, {
      stars: this.winResult.stars,
      timeMs: this.winTimeMs,
      gem: this.gemCollected,
      completed: true,
    });

    const audio = this.getAudio();
    audio.stopHum();
    audio.playGoalCapture();
    this.haptics([...PHYSICS.HAPTIC_WIN_PATTERN]);
    this.attractor?.destroy();
    this.attractor = null;
    this.matter.world.pause();
    this.emitGoalBurst();
    this.winFlash();
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
    const cx = width / 2;
    const cy = height / 2;

    const scrim = this.add.graphics().setDepth(50);
    scrim.fillStyle(0x000000, THEME.SCRIM_ALPHA);
    scrim.fillRect(0, 0, width, height);

    const panelW = Math.min(width * 0.8, 300);
    const panelH = 120;
    const panel = this.add.graphics();
    drawGlass(panel, panelW, panelH, THEME.RADIUS);

    const label = this.add
      .text(0, -38, 'LEVEL COMPLETE', {
        fontFamily: THEME.FONT_DISPLAY,
        fontSize: '21px',
        color: '#00e676',
        fontStyle: '700',
      })
      .setOrigin(0.5);
    label.setLetterSpacing(2);

    const card = this.add.container(cx, cy, [panel, label]).setDepth(51);

    // Star row (earned = gold, else slate).
    const earned = this.winResult?.stars ?? 1;
    const starGap = 40;
    for (let i = 0; i < 3; i++) {
      const star = this.add
        .text((i - 1) * starGap, 6, '★', {
          fontFamily: THEME.FONT_BODY,
          fontSize: '30px',
          color: i < earned ? '#ffd166' : '#3a4256',
        })
        .setOrigin(0.5);
      card.add(star);
    }

    const parStr = fmtTime(this.parTimeMs);
    const timeStr = fmtTime(this.winTimeMs);
    const underPar = this.winResult?.underPar;
    const sub = this.add
      .text(0, 42, `${timeStr}  ·  par ${parStr}`, {
        fontFamily: THEME.FONT_BODY,
        fontSize: '14px',
        color: underPar ? '#ffd166' : THEME.TEXT_MUTED,
      })
      .setOrigin(0.5);
    card.add(sub);

    card.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 360, ease: THEME.EASE_POP });
  }

  // Soft "absorb" flash at the goal when the ball is captured.
  private winFlash(): void {
    const size = this.goal.radius * 4;
    const flash = this.add
      .image(this.goal.x, this.goal.y, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xc9ffd6)
      .setDepth(40)
      .setDisplaySize(size, size)
      .setAlpha(0.9);
    const grow = reducedMotionActive() ? 1.15 : 2.1;
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: flash.scale * grow,
      duration: PHYSICS.WIN_FLASH_MS,
      ease: 'Cubic.Out',
      onComplete: () => flash.destroy(),
    });
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

  // Death: a clear-but-tasteful fail cue (red flash + puff + tone + haptic),
  // then restart the current level.
  private triggerDeath(): void {
    if (this.isDying) return;
    this.isDying = true;
    const audio = this.getAudio();
    audio.stopHum();
    audio.playFail();
    this.haptics([...PHYSICS.HAPTIC_DEATH_PATTERN]);
    this.attractor?.destroy();
    this.attractor = null;
    this.cameras.main.shake(PHYSICS.SHAKE_DEATH_MS, PHYSICS.SHAKE_DEATH_INTENSITY);
    this.deathFeedback();
    this.time.delayedCall(PHYSICS.DEATH_FLASH_MS, () =>
      this.scene.restart({ level: this.currentLevel }),
    );
  }

  // Red flash/vignette + a puff of fail-colored particles where the ball was lost.
  private deathFeedback(): void {
    const { width, height } = this.scale;
    const reduced = reducedMotionActive();

    const flash = this.add
      .rectangle(0, 0, width, height, PHYSICS.COLOR_DEATH, 0)
      .setOrigin(0)
      .setDepth(45);
    this.tweens.add({
      targets: flash,
      alpha: reduced ? 0.12 : 0.2,
      duration: 90,
      yoyo: true,
      hold: 50,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });

    const puff = this.add.particles(this.ball.body.position.x, this.ball.body.position.y, 'spark', {
      speed: { min: 60, max: 180 },
      lifespan: 360,
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: PHYSICS.COLOR_DEATH,
      blendMode: 'ADD',
      emitting: false,
    });
    puff.setDepth(44);
    puff.explode(PHYSICS.DEATH_PUFF_COUNT);
    this.time.delayedCall(PHYSICS.DEATH_FLASH_MS - 20, () => puff.destroy());
  }

  // Instant restart (keyboard R) - no death animation.
  private triggerRestart(): void {
    this.getAudio().stopHum();
    this.attractor?.destroy();
    this.attractor = null;
    this.scene.restart({ level: this.currentLevel });
  }
}
