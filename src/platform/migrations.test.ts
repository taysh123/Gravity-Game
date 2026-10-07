import { describe, it, expect, vi } from 'vitest';
import {
  MIGRATIONS,
  MIGRATED_V1_KEY,
  SAVE_SCHEMA_KEY,
  migrateV1,
  readSchema,
  runMigrations,
  type Migration,
  type MigrationContext,
} from './migrations';
import type { AsyncKV, KV } from './saves';

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
    report,
  };
}

const SAVE = {
  [`${P}progress:v9`]: '{"1":{"stars":3,"bestTimeMs":4100,"gem":true}}',
  [`${P}settings`]: '{"sound":false,"music":true}',
  [`${P}currency:v1`]: '120',
  [`${P}cosmetics:v2`]: '{"owned":["a"],"equipped":{"skin":"a"}}',
};

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

  it('with the real ladder, seeds the mirror and records schema 1', async () => {
    const local = memoryKV(SAVE);
    const mirror = fakeMirror();
    const at = await runMigrations(ctx(local, mirror), readSchema(local));
    expect(at).toBe(1);
    expect(local.get(SAVE_SCHEMA_KEY)).toBe('1');
    expect(mirror.data.get(MIGRATED_V1_KEY)).toBe('1');
    expect(mirror.data.get(`${P}settings`)).toBe(SAVE[`${P}settings`]);
  });

  it('with the real ladder and a recorded schema, re-seeds a mirror that lost its data', async () => {
    const local = memoryKV({ ...SAVE, [SAVE_SCHEMA_KEY]: '1' });
    const mirror = fakeMirror();
    expect(await runMigrations(ctx(local, mirror), readSchema(local))).toBe(1);
    expect(mirror.data.get(MIGRATED_V1_KEY)).toBe('1');
    expect(mirror.data.get(`${P}progress:v9`)).toBe(SAVE[`${P}progress:v9`]);
  });
});
