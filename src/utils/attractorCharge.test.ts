import { describe, it, expect } from 'vitest';
import { chargeLevel } from './attractorCharge';

describe('chargeLevel', () => {
  it('is 0 at press and 1 at/after full charge', () => {
    expect(chargeLevel(0, 900)).toBe(0);
    expect(chargeLevel(900, 900)).toBe(1);
    expect(chargeLevel(5000, 900)).toBe(1);
  });
  it('is monotonic and eased (smoothstep passes through 0.5 at the midpoint)', () => {
    expect(chargeLevel(450, 900)).toBeCloseTo(0.5, 5);
    expect(chargeLevel(225, 900)).toBeLessThan(chargeLevel(450, 900));
  });
  it('treats a non-positive window as instantly full', () => {
    expect(chargeLevel(0, 0)).toBe(1);
  });
});
