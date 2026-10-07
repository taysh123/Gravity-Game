import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Entitlement } from '../services/entitlements';

// Review fix M9 (P00-T16, D-09): CosmeticStore's derived-ownership paths. Bundle cosmetics are owned exactly while
// their pack entitlement is active in the snapshot; they are never stored, and a stored copy (a pre-D-09 local grant)
// is ignored. The real modules run on an in-memory localStorage (Saves is a plain passthrough on web).

const KEY = 'gravity-flow:cosmetics:v2';
const DEFAULTS = { skin: 'default', trail: 'trail_default', arrival: 'arrival_default' };

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
}

let ls: ReturnType<typeof memoryStorage>;

beforeEach(() => {
  ls = memoryStorage();
  vi.stubGlobal('localStorage', ls);
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function load(stored?: { owned: string[]; equipped?: Record<string, string> }) {
  if (stored) ls.setItem(KEY, JSON.stringify({ owned: stored.owned, equipped: stored.equipped ?? DEFAULTS }));
  const { CosmeticStore } = await import('./CosmeticStore');
  const { EntitlementStore } = await import('../services/EntitlementStore');
  const entitle = (active: Entitlement[]) => EntitlementStore.write({ v: 1, active, at: 1, pending: [] });
  const stored$ = () => JSON.parse(ls.getItem(KEY) ?? 'null') as { owned: string[]; equipped: Record<string, string> };
  return { CosmeticStore, entitle, stored: stored$ };
}

describe('CosmeticStore derived ownership (M9)', () => {
  it('isOwned: a bundle item is owned only while its entitlement is active; a stored copy is ignored', async () => {
    const { CosmeticStore, entitle } = await load({ owned: ['default', 'trail_default', 'arrival_default', 'mythic_phoenix'] });
    expect(CosmeticStore.isOwned('mythic_phoenix')).toBe(false); // stored by an old build, no entitlement
    entitle(['pack_founders']);
    expect(CosmeticStore.isOwned('mythic_phoenix')).toBe(true);
    expect(CosmeticStore.isOwned('mythic_dragon')).toBe(true);
    expect(CosmeticStore.isOwned('trail_galaxy')).toBe(false);
    entitle([]); // refund
    expect(CosmeticStore.isOwned('mythic_phoenix')).toBe(false);
    // ordinary items keep reading the stored list
    expect(CosmeticStore.isOwned('default')).toBe(true);
    expect(CosmeticStore.isOwned('ember')).toBe(false);
  });

  it('equippedId falls back to the default when the entitlement disappears, and comes back after a restore', async () => {
    const { CosmeticStore, entitle, stored } = await load();
    entitle(['pack_founders', 'pack_starter']);
    CosmeticStore.equip('mythic_phoenix');
    CosmeticStore.equip('trail_galaxy');
    expect(CosmeticStore.equippedId('skin')).toBe('mythic_phoenix');
    expect(CosmeticStore.equipped('trail').id).toBe('trail_galaxy');

    entitle([]); // refund / another Google account
    expect(CosmeticStore.equippedId('skin')).toBe('default');
    expect(CosmeticStore.equipped('skin').id).toBe('default');
    expect(CosmeticStore.equippedId('trail')).toBe('trail_default');
    expect(stored().equipped.skin).toBe('mythic_phoenix'); // the stored equip is kept

    entitle(['pack_founders']); // restore
    expect(CosmeticStore.equippedId('skin')).toBe('mythic_phoenix');
    expect(CosmeticStore.equippedId('trail')).toBe('trail_default'); // pack_starter still gone
  });

  it('a bundle equip survives a fresh load while the entitlement is missing (not reset on load)', async () => {
    const { CosmeticStore, entitle, stored } = await load({
      owned: ['default', 'trail_default', 'arrival_default'],
      equipped: { ...DEFAULTS, skin: 'mythic_dragon' },
    });
    expect(CosmeticStore.equippedId('skin')).toBe('default');
    CosmeticStore.equip('trail_default'); // any persist must not drop the bundle equip
    expect(stored().equipped.skin).toBe('mythic_dragon');
    entitle(['pack_founders']);
    expect(CosmeticStore.equippedId('skin')).toBe('mythic_dragon');
  });

  it('equip refuses a bundle item that is not owned', async () => {
    const { CosmeticStore } = await load();
    CosmeticStore.equip('cosmic_blackhole');
    expect(CosmeticStore.equippedId('skin')).toBe('default');
    expect(CosmeticStore.buyOrEquip('cosmic_blackhole')).toBe('locked');
  });

  it('buyOrEquip equips an entitled bundle item', async () => {
    const { CosmeticStore, entitle } = await load();
    entitle(['pack_premium_collection']);
    expect(CosmeticStore.buyOrEquip('arrival_bolt')).toBe('equipped');
    expect(CosmeticStore.equippedId('arrival')).toBe('arrival_bolt');
  });

  it('grant refuses bundle-only items and still grants ordinary ones', async () => {
    const { CosmeticStore, stored } = await load();
    CosmeticStore.grant(['ember', 'mythic_phoenix', 'trail_galaxy']);
    expect(CosmeticStore.isOwned('ember')).toBe(true);
    expect(CosmeticStore.isOwned('mythic_phoenix')).toBe(false);
    expect(stored().owned).toContain('ember');
    expect(stored().owned).not.toContain('mythic_phoenix');
    expect(stored().owned).not.toContain('trail_galaxy');
  });

  it('ownedIds: stored bundle ids are filtered out; derived ones appear exactly once', async () => {
    const { CosmeticStore, entitle } = await load({ owned: ['default', 'trail_default', 'arrival_default', 'ember', 'mythic_phoenix'] });
    expect(CosmeticStore.ownedIds()).not.toContain('mythic_phoenix');
    entitle(['pack_starter']);
    expect([...CosmeticStore.ownedIds()].sort()).toEqual(['arrival_default', 'default', 'ember', 'trail_default', 'trail_galaxy']);
    entitle(['pack_founders']);
    const ids = CosmeticStore.ownedIds();
    expect(ids.filter((id) => id === 'mythic_phoenix')).toHaveLength(1);
    expect(ids).toContain('mythic_dragon');
    expect(ids).not.toContain('trail_galaxy');
  });
});
