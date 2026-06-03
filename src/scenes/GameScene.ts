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
import { Magnet } from '../entities/Magnet';
import { Portal } from '../entities/Portal';
import { withinMouth, portalExit } from '../utils/portal';
import { MovingPlatform } from '../entities/MovingPlatform';
import { Collectible } from '../entities/Collectible';
import { Hazard } from '../entities/Hazard';
import { IconButton } from '../ui/IconButton';
import { drawGlass } from '../ui/glass';
import { fadeToScene } from '../utils/transitions';
import { safeAreaInsetsScaled, reducedMotionActive } from '../utils/a11y';
import { computeStars, type StarResult } from '../utils/scoring';
import { ProgressStore } from '../utils/ProgressStore';
import { DailyStore } from '../utils/DailyStore';

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
  private magnets: Magnet[] = [];
  private portals: Portal[] = [];
  private hazards: Hazard[] = [];
  private collectible: Collectible | null = null;
  // Interactive HUD/nav regions where a tap must NOT spawn an attractor.
  private uiBlockers: Phaser.GameObjects.Container[] = [];
  // Scoring (stars)
  private levelStartMs = 0;
  private parTimeMs: number = PHYSICS.STAR_PAR_DEFAULT_MS;
  private timeLimitMs = 0; // 0 = untimed; >0 = hard countdown
  private countdown: Phaser.GameObjects.Text | null = null;
  private gemCollected = false;
  private winResult: StarResult | null = null;
  private winTimeMs = 0;
  private isDaily = false; // launched from the Daily Challenge
  private dailyStreak = 0; // streak after winning today's daily

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
    const data = this.scene.settings.data as { level?: number; daily?: boolean } | undefined;
    this.currentLevel = data?.level ?? 1;
    this.isDaily = data?.daily ?? false;
    this.isWon = false;
    this.isDying = false;

    const config = LEVELS[this.currentLevel - 1] ?? LEVELS[0];
    this.levelStartMs = this.time.now;
    this.parTimeMs = config.parTimeMs ?? PHYSICS.STAR_PAR_DEFAULT_MS;
    this.timeLimitMs = config.timeLimitMs ?? 0;
    this.countdown = null;
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
    if (this.timeLimitMs > 0) this.createCountdown();
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

    this.magnets = (config.magnets ?? []).map(
      (m) => new Magnet(this, ox + m.x, oy + m.y, m),
    );

    this.portals = (config.portals ?? []).map((pc) => new Portal(this, ox, oy, pc));

    this.hazards = (config.hazards ?? []).map((hz) => {
      const h = new Hazard(this, ox + hz.x, oy + hz.y, hz);
      if (hz.to && hz.durationMs) h.startMoving(this, ox + hz.to.x, oy + hz.to.y, hz.durationMs);
      return h;
    });

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

  // Static wells: same inverse-square model as the attractor, applied per magnet
  // when the ball is within reach. Signed strength → attract (+) / repel (−).
  private applyMagnetForces(): void {
    if (!this.magnets.length) return;
    const bx = this.ball.body.position.x;
    const by = this.ball.body.position.y;
    for (const m of this.magnets) {
      const rawDist = distance(bx, by, m.x, m.y);
      if (rawDist > m.maxDist) continue;
      const dist = clamp(rawDist, PHYSICS.MAGNET_MIN_DIST, Infinity);
      const dir = normalize(m.x - bx, m.y - by); // unit vector toward the well
      const mag = m.strength / (dist * dist);
      RawMatter.Body.applyForce(
        this.ball.body,
        this.ball.body.position,
        { x: dir.x * mag, y: dir.y * mag },
      );
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

  // Top-center countdown chip for hard-fail timed levels.
  private createCountdown(): void {
    const insets = this.safeInsets;
    const padY = Math.max(SAFE_PAD, insets.top) + 8;
    const w = 80;
    const h = 36;
    const chip = this.add.graphics();
    drawGlass(chip, w, h, h / 2);
    this.countdown = this.add
      .text(0, 0, fmtTime(this.timeLimitMs), {
        fontFamily: THEME.FONT_DISPLAY,
        fontSize: '17px',
        color: PHYSICS.COLOR_TIMER,
        fontStyle: '700',
      })
      .setOrigin(0.5);
    // A second row, centered, clear of the top-left chip and top-right toolbar.
    const cont = this.add
      .container(this.scale.width / 2, padY + 56 + h / 2, [chip, this.countdown])
      .setDepth(20);
    this.uiBlockers.push(cont);
  }

  private updateCountdown(time: number): void {
    if (this.timeLimitMs <= 0 || !this.countdown) return;
    const remaining = this.timeLimitMs - (time - this.levelStartMs);
    if (remaining <= 0) {
      this.countdown.setText('0.0s').setColor(PHYSICS.COLOR_TIMER_WARN);
      this.triggerDeath(); // time's up — fail
      return;
    }
    this.countdown.setText(fmtTime(remaining));
    const warn = remaining <= PHYSICS.TIMER_WARN_MS;
    this.countdown.setColor(warn ? PHYSICS.COLOR_TIMER_WARN : PHYSICS.COLOR_TIMER);
    this.countdown.setScale(warn ? 1 + 0.08 * Math.sin(time / 110) : 1);
  }

  // Top-right nav as one cohesive glass toolbar (Home / Settings / Restart).
  // Bare icon buttons sit inside a shared glass pill — reads as a finished HUD
  // component, not loose squares. Safe-area aware; generous targets.
  private createNav(): void {
    const insets = this.safeInsets;
    const slot = 48;
    const gap = 4;
    const padX = 10;
    const barH = slot + 8;
    const rightPad = Math.max(SAFE_PAD, insets.right) + 8;
    const topPad = Math.max(SAFE_PAD, insets.top) + 8;

    const defs: Array<{ icon: 'home' | 'settings' | 'restart'; onClick: () => void }> = [
      { icon: 'home', onClick: () => this.goHome() },
      { icon: 'settings', onClick: () => this.openSettings() },
      { icon: 'restart', onClick: () => { if (!this.isWon && !this.isDying) this.triggerRestart(); } },
    ];

    const barW = defs.length * slot + (defs.length - 1) * gap + padX * 2;
    const barX = this.scale.width - rightPad - barW / 2;
    const barY = topPad + barH / 2;

    const barG = this.add.graphics();
    drawGlass(barG, barW, barH, barH / 2);
    const bar = this.add.container(barX, barY, [barG]).setDepth(20);
    this.uiBlockers.push(bar); // whole toolbar blocks attractor spawns

    const startX = -barW / 2 + padX + slot / 2;
    defs.forEach((d, i) => {
      const btn = new IconButton(this, barX + startX + i * (slot + gap), barY, d.icon, d.onClick, {
        size: slot,
        bare: true,
        iconSize: slot * 0.46,
      });
      btn.container.setDepth(21);
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

    this.updateCountdown(time);
    if (this.isDying) return; // updateCountdown may have triggered a timeout death
    this.ball.update();
    this.goal.pulse(time / 300);
    this.attractor?.pulse(time / 150);
    this.zones.forEach((z) => z.pulse(time / 600));
    this.magnets.forEach((m) => m.pulse(time / 600));
    this.portals.forEach((p) => p.pulse(time / 400));
    this.hazards.forEach((h) => h.pulse(time / 300));
    this.collectible?.pulse(time / 300);
    this.drawPullLine();
    this.applyAttractorForce();
    this.applyZoneForces();
    this.applyMagnetForces();
    this.checkPortals(time);
    this.checkGem();
    this.checkHazards();
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

  // Linked teleport pairs: entering a mouth moves the ball to its partner,
  // carrying velocity, offset clear of the exit. A per-pair cooldown + the exit
  // offset prevent immediate re-entry / ping-pong.
  private checkPortals(time: number): void {
    if (this.isWon || this.isDying || !this.portals.length) return;
    const bx = this.ball.body.position.x;
    const by = this.ball.body.position.y;
    for (const p of this.portals) {
      if (time - p.lastJumpMs < PHYSICS.PORTAL_COOLDOWN_MS) continue;
      let exit: { x: number; y: number } | null = null;
      if (withinMouth(bx, by, p.ax, p.ay, p.radius)) exit = { x: p.bx, y: p.by };
      else if (withinMouth(bx, by, p.bx, p.by, p.radius)) exit = { x: p.ax, y: p.ay };
      if (!exit) continue;
      const dest = portalExit(exit, this.ball.body.velocity, PHYSICS.PORTAL_EXIT_CLEAR);
      RawMatter.Body.setPosition(this.ball.body, dest);
      p.lastJumpMs = time;
      this.haptics(PHYSICS.HAPTIC_TAP_MS);
      return; // one jump per frame
    }
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

  private checkHazards(): void {
    if (this.isDying || this.isWon || !this.hazards.length) return;
    const bx = this.ball.body.position.x;
    const by = this.ball.body.position.y;
    for (const h of this.hazards) {
      if (h.overlaps(bx, by, PHYSICS.BALL_RADIUS)) {
        this.triggerDeath();
        return;
      }
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
    if (this.isDaily) this.dailyStreak = DailyStore.recordWin();

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
      if (this.isDaily) {
        this.scene.start('MainMenuScene'); // one daily a day — back to the menu
      } else if (nextLevel > LEVELS.length) {
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
      .text(0, -38, this.isDaily ? 'DAILY COMPLETE' : 'LEVEL COMPLETE', {
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
    const subStr = this.isDaily
      ? `STREAK ${this.dailyStreak}  ·  best ${DailyStore.bestStreak()}`
      : `${timeStr}  ·  par ${parStr}`;
    const sub = this.add
      .text(0, 42, subStr, {
        fontFamily: THEME.FONT_BODY,
        fontSize: '14px',
        color: this.isDaily ? '#ffd166' : underPar ? '#ffd166' : THEME.TEXT_MUTED,
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
      this.scene.restart({ level: this.currentLevel, daily: this.isDaily }),
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
    this.scene.restart({ level: this.currentLevel, daily: this.isDaily });
  }
}
