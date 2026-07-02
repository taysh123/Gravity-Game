import { describe, it, expect } from 'vitest';
import { canAffordAnyUnowned, nudgeDue } from './storeNudge';

describe('canAffordAnyUnowned', () => {
  const cosmetics = [
    { id: 'ember', cost: 40, currency: 'stardust' },
    { id: 'ion', cost: 70, currency: 'stardust' },
    { id: 'trail_fire', cost: 25, currency: 'fragments' },
  ];

  it('is true when an unowned Stardust item costs exactly the balance (boundary)', () => {
    expect(canAffordAnyUnowned(40, cosmetics, new Set())).toBe(true);
  });

  it('is false when the cheapest unowned Stardust item costs one more than the balance', () => {
    expect(canAffordAnyUnowned(39, cosmetics, new Set())).toBe(false);
  });

  it('ignores an item the player already owns, even if it would be affordable', () => {
    expect(canAffordAnyUnowned(40, cosmetics, new Set(['ember']))).toBe(false);
  });

  it('ignores Fragments-priced items even when the cost is within the Stardust balance', () => {
    expect(canAffordAnyUnowned(25, [cosmetics[2]], new Set())).toBe(false);
  });

  it('is false for an empty catalog', () => {
    expect(canAffordAnyUnowned(9999, [], new Set())).toBe(false);
  });

  it('is true when a pricier unowned item is affordable even if a cheaper one is owned', () => {
    expect(canAffordAnyUnowned(70, cosmetics, new Set(['ember']))).toBe(true);
  });
});

describe('nudgeDue', () => {
  it('is true exactly at the cooldown boundary', () => {
    expect(nudgeDue(6, 6)).toBe(true);
  });

  it('is false one win short of the cooldown boundary', () => {
    expect(nudgeDue(5, 6)).toBe(false);
  });

  it('is true comfortably past the cooldown boundary', () => {
    expect(nudgeDue(20, 6)).toBe(true);
  });

  it('is true immediately when the cooldown is zero', () => {
    expect(nudgeDue(0, 0)).toBe(true);
  });
});
