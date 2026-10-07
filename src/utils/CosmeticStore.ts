// Persisted cosmetics (localStorage): which items are owned (across skin / trail /
// arrival) + which is equipped per category. Purchases spend Stardust or Fragments.
// Thin store. v2 migrates the old v1 (skins-only) save so nothing is lost.
//
// Bundle cosmetics (D-09) are NEVER stored here: they are owned exactly while their
// RevenueCat pack entitlement is active in the entitlement snapshot, derived on every
// read (services/entitlements.ts deriveOwnership). A refund removes them and a restore
// brings them back with no extra code path; any bundle id still sitting in the stored
// `owned` list (a pre-D-09 local grant, which migration 2 strips) is ignored. An equipped
// item that is no longer owned reads as the category default; the stored equip is kept,
// so a restore brings it back equipped.
import { cosmeticById, cosmeticOr, DEFAULT_IDS, type Cosmetic, type Category } from './cosmetics';
import { purchaseCost } from './cosmeticsLogic';
import { CurrencyStore } from './CurrencyStore';
import { FragmentStore } from './FragmentStore';
import { Saves } from '../platform/saves';
import { deriveOwnership, isEntitlementCosmetic } from '../services/entitlements';
import { EntitlementStore } from '../services/EntitlementStore';

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
// Saves.hydrate() may restore this key from the Preferences mirror after an early read: drop the cache.
Saves.onRestore(KEY, () => {
  cache = null;
});

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
    // Always guarantee the free defaults are owned + a valid equip per category. A bundle
    // equip is left alone: its ownership depends on the entitlement snapshot, checked on read.
    for (const c of Object.values(DEFAULT_IDS)) if (!cache.owned.includes(c)) cache.owned.push(c);
    (Object.keys(DEFAULT_IDS) as Category[]).forEach((cat) => {
      const id = cache!.equipped[cat];
      if (!isEntitlementCosmetic(id) && !cache!.owned.includes(id)) cache!.equipped[cat] = DEFAULT_IDS[cat];
    });
  } catch {
    cache = fresh();
  }
  return cache;
}

function persist(): void {
  try {
    Saves.write(KEY, JSON.stringify(cache));
  } catch {
    // storage disabled — keep in-memory
  }
}

// The bundle cosmetics the active entitlements derive (read from the snapshot, never stored).
function derivedOwned(): string[] {
  return deriveOwnership(EntitlementStore.read().active).bundleCosmetics;
}

function owns(s: StoredCosmetics, id: string): boolean {
  return isEntitlementCosmetic(id) ? derivedOwned().includes(id) : s.owned.includes(id);
}

export type BuyResult = 'equipped' | 'bought' | 'cantAfford' | 'locked';

export const CosmeticStore = {
  isOwned(id: string): boolean {
    return owns(load(), id);
  },
  // The equipped id, or the category default when it is no longer owned (refund, another account).
  equippedId(category: Category = 'skin'): string {
    const s = load();
    const id = s.equipped[category];
    return owns(s, id) ? id : DEFAULT_IDS[category];
  },
  equipped(category: Category = 'skin'): Cosmetic {
    return cosmeticOr(CosmeticStore.equippedId(category), category);
  },
  // Equip an owned item (category inferred from the cosmetic).
  equip(id: string): void {
    const c = cosmeticById(id);
    const s = load();
    if (c && owns(s, id)) {
      s.equipped[c.category] = id;
      persist();
    }
  },
  // Grant ownership without spending (achievements, milestone rewards). Bundle cosmetics are
  // refused: only an active entitlement grants them (D-09).
  grant(ids: string[]): void {
    const s = load();
    let changed = false;
    for (const id of ids) {
      if (cosmeticById(id) && !isEntitlementCosmetic(id) && !s.owned.includes(id)) {
        s.owned.push(id);
        changed = true;
      }
    }
    if (changed) persist();
  },
  // Stored ownership (bundle ids filtered out) plus the entitlement-derived bundle cosmetics.
  ownedIds(): string[] {
    return [...load().owned.filter((id) => !isEntitlementCosmetic(id)), ...derivedOwned()];
  },
  // Buy (if affordable) and equip. Returns what happened.
  buyOrEquip(id: string): BuyResult {
    const c = cosmeticById(id);
    if (!c) return 'locked';
    const s = load();
    if (owns(s, id)) {
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
