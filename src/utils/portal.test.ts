import { describe, it, expect } from 'vitest';
import { withinMouth, portalExit } from './portal';

describe('withinMouth', () => {
  it('is true at the center and within the radius', () => {
    expect(withinMouth(100, 100, 100, 100, 26)).toBe(true);
    expect(withinMouth(120, 100, 100, 100, 26)).toBe(true); // 20 < 26
  });
  it('is false outside the radius', () => {
    expect(withinMouth(140, 100, 100, 100, 26)).toBe(false); // 40 > 26
  });
});

describe('portalExit', () => {
  it('offsets along the travel direction by clear', () => {
    const out = portalExit({ x: 200, y: 200 }, { x: 0, y: -5 }, 50); // moving up
    expect(out.x).toBeCloseTo(200);
    expect(out.y).toBeCloseTo(150); // 50px up from the exit
  });
  it('normalizes diagonal velocity', () => {
    const out = portalExit({ x: 0, y: 0 }, { x: 3, y: 4 }, 10); // |v|=5
    expect(out.x).toBeCloseTo(6); // 3/5 * 10
    expect(out.y).toBeCloseTo(8); // 4/5 * 10
  });
  it('defaults to straight down when nearly still', () => {
    const out = portalExit({ x: 10, y: 10 }, { x: 0, y: 0 }, 40);
    expect(out).toEqual({ x: 10, y: 50 });
  });
});
