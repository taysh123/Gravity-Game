// Pure hazard-motion helpers (no Phaser/Matter) so they're testable. Used by the
// Hazard entity for the two "alive" danger archetypes:
//  - pulsing laser beam: deadly only during the first `duty` fraction of each cycle
//  - rotating arm: a saw orbiting a pivot point
import type { Vec2 } from '../types';

// True while the beam is firing (deadly). `pulseMs` is the full on+off period;
// `phaseMs` offsets the cycle (so beams can alternate). pulseMs <= 0 => always on
// (i.e. a normal, non-pulsing hazard).
export function beamActive(timeMs: number, pulseMs: number, phaseMs: number, duty: number): boolean {
  if (pulseMs <= 0) return true;
  const t = (((timeMs + phaseMs) % pulseMs) + pulseMs) % pulseMs;
  return t < pulseMs * duty;
}

// Point on a circle of `radius` around (px,py) at `angle` radians.
export function orbitPoint(px: number, py: number, radius: number, angle: number): Vec2 {
  return { x: px + Math.cos(angle) * radius, y: py + Math.sin(angle) * radius };
}
