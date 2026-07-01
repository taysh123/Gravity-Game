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
import { Gate } from '../entities/Gate';
import { gateOpen } from '../utils/gate';
import { MovingPlatform } from '../entities/MovingPlatform';
import { Collectible } from '../entities/Collectible';
import { Orb } from '../entities/Orb';
import { Hazard } from '../entities/Hazard';
import { IconButton } from '../ui/IconButton';
import { drawGlass } from '../ui/glass';
import { fadeToScene } from '../utils/transitions';
import { safeAreaInsetsScaled, reducedMotionActive } from '../utils/a11y';
import { FX } from '../config/fx.config';
import { fxCapable, shouldDowngradeFx } from '../utils/fx';
import { chargeLevel } from '../utils/attractorCharge';
import { computeStars, type StarResult } from '../utils/scoring';
import { celebrationTier, celebrationSpec } from '../utils/celebration';
import { ProgressStore } from '../utils/ProgressStore';
import { GhostStore } from '../utils/GhostStore';
import { downsamplePath } from '../utils/ghost';
import { Analytics } from '../utils/Analytics';
import { Crash } from '../utils/Crash';
import { CosmeticStore } from '../utils/CosmeticStore';
import type { ArrivalStyle } from '../utils/cosmetics';
import { levelStart, levelComplete, levelFail, retry as retryEvent, worldStart, dailyComplete, dailyStart, worldComplete, achievementUnlocked, hintUsed, rewardDoubleStardust, onboardingComplete, winStreak, streakBroken } from '../utils/analyticsEvents';
import { DailyStore } from '../utils/DailyStore';
import { StatsStore } from '../utils/StatsStore';
import { AchievementStore } from '../utils/AchievementStore';
import { grantAchievementRewards, claimMilestoneRewards, claimCollectionRewards, grantStreakReward } from '../utils/Rewards';
import type { AchievementDef } from '../utils/achievements';
import { CurrencyStore } from '../utils/CurrencyStore';
import { stardustForWin } from '../utils/currency';
import { streakReward, dateKey, type DailyModifier } from '../utils/daily';
import { DAILY_LEVELS } from '../config/dailyLevels';
import { worldOf, isWorldStart, isWorldEnd } from '../utils/world';
import { themeForWorld, type WorldTheme } from '../config/worldThemes';
import { Leaderboard } from '../utils/Leaderboard';
import { Ads } from '../utils/Ads';
import { nextUnlockHint } from '../utils/onboarding';
import { RETENTION } from '../config/retention.config';
import { StreakStore } from '../utils/StreakStore';
import { streakTier } from '../utils/streak';
import { nearMiss } from '../utils/nearMiss';

const SAFE_PAD = 12; // minimum padding from any screen edge for HUD/nav

function fmtTime(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export class GameScene extends Phaser.Scene {
  private ball!: Ball;
  private goal!: Goal;
  private attractor: Attractor | null = null;
  private attractorDownMs = 0; // this.game.loop.time at press — drives visual hold-charge
  private restartKey!: Phaser.Input.Keyboard.Key;
  private currentLevel = 1;
  private isWon = false;
  private isDying = false;
  private leaving = false; // true once any scene-leaving path (home/restart/advance) starts — prevents races
  private hintText: Phaser.GameObjects.Text | null = null;
  private pullLine!: Phaser.GameObjects.Graphics;
  private cosmic!: CosmicBackground;
  private coachMark: CoachMark | null = null;
  private zones: GravityZone[] = [];
  private magnets: Magnet[] = [];
  private portals: Portal[] = [];
  private gates: Gate[] = [];
  private hazards: Hazard[] = [];
  private collectible: Collectible | null = null;
  // Multi-goal "constellation" toy.
  private orbs: Orb[] = [];
  private collectAllToWin = false;
  // Moving "home" goal (drift/chase levels). All world coords.
  private goalStart = { x: 0, y: 0 };
  private goalTo: { x: number; y: number } | null = null;
  private goalDurMs = 0;
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
  // Mastery feedback — live par chip + PB ghost trail.
  private parChip: Phaser.GameObjects.Text | null = null;
  private prevBestMs = 0; // best time before this run (for new-best detection)
  private ghostPath: { x: number; y: number }[] = []; // this run's path, in play coords
  private ghostLastSampleMs = 0;
  private newAchievements: AchievementDef[] = [];
  private awardedStardust = 0;
  private isFirstWin = false; // this run is the first-ever campaign win (FTUE hero beat)
  private hadPriorProgress = false; // had campaign stars at level entry — suppresses the FTUE beat for returning players
  private advanceTimer?: Phaser.Time.TimerEvent; // post-win auto-advance (cancellable by the 2x offer)
  private advanceConsumed = false;
  private isDaily = false; // launched from the Daily Challenge
  private dailyStreak = 0; // streak after winning today's daily
  private winStreakCount = 0; // consecutive-campaign-win streak after this win (0 = daily / no streak)
  private dailyIndex = 0; // which curated daily level
  private dailyModifier: DailyModifier = 'none';
  private gemRequired = false; // daily 'gemRush' modifier — must collect the gem to win
  private levelTitle = ''; // signature-level name shown in the HUD
  private isBoss = false; // boss level — HUD shows a BOSS identity
  private worldTheme: WorldTheme | undefined; // per-world palette (undefined for daily)
  // Screen-space post-FX (bloom/vignette) — WebGL-gated, torn down by the FPS watchdog.
  private fxSamples: number[] = [];
  private bloomFx?: Phaser.FX.Bloom;

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
    const data = this.scene.settings.data as
      | { level?: number; daily?: boolean; dailyIndex?: number; dailyModifier?: DailyModifier }
      | undefined;
    this.currentLevel = data?.level ?? 1;
    this.isDaily = data?.daily ?? false;
    this.dailyIndex = data?.dailyIndex ?? 0;
    this.dailyModifier = data?.dailyModifier ?? 'none';
    this.isWon = false;
    this.isDying = false;
    this.leaving = false;
    this.advanceConsumed = false;

    const config = this.isDaily
      ? DAILY_LEVELS[this.dailyIndex] ?? DAILY_LEVELS[0]
      : LEVELS[this.currentLevel - 1] ?? LEVELS[0];
    // game.loop.time is the fresh current global time. (this.time.now is the Scene
    // Clock, which FREEZES on shutdown and is only re-synced by the first update() —
    // which runs AFTER create() — so reading it here on re-entry yields a stale value
    // and the timer/par/best-time would not reset to 0.)
    this.levelStartMs = this.game.loop.time;
    this.parTimeMs = config.parTimeMs ?? PHYSICS.STAR_PAR_DEFAULT_MS;
    this.timeLimitMs = config.timeLimitMs ?? 0;
    // Apply the daily modifier.
    this.gemRequired = false;
    if (this.isDaily && this.dailyModifier === 'timed') {
      this.timeLimitMs = (config.parTimeMs ?? 12000) + 3000;
    } else if (this.isDaily && this.dailyModifier === 'gemRush') {
      this.gemRequired = true;
    }
    this.levelTitle = config.title ?? '';
    this.isBoss = config.boss ?? false;
    this.countdown = null;
    this.parChip = null;
    this.gemCollected = false;
    this.winResult = null;
    this.isFirstWin = false;
    this.winStreakCount = 0;
    // Snapshot prior progress at entry (before this level's win is recorded) so the
    // one-time FTUE hero beat only greets a genuine first-timer — never a returning
    // player who predates the seenFirstWin flag.
    this.hadPriorProgress = !this.isDaily && ProgressStore.totalStars() > 0;
    this.orbs = [];
    this.collectAllToWin = false;
    this.goalTo = null;
    this.goalDurMs = 0;

    this.uiBlockers = [];
    // Per-world visual identity (campaign only; daily keeps the neutral cosmos).
    this.worldTheme = this.isDaily ? undefined : themeForWorld(worldOf(this.currentLevel).id);
    this.cosmic = new CosmicBackground(this, 0.5, this.worldTheme); // dim atmosphere behind play
    this.createWorldBounds();
    this.createFromConfig(config);
    this.applyCameraIntro(config);
    this.pullLine = this.add.graphics();
    this.setupInput();
    this.createHud();
    this.createNav();
    if (this.timeLimitMs > 0) this.createCountdown();
    else this.createParChip();
    // Mastery feedback: remember the pre-run best, reset the recorder, paint the PB ghost.
    this.prevBestMs = this.isDaily ? 0 : ProgressStore.get(this.currentLevel).bestTimeMs;
    this.ghostPath = [];
    this.ghostLastSampleMs = this.levelStartMs;
    this.renderGhostTrail();
    this.hintText = null;
    this.showHint(config.hint);
    this.coachMark = null;
    this.maybeShowCoach();
    // A brief world title card when entering a new world — identity + anticipation.
    if (!this.isDaily && this.worldTheme && isWorldStart(this.currentLevel)) {
      this.showWorldTitleCard();
    }
    // Telemetry: level-entry funnel. Campaign tracks level/world start; daily tracks
    // its own entry here (completion/streak is tracked separately in triggerWin).
    if (!this.isDaily) {
      const wid = worldOf(this.currentLevel).id;
      Analytics.track(levelStart(this.currentLevel, wid));
      if (isWorldStart(this.currentLevel)) Analytics.track(worldStart(wid));
    } else {
      Analytics.track(dailyStart(this.dailyIndex, String(this.dailyModifier)));
    }
    Crash.log(`level_start ${this.isDaily ? 'daily' : this.currentLevel}`);
    // Per-world music bed (continuous across same-world restarts; boss = tense).
    const ambientAudio = this.getAudio();
    ambientAudio.resume();
    ambientAudio.startWorldTheme(worldOf(this.currentLevel).id, this.isBoss);
    // Signature/boss levels announce themselves (boss arenas also get a red wash).
    if (this.isBoss) this.addBossArenaTint();
    if (this.levelTitle && !this.isDaily) this.showLevelTitleCard();

    this.restartKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.R,
    );

    this.applyScenePostFX();
  }

  // Screen-space premium pass: subtle global bloom + vignette. WebGL-only; skipped
  // under reduced-motion; auto-removed by the FPS watchdog on weak GPUs. Never a
  // gameplay dependency — the scene renders identically without it.
  private applyScenePostFX(): void {
    this.fxSamples = [];
    this.bloomFx = undefined; // fresh camera each create()/restart — drop any stale FX ref
    const cam = this.cameras.main;
    const capable = fxCapable(this.game.renderer.type) && !!cam.postFX;
    if (!capable) return;
    // Vignette is cheap — keep it even under reduced-motion for focus/depth.
    cam.postFX.addVignette(FX.VIGNETTE_CENTER, FX.VIGNETTE_CENTER, FX.VIGNETTE_RADIUS, FX.VIGNETTE_STRENGTH);
    if (reducedMotionActive()) return; // motion-sensitive users: no bloom bloom-in
    this.bloomFx = cam.postFX.addBloom(
      FX.BLOOM_COLOR, FX.BLOOM_OFFSET, FX.BLOOM_OFFSET,
      FX.BLOOM_BLUR_STRENGTH, FX.BLOOM_STRENGTH, FX.BLOOM_STEPS,
    );
  }

  // Called each frame from update() — samples fps and tears down bloom if the
  // device can't sustain it. Only samples while bloom is live.
  private watchdogFx(): void {
    if (!this.bloomFx) return;
    this.fxSamples.push(this.game.loop.actualFps);
    if (this.fxSamples.length > FX.FPS_DOWNGRADE_WINDOW) this.fxSamples.shift(); // bound the buffer
    if (shouldDowngradeFx(this.fxSamples, FX.FPS_DOWNGRADE_THRESHOLD, FX.FPS_DOWNGRADE_WINDOW)) {
      this.cameras.main.postFX.remove(this.bloomFx);
      this.bloomFx = undefined;
    }
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

    this.gates = (config.gates ?? []).map(
      (gc) => new Gate(this, ox + gc.x, oy + gc.y, gc.width, gc.height, gc.dir, gc.angle),
    );

    this.hazards = (config.hazards ?? []).map((hz) => {
      const h = new Hazard(this, ox + hz.x, oy + hz.y, hz);
      if (hz.pivot && hz.durationMs) h.startOrbiting(this, ox + hz.pivot.x, oy + hz.pivot.y, hz.durationMs);
      else if (hz.to && hz.durationMs) h.startMoving(this, ox + hz.to.x, oy + hz.to.y, hz.durationMs);
      return h;
    });

    this.collectible = config.collectible
      ? new Collectible(this, ox + config.collectible.x, oy + config.collectible.y)
      : null;

    // Multi-goal "constellation" orbs (collect-all toy).
    this.orbs = (config.collectibles ?? []).map((c) => new Orb(this, ox + c.x, oy + c.y));
    this.collectAllToWin = config.collectAllToWin ?? false;

    // Moving "home" goal (drift/chase): store world-space endpoints for the yoyo.
    this.goalStart = { x: ox + config.goal.x, y: oy + config.goal.y };
    if (config.goal.to && config.goal.durationMs) {
      this.goalTo = { x: ox + config.goal.to.x, y: oy + config.goal.to.y };
      this.goalDurMs = config.goal.durationMs;
    }

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

  // Cinematic intro: start zoomed (in/out) and settle to 1.0 — a "reveal" beat.
  private applyCameraIntro(config: LevelConfig): void {
    const z = config.camera?.introZoom;
    if (!z) return;
    const from = clamp(z, 0.5, PHYSICS.CAMERA_INTRO_ZOOM_MAX);
    const cam = this.cameras.main;
    if (reducedMotionActive()) { cam.setZoom(1); return; }
    cam.setZoom(from);
    this.tweens.add({ targets: cam, zoom: 1, duration: PHYSICS.CAMERA_TWEEN_MS, ease: 'Cubic.easeOut' });
  }

  // Drift the "home" goal along its yoyo (chase/journey levels).
  private updateGoalMotion(time: number): void {
    if (!this.goalTo || this.goalDurMs <= 0) return;
    const cycle = (time / this.goalDurMs) % 2;          // 0..2
    const t = cycle <= 1 ? cycle : 2 - cycle;           // ping-pong 0..1..0
    this.goal.setPosition(
      this.goalStart.x + (this.goalTo.x - this.goalStart.x) * t,
      this.goalStart.y + (this.goalTo.y - this.goalStart.y) * t,
    );
  }

  // Multi-goal toy: gather constellation orbs; collecting all can BE the win.
  private checkOrbs(): void {
    if (!this.orbs.length) return;
    const bx = this.ball.body.position.x;
    const by = this.ball.body.position.y;
    for (const o of this.orbs) {
      if (o.overlaps(bx, by, PHYSICS.BALL_RADIUS)) {
        o.collect(this);
        this.getAudio().playGem();
        this.haptics(PHYSICS.HAPTIC_TAP_MS);
      }
    }
  }

  private allOrbsCollected(): boolean {
    return this.orbs.length > 0 && this.orbs.every((o) => o.collected);
  }

  // Connect the gathered orbs (+ the home goal) into a constellation on win.
  private drawConstellation(): void {
    if (!this.orbs.length) return;
    const g = this.add.graphics().setDepth(40).setBlendMode(Phaser.BlendModes.ADD);
    g.lineStyle(2, PHYSICS.COLOR_CONSTELLATION, PHYSICS.CONSTELLATION_ALPHA);
    const pts = [...this.orbs.map((o) => ({ x: o.x, y: o.y })), { x: this.goal.x, y: this.goal.y }];
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach((p) => g.lineTo(p.x, p.y));
    g.strokePath();
    pts.forEach((p) => { g.fillStyle(PHYSICS.COLOR_CONSTELLATION, 0.9); g.fillCircle(p.x, p.y, 3); });
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
      this.attractorDownMs = this.game.loop.time;
      this.cosmic.pulse(1); // press stirs the nebula — cause → effect
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

    // HUD title: BOSS / signature name / DAILY / LEVEL N — bosses + signatures
    // get a gold accent so they read as special.
    // Signature levels show a gold title; bosses a red one — kept short so the
    // chip stays clear of the top-right toolbar.
    const labelStr = this.isDaily ? 'DAILY' : this.levelTitle || `LEVEL ${this.currentLevel}`;
    const labelColor = this.isBoss ? '#ff5a6a' : this.levelTitle ? '#ffd166' : THEME.TEXT_PRIMARY;
    const label = this.add
      .text(0, 0, labelStr, {
        fontFamily: THEME.FONT_DISPLAY,
        fontSize: '14px',
        color: labelColor,
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
      this.triggerDeath('timeout'); // time's up — fail
      return;
    }
    this.countdown.setText(fmtTime(remaining));
    const warn = remaining <= PHYSICS.TIMER_WARN_MS;
    this.countdown.setColor(warn ? PHYSICS.COLOR_TIMER_WARN : PHYSICS.COLOR_TIMER);
    this.countdown.setScale(warn ? 1 + 0.08 * Math.sin(time / 110) : 1);
  }

  // Live par chip (untimed levels): elapsed time, gold while still under par — the
  // "am I on pace for 3 stars?" feedback that drives the replay loop.
  private createParChip(): void {
    const insets = this.safeInsets;
    const padY = Math.max(SAFE_PAD, insets.top) + 8;
    const w = 80;
    const h = 36;
    const chip = this.add.graphics();
    drawGlass(chip, w, h, h / 2);
    this.parChip = this.add
      .text(0, 0, '0.0s', {
        fontFamily: THEME.FONT_DISPLAY,
        fontSize: '17px',
        color: PHYSICS.COLOR_PAR_UNDER,
        fontStyle: '700',
      })
      .setOrigin(0.5);
    const cont = this.add
      .container(this.scale.width / 2, padY + 56 + h / 2, [chip, this.parChip])
      .setDepth(20);
    this.uiBlockers.push(cont);
  }

  private updateParChip(time: number): void {
    if (!this.parChip) return;
    const elapsed = time - this.levelStartMs;
    this.parChip.setText(fmtTime(elapsed));
    this.parChip.setColor(elapsed <= this.parTimeMs ? PHYSICS.COLOR_PAR_UNDER : PHYSICS.COLOR_PAR_OVER);
  }

  // Sample the ball's path (play coords) for the PB ghost, throttled + capped.
  private sampleGhost(time: number): void {
    if (this.isDaily) return;
    if (time - this.ghostLastSampleMs < PHYSICS.GHOST_SAMPLE_MS) return;
    this.ghostLastSampleMs = time;
    if (this.ghostPath.length >= PHYSICS.GHOST_MAX_SAMPLES) return;
    this.ghostPath.push({
      x: this.ball.body.position.x - this.playX,
      y: this.ball.body.position.y - this.playY,
    });
  }

  // Paint the faint trail of the player's best run (campaign only, motion-on).
  private renderGhostTrail(): void {
    if (this.isDaily || reducedMotionActive()) return;
    const path = GhostStore.get(this.currentLevel);
    if (path.length < 2) return;
    const ox = this.playX;
    const oy = this.playY;
    const g = this.add.graphics().setDepth(0);
    g.lineStyle(2, PHYSICS.COLOR_GHOST, PHYSICS.GHOST_ALPHA);
    g.beginPath();
    g.moveTo(ox + path[0].x, oy + path[0].y);
    for (let i = 1; i < path.length; i++) g.lineTo(ox + path[i].x, oy + path[i].y);
    g.strokePath();
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

  // Brief world title card on entering a new world (roman numeral + name + journey
  // subtitle in the world accent). Fades out; respects reduced-motion.
  private showWorldTitleCard(): void {
    const t = this.worldTheme;
    if (!t) return;
    const w = worldOf(this.currentLevel);
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height * 0.42;
    const accent = Phaser.Display.Color.IntegerToColor(t.accent).rgba;
    const roman = this.add.text(cx, cy - 24, t.roman, { fontFamily: THEME.FONT_DISPLAY, fontSize: '34px', color: accent, fontStyle: '700' }).setOrigin(0.5).setDepth(60).setLetterSpacing(4);
    const name = this.add.text(cx, cy + 12, w.name, { fontFamily: THEME.FONT_DISPLAY, fontSize: '22px', color: THEME.TEXT_PRIMARY, fontStyle: '700' }).setOrigin(0.5).setDepth(60).setLetterSpacing(3);
    const sub = this.add.text(cx, cy + 40, t.subtitle, { fontFamily: THEME.FONT_BODY, fontSize: '13px', color: THEME.TEXT_MUTED }).setOrigin(0.5).setDepth(60);
    const group = [roman, name, sub];
    if (reducedMotionActive()) {
      this.time.delayedCall(1500, () => group.forEach((g) => g.destroy()));
      return;
    }
    group.forEach((g) => g.setAlpha(0));
    group.forEach((g, i) => {
      this.tweens.add({
        targets: g, alpha: 1, y: g.y - 8, delay: 120 + i * 90, duration: 420, ease: THEME.EASE,
        onComplete: i === group.length - 1
          ? () => this.time.delayedCall(950, () => this.tweens.add({ targets: group, alpha: 0, duration: 500, onComplete: () => group.forEach((x) => x.destroy()) }))
          : undefined,
      });
    });
  }

  // Signature/boss level announcement card on entry — a named "event" beat.
  private showLevelTitleCard(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height * 0.4;
    const accentNum = this.isBoss ? 0xff5a6a : 0xffd166;
    const accent = Phaser.Display.Color.IntegerToColor(accentNum).rgba;
    const tag = this.add
      .text(cx, cy - 26, this.isBoss ? '▲ BOSS' : 'SIGNATURE', { fontFamily: THEME.FONT_BODY, fontSize: '12px', color: accent })
      .setOrigin(0.5).setDepth(60).setLetterSpacing(3);
    const name = this.add
      .text(cx, cy + 6, this.levelTitle, { fontFamily: THEME.FONT_DISPLAY, fontSize: '28px', color: accent, fontStyle: '700' })
      .setOrigin(0.5).setDepth(60).setLetterSpacing(2);
    const group = [tag, name];
    if (reducedMotionActive()) {
      this.time.delayedCall(1500, () => group.forEach((g) => g.destroy()));
      return;
    }
    group.forEach((g) => g.setAlpha(0));
    group.forEach((g, i) => {
      this.tweens.add({
        targets: g, alpha: 1, y: g.y - 8, delay: 120 + i * 100, duration: 420, ease: THEME.EASE,
        onComplete: i === group.length - 1
          ? () => this.time.delayedCall(950, () => this.tweens.add({ targets: group, alpha: 0, duration: 500, onComplete: () => group.forEach((x) => x.destroy()) }))
          : undefined,
      });
    });
  }

  // Faint red wash over a boss arena — signals danger/escalation at a glance.
  private addBossArenaTint(): void {
    const { width, height } = this.scale;
    this.add
      .rectangle(0, 0, width, height, 0xff2a3a, 0.05)
      .setOrigin(0)
      .setDepth(-70)
      .setBlendMode(Phaser.BlendModes.ADD);
  }

  private isOverUi(pointer: Phaser.Input.Pointer): boolean {
    return this.uiBlockers.some((c) => c.getBounds().contains(pointer.x, pointer.y));
  }

  private goHome(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.getAudio().stopHum();
    this.getAudio().stopWorldTheme();
    this.attractor?.destroy();
    this.attractor = null;
    fadeToScene(this, 'MainMenuScene');
  }

  // Pause gameplay and open the settings overlay on top. Idempotent — a double-tap
  // must not pause the scene twice (close() resumes once → would leave us frozen).
  private openSettings(): void {
    if (this.leaving || this.scene.isActive('SettingsScene')) return;
    this.getAudio().stopHum();
    this.attractor?.destroy();
    this.attractor = null;
    this.scene.pause();
    this.scene.launch('SettingsScene', { caller: 'GameScene' });
  }

  // Onboarding tip near the bottom. Auto-fades, or dismisses on first touch.
  private showHint(hint?: string): void {
    if (!hint) return;
    // Telemetry: hint exposure (campaign only — this is a shown/auto tip, not a
    // player-requested action, so it represents exposure rather than a "used" tap).
    if (!this.isDaily) Analytics.track(hintUsed(this.currentLevel));
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
    this.watchdogFx();
    if (this.isWon || this.isDying) return;

    this.updateCountdown(time);
    if (this.isDying) return; // updateCountdown may have triggered a timeout death
    this.ball.update();
    this.sampleGhost(time);
    this.updateParChip(time);
    this.updateGoalMotion(time);
    const nearT = clamp(
      1 - distance(this.ball.body.position.x, this.ball.body.position.y, this.goal.x, this.goal.y) / PHYSICS.GOAL_NEAR_DIST,
      0,
      1,
    );
    this.goal.pulse(time / 300, nearT);
    this.orbs.forEach((o) => o.pulse(time / 300));
    // Set charge BEFORE pulse() so the redraw pulse() triggers uses this frame's
    // charge (no one-frame render lag).
    if (this.attractor) {
      this.attractor.setCharge(chargeLevel(this.game.loop.time - this.attractorDownMs, FX.CHARGE_FULL_MS));
    }
    this.attractor?.pulse(time / 150);
    this.zones.forEach((z) => z.pulse(time / 600));
    this.magnets.forEach((m) => m.pulse(time / 600));
    this.portals.forEach((p) => p.pulse(time / 400));
    this.gates.forEach((g) => g.pulse(time / 300));
    this.hazards.forEach((h) => h.pulse(time));
    this.collectible?.pulse(time / 300);
    this.drawPullLine();
    this.applyAttractorForce();
    this.applyZoneForces();
    this.applyMagnetForces();
    this.updateGates();
    this.checkPortals(time);
    this.checkGem();
    this.checkOrbs();
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

  // One-way gates: open (passable) while the ball moves along `dir`, else solid.
  // Hysteresis keeps a gate open while the ball is still passing through it.
  private updateGates(): void {
    if (!this.gates.length) return;
    const v = this.ball.body.velocity;
    const bx = this.ball.body.position.x;
    const by = this.ball.body.position.y;
    for (const g of this.gates) {
      const moving = gateOpen(v, { x: g.nx, y: g.ny }, PHYSICS.GATE_OPEN_THRESHOLD);
      const open = moving || (g.isOpen && g.overlaps(bx, by, PHYSICS.BALL_RADIUS + 4));
      g.setOpen(open);
    }
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
      StatsStore.recordPortalJump();
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
      if (this.gemRequired && !this.gemCollected) return; // 'gemRush' daily — grab the gem first
      if (this.collectAllToWin && !this.allOrbsCollected()) return; // gather the constellation first
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
    // Campaign progress only — the daily isn't a campaign level.
    if (!this.isDaily) {
      // Save the PB ghost trail if this run beat the stored best (before record() updates it).
      const isNewBest = this.prevBestMs === 0 || this.winTimeMs < this.prevBestMs;
      if (isNewBest && this.ghostPath.length >= 2) {
        GhostStore.save(this.currentLevel, downsamplePath(this.ghostPath, PHYSICS.GHOST_MAX_POINTS));
      }
      ProgressStore.record(this.currentLevel, {
        stars: this.winResult.stars,
        timeMs: this.winTimeMs,
        gem: this.gemCollected,
        completed: true,
      });
      Analytics.track(levelComplete(this.currentLevel, this.winResult.stars, this.winTimeMs));
      if (isWorldEnd(this.currentLevel)) Analytics.track(worldComplete(worldOf(this.currentLevel).id));
      // FTUE: a genuine first-timer's first campaign win gets a one-time hero beat
      // (distinct from the generic 3★). Gated on !seenFirstWin AND no prior progress
      // (a returning player who predates the flag never sees it); set-once so it
      // never re-fires on replay.
      this.isFirstWin = !SettingsStore.get().seenFirstWin && !this.hadPriorProgress;
      if (this.isFirstWin) {
        SettingsStore.set('seenFirstWin', true);
        Analytics.track(onboardingComplete());
      }
    }
    // Award Stardust (soft currency) for the win — spent on cosmetics.
    this.awardedStardust = stardustForWin(this.winResult.stars, this.isDaily);
    if (this.isDaily) {
      this.dailyStreak = DailyStore.recordWin();
      Analytics.track(dailyComplete(this.dailyStreak));
      this.awardedStardust += streakReward(this.dailyStreak); // milestone bonus
      // Record a structured daily result (leaderboard-ready; local for now).
      Leaderboard.submitDaily({
        date: dateKey(new Date()),
        index: this.dailyIndex,
        modifier: this.dailyModifier,
        timeMs: this.winTimeMs,
        stars: this.winResult.stars,
      });
    }
    CurrencyStore.add(this.awardedStardust);
    // Win-streak momentum (campaign only) — a separate bonus from the base
    // award above. grantStreakReward adds its own Stardust directly (see
    // Rewards.ts for why that hook intentionally skips the RewardStore
    // one-time guard), so the bonus is folded into the displayed total here
    // for the overlay only, never re-added to CurrencyStore.
    if (!this.isDaily) {
      this.winStreakCount = StreakStore.win();
      const bonus = grantStreakReward(this.winStreakCount);
      this.awardedStardust += bonus;
      if (bonus > 0) Analytics.track(winStreak(this.winStreakCount));
    }
    // Achievements reflect this win (progress + daily streak recorded above).
    this.newAchievements = AchievementStore.syncAndGetNew(StatsStore.collectSnapshot());
    this.newAchievements.forEach((a) => Analytics.track(achievementUnlocked(a.id)));
    // Retention rewards: achievements grant currency; star-milestones + completed
    // collections grant one-time Fragment bonuses (all cosmetic economy).
    grantAchievementRewards(this.newAchievements.map((a) => a.id));
    claimMilestoneRewards(ProgressStore.totalStars());
    claimCollectionRewards();

    const audio = this.getAudio();
    audio.stopHum();
    audio.playGoalCapture();
    // Tiered celebration ladder: 1★ normal → 2★ great → 3★ perfect → boss — one
    // spec drives haptics, shake, optional screen flash, camera punch, and bloom.
    const spec = celebrationSpec(celebrationTier(this.winResult.stars, this.isBoss));
    this.haptics([...PHYSICS[spec.hapticKey]]);
    this.attractor?.destroy();
    this.attractor = null;
    this.matter.world.pause();
    this.drawConstellation();
    const arrival = CosmeticStore.equipped('arrival').arrival;
    this.emitGoalBurst(arrival);
    this.winFlash(arrival?.flash);
    // Screen-wide bloom on the biggest wins (perfect / boss) — a celebratory
    // moment beyond the goal-localized flash. Tinted to the world accent.
    if (spec.screenFlash) this.celebrationFlash(this.worldTheme?.accent ?? PHYSICS.COLOR_STAR);
    // Transient global-bloom swell during the moment, then ease back to base
    // (WebGL only — this.bloomFx is unset under Canvas/reduced-motion/low-FPS,
    // so this auto-guards with no extra reduced-motion check needed).
    if (this.bloomFx) {
      const base = FX.BLOOM_STRENGTH;
      this.bloomFx.strength = base + spec.bloomBoost;
      this.tweens.add({ targets: this.bloomFx, strength: base, duration: FX.CELEB_BLOOM_DECAY_MS, ease: 'Quad.easeOut' });
    }
    // Camera punch — a small zoom kick for impact, scaled by tier.
    this.tweens.add({ targets: this.cameras.main, zoom: spec.cameraPunch, duration: 130, yoyo: true, ease: 'Quad.easeOut' });
    this.cameras.main.shake(spec.shakeMs, spec.shakeIntensity);

    this.tweens.add({
      targets: this.ball.graphics,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => this.showWinOverlay(),
    });

    // Campaign wins linger a little so the optional 2x-Stardust offer is tappable;
    // the daily returns to the menu snappily.
    this.advanceTimer = this.time.delayedCall(this.isDaily ? 1550 : 2800, () => this.advanceAfterWin());
  }

  // Advance after a win (next level / end / menu). Extracted so the optional
  // "2x Stardust" offer can cancel the auto-advance, run the ad, then advance.
  private advanceAfterWin(): void {
    if (this.leaving || this.advanceConsumed) return;
    this.advanceConsumed = true;
    this.leaving = true;
    const nextLevel = this.currentLevel + 1;
    if (this.isDaily) {
      this.getAudio().stopWorldTheme();
      this.scene.start('MainMenuScene'); // one daily a day — back to the menu
    } else if (nextLevel > LEVELS.length) {
      this.getAudio().stopWorldTheme();
      this.scene.start('EndScene');
    } else {
      void Ads.maybeInterstitial(); // frequency-capped; no-op on web / for premium
      this.scene.restart({ level: nextLevel }); // startWorldTheme keeps same-world music continuous
    }
  }

  private showWinOverlay(): void {
    if (this.isBoss) this.getAudio().playBossClear();
    else this.getAudio().playLevelComplete();
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

    // Boss clears read as "STAR FREED" (the journey hook); else level/daily complete.
    const completeStr = this.isDaily ? 'DAILY COMPLETE' : this.isBoss ? 'STAR FREED' : 'LEVEL COMPLETE';
    const label = this.add
      .text(0, -38, completeStr, {
        fontFamily: THEME.FONT_DISPLAY,
        fontSize: '21px',
        color: this.isBoss ? '#ffd166' : '#00e676',
        fontStyle: '700',
      })
      .setOrigin(0.5);
    label.setLetterSpacing(2);

    const card = this.add.container(cx, cy, [panel, label]).setDepth(51);

    // Star row — earned stars pop in one-by-one (gold), with a PERFECT! on 3★.
    const earned = this.winResult?.stars ?? 1;
    const reduced = reducedMotionActive();
    const starGap = 40;
    for (let i = 0; i < 3; i++) {
      const on = i < earned;
      const star = this.add
        .text((i - 1) * starGap, 6, '★', {
          fontFamily: THEME.FONT_BODY,
          fontSize: '30px',
          color: on ? '#ffd166' : '#3a4256',
        })
        .setOrigin(0.5);
      card.add(star);
      if (on && !reduced) {
        star.setScale(0);
        this.tweens.add({ targets: star, scale: 1, duration: 300, delay: 420 + i * 220, ease: 'Back.easeOut' });
        this.time.delayedCall(420 + i * 220, () => this.getAudio().playStarTone(i));
      }
    }
    if (earned >= 3) {
      const perfect = this.add
        .text(0, -64, 'PERFECT!', { fontFamily: THEME.FONT_DISPLAY, fontSize: '15px', color: '#ffd166', fontStyle: '700' })
        .setOrigin(0.5)
        .setLetterSpacing(2);
      card.add(perfect);
      if (!reduced) {
        perfect.setScale(0).setAlpha(0);
        this.tweens.add({ targets: perfect, scale: 1, alpha: 1, delay: 420 + 3 * 220, duration: 300, ease: 'Back.easeOut' });
      }
    }

    // FTUE: one-time first-win hero beat — a kicker line above the title that
    // celebrates what just happened (distinct from the generic 3★) rather than
    // competing with it. Floats above the panel edge, same as PERFECT!. Fades
    // itself out well before the standard post-win auto-advance.
    if (this.isFirstWin) {
      const hero = this.add
        .text(0, -88, RETENTION.FIRST_WIN_TEXT, {
          fontFamily: THEME.FONT_DISPLAY,
          fontSize: '14px',
          color: RETENTION.FIRST_WIN_COLOR,
          fontStyle: '700',
          align: 'center',
        })
        .setOrigin(0.5);
      card.add(hero);
      if (reduced) {
        this.time.delayedCall(RETENTION.FIRST_WIN_MS, () => hero.destroy());
      } else {
        hero.setScale(0.9).setAlpha(0);
        this.tweens.add({
          targets: hero,
          scale: 1,
          alpha: 1,
          duration: 320,
          ease: THEME.EASE_POP,
          onComplete: () =>
            this.time.delayedCall(RETENTION.FIRST_WIN_MS, () =>
              this.tweens.add({ targets: hero, alpha: 0, duration: RETENTION.FIRST_WIN_FADE_MS, onComplete: () => hero.destroy() }),
            ),
        });
      }
    } else if (!this.isDaily && streakTier(this.winStreakCount).level >= 1) {
      // Win-streak momentum flourish — the same kicker slot as the FTUE hero
      // beat above (mutually exclusive with it: a single win never shows two
      // competing headline moments). Escalates size + color with the tier.
      const tier = streakTier(this.winStreakCount);
      const tierColor =
        tier.level === 3 ? RETENTION.STREAK_NOVA_COLOR :
        tier.level === 2 ? RETENTION.STREAK_BLAZE_COLOR : RETENTION.STREAK_FLOW_COLOR;
      const streakLabel = this.add
        .text(0, -88, tier.label, {
          fontFamily: THEME.FONT_DISPLAY,
          fontSize: `${RETENTION.STREAK_LABEL_BASE_PX + tier.level * RETENTION.STREAK_LABEL_STEP_PX}px`, // escalates with the tier
          color: tierColor,
          fontStyle: '700',
        })
        .setOrigin(0.5)
        .setLetterSpacing(1);
      card.add(streakLabel);
      if (!reduced) {
        streakLabel.setScale(0.85).setAlpha(0);
        this.tweens.add({ targets: streakLabel, scale: 1, alpha: 1, duration: 320, delay: 120, ease: THEME.EASE_POP });
      }
    }

    // Near-miss encouragement (win side): finished just OVER par without the
    // efficiency star — a "so close" retry pull. Takes priority over the
    // generic next-world nudge below (same slot; never shows both at once).
    const justPar =
      !this.isFirstWin && !this.isDaily &&
      nearMiss({ outcome: 'win', timeMs: this.winTimeMs, parMs: this.parTimeMs, underPar: this.winResult?.underPar }) === 'just-par';
    const justParText = justPar
      ? `${fmtTime(Math.max(0, this.winTimeMs - this.parTimeMs))} ${RETENTION.JUST_PAR_SUFFIX}`
      : null;
    // Momentum nudge (early campaign wins, not the first) — the ever-present
    // "next carrot" so progress toward the next world always reads. Subordinate
    // to the title/stars (small, muted); mutually exclusive with the hero beat
    // above and the near-miss line above so a single win never shows two
    // competing headline moments.
    const nudgeHint =
      !justParText && !this.isFirstWin && !this.isDaily && this.currentLevel <= RETENTION.NUDGE_MAX_LEVEL
        ? nextUnlockHint(this.currentLevel)
        : null;
    const secondLine = justParText ?? nudgeHint;
    if (secondLine) {
      const nudge = this.add
        .text(0, 70, secondLine, {
          fontFamily: THEME.FONT_BODY,
          fontSize: '12px',
          color: justParText ? RETENTION.JUST_PAR_COLOR : RETENTION.NUDGE_COLOR,
        })
        .setOrigin(0.5);
      card.add(nudge);
      if (!reduced) {
        nudge.setAlpha(0);
        this.tweens.add({ targets: nudge, alpha: 1, duration: 300, delay: 300, ease: THEME.EASE });
      }
    }
    // Below-panel elements (2x offer, achievement toast) make room when the
    // second line (nudge or near-miss) is showing, so nothing overlaps it.
    const nudgeExtra = secondLine ? 30 : 0;

    const parStr = fmtTime(this.parTimeMs);
    const timeStr = fmtTime(this.winTimeMs);
    const underPar = this.winResult?.underPar;
    const subStr = this.isDaily
      ? `STREAK ${this.dailyStreak}  ·  +${this.awardedStardust} ✦`
      : `${timeStr}  ·  par ${parStr}  ·  +${this.awardedStardust} ✦`;
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

    // Optional "2x Stardust" rewarded offer (campaign wins) — cancels the
    // auto-advance, runs an ad, doubles the reward. Always opt-in.
    const showDouble = !this.isDaily && this.awardedStardust > 0;
    if (showDouble) {
      const bw = 190, bh = 42;
      const bbg = this.add.graphics();
      drawGlass(bbg, bw, bh, bh / 2);
      bbg.lineStyle(2, 0x7affb0, 0.6);
      bbg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
      const btxt = this.add.text(0, 0, `▶  2×  +${this.awardedStardust} ✦`, {
        fontFamily: THEME.FONT_DISPLAY, fontSize: '15px', color: '#7affb0', fontStyle: '700',
      }).setOrigin(0.5);
      const btn = this.add.container(cx, cy + panelH / 2 + 34 + nudgeExtra, [bbg, btxt]).setDepth(51);
      btn.setSize(bw, bh);
      btn.setInteractive(new Phaser.Geom.Rectangle(-bw / 2, -bh / 2, bw, bh), Phaser.Geom.Rectangle.Contains);
      btn.once('pointerup', async () => {
        btn.disableInteractive();
        this.advanceTimer?.remove();
        const earned = await Ads.showRewarded();
        if (earned) {
          CurrencyStore.add(this.awardedStardust);
          Analytics.track(rewardDoubleStardust(this.awardedStardust));
          btxt.setText(`+${this.awardedStardust} ✦  ×2!`);
          this.time.delayedCall(900, () => this.advanceAfterWin());
        } else {
          this.advanceAfterWin();
        }
      });
      if (!reduced) { btn.setScale(0.85).setAlpha(0); this.tweens.add({ targets: btn, scale: 1, alpha: 1, delay: 500, duration: 300, ease: THEME.EASE_POP }); }
    }

    // Newly-unlocked achievement(s) → a glass toast below the panel.
    if (this.newAchievements.length) {
      const a = this.newAchievements[0];
      const extra = this.newAchievements.length - 1;
      const nameStr = extra > 0 ? `${a.name}  +${extra} more` : a.name;
      const tw = Math.min(width * 0.82, 280);
      const th = 44;
      const tg = this.add.graphics();
      drawGlass(tg, tw, th, th / 2);
      const head = this.add
        .text(0, -8, '★ ACHIEVEMENT', { fontFamily: THEME.FONT_BODY, fontSize: '10px', color: '#ffd166' })
        .setOrigin(0.5)
        .setLetterSpacing(2);
      const nm = this.add
        .text(0, 8, nameStr, { fontFamily: THEME.FONT_DISPLAY, fontSize: '14px', color: THEME.TEXT_PRIMARY, fontStyle: '600' })
        .setOrigin(0.5);
      const toast = this.add.container(cx, cy + panelH / 2 + 40 + (showDouble ? 54 : 0) + nudgeExtra, [tg, head, nm]).setDepth(51);
      toast.setScale(0.85).setAlpha(0);
      this.tweens.add({ targets: toast, scale: 1, alpha: 1, delay: 360, duration: 320, ease: THEME.EASE_POP });
    }
  }

  // Screen-wide radial bloom for the biggest wins (3★ / boss) — the "screen-
  // filling" celebratory moment. One additive sprite (not particles), tinted to
  // the world accent, blooming out then fading. Sits above gameplay, below the
  // win overlay scrim. Honors reduced-motion via a calmer peak alpha.
  private celebrationFlash(tint: number): void {
    const { width, height } = this.scale;
    const size = Math.max(width, height) * 2;
    const flash = this.add
      .image(width / 2, height / 2, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(tint)
      .setDepth(45)
      .setDisplaySize(size, size)
      .setAlpha(0);
    const peak = reducedMotionActive()
      ? PHYSICS.CELEBRATION_FLASH_ALPHA_REDUCED
      : PHYSICS.CELEBRATION_FLASH_ALPHA;
    this.tweens.add({
      targets: flash,
      alpha: peak,
      scale: flash.scale * 1.15,
      duration: PHYSICS.CELEBRATION_FLASH_MS,
      ease: 'Quad.easeOut',
      yoyo: true,
      hold: 60,
      onComplete: () => flash.destroy(),
    });
  }

  // Soft "absorb" flash at the goal when the ball is captured.
  private winFlash(flashColor: number = 0xc9ffd6): void {
    const size = this.goal.radius * 4;
    const flash = this.add
      .image(this.goal.x, this.goal.y, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(flashColor)
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

  // One-shot particle burst at the goal, shaped by the equipped Arrival cosmetic
  // (pattern + colors + count). Auto-destroys so emitters never accumulate.
  private emitGoalBurst(arrival?: ArrivalStyle): void {
    const a: ArrivalStyle = arrival ?? {
      particle: PHYSICS.COLOR_PARTICLE, flash: 0xc9ffd6, count: PHYSICS.PARTICLE_COUNT, pattern: 'burst',
    };
    const count = Math.min(a.count, 44); // stay under the <50-particle ceiling
    const common = { alpha: { start: 1, end: 0 }, tint: a.particle, blendMode: 'ADD' as const, emitting: false };
    let cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;
    switch (a.pattern) {
      case 'implode': // Portal Collapse — particles spawn on a ring and converge inward
        cfg = { ...common, lifespan: 520, scale: { start: 0.85, end: 0 },
          emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 46), quantity: count },
          moveToX: this.goal.x, moveToY: this.goal.y };
        break;
      case 'nova': // big fast explosion
        cfg = { ...common, speed: { min: 90, max: 280 }, lifespan: 720, scale: { start: 1.1, end: 0 } };
        break;
      case 'bolt': // Lightning Strike — fast, mostly-vertical streaks
        cfg = { ...common, speed: { min: 130, max: 330 }, lifespan: 380, angle: { min: 250, max: 290 }, scale: { start: 0.7, end: 0 } };
        break;
      case 'bloom': // Cosmic Bloom — slow, large, lingering flower
        cfg = { ...common, speed: { min: 20, max: 95 }, lifespan: 900, scale: { start: 1.25, end: 0 }, alpha: { start: 0.9, end: 0 } };
        break;
      default: // burst
        cfg = { ...common, speed: { min: 40, max: 150 }, lifespan: 600, scale: { start: 0.9, end: 0 } };
    }
    const emitter = this.add.particles(this.goal.x, this.goal.y, 'spark', cfg);
    emitter.explode(count);
    this.time.delayedCall(950, () => emitter.destroy());
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
      this.triggerDeath('oob');
    }
  }

  // Death: a clear-but-tasteful fail cue (red flash + puff + tone + haptic),
  // then restart the current level.
  private triggerDeath(cause: 'hazard' | 'timeout' | 'oob' = 'hazard'): void {
    if (this.isDying) return;
    this.isDying = true;
    this.leaving = true; // block manual nav during the death → auto-restart window
    StatsStore.recordDeath();
    Analytics.track(levelFail(this.isDaily ? 0 : this.currentLevel, cause));
    // Win-streak momentum: a CAMPAIGN death breaks a live campaign streak — a daily
    // death does NOT (symmetric with the campaign-only win side). A manual restart or
    // leaving the level is a player choice, not a loss — triggerRestart/goHome never
    // call StreakStore.reset(), only this path does. Read the ball→goal distance up
    // front (before anything moves the ball) so a near-goal death is judged on the
    // true distance at the moment of death.
    const distToGoal = distance(this.ball.body.position.x, this.ball.body.position.y, this.goal.x, this.goal.y);
    if (!this.isDaily) {
      const prevStreak = StreakStore.current();
      StreakStore.reset();
      if (prevStreak > 0) Analytics.track(streakBroken(prevStreak));
    }
    const isNearGoal = nearMiss({ outcome: 'death', distToGoal }) === 'near-goal';
    const audio = this.getAudio();
    audio.stopHum();
    audio.playFail();
    this.haptics([...PHYSICS.HAPTIC_DEATH_PATTERN]);
    this.attractor?.destroy();
    this.attractor = null;
    this.cameras.main.shake(PHYSICS.SHAKE_DEATH_MS, PHYSICS.SHAKE_DEATH_INTENSITY);
    // Quick zoom punch for impact on the loss.
    this.tweens.add({ targets: this.cameras.main, zoom: 1.05, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
    this.deathFeedback(isNearGoal);
    // Instant retry: snappy re-spawn (less dead time) so failure keeps flow.
    this.time.delayedCall(PHYSICS.RESTART_DELAY_MS, () =>
      this.scene.restart({ level: this.currentLevel, daily: this.isDaily, dailyIndex: this.dailyIndex, dailyModifier: this.dailyModifier }),
    );
  }

  // Red flash/vignette + a puff of fail-colored particles where the ball was lost.
  // `isNearGoal` layers a brief "SO CLOSE" encouragement on top (near-miss death).
  private deathFeedback(isNearGoal: boolean): void {
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

    // Near-miss encouragement — a death right next to the goal reads as "so
    // close" rather than a plain fail. Kept inside the same snappy
    // RESTART_DELAY_MS window as the rest of this feedback (never blocks or
    // delays the retry); reduced-motion gets a static (no pop-in) version.
    if (isNearGoal) {
      const soClose = this.add
        .text(width / 2, height * 0.4, RETENTION.SO_CLOSE_TEXT, {
          fontFamily: THEME.FONT_DISPLAY,
          fontSize: '15px',
          color: RETENTION.SO_CLOSE_COLOR,
          fontStyle: '700',
        })
        .setOrigin(0.5)
        .setDepth(46);
      if (!reduced) {
        soClose.setScale(0.85).setAlpha(0);
        this.tweens.add({ targets: soClose, scale: 1, alpha: 1, duration: 140, ease: THEME.EASE_POP });
      }
    }
  }

  // Instant restart (keyboard R) - no death animation.
  private triggerRestart(): void {
    if (this.leaving) return;
    this.leaving = true;
    Analytics.track(retryEvent(this.isDaily ? 0 : this.currentLevel));
    this.getAudio().stopHum();
    this.attractor?.destroy();
    this.attractor = null;
    this.scene.restart({ level: this.currentLevel, daily: this.isDaily, dailyIndex: this.dailyIndex, dailyModifier: this.dailyModifier });
  }
}
