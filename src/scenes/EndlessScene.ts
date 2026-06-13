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
import { generateRun, weekKey, runScore } from '../utils/endless';
import type { RunChunk } from '../config/endless/chunks';
import { fadeToScene } from '../utils/transitions';
import { sharedAudio } from '../utils/AudioSynth';

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

const BEST_KEY = 'gravity-flow:run:best'; // local best until G4 wires Leaderboard

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

  private scoreText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'EndlessScene' });
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

    // Deterministic weekly run; loop the sequence if a run goes extremely long.
    this.run = generateRun(weekKey(new Date()), 400);
    this.filledToY = -40; // first chunk spawns above the star (open runway below)
    this.ensureSpawned();

    this.scoreText = this.add
      .text(this.viewW / 2, 46, '0', {
        fontFamily: THEME.FONT_DISPLAY, fontSize: '30px', color: THEME.TEXT_PRIMARY, fontStyle: '700',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);
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
      if (this.isDead) {
        if (this.canReturn) fadeToScene(this, 'MainMenuScene');
        return;
      }
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

    // Accelerating upward scroll.
    this.elapsed += dt;
    this.scrollSpeed = Math.min(
      PHYSICS.ENDLESS_SCROLL_MAX,
      PHYSICS.ENDLESS_SCROLL_BASE + this.elapsed * PHYSICS.ENDLESS_SCROLL_ACCEL,
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
        if (h.overlaps(bx, by, PHYSICS.BALL_RADIUS)) { this.die(); return; }
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

    // Fell behind the climbing camera → run over.
    if (by > cam.scrollY + this.viewH + PHYSICS.ENDLESS_FALL_MARGIN) { this.die(); return; }

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

    const best = this.loadBest();
    const isBest = this.score > best;
    if (isBest) this.saveBest(this.score);
    this.showRunOver(isBest ? this.score : best, isBest);
  }

  private showRunOver(best: number, isBest: boolean): void {
    const cx = this.viewW / 2;
    const cy = this.viewH / 2;
    const scrim = this.add.graphics().setScrollFactor(0).setDepth(110);
    scrim.fillStyle(0x000000, THEME.SCRIM_ALPHA);
    scrim.fillRect(0, 0, this.viewW, this.viewH);

    const panelW = Math.min(this.viewW * 0.8, 300);
    const panelH = 150;
    const panel = this.add.graphics();
    drawGlass(panel, panelW, panelH, THEME.RADIUS);
    const title = this.add.text(0, -50, 'RUN OVER', {
      fontFamily: THEME.FONT_DISPLAY, fontSize: '20px', color: THEME.TEXT_PRIMARY, fontStyle: '700',
    }).setOrigin(0.5).setLetterSpacing(2);
    const scoreLine = this.add.text(0, -8, `${this.score}`, {
      fontFamily: THEME.FONT_DISPLAY, fontSize: '34px', color: '#ffd166', fontStyle: '700',
    }).setOrigin(0.5);
    const bestLine = this.add.text(0, 30, isBest ? 'NEW BEST!' : `best ${best}`, {
      fontFamily: THEME.FONT_BODY, fontSize: '14px', color: isBest ? '#7affb0' : THEME.TEXT_MUTED, fontStyle: '600',
    }).setOrigin(0.5);
    const tap = this.add.text(0, 56, 'tap to return', {
      fontFamily: THEME.FONT_BODY, fontSize: '12px', color: THEME.TEXT_MUTED,
    }).setOrigin(0.5);
    const card = this.add.container(cx, cy, [panel, title, scoreLine, bestLine, tap])
      .setScrollFactor(0).setDepth(111).setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 320, ease: THEME.EASE_POP });
    this.time.delayedCall(500, () => { this.canReturn = true; });
  }

  private loadBest(): number {
    try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
  }
  private saveBest(v: number): void {
    try { localStorage.setItem(BEST_KEY, String(v)); } catch { /* storage off */ }
  }
}
