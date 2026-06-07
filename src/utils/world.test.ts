import { describe, it, expect } from 'vitest';
import { worldOf, worldIndexOf, isWorldStart } from './world';

describe('worldOf', () => {
  it('maps levels to the right world', () => {
    expect(worldOf(1).name).toBe('FOUNDATIONS');
    expect(worldOf(10).name).toBe('FOUNDATIONS');
    expect(worldOf(11).name).toBe('CURRENTS');
    expect(worldOf(21).name).toBe('CLOCKWORK');
    expect(worldOf(70).name).toBe('CONVERGENCE');
  });
  it('falls back to the first world out of range', () => {
    expect(worldOf(0).id).toBe(1);
    expect(worldOf(999).id).toBe(1);
  });
});

describe('worldIndexOf', () => {
  it('returns the world id', () => {
    expect(worldIndexOf(1)).toBe(1);
    expect(worldIndexOf(11)).toBe(2);
    expect(worldIndexOf(63)).toBe(8);
  });
});

describe('isWorldStart', () => {
  it('is true only on a world\'s first level', () => {
    expect(isWorldStart(1)).toBe(true);
    expect(isWorldStart(11)).toBe(true);
    expect(isWorldStart(2)).toBe(false);
    expect(isWorldStart(10)).toBe(false);
  });
});
