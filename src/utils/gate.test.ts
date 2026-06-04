import { describe, it, expect } from 'vitest';
import { gateOpen } from './gate';

const UP = { x: 0, y: -1 }; // allowed direction = upward

describe('gateOpen', () => {
  it('opens when moving along the allowed direction', () => {
    expect(gateOpen({ x: 0, y: -5 }, UP, 0.1)).toBe(true);
  });
  it('stays solid when moving against it', () => {
    expect(gateOpen({ x: 0, y: 5 }, UP, 0.1)).toBe(false);
  });
  it('stays solid when nearly still', () => {
    expect(gateOpen({ x: 0, y: 0 }, UP, 0.1)).toBe(false);
    expect(gateOpen({ x: 0, y: -0.05 }, UP, 0.1)).toBe(false); // below threshold
  });
  it('uses the velocity component along the direction (diagonal)', () => {
    // moving up-right, gate allows up -> component along up is +3 -> open
    expect(gateOpen({ x: 4, y: -3 }, UP, 0.1)).toBe(true);
    // moving right only, gate allows up -> component along up is 0 -> solid
    expect(gateOpen({ x: 5, y: 0 }, UP, 0.1)).toBe(false);
  });
  it('works for a rightward gate', () => {
    const RIGHT = { x: 1, y: 0 };
    expect(gateOpen({ x: 4, y: 0 }, RIGHT, 0.1)).toBe(true);
    expect(gateOpen({ x: -4, y: 0 }, RIGHT, 0.1)).toBe(false);
  });
});
