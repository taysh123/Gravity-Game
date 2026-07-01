import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';
import { FX } from '../config/fx.config';
import { reducedMotionActive } from '../utils/a11y';

const RING_RADIUS = 30;

export class Attractor {
  x: number;
  y: number;
  private phase = 0;
  private spawnT = 1; // 0→1 over SPAWN_PULSE_MS; drives the reach "sonar ping"
  private charge = 0; // 0..1 hold-charge (visual only) — see attractorCharge.ts
  private readonly graphics: Phaser.GameObjects.Graphics;
  private spawnTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.graphics = scene.add.graphics();
    // One-shot ping that expands to the influence radius — shows the reach.
    this.spawnT = 0;
    this.spawnTween = scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: PHYSICS.SPAWN_PULSE_MS,
      ease: 'Cubic.Out',
      onUpdate: (t) => {
        this.spawnT = t.getValue() ?? 1;
      },
    });
    this.draw();
  }

  private draw(): void {
    const beat = Math.sin(this.phase); // ∈ [-1, 1]
    this.graphics.clear();

    // Spawn "sonar ping" — a ring sweeping out to the reach, then gone.
    if (this.spawnT < 1) {
      this.graphics.lineStyle(
        2,
        PHYSICS.COLOR_ATTRACTOR_PULSE,
        (1 - this.spawnT) * PHYSICS.SPAWN_PULSE_ALPHA,
      );
      this.graphics.strokeCircle(this.x, this.y, this.spawnT * PHYSICS.ATTRACTOR_MAX_DIST);
    }

    // Influence boundary — shows the exact reach of the gravity field.
    this.graphics.lineStyle(1, PHYSICS.COLOR_ATTRACTOR, PHYSICS.ATTRACTOR_INFLUENCE_ALPHA);
    this.graphics.strokeCircle(this.x, this.y, PHYSICS.ATTRACTOR_MAX_DIST);
    // Outer pulse ring — expands/contracts to signal the field is live.
    this.graphics.lineStyle(2, PHYSICS.COLOR_ATTRACTOR_PULSE, 0.4 + beat * 0.2);
    this.graphics.strokeCircle(this.x, this.y, RING_RADIUS + 10 + beat * 4);
    // Core ring.
    this.graphics.lineStyle(3, PHYSICS.COLOR_ATTRACTOR, 1);
    this.graphics.strokeCircle(this.x, this.y, RING_RADIUS);
    // Center dot.
    this.graphics.fillStyle(PHYSICS.COLOR_ATTRACTOR_PULSE, 0.8);
    this.graphics.fillCircle(this.x, this.y, 4);

    // Living charge: escalating energy tendrils + a lensing shimmer ring that
    // grow with hold duration (visual only — never touches the force formula).
    const reduced = reducedMotionActive();
    const c = reduced ? Math.min(this.charge, FX.TENDRIL_REDUCED_CAP) : this.charge;
    if (c > 0.01) {
      // Lensing shimmer — a faint ring that tightens + brightens with charge.
      this.graphics.lineStyle(1.5, PHYSICS.COLOR_ATTRACTOR_PULSE, FX.LENS_RING_ALPHA * c);
      this.graphics.strokeCircle(this.x, this.y, FX.LENS_RING_R - c * 8 + beat * 2);
      // Energy tendrils — short arcs around the core, count/alpha rise with charge.
      // Reduced-motion: fixed angles (no phase term) so they hold still, not spin.
      const live = Math.max(1, Math.round(FX.TENDRIL_COUNT * c));
      for (let i = 0; i < live; i++) {
        const ang = reduced
          ? (i / FX.TENDRIL_COUNT) * Math.PI * 2
          : this.phase * 0.6 + (i / FX.TENDRIL_COUNT) * Math.PI * 2;
        const r0 = RING_RADIUS + 6, r1 = r0 + FX.TENDRIL_LEN * c;
        this.graphics.lineStyle(2, PHYSICS.COLOR_ATTRACTOR_PULSE, FX.TENDRIL_ALPHA * c);
        this.graphics.lineBetween(
          this.x + Math.cos(ang) * r0, this.y + Math.sin(ang) * r0,
          this.x + Math.cos(ang) * r1, this.y + Math.sin(ang) * r1,
        );
      }
    }
  }

  // Animate the live pulse. phase is a continuous value (e.g. time/150).
  pulse(phase: number): void {
    this.phase = phase;
    this.draw();
  }

  moveTo(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.draw();
  }

  // Hold-duration charge (0..1, pre-eased by chargeLevel()) — escalates the
  // tendril/lensing visuals. Visual only; does not affect the attractor force.
  setCharge(level01: number): void {
    this.charge = level01 < 0 ? 0 : level01 > 1 ? 1 : level01;
  }

  destroy(): void {
    this.spawnTween?.remove();
    this.graphics.destroy();
  }
}
