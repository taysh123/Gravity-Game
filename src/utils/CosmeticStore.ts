// Persisted cosmetics (localStorage): which items are owned (across skin / trail /
// arrival) + which is equipped per category. Purchases spend Stardust or Fragments.
// Thin store. v2 migrates the old v1 (skins-only) save so nothing is lost.
import { cosmeticById, cosmeticOr, DEFAULT_IDS, type Cosmetic, type Category } from './cosmetics';
import { purchaseCost } from './cosmeticsLogic';
import { CurrencyStore } from './CurrencyStore';
import { FragmentStore } from './FragmentStore';

interface StoredCosmetics {
  owned: string[];
  equipped: Record<Category, string>;
}

const KEY = 'gravity-flow:cosmetics:v2';
const V1_KEY = 'gravity-flow:cosmetics:v1';

function fresh(): StoredCosmetics {
  return {
    owned: [DEFAULT_IDS.skin, DEFAULT_IDS.trail, DEFAULT_IDS.arrival],
    equipped: { skin: DEFAULT_IDS.skin, trail: DEFAULT_IDS.trail, arrival: DEFAULT_IDS.arrival },
  };
}

let cache: StoredCosmetics | null = null;

// Migrate the v1 save ({ owned: string[], equipped: string }) into v2 — keep all
// previously-owned skins + the equipped skin; seed the default trail + arrival.
function migrateV1(): StoredCosmetics | null {
  try {
    const raw = localStorage.getItem(V1_KEY);
    if (!raw) return null;
    const v1 = JSON.parse(raw) as { owned?: string[]; equipped?: string };
    const s = fresh();
    for (const id of v1.owned ?? []) if (!s.owned.includes(id)) s.owned.push(id);
    if (v1.equipped && cosmeticById(v1.equipped)) s.equipped.skin = v1.equipped;
    return s;
  } catch {
    return null;
  }
}

function load(): StoredCosmetics {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      cache = { ...fresh(), ...(JSON.parse(raw) as StoredCosmetics) };
    } else {
      cache = migrateV1() ?? fresh();
      persist(); // write the v2 record (and the migration result) once
    }
    // Always guarantee the free defaults are owned + a valid equip per category.
    for (const c of Object.values(DEFAULT_IDS)) if (!cache.owned.includes(c)) cache.owned.push(c);
    (Object.keys(DEFAULT_IDS) as Category[]).forEach((cat) => {
      if (!cache!.owned.includes(cache!.equipped[cat])) cache!.equipped[cat] = DEFAULT_IDS[cat];
    });
  } catch {
    cache = fresh();
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

export type BuyResult = 'equipped' | 'bought' | 'cantAfford' | 'locked';

export const CosmeticStore = {
  isOwned(id: string): boolean {
    return load().owned.includes(id);
  },
  equippedId(category: Category = 'skin'): string {
    return load().equipped[category];
  },
  equipped(category: Category = 'skin'): Cosmetic {
    return cosmeticOr(load().equipped[category], category);
  },
  // Equip an owned item (category inferred from the cosmetic).
  equip(id: string): void {
    const c = cosmeticById(id);
    const s = load();
    if (c && s.owned.includes(id)) {
      s.equipped[c.category] = id;
      persist();
    }
  },
  // Grant ownership without spending (bundles, achievements, milestone rewards).
  grant(ids: string[]): void {
    const s = load();
    let changed = false;
    for (const id of ids) {
      if (cosmeticById(id) && !s.owned.includes(id)) {
        s.owned.push(id);
        changed = true;
      }
    }
    if (changed) persist();
  },
  ownedIds(): string[] {
    return [...load().owned];
  },
  // Buy (if affordable) and equip. Returns what happened.
  buyOrEquip(id: string): BuyResult {
    const c = cosmeticById(id);
    if (!c) return 'locked';
    const s = load();
    if (s.owned.includes(id)) {
      s.equipped[c.category] = id;
      persist();
      return 'equipped';
    }
    const price = purchaseCost(c);
    if (!price) return 'locked'; // bundle / achievement only
    const store = price.currency === 'fragments' ? FragmentStore : CurrencyStore;
    if (!store.trySpend(price.cost)) return 'cantAfford';
    s.owned.push(id);
    s.equipped[c.category] = id;
    persist();
    return 'bought';
  },
};
