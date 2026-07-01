import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';
import { THEME } from '../config/theme.config';
import { RawMatter } from '../utils/matter';
import { distance, clamp, normalize } from '../utils/MathUtils';
import { CosmicBackground } from '../entities/CosmicBackground';
import { Ball } from '../entities/Ball';
import { Attractor } from '../entities/Attractor';
import { Hazard } from '../entities/Hazard';
import { Obstacle } from '../entities/Obstacle';
import { GravityZone } from '../entities/GravityZone';
import { Magnet } from '../entities/Magnet';
import { Collectible } from '../entities/Collectible';
import { drawGlass } from '../ui/glass';
import { generateRun, weekKey, runScore, stardustForRun } from '../utils/endless';
import type { RunChunk } from '../config/endless/chunks';
import { fadeToScene } from '../utils/transitions';
import { sharedAudio } from '../utils/AudioSynth';
import { CurrencyStore } from '../utils/CurrencyStore';
import { Leaderboard } from '../utils/Leaderboard';
import { Ads } from '../utils/Ads';
import { Share } from '../utils/Share';
import { dateKey } from '../utils/daily';
import { Analytics } from '../utils/Analytics';
import { rewardedOffered } from '../utils/analyticsEvents';

// A live (spawned) chunk: its world-Y extent + the entities to pulse/cull.
interface LiveChunk {
  topY: number;
  bottomY: number;
  hazards: Hazard[];
  zones: GravityZone[];
  magnets: Magnet[];
  stars: Collectible[];
  obstacles: Obstacle[];
  bodies: MatterJS.BodyType[]; // obstacle Matter bodies to remove on cull
}

// GRAVITY RUN — the endless flagship. The camera auto-pans UP at an accelerating
// speed; the player keeps the star above the bottom edge with the attractor while
// dodging a seeded sequence of handcrafted chunks. One death (fall behind / hazard)
// ends the run. Entities are placed at fixed world coords and the CAMERA scrolls,
// so every campaign entity is reused as-is. (G2 prototype — feel tuning to follow.)
export class EndlessScene extends Phaser.Scene {
  private cosmic!: CosmicBackground;
  private ball!: Ball;
  private attractor: Attractor | null = null;

  private run: RunChunk[] = [];
  private runIndex = 0;
  private live: LiveChunk[] = [];
  private filledToY = 0;

  private playX = 15;
  private viewW = 390;
  private viewH = 844;
  private startScrollY = 0;
  private scrollSpeed: number = PHYSICS.ENDLESS_SCROLL_BASE;
  private elapsed = 0;

  private leftWall!: MatterJS.BodyType;
  private rightWall!: MatterJS.BodyType;

  private starsCollected = 0;
  private score = 0;
  private isDead = false;
  private canReturn = false;
  private revived = false;
  private invulnUntil = 0;
  private awardedStardust = 0;
  private runWeek = '';
  private mode: 'endless' | 'weekly' = 'endless';
  private overlay: Phaser.GameObjects.GameObject[] = [];
  private overlayActions: Phaser.GameObjects.GameObject[] = [];

  private scoreText!: Phaser.GameObjects.Text;
  private coachText?: Phaser.GameObjects.Text;

  private get ballHomeX(): number {
    return this.playX + PHYSICS.PLAY_WIDTH / 2;
  }

  constructor() {
    super({ key: 'EndlessScene' });
  }

  init(data: { mode?: 'endless' | 'weekly' }): void {
    this.mode = data?.mode === 'weekly' ? 'weekly' : 'endless';
  }

  create(): void {
    this.viewW = this.scale.width;
    this.viewH = this.scale.height;
    this.playX = Math.round((this.viewW - PHYSICS.PLAY_WIDTH) / 2);
    this.isDead = false;
    this.canReturn = false;
    this.live = [];
    this.runIndex = 0;
    this.starsCollected = 0;
    this.score = 0;
    this.scrollSpeed = PHYSICS.ENDLESS_SCROLL_BASE;
    this.elapsed = 0;
    this.attractor = null;
    this.matter.world.enabled = true;
    this.revived = false;
    this.invulnUntil = this.time.now + PHYSICS.ENDLESS_START_INVULN_MS; // spawn grace
    this.awardedStardust = 0;
    this.overlay = [];
    this.overlayActions = [];

    this.cosmic = new CosmicBackground(this);
    this.cosmic.setScrollFactor(0); // backdrop pinned to the screen

    // Camera starts with the star ~72% down the screen; climbing moves it up.
    const ballX = this.playX + PHYSICS.PLAY_WIDTH / 2;
    this.startScrollY = -this.viewH * 0.72;
    this.cameras.main.setScroll(0, this.startScrollY);

    this.ball = new Ball(this, ballX, 0);
    this.ball.graphics.setDepth(5); // above hazard/gem graphics

    this.createSideWalls();
    this.setupInput();

    // Weekly Challenge = the shared weekly seed (a fair, everyone-gets-the-same-run
    // leaderboard). Endless = a fresh random seed each attempt, so every run differs.
    this.runWeek = weekKey(new Date());
    const seed = this.mode === 'weekly' ? this.runWeek : `e${(Math.random() * 1e9) | 0}`;
    this.run = generateRun(seed, 400);
    this.filledToY = -40; // first chunk spawns above the star (open runway below)
    this.ensureSpawned();

    this.scoreText = this.add
      .text(this.viewW / 2, 46, '0', {
        fontFamily: THEME.FONT_DISPLAY, fontSize: '30px', color: THEME.TEXT_PRIMARY, fontStyle: '700',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);

    this.maybeShowCoach();
  }

  // One-time coach hint on the player's first run (either mode). Dismissed on the
  // first press or after a few seconds; persisted so it never nags again.
  private maybeShowCoach(): void {
    let seen = false;
    try { seen = localStorage.getItem('gravity-flow:run:coached') === '1'; } catch { /* storage off */ }
    if (seen) return;
    this.coachText = this.add
      .text(this.viewW / 2, this.viewH * 0.4, 'Hold to pull the star upward\nKeep it above the bottom edge', {
        fontFamily: THEME.FONT_BODY, fontSize: '15px', color: THEME.TEXT_PRIMARY, align: 'center', fontStyle: '600',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setAlpha(0.92);
    try { localStorage.setItem('gravity-flow:run:coached', '1'); } catch { /* storage off */ }
    this.time.delayedCall(4200, () => this.dismissCoach());
  }

  private dismissCoach(): void {
    if (!this.coachText) return;
    const c = this.coachText;
    this.coachText = undefined;
    this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => c.destroy() });
  }

  // Two tall static side walls, repositioned each frame to span the current view.
  private createSideWalls(): void {
    const t = PHYSICS.WALL_THICKNESS;
    const h = this.viewH * 2;
    const opts = { isStatic: true, restitution: PHYSICS.WALL_RESTITUTION, friction: 0, label: 'wall' };
    const leftX = this.playX - t / 2;
    const rightX = this.playX + PHYSICS.PLAY_WIDTH + t / 2;
    const midY = this.startScrollY + this.viewH / 2;
    this.leftWall = this.matter.add.rectangle(leftX, midY, t, h, opts);
    this.rightWall = this.matter.add.rectangle(rightX, midY, t, h, opts);
  }

  private setupInput(): void {
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.isDead) return; // the run-over overlay's scrim handles "tap to return"
      this.dismissCoach();
      const audio = this.getAudio();
      audio.resume();
      audio.playGravityActivate();
      audio.startHum();
      this.attractor?.destroy();
      this.attractor = new Attractor(this, p.worldX, p.worldY);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown && !this.isDead) this.attractor?.moveTo(p.worldX, p.worldY);
    });
    this.input.on('pointerup', () => {
      this.getAudio().stopHum();
      this.attractor?.destroy();
      this.attractor = null;
    });
  }

  private getAudio() {
    return sharedAudio(); // shared singleton, same as GameScene
  }

  update(time: number, delta: number): void {
    this.cosmic.update();
    if (this.isDead) return;
    const dt = delta / 1000;

    // Upward scroll: hold the base speed through the onboarding window, then ramp.
    this.elapsed += dt;
    const rampSec = Math.max(0, this.elapsed - PHYSICS.ENDLESS_ONBOARD_MS / 1000);
    this.scrollSpeed = Math.min(
      PHYSICS.ENDLESS_SCROLL_MAX,
      PHYSICS.ENDLESS_SCROLL_BASE + rampSec * PHYSICS.ENDLESS_SCROLL_ACCEL,
    );
    const cam = this.cameras.main;
    cam.scrollY -= this.scrollSpeed * dt;

    // Keep the side walls spanning the view.
    const midY = cam.scrollY + this.viewH / 2;
    RawMatter.Body.setPosition(this.leftWall, { x: this.leftWall.position.x, y: midY });
    RawMatter.Body.setPosition(this.rightWall, { x: this.rightWall.position.x, y: midY });

    this.applyAttractorForce();
    this.applyZoneForces();
    this.applyMagnetForces();

    this.ball.update();
    this.attractor?.pulse(time / 150);

    const bx = this.ball.body.position.x;
    const by = this.ball.body.position.y;
    for (const ch of this.live) {
      ch.zones.forEach((z) => z.pulse(time / 600));
      ch.magnets.forEach((m) => m.pulse(time / 600));
      for (const h of ch.hazards) {
        h.pulse(time);
        if (time > this.invulnUntil && h.overlaps(bx, by, PHYSICS.BALL_RADIUS)) { this.die(); return; }
      }
      for (const s of ch.stars) {
        s.pulse(time / 300);
        if (!s.collected && s.overlaps(bx, by, PHYSICS.BALL_RADIUS)) {
          s.collect(this);
          this.getAudio().playGem();
          this.starsCollected++;
        }
      }
    }

    this.ensureSpawned();
    this.cull(cam);

    // Fell behind the climbing camera → run over (ignored during revive invuln).
    if (time > this.invulnUntil && by > cam.scrollY + this.viewH + PHYSICS.ENDLESS_FALL_MARGIN) { this.die(); return; }

    this.score = runScore(this.startScrollY - cam.scrollY, this.starsCollected);
    this.scoreText.setText(`${this.score}`);
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
    RawMatter.Body.applyForce(this.ball.body, this.ball.body.position, { x: dir.x * mag, y: dir.y * mag });
  }

  private applyZoneForces(): void {
    const bx = this.ball.body.position.x;
    const by = this.ball.body.position.y;
    for (const ch of this.live) {
      for (const z of ch.zones) {
        if (z.contains(bx, by)) RawMatter.Body.applyForce(this.ball.body, this.ball.body.position, z.force);
      }
    }
  }

  private applyMagnetForces(): void {
    const bx = this.ball.body.position.x;
    const by = this.ball.body.position.y;
    for (const ch of this.live) {
      for (const m of ch.magnets) {
        const rawDist = distance(bx, by, m.x, m.y);
        if (rawDist > m.maxDist) continue;
        const dist = clamp(rawDist, PHYSICS.MAGNET_MIN_DIST, Infinity);
        const dir = normalize(m.x - bx, m.y - by);
        const mag = m.strength / (dist * dist);
        RawMatter.Body.applyForce(this.ball.body, this.ball.body.position, { x: dir.x * mag, y: dir.y * mag });
      }
    }
  }

  // Fill chunks upward until the view top is covered by SPAWN_AHEAD.
  private ensureSpawned(): void {
    const cam = this.cameras.main;
    while (this.filledToY > cam.scrollY - PHYSICS.ENDLESS_SPAWN_AHEAD) {
      const chunk = this.run[this.runIndex % this.run.length];
      this.runIndex++;
      const topY = this.filledToY - chunk.height;
      this.spawnChunk(chunk, topY);
      this.filledToY = topY;
    }
  }

  private spawnChunk(chunk: RunChunk, topY: number): void {
    const ox = this.playX;
    const live: LiveChunk = { topY, bottomY: topY + chunk.height, hazards: [], zones: [], magnets: [], stars: [], obstacles: [], bodies: [] };
    (chunk.obstacles ?? []).forEach((o) => {
      const obs = new Obstacle(this, ox + o.x, topY + o.y, o.width, o.height, o.angle);
      live.obstacles.push(obs);
      live.bodies.push(obs.body);
    });
    (chunk.gravityZones ?? []).forEach((z) => live.zones.push(new GravityZone(this, ox + z.x, topY + z.y, z)));
    (chunk.magnets ?? []).forEach((m) => live.magnets.push(new Magnet(this, ox + m.x, topY + m.y, m)));
    (chunk.hazards ?? []).forEach((h) => {
      const hz = new Hazard(this, ox + h.x, topY + h.y, h);
      if (h.to && h.durationMs) hz.startMoving(this, ox + h.to.x, topY + h.to.y, h.durationMs);
      live.hazards.push(hz);
    });
    (chunk.stars ?? []).forEach((s) => live.stars.push(new Collectible(this, ox + s.x, topY + s.y)));
    this.live.push(live);
  }

  // Destroy chunks fully below the view bottom (free graphics + Matter bodies).
  private cull(cam: Phaser.Cameras.Scene2D.Camera): void {
    const limit = cam.scrollY + this.viewH + PHYSICS.ENDLESS_CULL_MARGIN;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const ch = this.live[i];
      if (ch.topY <= limit) continue; // still on/near screen
      ch.hazards.forEach((h) => h.destroy());
      ch.zones.forEach((z) => z.destroy());
      ch.magnets.forEach((m) => m.destroy());
      ch.stars.forEach((s) => s.destroy());
      ch.obstacles.forEach((o) => o.destroy());
      ch.bodies.forEach((b) => this.matter.world.remove(b));
      this.live.splice(i, 1);
    }
  }

  private die(): void {
    if (this.isDead) return;
    this.isDead = true;
    const audio = this.getAudio();
    audio.stopHum();
    audio.playFail();
    this.attractor?.destroy();
    this.attractor = null;
    this.matter.world.enabled = false;
    this.cameras.main.shake(PHYSICS.SHAKE_DEATH_MS, PHYSICS.SHAKE_DEATH_INTENSITY);

    // Award Stardust (cosmetic economy only). Submit to the weekly board ONLY for a
    // clean (non-revived) run, so a rewarded revive can't buy a leaderboard score.
    this.awardedStardust = stardustForRun(this.score);
    if (this.awardedStardust > 0) CurrencyStore.add(this.awardedStardust);

    let best: number;
    let isBest: boolean;
    if (this.mode === 'weekly') {
      // Ranked weekly board — a revive must not buy a score, so don't post revived runs.
      if (!this.revived) {
        Leaderboard.submitRun({ week: this.runWeek, score: this.score, date: dateKey(new Date()) });
      }
      best = Leaderboard.bestRun(this.runWeek);
      isBest = !this.revived && this.score > 0 && this.score >= best;
    } else {
      // Endless — a personal all-time best (random runs aren't globally rankable).
      const prev = Leaderboard.bestEndless();
      best = Leaderboard.submitEndless(this.score);
      isBest = this.score > 0 && this.score > prev;
    }
    this.showRunOver(best, isBest);
  }

  // Instant restart of the same mode — the core "one more try" loop.
  private retry(): void {
    this.scene.restart({ mode: this.mode });
  }

  private showRunOver(best: number, isBest: boolean): void {
    const cx = this.viewW / 2;
    const cy = this.viewH / 2;
    const scrim = this.add.graphics().setScrollFactor(0).setDepth(110);
    scrim.fillStyle(0x000000, THEME.SCRIM_ALPHA);
    scrim.fillRect(0, 0, this.viewW, this.viewH);
    scrim.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.viewW, this.viewH), Phaser.Geom.Rectangle.Contains);
    scrim.on('pointerup', () => { if (this.canReturn) fadeToScene(this, 'MainMenuScene'); });

    const panelW = Math.min(this.viewW * 0.8, 300);
    const panelH = 150;
    const panel = this.add.graphics();
    drawGlass(panel, panelW, panelH, THEME.RADIUS);
    const title = this.add.text(0, -52, 'RUN OVER', {
      fontFamily: THEME.FONT_DISPLAY, fontSize: '20px', color: THEME.TEXT_PRIMARY, fontStyle: '700',
    }).setOrigin(0.5).setLetterSpacing(2);
    const scoreLine = this.add.text(0, -12, `${this.score}`, {
      fontFamily: THEME.FONT_DISPLAY, fontSize: '34px', color: '#ffd166', fontStyle: '700',
    }).setOrigin(0.5);
    const sub = this.add.text(0, 26, isBest ? 'NEW BEST!' : `best ${best}`, {
      fontFamily: THEME.FONT_BODY, fontSize: '14px', color: isBest ? '#7affb0' : THEME.TEXT_MUTED, fontStyle: '600',
    }).setOrigin(0.5);
    const cardChildren: Phaser.GameObjects.GameObject[] = [panel, title, scoreLine, sub];
    if (this.awardedStardust > 0) {
      cardChildren.push(this.add.text(0, 50, `+${this.awardedStardust} ✦`, {
        fontFamily: THEME.FONT_BODY, fontSize: '13px', color: '#ffd166', fontStyle: '700',
      }).setOrigin(0.5));
    }
    const card = this.add.container(cx, cy, cardChildren).setScrollFactor(0).setDepth(111).setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 320, ease: THEME.EASE_POP });

    const actions: Phaser.GameObjects.GameObject[] = [];
    let ay = cy + panelH / 2 + 30;
    // RETRY first — instant restart of the same mode (the "one more try" loop).
    actions.push(this.pill('↻ RETRY', '#ffffff', 0xffd166, 168, cx, ay, () => this.retry()));
    ay += 50;
    if (!this.revived) {
      Analytics.track(rewardedOffered('endless_revive')); // offer impression, fires once on render
      actions.push(this.pill('▶ REVIVE', '#7affb0', 0x7affb0, 168, cx, ay, () => void this.tryRevive()));
      ay += 50;
    }
    const hasDouble = this.awardedStardust > 0;
    actions.push(this.pill('SHARE', '#cfe0ff', 0x6a8cff, 124, hasDouble ? cx - 68 : cx, ay, () => this.shareRun()));
    if (hasDouble) {
      Analytics.track(rewardedOffered('endless_2x')); // offer impression, fires once on render
      actions.push(this.pill('▶ 2× ✦', '#ffd166', 0xffd166, 124, cx + 68, ay, (self) => void this.tryDouble(self)));
    }
    ay += 46;
    actions.push(
      this.add.text(cx, ay, 'tap to return', {
        fontFamily: THEME.FONT_BODY, fontSize: '12px', color: THEME.TEXT_MUTED,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(112),
    );

    this.overlayActions = actions;
    this.overlay = [scrim, card, ...actions];
    this.time.delayedCall(500, () => { this.canReturn = true; });
  }

  // A small glass action pill. `width` lets the secondary row fit two side-by-side.
  private pill(
    label: string, colorHex: string, accent: number, width: number, x: number, y: number,
    onTap: (self: Phaser.GameObjects.Container) => void,
  ): Phaser.GameObjects.Container {
    const h = 42;
    const bg = this.add.graphics();
    drawGlass(bg, width, h, h / 2);
    bg.lineStyle(2, accent, 0.6);
    bg.strokeRoundedRect(-width / 2, -h / 2, width, h, h / 2);
    const txt = this.add.text(0, 0, label, {
      fontFamily: THEME.FONT_DISPLAY, fontSize: '15px', color: colorHex, fontStyle: '700',
    }).setOrigin(0.5);
    const c = this.add.container(x, y, [bg, txt]).setScrollFactor(0).setDepth(112);
    c.setSize(width, h);
    c.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -h / 2, width, h), Phaser.Geom.Rectangle.Contains);
    c.on('pointerup', () => onTap(c));
    return c;
  }

  private async tryRevive(): Promise<void> {
    const earned = await Ads.showRewarded('endless_revive');
    if (earned) this.doRevive();
  }

  // Clear the immediate threats, recentre the star, grant brief invulnerability, and
  // resume. One revive per run; revived runs don't post to the weekly board.
  private doRevive(): void {
    this.overlay.forEach((o) => o.destroy());
    this.overlay = [];
    this.overlayActions = [];
    this.revived = true;
    for (const ch of this.live) { ch.hazards.forEach((hz) => hz.destroy()); ch.hazards = []; }
    const cam = this.cameras.main;
    RawMatter.Body.setPosition(this.ball.body, { x: this.ballHomeX, y: cam.scrollY + this.viewH * 0.45 });
    RawMatter.Body.setVelocity(this.ball.body, { x: 0, y: 0 });
    this.invulnUntil = this.time.now + 1500;
    this.isDead = false;
    this.canReturn = false;
    this.matter.world.enabled = true;
  }

  private async tryDouble(btn: Phaser.GameObjects.Container): Promise<void> {
    const earned = await Ads.showRewarded('endless_2x');
    if (!earned) return;
    CurrencyStore.add(this.awardedStardust);
    const txt = btn.list.find((o) => o instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text | undefined;
    txt?.setText('✦ ×2!');
    btn.disableInteractive();
  }

  private shareRun(): void {
    const text = `I climbed to ${this.score} in GRAVITY RUN 🌌 — can you beat it?`;
    const setVis = (vis: boolean) =>
      this.overlayActions.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(vis));
    setVis(false);
    this.snapshotBlob((blob) => {
      setVis(true);
      void Share.shareCard(blob, text);
    });
  }

  // Grab the current frame as a PNG blob (WebGL-safe via renderer.snapshot → 2D canvas).
  private snapshotBlob(cb: (b: Blob | null) => void): void {
    const renderer = this.game.renderer as unknown as { snapshot?: (c: (img: unknown) => void) => void };
    if (!renderer.snapshot) { cb(null); return; }
    renderer.snapshot((img) => {
      try {
        const image = img as HTMLImageElement;
        const canvas = document.createElement('canvas');
        canvas.width = this.game.canvas.width;
        canvas.height = this.game.canvas.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { cb(null); return; }
        ctx.drawImage(image, 0, 0);
        canvas.toBlob((b) => cb(b), 'image/png');
      } catch { cb(null); }
    });
  }
}
