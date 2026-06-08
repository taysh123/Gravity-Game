import { describe, it, expect } from 'vitest';
import { purchaseCost, collectionProgress, collectionComplete } from './cosmeticsLogic';
import { cosmeticById } from './cosmetics';

describe('purchaseCost', () => {
  it('returns stardust cost for a stardust item', () => {
    expect(purchaseCost(cosmeticById('ember')!)).toEqual({ currency: 'stardust', cost: 40 });
  });
  it('returns fragments cost for a fragments item', () => {
    expect(purchaseCost(cosmeticById('trail_fire')!)).toEqual({ currency: 'fragments', cost: 25 });
  });
  it('returns null for free / bundle / achievement items (not directly purchasable)', () => {
    expect(purchaseCost(cosmeticById('default')!)).toBeNull();
    expect(purchaseCost(cosmeticById('cosmic_blackhole')!)).toBeNull(); // bundle
  });
});

describe('collectionProgress', () => {
  it('counts owned vs total in a collection', () => {
    const p = collectionProgress(['trail_default', 'trail_fire'], 'trails');
    expect(p.total).toBe(6); // default + 5
    expect(p.owned).toBe(2);
  });
  it('ignores owned ids from other collections', () => {
    expect(collectionProgress(['ember', 'mint'], 'trails').owned).toBe(0);
  });
});

describe('collectionComplete', () => {
  it('is true only when every item in the collection is owned', () => {
    const all = ['trail_default', 'trail_fire', 'trail_ice', 'trail_lightning', 'trail_galaxy', 'trail_void'];
    expect(collectionComplete(all, 'trails')).toBe(true);
    expect(collectionComplete(all.slice(0, 5), 'trails')).toBe(false);
  });
});
