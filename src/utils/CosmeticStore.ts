// Persisted cosmetics (localStorage): which ball themes are owned + which is
// equipped. Purchases spend Stardust via CurrencyStore. Thin store.
import { COSMETICS, cosmeticById, type Cosmetic } from './cosmetics';
import { CurrencyStore } from './CurrencyStore';

interface StoredCosmetics {
  owned: string[];
  equipped: string;
}

const KEY = 'gravity-flow:cosmetics:v1';
const EMPTY: StoredCosmetics = { owned: ['default'], equipped: 'default' };

let cache: StoredCosmetics | null = null;

function load(): StoredCosmetics {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as StoredCosmetics) } : { ...EMPTY };
    if (!cache.owned.includes('default')) cache.owned.push('default');
  } catch {
    cache = { owned: ['default'], equipped: 'default' };
  }
  return cache;
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // storage disabled — keep in-memory
  }
}

export type BuyResult = 'equipped' | 'bought' | 'cantAfford';

export const CosmeticStore = {
  isOwned(id: string): boolean {
    return load().owned.includes(id);
  },
  equippedId(): string {
    return load().equipped;
  },
  equipped(): Cosmetic {
    return cosmeticById(load().equipped);
  },
  equip(id: string): void {
    const s = load();
    if (s.owned.includes(id)) {
      s.equipped = id;
      persist();
    }
  },
  // Buy (if needed) and equip. Returns what happened.
  buyOrEquip(id: string): BuyResult {
    const s = load();
    if (s.owned.includes(id)) {
      s.equipped = id;
      persist();
      return 'equipped';
    }
    const cost = (COSMETICS.find((c) => c.id === id)?.cost) ?? 0;
    if (!CurrencyStore.trySpend(cost)) return 'cantAfford';
    s.owned.push(id);
    s.equipped = id;
    persist();
    return 'bought';
  },
};
