// Economy invariant: within each currency, a higher-rarity purchasable cosmetic must
// cost strictly more than every lower-rarity one (Common < Rare < Epic < Legendary <
// Mythic). Guards against pricing regressions. Cross-currency magnitudes are NOT
// compared (Stardust soft vs Fragments premium are different scales).
import { describe, it, expect } from 'vitest';
import { COSMETICS } from './cosmetics';
import { purchaseCost, type Currency } from './cosmeticsLogic';
import { RARITY, type Rarity } from '../config/cosmetics.config';

describe('cosmetic economy pricing', () => {
  const currencies: Currency[] = ['stardust', 'fragments'];

  it.each(currencies)('%s: price strictly increases with rarity', (currency) => {
    const byRarity = new Map<Rarity, number[]>();
    for (const c of COSMETICS) {
      const pc = purchaseCost(c);
      if (!pc || pc.currency !== currency) continue;
      const arr = byRarity.get(c.rarity) ?? [];
      arr.push(pc.cost);
      byRarity.set(c.rarity, arr);
    }
    const tiers = [...byRarity.entries()]
      .map(([rarity, costs]) => ({ rarity, order: RARITY[rarity].order, min: Math.min(...costs), max: Math.max(...costs) }))
      .sort((a, b) => a.order - b.order);
    // Each tier's cheapest item must cost more than the previous tier's most expensive.
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i].min).toBeGreaterThan(tiers[i - 1].max);
    }
  });

  it('every purchasable cosmetic has a positive cost', () => {
    for (const c of COSMETICS) {
      const pc = purchaseCost(c);
      if (pc) expect(pc.cost).toBeGreaterThan(0);
    }
  });
});
