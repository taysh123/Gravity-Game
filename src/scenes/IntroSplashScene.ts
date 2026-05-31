import Phaser from 'phaser';
import { IMAGES } from '../config/assets';
import { PHYSICS } from '../config/physics.config';
import { SPLASH } from '../config/splash.config';
import { CosmicBackground } from '../entities/CosmicBackground';
import { AudioSynth } from '../utils/AudioSynth';
import { fadeIn, fadeToScene } from '../utils/transitions';
import { prefersReducedMotion, safeAreaInsetsScaled } from '../utils/a11y';

// Stage 2: cosmic set-piece. The energy sphere (the player ball) crosses the
// screen, is pulled into the vortex (the gameplay goal), and the swirl reveals
// the Gravity Flow logo. Teaches "guide the ball into the target" before play.
const NEXT = 'MainMenuScene';

interface SphereState {
  x: number;
  y: number;
  scale: number;
  visible: boolean;
}

export class IntroSplashScene extends Phaser.Scene {
  private isAdvancing = false;
  private cosmic!: CosmicBackground;
  private audio?: AudioSynth;
  private audioCtx?: AudioContext;

  private sphereGfx!: Phaser.GameObjects.Graphics;
  private trailGfx!: Phaser.GameObjects.Graphics;
  private vortexGfx!: Phaser.GameObjects.Graphics;
  private readonly trail: Array<{ x: number; y: number }> = [];

  private sphere: SphereState = { x: 0, y: 0, scale: 1, visible: false };
  private vortex = { scale: 0, phase: 0, visible: false };
  private cx = 0;
  private cy = 0;

  constructor() {
    super({ key: 'IntroSplashScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.cx = width / 2;
    this.cy = height * 0.5;

    this.cosmic = new CosmicBackground(this);
    fadeIn(this, SPLASH.INTRO_COSMIC_FADE_MS);

    // Draw layers: trail < sphere < vortex < (logo added at reveal).
    this.trailGfx = this.add.graphics().setDepth(5);
    this.sphereGfx = this.add.graphics().setDepth(6);
    this.vortexGfx = this.add.graphics().setDepth(7);

    this.initAudio();

    const sx = this.scale.displaySize.width / this.scale.gameSize.width;
    const sy = this.scale.displaySize.height / this.scale.gameSize.height;
    const insets = safeAreaInsetsScaled(sx, sy);
    this.setupSkip(insets);

    if (prefersReducedMotion()) {
      this.runReducedMotion();
      return;
    }
    this.runSetPiece(width);
  }

  // ── Full cinematic ────────────────────────────────────────────────
  private runSetPiece(width: number): void {
    // Sphere enters off the left edge and curves toward the vortex.
    const p0 = { x: -40, y: this.cy - 130 };
    const p1 = { x: width * 0.4, y: this.cy - 200 }; // bezier control
    const entryAngle = -Math.PI * 0.65;
    const entryRadius = 150;
    const p2 = {
      x: this.cx + Math.cos(entryAngle) * entryRadius,
      y: this.cy + Math.sin(entryAngle) * entryRadius,
    };

    this.sphere = { x: p0.x, y: p0.y, scale: 1, visible: true };
    this.audio?.playWhoosh(SPLASH.INTRO_SPHERE_TRAVEL_MS / 1000);

    // Travel along a quadratic bezier.
    this.tweens.addCounter({
      from: 0,
      to: 1,
      delay: SPLASH.INTRO_SPHERE_DELAY_MS,
      duration: SPLASH.INTRO_SPHERE_TRAVEL_MS,
      ease: 'Sine.InOut',
      onUpdate: (tw) => {
        const u = tw.getValue() ?? 0;
        const inv = 1 - u;
        this.sphere.x = inv * inv * p0.x + 2 * inv * u * p1.x + u * u * p2.x;
        this.sphere.y = inv * inv * p0.y + 2 * inv * u * p1.y + u * u * p2.y;
      },
    });

    // Vortex forms before the sphere arrives.
    this.vortex.visible = true;
    this.tweens.add({
      targets: this.vortex,
      scale: 1,
      delay: SPLASH.INTRO_VORTEX_APPEAR_MS + 800,
      duration: SPLASH.INTRO_VORTEX_APPEAR_MS,
      ease: 'Back.Out',
    });

    // Spiral-in: angle winds inward while radius + scale collapse to the core.
    const spiralStart = SPLASH.INTRO_SPHERE_DELAY_MS + SPLASH.INTRO_SPHERE_TRAVEL_MS;
    const spiral = { ang: entryAngle, rad: entryRadius, sc: 1 };
    this.time.delayedCall(spiralStart, () => {
      this.tweens.add({
        targets: spiral,
        ang: entryAngle + Math.PI * 3.2,
        rad: 4,
        sc: 0.2,
        duration: SPLASH.INTRO_SPIRAL_MS,
        ease: 'Cubic.In',
        onUpdate: () => {
          this.sphere.x = this.cx + Math.cos(spiral.ang) * spiral.rad;
          this.sphere.y = this.cy + Math.sin(spiral.ang) * spiral.rad;
          this.sphere.scale = spiral.sc;
        },
      });
    });

    // Capture → reveal → settle (logo holds before the transition).
    const captureAt = spiralStart + SPLASH.INTRO_SPIRAL_MS;
    this.time.delayedCall(captureAt, () => this.onCapture());
    this.time.delayedCall(
      captureAt + SPLASH.INTRO_REVEAL_MS + SPLASH.INTRO_SETTLE_MS,
      () => this.advance(),
    );
  }

  private onCapture(): void {
    this.sphere.visible = false;
    this.trail.length = 0;
    this.cameras.main.shake(140, 0.005);
    this.audio?.playVortexThoom();

    // Bright implosion flash at the core.
    const flash = this.add
      .image(this.cx, this.cy, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffffff)
      .setDepth(8)
      .setScale(0.2)
      .setAlpha(0.9);
    this.tweens.add({
      targets: flash,
      scale: 2.2,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.Out',
      onComplete: () => flash.destroy(),
    });

    // Collapse the vortex as the logo blooms out of it.
    this.tweens.add({
      targets: this.vortex,
      scale: 0,
      delay: 120,
      duration: SPLASH.INTRO_REVEAL_MS - 120,
      ease: 'Cubic.In',
      onComplete: () => {
        this.vortex.visible = false;
      },
    });

    this.revealLogo();
  }

  private revealLogo(): void {
    const burst = this.add.particles(this.cx, this.cy, 'spark', {
      lifespan: 700,
      speed: { min: 60, max: 220 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      tint: [PHYSICS.COLOR_BALL_GLOW, PHYSICS.COLOR_GOAL],
      emitting: false,
    });
    burst.setDepth(8);
    burst.explode(SPLASH.REVEAL_BURST_COUNT);
    this.time.delayedCall(900, () => burst.destroy());

    this.audio?.playRevealChime();

    const targetW = this.scale.width * SPLASH.INTRO_LOGO_W_RATIO;
    const glow = this.add
      .image(this.cx, this.cy, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(SPLASH.INTRO_GLOW_COLOR)
      .setDepth(9)
      .setAlpha(0)
      .setDisplaySize(targetW * 1.6, targetW * 1.6);

    const logo = this.add.image(this.cx, this.cy, IMAGES.gravityFlowLogo.key).setDepth(10);
    const baseScale = targetW / logo.width;
    logo.setScale(baseScale * 0.8).setAlpha(0);

    this.tweens.add({
      targets: logo,
      alpha: 1,
      scale: baseScale,
      duration: SPLASH.INTRO_REVEAL_MS,
      ease: 'Back.Out',
    });
    this.tweens.add({
      targets: glow,
      alpha: SPLASH.INTRO_GLOW_ALPHA,
      duration: SPLASH.INTRO_REVEAL_MS,
      ease: 'Sine.Out',
    });
  }

  // ── Reduced-motion path ──────────────────────────────────────────
  private runReducedMotion(): void {
    const targetW = this.scale.width * SPLASH.INTRO_LOGO_W_RATIO;
    const logo = this.add.image(this.cx, this.cy, IMAGES.gravityFlowLogo.key).setDepth(10);
    logo.setScale((targetW / logo.width)).setAlpha(0);
    this.audio?.playRevealChime();
    this.tweens.add({
      targets: logo,
      alpha: 1,
      duration: SPLASH.REDUCED_MOTION_FADE_MS,
    });
    this.time.delayedCall(
      SPLASH.REDUCED_MOTION_FADE_MS + SPLASH.REDUCED_MOTION_HOLD_MS,
      () => this.advance(),
    );
  }

  // ── Per-frame redraw of sphere + vortex ──────────────────────────
  update(): void {
    this.cosmic.update();
    this.drawSphere();
    this.drawVortex();
  }

  private drawSphere(): void {
    this.trailGfx.clear();
    this.sphereGfx.clear();
    if (!this.sphere.visible) return;

    // Same trail style as Ball.ts: tapering, fading glow segments.
    this.trail.unshift({ x: this.sphere.x, y: this.sphere.y });
    if (this.trail.length > PHYSICS.TRAIL_LENGTH) this.trail.pop();
    this.trail.forEach((pos, i) => {
      const t = 1 - i / PHYSICS.TRAIL_LENGTH;
      const alpha = t * PHYSICS.TRAIL_MAX_ALPHA;
      const radius = PHYSICS.BALL_RADIUS * t * 0.55 * this.sphere.scale;
      this.trailGfx.fillStyle(PHYSICS.COLOR_BALL_GLOW, alpha);
      this.trailGfx.fillCircle(pos.x, pos.y, radius);
    });

    // Same core + glow ring as Ball.ts.
    const r = PHYSICS.BALL_RADIUS * this.sphere.scale;
    this.sphereGfx.lineStyle(3, PHYSICS.COLOR_BALL_GLOW, 0.35);
    this.sphereGfx.strokeCircle(this.sphere.x, this.sphere.y, r + 7 * this.sphere.scale);
    this.sphereGfx.fillStyle(PHYSICS.COLOR_BALL, 1);
    this.sphereGfx.fillCircle(this.sphere.x, this.sphere.y, r);
  }

  private drawVortex(): void {
    this.vortexGfx.clear();
    if (!this.vortex.visible || this.vortex.scale <= 0.001) return;

    this.vortex.phase += (this.game.loop.delta / 1000) * SPLASH.VORTEX_SPIN_SPEED;
    const s = this.vortex.scale;
    const R = SPLASH.VORTEX_RADIUS * s;
    const beat = Math.sin(this.vortex.phase);
    const g = this.vortexGfx;

    // Dark core — the "black hole".
    g.fillStyle(0x000000, 0.55 * s);
    g.fillCircle(this.cx, this.cy, R * 0.6);
    // Goal-style breathing halo + ring + soft disc + center dot.
    g.lineStyle(2, SPLASH.VORTEX_COLOR, (0.3 + beat * 0.12) * s);
    g.strokeCircle(this.cx, this.cy, R + 12 * s + beat * 4 * s);
    g.lineStyle(3, SPLASH.VORTEX_COLOR, 0.9 * s);
    g.strokeCircle(this.cx, this.cy, R);
    g.fillStyle(SPLASH.VORTEX_COLOR, 0.15 * s);
    g.fillCircle(this.cx, this.cy, R);
    g.fillStyle(SPLASH.VORTEX_COLOR, 0.8 * s);
    g.fillCircle(this.cx, this.cy, 5 * s);
    // Rotating accretion swirl — three arcs winding around the core.
    for (let k = 0; k < 3; k++) {
      const a = this.vortex.phase + (k * Math.PI * 2) / 3;
      g.lineStyle(2, SPLASH.VORTEX_COLOR, 0.4 * s);
      g.beginPath();
      g.arc(this.cx, this.cy, R * 1.35, a, a + 0.9);
      g.strokePath();
    }
  }

  // ── Skip + audio + advance ───────────────────────────────────────
  private initAudio(): void {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new Ctor();
      this.audio = new AudioSynth(this.audioCtx);
      this.audio.resume(); // succeeds only if a prior gesture unlocked audio
    } catch {
      this.audio = undefined;
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      void this.audioCtx?.close();
    });
  }

  private setupSkip(insets: { bottom: number }): void {
    const { width, height } = this.scale;
    const hint = this.add
      .text(width / 2, height - Math.max(SPLASH.SAFE_AREA_MIN_PAD, insets.bottom) - 14, SPLASH.SKIP_HINT_TEXT, {
        fontFamily: SPLASH.FONT,
        fontSize: '13px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setAlpha(0);
    this.tweens.add({
      targets: hint,
      alpha: SPLASH.SKIP_HINT_ALPHA,
      delay: SPLASH.SKIP_HINT_DELAY_MS,
      duration: 400,
    });

    this.input.once('pointerdown', () => {
      this.audio?.resume();
      this.advance(true);
    });
    this.input.keyboard?.once('keydown', () => this.advance(true));
  }

  private advance(skipped = false): void {
    if (this.isAdvancing) return;
    this.isAdvancing = true;
    this.tweens.killAll();
    this.time.removeAllEvents();
    fadeToScene(this, NEXT, undefined, skipped ? SPLASH.SKIP_FADE_MS : SPLASH.SCENE_FADE_MS);
  }
}
