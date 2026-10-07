import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  COSMETICS_V1_KEY,
  COSMETICS_V2_KEY,
  MIGRATIONS,
  MIGRATED_V1_KEY,
  SAVE_SCHEMA_KEY,
  migrateV1,
  migrateV2,
  readSchema,
  runMigrations,
  type Migration,
  type MigrationContext,
} from './migrations';
import type { AsyncKV, KV } from './saves';
import { ENTITLEMENTS_KEY, LEGACY_PREMIUM_KEY, deriveOwnership, parseSnapshot } from '../services/entitlements';

// P00-T13 (D-12): the save-migration ladder. Migration 1 seeds the @capacitor/preferences mirror from localStorage
// once. It must copy every save key, set its marker only after everything landed, be idempotent, never delete
// anything, and recover from an interrupted (partial) copy. Fakes stand in for localStorage and Preferences.

const P = 'gravity-flow:';
const LOCAL_ONLY = `${P}save:unmirrored`;

function memoryKV(init: Record<string, string> = {}): KV & { data: Map<string, string> } {
  const data = new Map(Object.entries(init));
  return {
    data,
    get: (k) => data.get(k) ?? null,
    set: (k, v) => void data.set(k, v),
    remove: (k) => void data.delete(k),
    keys: () => [...data.keys()],
  };
}

interface FakeMirror extends AsyncKV {
  data: Map<string, string>;
  sets: Array<[string, string]>;
  failSet: (key: string) => boolean;
}

function fakeMirror(init: Record<string, string> = {}): FakeMirror {
  const data = new Map(Object.entries(init));
  const m: FakeMirror = {
    data,
    sets: [],
    failSet: () => false,
    get: async (k) => data.get(k) ?? null,
    set: async (k, v) => {
      if (m.failSet(k)) throw new Error(`bridge refused ${k}`);
      m.sets.push([k, v]);
      data.set(k, v);
    },
    remove: async (k) => void data.delete(k),
    keys: async () => [...data.keys()],
  };
  return m;
}

function ctx(
  local: KV,
  mirror: AsyncKV | null,
  write = vi.fn((k: string, v: string) => local.set(k, v)),
  report = vi.fn(),
): MigrationContext {
  return {
    local,
    mirror,
    prefix: P,
    isMirrored: (k) => k.startsWith(P) && k !== LOCAL_ONLY && k !== MIGRATED_V1_KEY,
    write,
    remove: vi.fn(async () => true),
    report,
  };
}

const SAVE = {
  [`${P}progress:v9`]: '{"1":{"stars":3,"bestTimeMs":4100,"gem":true}}',
  [`${P}settings`]: '{"sound":false,"music":true}',
  [`${P}currency:v1`]: '120',
  [`${P}cosmetics:v2`]: '{"owned":["a"],"equipped":{"skin":"a"}}',
};

const LATEST = MIGRATIONS[MIGRATIONS.length - 1].version;

describe('MIGRATIONS ladder', () => {
  it('is ordered by strictly increasing version, starting at 1', () => {
    const versions = MIGRATIONS.map((m) => m.version);
    expect(versions[0]).toBe(1);
    for (let i = 1; i < versions.length; i++) expect(versions[i]).toBeGreaterThan(versions[i - 1]);
  });

  it('starts with migration 1, the mirror seed, which re-checks on every hydrate', () => {
    expect(MIGRATIONS[0].name).toBe('mirror-seed');
    expect(MIGRATIONS[0].recheck).toBe(true);
    expect(MIGRATIONS[0].run).toBe(migrateV1);
  });

  it('migration 2 is the premium -> entitlements conversion, run once (no recheck)', () => {
    expect(MIGRATIONS[1]).toMatchObject({ version: 2, name: 'premium-entitlements' });
    expect(MIGRATIONS[1].recheck).toBeFalsy();
    expect(MIGRATIONS[1].run).toBe(migrateV2);
  });

  it('keeps its keys under the save prefix', () => {
    expect(SAVE_SCHEMA_KEY).toBe('gravity-flow:save:schema');
    expect(MIGRATED_V1_KEY).toBe('gravity-flow:save:migratedV1');
  });
});

describe('migration 1: seed the Preferences mirror from localStorage', () => {
  it('copies every save key into an empty mirror and sets the marker', async () => {
    const local = memoryKV(SAVE);
    const mirror = fakeMirror();
    expect(await migrateV1(ctx(local, mirror))).toBe(true);
    for (const [k, v] of Object.entries(SAVE)) expect(mirror.data.get(k)).toBe(v);
    expect(mirror.data.get(MIGRATED_V1_KEY)).toBe('1');
  });

  it('writes the marker last, after every key has landed', async () => {
    const mirror = fakeMirror();
    await migrateV1(ctx(memoryKV(SAVE), mirror));
    expect(mirror.sets.length).toBe(Object.keys(SAVE).length + 1);
    expect(mirror.sets[mirror.sets.length - 1]).toEqual([MIGRATED_V1_KEY, '1']);
  });

  it('never changes or deletes localStorage (and never writes the marker there)', async () => {
    const local = memoryKV(SAVE);
    await migrateV1(ctx(local, fakeMirror()));
    expect(Object.fromEntries(local.data)).toEqual(SAVE);
  });

  it('never deletes mirror keys that localStorage lacks (other plugins, keys only the mirror kept)', async () => {
    const mirror = fakeMirror({ 'platform:rendererGone': '2', [`${P}streak:v1`]: '{"current":4,"best":9}' });
    await migrateV1(ctx(memoryKV(SAVE), mirror));
    expect(mirror.data.get('platform:rendererGone')).toBe('2');
    expect(mirror.data.get(`${P}streak:v1`)).toBe('{"current":4,"best":9}');
  });

  it('copies only save keys: foreign keys and local-only bookkeeping stay out of the mirror', async () => {
    const local = memoryKV({ ...SAVE, 'other-app:token': 'x', [LOCAL_ONLY]: '["gravity-flow:settings"]' });
    const mirror = fakeMirror();
    await migrateV1(ctx(local, mirror));
    expect(mirror.data.has('other-app:token')).toBe(false);
    expect(mirror.data.has(LOCAL_ONLY)).toBe(false);
  });

  it('is idempotent: a second run copies nothing', async () => {
    const local = memoryKV(SAVE);
    const mirror = fakeMirror();
    await migrateV1(ctx(local, mirror));
    const before = mirror.sets.length;
    expect(await migrateV1(ctx(local, mirror))).toBe(true);
    expect(mirror.sets.length).toBe(before);
  });

  it('once the marker is set, never overwrites the mirror (it is authoritative from then on)', async () => {
    const mirror = fakeMirror({ [`${P}currency:v1`]: '900', [MIGRATED_V1_KEY]: '1' });
    await migrateV1(ctx(memoryKV(SAVE), mirror));
    expect(mirror.data.get(`${P}currency:v1`)).toBe('900');
    expect(mirror.sets).toEqual([]);
  });

  it('a fresh install (nothing saved yet) just records the marker', async () => {
    const mirror = fakeMirror();
    expect(await migrateV1(ctx(memoryKV(), mirror))).toBe(true);
    expect(mirror.sets).toEqual([[MIGRATED_V1_KEY, '1']]);
  });

  it('with no mirror (web, kill switch, plugin missing) is a no-op that still completes', async () => {
    const local = memoryKV(SAVE);
    expect(await migrateV1(ctx(local, null))).toBe(true);
    expect(Object.fromEntries(local.data)).toEqual(SAVE);
  });

  describe('survives a partial copy', () => {
    it('a failed key leaves the marker unset and localStorage untouched, and is reported', async () => {
      const local = memoryKV(SAVE);
      const mirror = fakeMirror();
      const report = vi.fn();
      mirror.failSet = (k) => k === `${P}currency:v1`;
      expect(await migrateV1(ctx(local, mirror, undefined, report))).toBe(false);
      expect(mirror.data.has(MIGRATED_V1_KEY)).toBe(false);
      expect(Object.fromEntries(local.data)).toEqual(SAVE);
      expect(report).toHaveBeenCalledWith(expect.any(Error), 'saves.migration:mirror-seed');
    });

    it('a failed marker write leaves the mirror unmarked (resolves false, never rejects)', async () => {
      const mirror = fakeMirror();
      const report = vi.fn();
      mirror.failSet = (k) => k === MIGRATED_V1_KEY;
      expect(await migrateV1(ctx(memoryKV(SAVE), mirror, undefined, report))).toBe(false);
      expect(mirror.data.has(MIGRATED_V1_KEY)).toBe(false);
      expect(report).toHaveBeenCalledTimes(1);
    });

    it('the next run completes the copy and sets the marker', async () => {
      const local = memoryKV(SAVE);
      const mirror = fakeMirror();
      mirror.failSet = (k) => k === `${P}currency:v1`;
      await migrateV1(ctx(local, mirror));
      mirror.failSet = () => false;
      expect(await migrateV1(ctx(local, mirror))).toBe(true);
      for (const [k, v] of Object.entries(SAVE)) expect(mirror.data.get(k)).toBe(v);
      expect(mirror.data.get(MIGRATED_V1_KEY)).toBe('1');
    });

    it('an interrupted run (stale copies, no marker) is redone from localStorage, the source until the marker', async () => {
      // Killed mid-copy on an earlier launch, then the player kept playing: the mirror holds older copies.
      const mirror = fakeMirror({ [`${P}progress:v9`]: '{}', [`${P}currency:v1`]: '5' });
      const local = memoryKV(SAVE);
      expect(await migrateV1(ctx(local, mirror))).toBe(true);
      expect(mirror.data.get(`${P}progress:v9`)).toBe(SAVE[`${P}progress:v9`]);
      expect(mirror.data.get(`${P}currency:v1`)).toBe('120');
      expect(mirror.data.get(MIGRATED_V1_KEY)).toBe('1');
    });
  });
});

describe('readSchema', () => {
  it('reads the recorded ladder version, 0 when missing or unreadable', () => {
    expect(readSchema(memoryKV())).toBe(0);
    expect(readSchema(memoryKV({ [SAVE_SCHEMA_KEY]: '3' }))).toBe(3);
    expect(readSchema(memoryKV({ [SAVE_SCHEMA_KEY]: 'banana' }))).toBe(0);
    expect(readSchema(memoryKV({ [SAVE_SCHEMA_KEY]: '-2' }))).toBe(0);
    expect(readSchema(memoryKV({ [SAVE_SCHEMA_KEY]: '1.5' }))).toBe(0);
  });
});

describe('runMigrations', () => {
  function step(version: number, result: boolean | Error, log: string[], recheck = false): Migration {
    return {
      version,
      name: `m${version}`,
      recheck,
      run: async () => {
        log.push(`m${version}`);
        if (result instanceof Error) throw result;
        return result;
      },
    };
  }

  it('runs the pending steps in order and records the schema after each one', async () => {
    const log: string[] = [];
    const local = memoryKV();
    const write = vi.fn((k: string, v: string) => local.set(k, v));
    const at = await runMigrations(ctx(local, null, write), 0, [step(1, true, log), step(2, true, log), step(3, true, log)]);
    expect(at).toBe(3);
    expect(log).toEqual(['m1', 'm2', 'm3']);
    expect(write.mock.calls).toEqual([
      [SAVE_SCHEMA_KEY, '1'],
      [SAVE_SCHEMA_KEY, '2'],
      [SAVE_SCHEMA_KEY, '3'],
    ]);
  });

  it('skips steps at or below the recorded version', async () => {
    const log: string[] = [];
    const at = await runMigrations(ctx(memoryKV(), null), 2, [step(1, true, log), step(2, true, log), step(3, true, log)]);
    expect(at).toBe(3);
    expect(log).toEqual(['m3']);
  });

  it('re-runs a recheck step every time without re-recording it', async () => {
    const log: string[] = [];
    const write = vi.fn();
    const at = await runMigrations(ctx(memoryKV(), null, write), 1, [step(1, true, log, true)]);
    expect(at).toBe(1);
    expect(log).toEqual(['m1']);
    expect(write).not.toHaveBeenCalled();
  });

  it('stops at the first new step that does not complete; later steps wait for the next boot', async () => {
    const log: string[] = [];
    const write = vi.fn();
    const at = await runMigrations(ctx(memoryKV(), null, write), 0, [step(1, true, log), step(2, false, log), step(3, true, log)]);
    expect(at).toBe(1);
    expect(log).toEqual(['m1', 'm2']);
    expect(write.mock.calls).toEqual([[SAVE_SCHEMA_KEY, '1']]);
  });

  it('a throwing step is reported and treated as not complete (never rejects)', async () => {
    const log: string[] = [];
    const report = vi.fn();
    const boom = new Error('boom');
    const at = await runMigrations(ctx(memoryKV(), null, undefined, report), 0, [step(1, boom, log), step(2, true, log)]);
    expect(at).toBe(0);
    expect(log).toEqual(['m1']);
    expect(report).toHaveBeenCalledWith(boom, 'saves.migration:m1');
  });

  it('a failing recheck of an already-recorded step does not block the steps after it', async () => {
    const log: string[] = [];
    const at = await runMigrations(ctx(memoryKV(), null), 1, [step(1, false, log, true), step(2, true, log)]);
    expect(at).toBe(2);
    expect(log).toEqual(['m1', 'm2']);
  });

  it('with the real ladder, seeds the mirror and records the latest schema', async () => {
    const local = memoryKV(SAVE);
    const mirror = fakeMirror();
    const at = await runMigrations(ctx(local, mirror), readSchema(local));
    expect(at).toBe(LATEST);
    expect(local.get(SAVE_SCHEMA_KEY)).toBe(String(LATEST));
    expect(mirror.data.get(MIGRATED_V1_KEY)).toBe('1');
    expect(mirror.data.get(`${P}settings`)).toBe(SAVE[`${P}settings`]);
  });

  it('with the real ladder and a recorded schema, re-seeds a mirror that lost its data', async () => {
    const local = memoryKV({ ...SAVE, [SAVE_SCHEMA_KEY]: String(LATEST) });
    const mirror = fakeMirror();
    expect(await runMigrations(ctx(local, mirror), readSchema(local))).toBe(LATEST);
    expect(mirror.data.get(MIGRATED_V1_KEY)).toBe('1');
    expect(mirror.data.get(`${P}progress:v9`)).toBe(SAVE[`${P}progress:v9`]);
  });

  it('with the real ladder from schema 1 (a P00-T13 install), runs migration 2 and records 2', async () => {
    const local = memoryKV({ ...SAVE, [SAVE_SCHEMA_KEY]: '1', [LEGACY_PREMIUM_KEY]: '1' });
    expect(await runMigrations(ctx(local, fakeMirror({ [MIGRATED_V1_KEY]: '1' })), readSchema(local))).toBe(LATEST);
    expect(local.get(SAVE_SCHEMA_KEY)).toBe(String(LATEST));
    expect(parseSnapshot(local.get(ENTITLEMENTS_KEY))?.active).toEqual(['no_ads']);
  });
});

// P00-T16 (D-09, P00-foundation.md §5 + §9 step 2): migration 2 converts the legacy local purchase state into the
// entitlement snapshot model. The snapshot is SEEDED (at: 0 = not confirmed by RevenueCat yet), so a player keeps
// Remove Ads until the first successful getCustomerInfo() replaces the seed with the store truth. Bundle cosmetics an
// old build granted locally become their pack entitlement and leave CosmeticStore.owned (ownership is derived).
describe('migration 2: legacy premium flag + local bundle grants -> entitlements:v1 snapshot', () => {
  const COSMETICS = (owned: string[], equipped: Record<string, string> = { skin: 'default', trail: 'trail_default', arrival: 'arrival_default' }) =>
    JSON.stringify({ owned, equipped });
  const snapshotOf = (local: KV) => parseSnapshot(local.get(ENTITLEMENTS_KEY));

  it('keys match the stores that own them', () => {
    expect(COSMETICS_V2_KEY).toBe('gravity-flow:cosmetics:v2');
    expect(COSMETICS_V1_KEY).toBe('gravity-flow:cosmetics:v1');
    const store = readFileSync(new URL('../utils/CosmeticStore.ts', import.meta.url), 'utf8');
    expect(store).toContain(`const KEY = '${COSMETICS_V2_KEY}'`);
    expect(store).toContain(`const V1_KEY = '${COSMETICS_V1_KEY}'`);
  });

  it("premium '1' seeds an unconfirmed no_ads snapshot: Remove Ads is kept until RevenueCat answers", async () => {
    const local = memoryKV({ [LEGACY_PREMIUM_KEY]: '1' });
    expect(await migrateV2(ctx(local, null))).toBe(true);
    expect(JSON.parse(local.get(ENTITLEMENTS_KEY)!)).toEqual({ v: 1, active: ['no_ads'], at: 0, pending: [] });
    expect(deriveOwnership(snapshotOf(local)!.active).noAds).toBe(true);
  });

  it('does not delete the legacy key: IAP removes it after the first successful getCustomerInfo (§5)', async () => {
    const local = memoryKV({ [LEGACY_PREMIUM_KEY]: '1' });
    const c = ctx(local, fakeMirror());
    await migrateV2(c);
    expect(local.get(LEGACY_PREMIUM_KEY)).toBe('1');
    expect(c.remove).not.toHaveBeenCalled();
  });

  it("premium '0', missing, or junk with no bundle items: writes nothing (a fresh install stays clean)", async () => {
    const cases: Array<Record<string, string>> = [{}, { [LEGACY_PREMIUM_KEY]: '0' }, { [LEGACY_PREMIUM_KEY]: 'yes' }, { [COSMETICS_V2_KEY]: COSMETICS(['default', 'ember']) }];
    for (const init of cases) {
      const local = memoryKV(init);
      const write = vi.fn((k: string, v: string) => local.set(k, v));
      expect(await migrateV2(ctx(local, null, write))).toBe(true);
      expect(write).not.toHaveBeenCalled();
      expect(local.get(ENTITLEMENTS_KEY)).toBeNull();
    }
  });

  it('locally granted bundle cosmetics become their pack entitlements and leave the stored owned list', async () => {
    const equipped = { skin: 'mythic_phoenix', trail: 'trail_galaxy', arrival: 'arrival_default' };
    const local = memoryKV({
      [LEGACY_PREMIUM_KEY]: '1',
      [COSMETICS_V2_KEY]: COSMETICS(['default', 'ember', 'trail_galaxy', 'mythic_phoenix', 'mythic_dragon'], equipped),
    });
    expect(await migrateV2(ctx(local, null))).toBe(true);
    expect(snapshotOf(local)).toEqual({ v: 1, active: ['no_ads', 'pack_starter', 'pack_founders'], at: 0, pending: [] });
    const cosmetics = JSON.parse(local.get(COSMETICS_V2_KEY)!);
    expect(cosmetics.owned).toEqual(['default', 'ember']);
    expect(cosmetics.equipped).toEqual(equipped); // equips are kept: ownership of bundle items is now derived
    expect([...deriveOwnership(snapshotOf(local)!.active).bundleCosmetics].sort()).toEqual(['mythic_dragon', 'mythic_phoenix', 'trail_galaxy']);
  });

  it('reads a v1-only cosmetics save (never upgraded to v2) without modifying it', async () => {
    const v1 = JSON.stringify({ owned: ['default', 'cosmic_blackhole'], equipped: 'cosmic_blackhole' });
    const local = memoryKV({ [COSMETICS_V1_KEY]: v1 });
    expect(await migrateV2(ctx(local, null))).toBe(true);
    expect(snapshotOf(local)?.active).toEqual(['pack_premium_collection']);
    expect(local.get(COSMETICS_V1_KEY)).toBe(v1);
    expect(local.get(COSMETICS_V2_KEY)).toBeNull();
  });

  it('never overwrites a snapshot RevenueCat already confirmed (the store truth wins), but still strips local grants', async () => {
    const confirmed = JSON.stringify({ v: 1, active: ['pack_premium_collection'], at: 1_700_000_000_000, pending: [] });
    const local = memoryKV({
      [ENTITLEMENTS_KEY]: confirmed,
      [LEGACY_PREMIUM_KEY]: '1', // e.g. resurrected from the mirror after IAP deleted it
      [COSMETICS_V2_KEY]: COSMETICS(['default', 'trail_galaxy']),
    });
    expect(await migrateV2(ctx(local, null))).toBe(true);
    expect(local.get(ENTITLEMENTS_KEY)).toBe(confirmed);
    expect(JSON.parse(local.get(COSMETICS_V2_KEY)!).owned).toEqual(['default']);
  });

  it('merges into an unconfirmed (seeded) snapshot instead of replacing it, keeping pending markers', async () => {
    const seeded = JSON.stringify({ v: 1, active: ['pack_founders'], at: 0, pending: [{ productId: 'starter_pack', at: 5 }] });
    const local = memoryKV({ [ENTITLEMENTS_KEY]: seeded, [LEGACY_PREMIUM_KEY]: '1' });
    expect(await migrateV2(ctx(local, null))).toBe(true);
    expect(snapshotOf(local)).toEqual({ v: 1, active: ['no_ads', 'pack_founders'], at: 0, pending: [{ productId: 'starter_pack', at: 5 }] });
  });

  it('replaces a corrupt snapshot with the seed', async () => {
    const local = memoryKV({ [ENTITLEMENTS_KEY]: '{oops', [LEGACY_PREMIUM_KEY]: '1' });
    expect(await migrateV2(ctx(local, null))).toBe(true);
    expect(snapshotOf(local)?.active).toEqual(['no_ads']);
  });

  it('a corrupt cosmetics save is left alone and does not block the step', async () => {
    const local = memoryKV({ [COSMETICS_V2_KEY]: 'not json', [LEGACY_PREMIUM_KEY]: '1' });
    expect(await migrateV2(ctx(local, null))).toBe(true);
    expect(local.get(COSMETICS_V2_KEY)).toBe('not json');
    expect(snapshotOf(local)?.active).toEqual(['no_ads']);
  });

  describe('idempotent (safe to re-run: a kill before the schema is recorded, or a resurrected key)', () => {
    it('a second run writes nothing', async () => {
      const local = memoryKV({ [LEGACY_PREMIUM_KEY]: '1', [COSMETICS_V2_KEY]: COSMETICS(['default', 'trail_galaxy']) });
      await migrateV2(ctx(local, null));
      const after = Object.fromEntries(local.data);
      const write = vi.fn((k: string, v: string) => local.set(k, v));
      expect(await migrateV2(ctx(local, null, write))).toBe(true);
      expect(write).not.toHaveBeenCalled();
      expect(Object.fromEntries(local.data)).toEqual(after);
    });

    it('a re-run after the strip still remembers the packs (they live in the seeded snapshot)', async () => {
      const local = memoryKV({ [COSMETICS_V2_KEY]: COSMETICS(['default', 'mythic_dragon']) });
      await migrateV2(ctx(local, null));
      await migrateV2(ctx(local, null));
      expect(snapshotOf(local)?.active).toEqual(['pack_founders']);
    });

    it('re-running the whole ladder from a lost schema record converges to the same state', async () => {
      const local = memoryKV({ ...SAVE, [LEGACY_PREMIUM_KEY]: '1', [COSMETICS_V2_KEY]: COSMETICS(['default', 'arrival_bolt']) });
      const mirror = fakeMirror();
      await runMigrations(ctx(local, mirror), 0);
      const first = Object.fromEntries(local.data);
      local.remove(SAVE_SCHEMA_KEY);
      expect(await runMigrations(ctx(local, mirror), readSchema(local))).toBe(LATEST);
      expect(Object.fromEntries(local.data)).toEqual(first);
    });
  });

  it('writes through ctx.write only (the mirrored Saves.write), never localStorage directly', async () => {
    const local = memoryKV({ [LEGACY_PREMIUM_KEY]: '1', [COSMETICS_V2_KEY]: COSMETICS(['default', 'trail_galaxy']) });
    const direct = vi.spyOn(local, 'set');
    const write = vi.fn((k: string, v: string): void => {
      local.data.set(k, v); // lands, without the spied set()
    });
    expect(await migrateV2(ctx(local, null, write))).toBe(true);
    expect(direct).not.toHaveBeenCalled();
    expect(write.mock.calls.map((c) => c[0]).sort()).toEqual([COSMETICS_V2_KEY, ENTITLEMENTS_KEY].sort());
  });

  // Review fix M8: never strip the local grants before the seed that replaces them is known to be in storage.
  describe('M8: the strip waits until the seed is read back from storage', () => {
    const dropping = (local: KV & { data: Map<string, string> }, state: { fail: boolean }) =>
      vi.fn((k: string, v: string): void => {
        if (state.fail && k === ENTITLEMENTS_KEY) return; // Saves.write never throws: a quota failure is silent
        local.data.set(k, v);
      });

    it('a seed write that does not land: nothing is stripped, reported, and the step is not complete', async () => {
      const local = memoryKV({ [LEGACY_PREMIUM_KEY]: '1', [COSMETICS_V2_KEY]: COSMETICS(['default', 'trail_galaxy']) });
      const state = { fail: true };
      const report = vi.fn();
      expect(await migrateV2(ctx(local, null, dropping(local, state), report))).toBe(false);
      expect(local.get(ENTITLEMENTS_KEY)).toBeNull();
      expect(JSON.parse(local.get(COSMETICS_V2_KEY)!).owned).toEqual(['default', 'trail_galaxy']);
      expect(report).toHaveBeenCalledWith(expect.any(Error), 'saves.migration:premium-entitlements');

      state.fail = false; // the next boot, storage works again
      expect(await migrateV2(ctx(local, null, dropping(local, state)))).toBe(true);
      expect(snapshotOf(local)?.active).toEqual(['no_ads', 'pack_starter']);
      expect(JSON.parse(local.get(COSMETICS_V2_KEY)!).owned).toEqual(['default']);
    });

    it('a merge into an unconfirmed snapshot that does not land: no strip, not complete', async () => {
      const seeded = JSON.stringify({ v: 1, active: ['no_ads'], at: 0, pending: [] });
      const local = memoryKV({ [ENTITLEMENTS_KEY]: seeded, [COSMETICS_V2_KEY]: COSMETICS(['default', 'mythic_dragon']) });
      expect(await migrateV2(ctx(local, null, dropping(local, { fail: true })))).toBe(false);
      expect(local.get(ENTITLEMENTS_KEY)).toBe(seeded);
      expect(JSON.parse(local.get(COSMETICS_V2_KEY)!).owned).toContain('mythic_dragon');
    });

    it('with the real ladder: stops at 1 while the seed does not persist, records the latest on the boot it does', async () => {
      const local = memoryKV({ [SAVE_SCHEMA_KEY]: '1', [LEGACY_PREMIUM_KEY]: '1', [COSMETICS_V2_KEY]: COSMETICS(['default', 'arrival_bolt']) });
      const state = { fail: true };
      const write = dropping(local, state);
      expect(await runMigrations(ctx(local, null, write), readSchema(local))).toBe(1);
      state.fail = false;
      expect(await runMigrations(ctx(local, null, write), readSchema(local))).toBe(LATEST);
      expect(snapshotOf(local)?.active).toEqual(['no_ads', 'pack_premium_collection']);
      expect(JSON.parse(local.get(COSMETICS_V2_KEY)!).owned).toEqual(['default']);
    });
  });
});
