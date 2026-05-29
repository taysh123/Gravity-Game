import { describe, it, expect } from 'vitest';
import { normalize, clamp, distance } from './MathUtils';

describe('normalize', () => {
  it('returns a unit vector for (3, 4)', () => {
    const result = normalize(3, 4);
    expect(result.x).toBeCloseTo(0.6);
    expect(result.y).toBeCloseTo(0.8);
  });

  it('returns (0, 0) for a zero vector', () => {
    expect(normalize(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('returns a vector with magnitude 1 for any nonzero input', () => {
    const result = normalize(7, 24);
    const mag = Math.sqrt(result.x ** 2 + result.y ** 2);
    expect(mag).toBeCloseTo(1);
  });
});

describe('clamp', () => {
  it('clamps value above max down to max', () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });

  it('clamps value below min up to min', () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });

  it('returns value unchanged when within range', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it('returns min when value equals min', () => {
    expect(clamp(0, 0, 100)).toBe(0);
  });
});

describe('distance', () => {
  it('calculates distance between two points', () => {
    expect(distance(0, 0, 3, 4)).toBeCloseTo(5);
  });

  it('returns 0 for the same point', () => {
    expect(distance(5, 5, 5, 5)).toBe(0);
  });

  it('is symmetric', () => {
    expect(distance(1, 2, 4, 6)).toBeCloseTo(distance(4, 6, 1, 2));
  });
});
