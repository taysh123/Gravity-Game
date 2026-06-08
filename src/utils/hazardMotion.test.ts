import { describe, it, expect } from 'vitest';
import { beamActive, orbitPoint } from './hazardMotion';

describe('beamActive', () => {
  // pulse 1000ms, duty 0.5 -> deadly for the first 500ms of each cycle.
  it('is deadly during the first duty-fraction of the cycle', () => {
    expect(beamActive(0, 1000, 0, 0.5)).toBe(true);
    expect(beamActive(499, 1000, 0, 0.5)).toBe(true);
  });
  it('is safe during the rest of the cycle', () => {
    expect(beamActive(500, 1000, 0, 0.5)).toBe(false);
    expect(beamActive(999, 1000, 0, 0.5)).toBe(false);
  });
  it('wraps across cycles', () => {
    expect(beamActive(1200, 1000, 0, 0.5)).toBe(true);  // 200 into cycle 2
    expect(beamActive(1700, 1000, 0, 0.5)).toBe(false); // 700 into cycle 2
  });
  it('honors a phase offset (choreographed alternation)', () => {
    // phase 500 shifts the window: t=0 lands at 500 -> safe.
    expect(beamActive(0, 1000, 500, 0.5)).toBe(false);
    expect(beamActive(500, 1000, 500, 0.5)).toBe(true);
  });
  it('is always deadly when pulseMs is not positive (a normal hazard)', () => {
    expect(beamActive(123, 0, 0, 0.5)).toBe(true);
  });
});

describe('orbitPoint', () => {
  it('places the point at the given angle and radius around the pivot', () => {
    const p = orbitPoint(100, 100, 50, 0);
    expect(p.x).toBeCloseTo(150);
    expect(p.y).toBeCloseTo(100);
    const q = orbitPoint(100, 100, 50, Math.PI / 2);
    expect(q.x).toBeCloseTo(100);
    expect(q.y).toBeCloseTo(150);
  });
});
