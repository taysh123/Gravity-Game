import { describe, it, expect } from 'vitest';
import { downsamplePath } from './ghost';

const mk = (n: number) => Array.from({ length: n }, (_, i) => ({ x: i, y: i }));

describe('downsamplePath', () => {
  it('returns a copy unchanged when already at/under the cap', () => {
    const p = mk(5);
    const out = downsamplePath(p, 10);
    expect(out).toEqual(p);
    expect(out).not.toBe(p); // copy, not the same reference
  });
  it('reduces a long path to exactly maxPoints', () => {
    const out = downsamplePath(mk(1000), 80);
    expect(out.length).toBe(80);
  });
  it('always keeps the first and last point', () => {
    const out = downsamplePath(mk(1000), 50);
    expect(out[0]).toEqual({ x: 0, y: 0 });
    expect(out[out.length - 1]).toEqual({ x: 999, y: 999 });
  });
  it('degenerate caps return a copy', () => {
    expect(downsamplePath(mk(10), 1).length).toBe(10);
  });
});
