import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';
import type { HazardConfig } from '../types';
import { beamActive, orbitPoint } from '../utils/hazardMotion';

type BeamState = 'fire' | 'charge' | 'idle';

// A deadly object — touching it fails the level (GameScene wires overlap →
// triggerDeath). Circle = a pulsing spiked node; rect = a striped danger bar.
// Motion: `to` slides it (sweeping saw); `pivot` orbits it (rotating arm). A rect
// with `pulseMs` becomes a telegraphed laser beam — deadly only part of each cycle.
export class Hazard {
  private cx: number;
  private cy: number;
  private readonly isCircle: boolean;
  private readonly radius: number;
  private readonly hw: number;
  private readonly hh: number;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Image;
  private tween?: Phaser.Tweens.Tween;

  // Rotating arm (pivot orbit).
  private pivotX?: number;
  private pivotY?: number;
  private orbitR = 0;

  // Laser beam (pulse).
  private readonly isBeam: boolean;
  private readonly pulseMs: number;
  private readonly phaseMs: number;
  private beamState: BeamState = 'fire';

  constructor(scene: Phaser.Scene, x: number, y: number, cfg: HazardConfig) {
    this.cx = x;
    this.cy = y;
    this.isCircle = cfg.radius != null;
    this.radius = cfg.radius ?? 0;
    this.hw = (cfg.width ?? 0) / 2;
    this.hh = (cfg.height ?? 0) / 2;
    this.isBeam = cfg.pulseMs != null && cfg.pulseMs > 0;
    this.pulseMs = cfg.pulseMs ?? 0;
    this.phaseMs = cfg.phaseMs ?? 0;

    const glowSize = (this.isCircle ? this.radius * 2 : Math.max(this.hw, this.hh) * 2) + 30;
    this.glow = scene.add
      .image(x, y, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(PHYSICS.COLOR_DEATH)
      .setAlpha(0.3)
      .setDisplaySize(glowSize, glowSize)
      .setDepth(0);
    this.graphics = scene.add.graphics().setDepth(1);
    this.draw(0);
  }

  // Slide between the start and an absolute (toX,toY) on a yoyo loop.
  startMoving(scene: Phaser.Scene, toX: number, toY: number, durationMs: number): void {
    const proxy = { x: this.cx, y: this.cy };
    this.tween = scene.tweens.add({
      targets: proxy,
      x: toX,
      y: toY,
      duration: durationMs,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      onUpdate: () => {
        this.cx = proxy.x;
        this.cy = proxy.y;
        this.glow.setPosition(this.cx, this.cy);
      },
    });
  }

  // Orbit a pivot point — a saw on a sweeping arm. Revolves once per durationMs.
  startOrbiting(scene: Phaser.Scene, pivotX: number, pivotY: number, durationMs: number): void {
    this.pivotX = pivotX;
    this.pivotY = pivotY;
    this.orbitR = Math.hypot(this.cx - pivotX, this.cy - pivotY);
    const base = Math.atan2(this.cy - pivotY, this.cx - pivotX);
    const proxy = { a: 0 };
    this.tween = scene.tweens.add({
      targets: proxy,
      a: Math.PI * 2,
      duration: durationMs,
      ease: 'Linear',
      repeat: -1,
      onUpdate: () => {
        const p = orbitPoint(pivotX, pivotY, this.orbitR, base + proxy.a);
        this.cx = p.x;
        this.cy = p.y;
        this.glow.setPosition(this.cx, this.cy);
      },
    });
  }

  // Overlap test against the ball. A beam only bites while firing.
  overlaps(bx: number, by: number, ballRadius: number): boolean {
    if (this.isBeam && this.beamState !== 'fire') return false;
    if (this.isCircle) {
      return Math.hypot(bx - this.cx, by - this.cy) < this.radius + ballRadius;
    }
    const dx = Math.max(Math.abs(bx - this.cx) - this.hw, 0);
    const dy = Math.max(Math.abs(by - this.cy) - this.hh, 0);
    return Math.hypot(dx, dy) < ballRadius;
  }

  // Called every frame with the raw scene time (ms).
  pulse(timeMs: number): void {
    if (this.isBeam) {
      this.beamState = this.computeBeamState(timeMs);
    }
    this.draw(timeMs / 300);
    if (this.isBeam) {
      const a =
        this.beamState === 'fire'
          ? PHYSICS.BEAM_ALPHA_ACTIVE * 0.5
          : this.beamState === 'charge'
            ? 0.25
            : PHYSICS.BEAM_ALPHA_IDLE;
      this.glow.setAlpha(a);
    } else {
      this.glow.setAlpha(0.25 + 0.12 * Math.sin((timeMs / 300) * 2));
    }
  }

  destroy(): void {
    this.tween?.remove();
    this.graphics.destroy();
    this.glow.destroy();
  }

  private computeBeamState(timeMs: number): BeamState {
    if (beamActive(timeMs, this.pulseMs, this.phaseMs, PHYSICS.BEAM_DUTY)) return 'fire';
    const t = (((timeMs + this.phaseMs) % this.pulseMs) + this.pulseMs) % this.pulseMs;
    // Charging = the tail of the safe window, just before it fires again.
    return t > this.pulseMs * (1 - PHYSICS.BEAM_CHARGE_FRAC) ? 'charge' : 'idle';
  }

  private draw(phase: number): void {
    const g = this.graphics;
    g.clear();
    const c = PHYSICS.COLOR_DEATH;
    const cx = this.cx;
    const cy = this.cy;

    if (this.isBeam) {
      this.drawBeam(g, c);
      return;
    }

    // Rotating arm — faint spoke from the pivot to the saw + a small hub.
    if (this.pivotX != null && this.pivotY != null) {
      g.lineStyle(3, c, PHYSICS.HAZARD_ARM_ALPHA);
      g.beginPath();
      g.moveTo(this.pivotX, this.pivotY);
      g.lineTo(cx, cy);
      g.strokePath();
      g.fillStyle(c, PHYSICS.HAZARD_ARM_ALPHA);
      g.fillCircle(this.pivotX, this.pivotY, 5);
    }

    if (this.isCircle) {
      const r = this.radius;
      const spin = phase * 0.5;
      g.fillStyle(c, 0.9);
      const spikes = 8;
      const base = Math.PI / spikes / 1.3;
      for (let k = 0; k < spikes; k++) {
        const a = spin + (k * Math.PI * 2) / spikes;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * r * 1.45, cy + Math.sin(a) * r * 1.45);
        g.lineTo(cx + Math.cos(a - base) * r * 0.9, cy + Math.sin(a - base) * r * 0.9);
        g.lineTo(cx + Math.cos(a + base) * r * 0.9, cy + Math.sin(a + base) * r * 0.9);
        g.closePath();
        g.fillPath();
      }
      g.fillStyle(c, 0.22);
      g.fillCircle(cx, cy, r);
      g.lineStyle(2.5, c, 0.95);
      g.strokeCircle(cx, cy, r);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(cx, cy, r * 0.18);
    } else {
      const x = cx - this.hw;
      const y = cy - this.hh;
      const w = this.hw * 2;
      const h = this.hh * 2;
      g.fillStyle(c, 0.28);
      g.fillRect(x, y, w, h);
      g.lineStyle(2, c, 0.95);
      g.strokeRect(x, y, w, h);
      g.lineStyle(3, c, 0.8);
      const step = 14;
      for (let sx = x - h; sx < x + w; sx += step) {
        g.beginPath();
        g.moveTo(Math.max(sx, x), y);
        g.lineTo(Math.min(sx + h, x + w), y + h);
        g.strokePath();
      }
    }
  }

  // Laser beam: a dim rail while safe, a brightening telegraph while charging,
  // and a solid deadly bar while firing — always readable, never a surprise.
  private drawBeam(g: Phaser.GameObjects.Graphics, c: number): void {
    const x = this.cx - this.hw;
    const y = this.cy - this.hh;
    const w = this.hw * 2;
    const h = this.hh * 2;
    if (this.beamState === 'fire') {
      g.fillStyle(c, PHYSICS.BEAM_ALPHA_ACTIVE * 0.4);
      g.fillRect(x, y, w, h);
      g.lineStyle(2.5, c, PHYSICS.BEAM_ALPHA_ACTIVE);
      g.strokeRect(x, y, w, h);
      g.fillStyle(0xffffff, 0.85);
      g.fillRect(this.cx - Math.max(this.hw, 2), this.cy - Math.min(this.hh, 1.5), Math.max(w, 4), Math.min(h, 3));
    } else if (this.beamState === 'charge') {
      g.fillStyle(c, 0.16);
      g.fillRect(x, y, w, h);
      g.lineStyle(2, c, 0.6);
      g.strokeRect(x, y, w, h);
    } else {
      // idle rail — thin centre line so the beam's lane stays visible (telegraph).
      g.lineStyle(2, c, PHYSICS.BEAM_ALPHA_IDLE);
      if (w >= h) {
        g.beginPath();
        g.moveTo(x, this.cy);
        g.lineTo(x + w, this.cy);
        g.strokePath();
      } else {
        g.beginPath();
        g.moveTo(this.cx, y);
        g.lineTo(this.cx, y + h);
        g.strokePath();
      }
    }
  }
}
