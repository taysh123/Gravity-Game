import { describe, it, expect, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSaves, CREATED_UNMIRRORED_KEY, UNMIRRORED_KEY, type AsyncKV, type KV, type SavesDeps } from './saves';
import { MIGRATED_V1_KEY, SAVE_SCHEMA_KEY, type Migration } from './migrations';
import { PLATFORM } from '../config/platform.config';

// P00-T13 (D-12): the Preferences mirror. localStorage stays the synchronous source every store reads; Saves.write
// writes it first and mirrors to @capacitor/preferences asynchronously (native only). Saves.hydrate() runs before
// BootScene finishes: it restores keys the WebView lost, applies "Preferences wins" once the mirror is seeded, keeps
// local values that never reached the mirror, and runs the migration ladder. Fakes replace both stores; Phaser and the
// Capacitor bridge never load here.

const P = 'gravity-flow:';
const PROGRESS = `${P}progress:v9`;
const SETTINGS = `${P}settings`;
const CURRENCY = `${P}currency:v1`;
const STATS = `${P}stats`;
const GHOST = `${P}ghost:v1`;

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

interface MemoryKV extends KV {
  data: Map<string, string>;
  failSet: boolean;
}

function memoryKV(init: Record<string, string> = {}): MemoryKV {
  const data = new Map(Object.entries(init));
  const kv: MemoryKV = {
    data,
    failSet: false,
    get: (k) => data.get(k) ?? null,
    set: (k, v) => {
      if (kv.failSet) throw new DOMException('quota', 'QuotaExceededError');
      data.set(k, v);
    },
    remove: (k) => void data.delete(k),
    keys: () => [...data.keys()],
  };
  return kv;
}

interface FakeMirror extends AsyncKV {
  data: Map<string, string>;
  sets: Array<[string, string]>;
  removes: string[];
  calls: { keys: number; get: number };
  failSet: (key: string) => boolean;
  failRemove: boolean;
  failKeys: boolean;
  throwSyncOnSet: boolean;
  hangKeys: Promise<void> | null;
  hangSet: Promise<void> | null;
  onRemove: (key: string) => void;
}

function fakeMirror(init: Record<string, string> = {}): FakeMirror {
  const data = new Map(Object.entries(init));
  const m: FakeMirror = {
    data,
    sets: [],
    removes: [],
    calls: { keys: 0, get: 0 },
    failSet: () => false,
    failRemove: false,
    failKeys: false,
    throwSyncOnSet: false,
    hangKeys: null,
    hangSet: null,
    onRemove: () => undefined,
    keys: async () => {
      m.calls.keys++;
      if (m.hangKeys) await m.hangKeys;
      if (m.failKeys) throw new Error('bridge down');
      return [...data.keys()];
    },
    get: async (k) => {
      m.calls.get++;
      return data.get(k) ?? null;
    },
    set: (k, v) => {
      if (m.throwSyncOnSet) throw new Error('proxy exploded');
      if (m.failSet(k)) return Promise.reject(new Error(`bridge refused ${k}`));
      if (m.hangSet) return m.hangSet;
      m.sets.push([k, v]);
      data.set(k, v);
      return Promise.resolve();
    },
    remove: async (k) => {
      m.onRemove(k);
      if (m.failRemove) throw new Error(`bridge refused remove ${k}`);
      m.removes.push(k);
      data.delete(k);
    },
  };
  return m;
}

function setup(over: Partial<SavesDeps> & { local?: MemoryKV; mirror?: FakeMirror | null } = {}) {
  const local = over.local ?? memoryKV();
  const mirror = over.mirror === undefined ? fakeMirror() : over.mirror;
  const report = vi.fn();
  const onHydrated = vi.fn();
  const loadMirror = vi.fn(async () => mirror);
  const deps: SavesDeps = {
    local,
    native: true,
    mirrorEnabled: true,
    loadMirror,
    report,
    now: () => 0,
    timeoutMs: 1000,
    prefix: P,
    localOnly: [GHOST],
    onHydrated,
    ...over,
  };
  return { saves: createSaves(deps), local, mirror, report, loadMirror, onHydrated };
}

const seeded = (data: Record<string, string>): Record<string, string> => ({ ...data, [MIGRATED_V1_KEY]: '1' });

describe('web: localStorage passthrough', () => {
  it('writes localStorage only and never loads the mirror', async () => {
    const { saves, local, loadMirror } = setup({ native: false });
    saves.write(PROGRESS, '{"1":{"stars":1}}');
    expect(local.get(PROGRESS)).toBe('{"1":{"stars":1}}');
    const r = await saves.hydrate();
    expect(r.mode).toBe('web');
    expect(loadMirror).not.toHaveBeenCalled();
  });

  it('still runs the migration ladder (version recorded locally)', async () => {
    const { saves, local } = setup({ native: false });
    const r = await saves.hydrate();
    expect(r.schema).toBe(1);
    expect(local.get(SAVE_SCHEMA_KEY)).toBe('1');
  });

  it('a refused localStorage write (storage disabled) is swallowed silently, as before', () => {
    const local = memoryKV();
    local.failSet = true;
    const { saves, report } = setup({ native: false, local });
    expect(() => saves.write(SETTINGS, '{}')).not.toThrow();
    expect(report).not.toHaveBeenCalled();
  });
});

describe('native without a usable mirror: passthrough, nothing lost', () => {
  it('kill switch (SAVE_MIRROR_ENABLED = false): never loads the plugin, writes localStorage', async () => {
    const { saves, local, loadMirror } = setup({ mirrorEnabled: false });
    const r = await saves.hydrate();
    expect(r).toMatchObject({ mode: 'passthrough', reason: 'disabled' });
    expect(loadMirror).not.toHaveBeenCalled();
    saves.write(CURRENCY, '7');
    expect(local.get(CURRENCY)).toBe('7');
  });

  it('kill switch: remembers which keys the mirror missed (local-only bookkeeping), split by lineage', async () => {
    const local = memoryKV({ [CURRENCY]: '6' }); // held when the session started
    const { saves } = setup({ local, mirrorEnabled: false });
    await saves.hydrate();
    saves.write(CURRENCY, '7');
    saves.write(CURRENCY, '8');
    saves.write(STATS, '{}'); // first created in this session
    expect(JSON.parse(local.get(UNMIRRORED_KEY) ?? '[]')).toEqual([CURRENCY]);
    expect(JSON.parse(local.get(CREATED_UNMIRRORED_KEY) ?? '[]')).toEqual(expect.arrayContaining([STATS]));
    expect(JSON.parse(local.get(CREATED_UNMIRRORED_KEY) ?? '[]')).not.toContain(CURRENCY);
  });

  it('plugin not available: passthrough "unavailable"', async () => {
    const { saves } = setup({ mirror: null });
    expect(await saves.hydrate()).toMatchObject({ mode: 'passthrough', reason: 'unavailable' });
  });

  it('plugin import throws: passthrough "error", reported, never rejects', async () => {
    const boom = new Error('chunk failed');
    const { saves, report } = setup({ loadMirror: vi.fn(async () => Promise.reject(boom)) });
    expect(await saves.hydrate()).toMatchObject({ mode: 'passthrough', reason: 'error' });
    expect(report).toHaveBeenCalledWith(boom, 'saves.hydrate');
  });

  it('Preferences.keys() rejects: passthrough "error", localStorage untouched', async () => {
    const mirror = fakeMirror(seeded({ [PROGRESS]: 'mirror' }));
    mirror.keys = () => Promise.reject(new Error('bridge down'));
    const local = memoryKV({ [PROGRESS]: 'local' });
    const { saves } = setup({ local, mirror });
    expect(await saves.hydrate()).toMatchObject({ mode: 'passthrough', reason: 'error' });
    expect(local.get(PROGRESS)).toBe('local');
  });
});

describe('write-through', () => {
  it('writes localStorage synchronously and the mirror asynchronously', async () => {
    const { saves, local, mirror } = setup();
    await saves.hydrate();
    saves.write(PROGRESS, 'v1');
    expect(local.get(PROGRESS)).toBe('v1');
    expect(mirror!.data.get(PROGRESS)).toBeUndefined();
    await tick();
    expect(mirror!.data.get(PROGRESS)).toBe('v1');
  });

  it('coalesces a burst per key into one bridge call carrying the last value', async () => {
    const { saves, mirror } = setup();
    await saves.hydrate();
    mirror!.sets.length = 0;
    for (let i = 1; i <= 5; i++) saves.write(STATS, `{"portalJumps":${i}}`);
    saves.write(CURRENCY, '3');
    await tick();
    expect(mirror!.sets).toEqual([
      [STATS, '{"portalJumps":5}'],
      [CURRENCY, '3'],
    ]);
  });

  it('holds writes made before hydrate settles, then mirrors them (newest value)', async () => {
    const { saves, local, mirror } = setup();
    saves.write(SETTINGS, 'early-1');
    saves.write(SETTINGS, 'early-2');
    await tick();
    expect(mirror!.data.has(SETTINGS)).toBe(false);
    await saves.hydrate();
    await tick();
    expect(local.get(SETTINGS)).toBe('early-2');
    expect(mirror!.data.get(SETTINGS)).toBe('early-2');
  });

  it('a write made during hydrate is never overwritten by the older mirror value', async () => {
    const mirror = fakeMirror(seeded({ [SETTINGS]: 'old' }));
    const local = memoryKV({ [SETTINGS]: 'old' });
    const { saves } = setup({ local, mirror });
    const pending = saves.hydrate();
    saves.write(SETTINGS, 'new');
    await pending;
    await tick();
    expect(local.get(SETTINGS)).toBe('new');
    expect(mirror.data.get(SETTINGS)).toBe('new');
  });

  describe('a Preferences error never loses a localStorage write', () => {
    it('a rejected mirror write keeps the local value, is reported, and is remembered as unmirrored', async () => {
      const { saves, local, mirror, report } = setup();
      await saves.hydrate();
      mirror!.failSet = (k) => k === CURRENCY;
      saves.write(CURRENCY, '500');
      await tick();
      expect(local.get(CURRENCY)).toBe('500');
      expect(report).toHaveBeenCalledWith(expect.any(Error), `saves.mirrorWrite:${CURRENCY}`);
      expect(JSON.parse(local.get(UNMIRRORED_KEY) ?? '[]')).toEqual([CURRENCY]);
    });

    it('a mirror proxy that throws synchronously is handled the same way', async () => {
      const { saves, local, mirror, report } = setup();
      await saves.hydrate();
      mirror!.throwSyncOnSet = true;
      expect(() => saves.write(CURRENCY, '9')).not.toThrow();
      await tick();
      expect(local.get(CURRENCY)).toBe('9');
      expect(report).toHaveBeenCalled();
    });

    it('the next launch keeps the local value (the mirror is behind) and pushes it, clearing the record', async () => {
      // Launch 1: the mirror refuses the currency write.
      const local = memoryKV();
      const mirror = fakeMirror();
      const first = setup({ local, mirror });
      await first.saves.hydrate();
      first.saves.write(CURRENCY, '100');
      await tick();
      mirror.failSet = (k) => k === CURRENCY;
      first.saves.write(CURRENCY, '500');
      await tick();
      expect(mirror.data.get(CURRENCY)).toBe('100');
      // Launch 2: the bridge works again. Without the record, "Preferences wins" would roll 500 back to 100.
      mirror.failSet = () => false;
      const second = setup({ local, mirror });
      const r = await second.saves.hydrate();
      expect(local.get(CURRENCY)).toBe('500');
      expect(mirror.data.get(CURRENCY)).toBe('500');
      expect(r.replaced).not.toContain(CURRENCY);
      expect(r.pushed).toContain(CURRENCY);
      expect(local.get(UNMIRRORED_KEY)).toBeNull();
    });

    it('writes during a kill-switch session win over the stale mirror once it is re-enabled', async () => {
      const local = memoryKV({ [PROGRESS]: 'before' });
      const mirror = fakeMirror(seeded({ [PROGRESS]: 'before' }));
      const off = setup({ local, mirror, mirrorEnabled: false });
      await off.saves.hydrate();
      off.saves.write(PROGRESS, 'played-while-off');
      const on = setup({ local, mirror });
      await on.saves.hydrate();
      expect(local.get(PROGRESS)).toBe('played-while-off');
      expect(mirror.data.get(PROGRESS)).toBe('played-while-off');
    });
  });

  it('a refused localStorage write on native is still mirrored, and reported once', async () => {
    const local = memoryKV();
    const { saves, mirror, report } = setup({ local });
    await saves.hydrate();
    local.failSet = true;
    saves.write(PROGRESS, 'a');
    saves.write(PROGRESS, 'b');
    await tick();
    expect(mirror!.data.get(PROGRESS)).toBe('b');
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(expect.anything(), `saves.localWrite:${PROGRESS}`);
  });

  it('never mirrors keys outside the save prefix', async () => {
    const { saves, mirror } = setup();
    await saves.hydrate();
    saves.write('someone-else:key', 'x');
    await tick();
    expect(mirror!.data.has('someone-else:key')).toBe(false);
  });
});

describe('hydrate', () => {
  const SAVE = { [PROGRESS]: '{"1":{"stars":3}}', [SETTINGS]: '{"sound":false}', [CURRENCY]: '120' };

  it('first launch of an existing player: copies localStorage into the empty mirror (migration 1)', async () => {
    const local = memoryKV(SAVE);
    const { saves, mirror } = setup({ local });
    const r = await saves.hydrate();
    await tick();
    expect(r).toMatchObject({ mode: 'mirror', reason: null, migrated: true, schema: 1 });
    for (const [k, v] of Object.entries(SAVE)) expect(mirror!.data.get(k)).toBe(v);
    expect(mirror!.data.get(MIGRATED_V1_KEY)).toBe('1');
    expect(mirror!.data.get(SAVE_SCHEMA_KEY)).toBe('1');
    expect(Object.fromEntries([...local.data].filter(([k]) => k in SAVE))).toEqual(SAVE);
  });

  it('fresh install: seeds an empty mirror with just the marker and the schema', async () => {
    const { saves, mirror } = setup();
    expect(await saves.hydrate()).toMatchObject({ mode: 'mirror', migrated: true, schema: 1 });
    await tick();
    expect([...mirror!.data.keys()].sort()).toEqual([MIGRATED_V1_KEY, SAVE_SCHEMA_KEY].sort());
  });

  it('WebView storage lost: restores every key from the mirror before Boot continues', async () => {
    const mirror = fakeMirror(seeded({ ...SAVE, [SAVE_SCHEMA_KEY]: '1' }));
    const local = memoryKV();
    const { saves } = setup({ local, mirror });
    const r = await saves.hydrate();
    expect(r.restored.sort()).toEqual([...Object.keys(SAVE), SAVE_SCHEMA_KEY].sort());
    for (const [k, v] of Object.entries(SAVE)) expect(local.get(k)).toBe(v);
    expect(local.get(MIGRATED_V1_KEY)).toBeNull(); // the marker describes the mirror and stays there
    expect(r.migrated).toBe(false);
  });

  it('restores even when the mirror was never marked (an interrupted copy, then the WebView lost its data)', async () => {
    const mirror = fakeMirror({ [PROGRESS]: SAVE[PROGRESS] });
    const local = memoryKV();
    const { saves } = setup({ local, mirror });
    const r = await saves.hydrate();
    expect(local.get(PROGRESS)).toBe(SAVE[PROGRESS]);
    expect(r.restored).toEqual([PROGRESS]);
    expect(mirror.data.get(MIGRATED_V1_KEY)).toBe('1');
  });

  it('conflict once the mirror is seeded: Preferences wins (the durable copy)', async () => {
    const mirror = fakeMirror(seeded({ [PROGRESS]: '{"1":{"stars":3}}' }));
    const local = memoryKV({ [PROGRESS]: '{"1":{"stars":1}}' });
    const { saves } = setup({ local, mirror });
    const r = await saves.hydrate();
    expect(local.get(PROGRESS)).toBe('{"1":{"stars":3}}');
    expect(r.replaced).toEqual([PROGRESS]);
  });

  it('conflict before the mirror is seeded: localStorage wins (it is the source being copied)', async () => {
    const mirror = fakeMirror({ [PROGRESS]: 'partial-old-copy' });
    const local = memoryKV({ [PROGRESS]: 'current' });
    const { saves } = setup({ local, mirror });
    const r = await saves.hydrate();
    expect(local.get(PROGRESS)).toBe('current');
    expect(mirror.data.get(PROGRESS)).toBe('current');
    expect(r.replaced).toEqual([]);
  });

  it('heals a seeded mirror that is missing a key localStorage has', async () => {
    const mirror = fakeMirror(seeded({ [PROGRESS]: 'p' }));
    const local = memoryKV({ [PROGRESS]: 'p', [STATS]: '{"deaths":4}' });
    const { saves } = setup({ local, mirror });
    const r = await saves.hydrate();
    expect(mirror.data.get(STATS)).toBe('{"deaths":4}');
    expect(r.pushed).toEqual([STATS]);
  });

  it('ignores keys outside the save prefix (other plugins and native flags in CapacitorStorage)', async () => {
    const mirror = fakeMirror(seeded({ 'platform:rendererGone': '1' }));
    const local = memoryKV();
    const { saves } = setup({ local, mirror });
    await saves.hydrate();
    expect(local.get('platform:rendererGone')).toBeNull();
    expect(mirror.data.get('platform:rendererGone')).toBe('1');
  });

  it('is idempotent: a second launch over consistent stores changes nothing', async () => {
    const local = memoryKV(SAVE);
    const mirror = fakeMirror();
    await setup({ local, mirror }).saves.hydrate();
    await tick();
    const before = { local: Object.fromEntries(local.data), mirror: Object.fromEntries(mirror.data) };
    mirror.sets.length = 0;
    const r = await setup({ local, mirror }).saves.hydrate();
    await tick();
    expect(r).toMatchObject({ mode: 'mirror', restored: [], replaced: [], pushed: [], migrated: false, schema: 1 });
    expect(mirror.sets).toEqual([]);
    expect(Object.fromEntries(local.data)).toEqual(before.local);
    expect(Object.fromEntries(mirror.data)).toEqual(before.mirror);
  });

  it('is memoized: BootScene awaits the same promise main.ts started', async () => {
    const { saves, loadMirror } = setup();
    const a = saves.hydrate();
    const b = saves.hydrate();
    expect(a).toBe(b);
    await a;
    expect(loadMirror).toHaveBeenCalledTimes(1);
  });

  it('drops a store cache whose key it restored or replaced (an early read must not shadow the restore)', async () => {
    const mirror = fakeMirror(seeded({ [SETTINGS]: 'restored', [PROGRESS]: 'mirror-wins' }));
    const local = memoryKV({ [PROGRESS]: 'stale', [CURRENCY]: 'same' });
    const { saves } = setup({ local, mirror });
    const resetSettings = vi.fn();
    const resetProgress = vi.fn();
    const resetCurrency = vi.fn();
    saves.onRestore(SETTINGS, resetSettings);
    saves.onRestore(PROGRESS, resetProgress);
    saves.onRestore(CURRENCY, resetCurrency);
    await saves.hydrate();
    expect(resetSettings).toHaveBeenCalledTimes(1);
    expect(resetProgress).toHaveBeenCalledTimes(1);
    expect(resetCurrency).not.toHaveBeenCalled();
  });

  it('a throwing cache-reset hook is reported and does not stop the others', async () => {
    const mirror = fakeMirror(seeded({ [SETTINGS]: 's', [PROGRESS]: 'p' }));
    const { saves, report } = setup({ mirror });
    const after = vi.fn();
    saves.onRestore(SETTINGS, () => {
      throw new Error('bad hook');
    });
    saves.onRestore(PROGRESS, after);
    await saves.hydrate();
    expect(after).toHaveBeenCalled();
    expect(report).toHaveBeenCalledWith(expect.any(Error), `saves.onRestore:${SETTINGS}`);
  });

  it('localStorage refuses the restore: keeps the mirror intact for the next launch (no write-through this session)', async () => {
    const mirror = fakeMirror(seeded({ [PROGRESS]: 'precious' }));
    const local = memoryKV();
    local.failSet = true;
    const { saves, report } = setup({ local, mirror });
    expect(await saves.hydrate()).toMatchObject({ mode: 'passthrough', reason: 'local-error' });
    // A store that now starts from defaults must not overwrite the only good copy.
    saves.write(PROGRESS, '{}');
    await tick();
    expect(mirror.data.get(PROGRESS)).toBe('precious');
    expect(report).toHaveBeenCalled();
  });

  it('times out instead of blocking Boot when the bridge hangs, and the late answer changes nothing', async () => {
    let release!: () => void;
    const mirror = fakeMirror(seeded({ [PROGRESS]: 'mirror' }));
    mirror.hangKeys = new Promise<void>((resolve) => (release = resolve));
    const local = memoryKV({ [PROGRESS]: 'local' });
    const { saves, report } = setup({ local, mirror, timeoutMs: 20 });
    const r = await saves.hydrate();
    expect(r).toMatchObject({ mode: 'passthrough', reason: 'timeout' });
    expect(report).toHaveBeenCalledWith(expect.any(Error), 'saves.hydrate');
    saves.write(CURRENCY, '42');
    release();
    await tick();
    await tick();
    expect(local.get(PROGRESS)).toBe('local');
    expect(local.get(CURRENCY)).toBe('42');
    expect(mirror.data.has(CURRENCY)).toBe(false);
    // CURRENCY did not exist when the session started, so it is recorded as created (the mirror would win for it).
    expect(JSON.parse(local.get(CREATED_UNMIRRORED_KEY) ?? '[]')).toContain(CURRENCY);
  });

  it('also times out when loading the plugin itself never settles', async () => {
    const { saves } = setup({ loadMirror: vi.fn(() => new Promise<AsyncKV | null>(() => undefined)), timeoutMs: 20 });
    expect(await saves.hydrate()).toMatchObject({ mode: 'passthrough', reason: 'timeout' });
  });

  it('reports its timing and hands the report to onHydrated (dev timing log, User Timing measure)', async () => {
    let t = 100;
    const { saves, onHydrated } = setup({ now: () => (t += 7) });
    const r = await saves.hydrate();
    expect(r.startMs).toBe(107);
    expect(r.ms).toBeGreaterThan(0);
    expect(onHydrated).toHaveBeenCalledWith(r);
  });

  it('a corrupt unmirrored record is reported and treated as empty', async () => {
    const mirror = fakeMirror(seeded({ [PROGRESS]: 'mirror' }));
    const local = memoryKV({ [PROGRESS]: 'local', [UNMIRRORED_KEY]: '{not json' });
    const { saves, report } = setup({ local, mirror });
    await saves.hydrate();
    expect(local.get(PROGRESS)).toBe('mirror');
    expect(report).toHaveBeenCalledWith(expect.anything(), 'saves.unmirroredRecord');
  });
});

// Review fix (P00-T13): a WebView wipe followed by a launch without a usable mirror must never let that session's
// default-based data overwrite the full mirror on the next good launch. A key the session's localStorage did not hold
// when it started is recorded as "created" (not "unmirrored"): next time the mirror's copy wins for it.
describe('WebView wipe + a launch without the mirror: the next launch restores the mirror', () => {
  const FULL = { [PROGRESS]: 'full-progress', [CURRENCY]: '900', [SAVE_SCHEMA_KEY]: '1' };
  type FirstLaunch = (m: FakeMirror) => Omit<Partial<SavesDeps>, 'local'> & { mirror?: FakeMirror | null };
  const badLaunches: Array<[string, FirstLaunch]> = [
    [
      'timeout',
      (m) => {
        m.hangKeys = new Promise<void>(() => undefined);
        return { mirror: m, timeoutMs: 20 };
      },
    ],
    [
      'bridge error',
      (m) => {
        m.failKeys = true;
        return { mirror: m };
      },
    ],
    ['plugin unavailable', () => ({ mirror: null })],
    ['kill switch', (m) => ({ mirror: m, mirrorEnabled: false })],
  ];
  const heal = (m: FakeMirror): void => {
    m.hangKeys = null;
    m.failKeys = false;
  };

  it.each(badLaunches)('WebView lost + %s + session writes: the mirror wins and its copy is restored', async (_label, first) => {
    const mirror = fakeMirror(seeded(FULL));
    const local = memoryKV(); // the WebView lost its storage
    const s1 = setup({ local, ...first(mirror) });
    await s1.saves.hydrate();
    s1.saves.write(PROGRESS, 'defaults-plus-one-level');
    s1.saves.write(CURRENCY, '5');
    await tick();
    expect(mirror.data.get(PROGRESS)).toBe('full-progress');

    heal(mirror);
    const s2 = setup({ local, mirror });
    const reset = vi.fn();
    s2.saves.onRestore(PROGRESS, reset);
    const r = await s2.saves.hydrate();
    await tick();
    expect(local.get(PROGRESS)).toBe('full-progress');
    expect(local.get(CURRENCY)).toBe('900');
    expect(mirror.data.get(PROGRESS)).toBe('full-progress');
    expect(mirror.data.get(CURRENCY)).toBe('900');
    expect([...r.replaced].sort()).toEqual([CURRENCY, PROGRESS].sort());
    expect(reset).toHaveBeenCalledTimes(1);
    expect(local.get(CREATED_UNMIRRORED_KEY)).toBeNull();
    expect(local.get(UNMIRRORED_KEY)).toBeNull();
  });

  it('even before the mirror is seeded (an interrupted first copy), a created key takes the mirror copy', async () => {
    const mirror = fakeMirror({ [PROGRESS]: 'real-progress' }); // migration 1 was cut short: no marker
    const local = memoryKV();
    const s1 = setup({ local, mirror: null });
    await s1.saves.hydrate();
    s1.saves.write(PROGRESS, 'defaults-plus-one-level');
    const r = await setup({ local, mirror }).saves.hydrate();
    expect(local.get(PROGRESS)).toBe('real-progress');
    expect(mirror.data.get(PROGRESS)).toBe('real-progress');
    expect(r.replaced).toEqual([PROGRESS]);
    expect(mirror.data.get(MIGRATED_V1_KEY)).toBe('1');
  });

  it('a write held during the next hydrate (from a cache read too early) does not beat the mirror for a created key', async () => {
    const mirror = fakeMirror(seeded(FULL));
    const local = memoryKV();
    const s1 = setup({ local, mirror: null });
    await s1.saves.hydrate();
    s1.saves.write(PROGRESS, 'defaults-1');
    const s2 = setup({ local, mirror });
    const reset = vi.fn();
    s2.saves.onRestore(PROGRESS, reset);
    const pending = s2.saves.hydrate();
    s2.saves.write(PROGRESS, 'defaults-2'); // a store that cached the default-based value before hydrate settled
    await pending;
    await tick();
    expect(local.get(PROGRESS)).toBe('full-progress');
    expect(mirror.data.get(PROGRESS)).toBe('full-progress');
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('a key the bad session created that the mirror never had is kept and pushed', async () => {
    const mirror = fakeMirror(seeded(FULL));
    const local = memoryKV();
    const s1 = setup({ local, mirror: null });
    await s1.saves.hydrate();
    s1.saves.write(STATS, '{"deaths":1}');
    const s2 = setup({ local, mirror });
    const r = await s2.saves.hydrate();
    expect(local.get(STATS)).toBe('{"deaths":1}');
    expect(mirror.data.get(STATS)).toBe('{"deaths":1}');
    expect(r.pushed).toContain(STATS);
  });

  it('two bad launches in a row keep the lineage: the mirror still wins afterwards', async () => {
    const mirror = fakeMirror(seeded(FULL));
    const local = memoryKV();
    const s1 = setup({ local, mirror: null });
    await s1.saves.hydrate();
    s1.saves.write(PROGRESS, 'defaults-1');
    const s2 = setup({ local, mirror: null }); // localStorage now holds the default-based key at session start
    await s2.saves.hydrate();
    s2.saves.write(PROGRESS, 'defaults-2');
    expect(JSON.parse(local.get(UNMIRRORED_KEY) ?? '[]')).not.toContain(PROGRESS);
    const s3 = setup({ local, mirror });
    await s3.saves.hydrate();
    expect(local.get(PROGRESS)).toBe('full-progress');
  });

  it('a key localStorage held when the bad session started still wins (the mirror is behind on it)', async () => {
    const mirror = fakeMirror(seeded({ [PROGRESS]: 'older' }));
    const local = memoryKV({ [PROGRESS]: 'newer' });
    mirror.hangKeys = new Promise<void>(() => undefined);
    const s1 = setup({ local, mirror, timeoutMs: 20 });
    await s1.saves.hydrate();
    s1.saves.write(PROGRESS, 'newest');
    heal(mirror);
    await setup({ local, mirror }).saves.hydrate();
    expect(local.get(PROGRESS)).toBe('newest');
    expect(mirror.data.get(PROGRESS)).toBe('newest');
  });

  it('a timeout after the pull counts the restored keys as held: session writes to them win next time', async () => {
    const mirror = fakeMirror(seeded({ [PROGRESS]: 'restored' }));
    const local = memoryKV({ [STATS]: 'only-local' }); // forces a push, which hangs
    mirror.hangSet = new Promise<void>(() => undefined);
    const s1 = setup({ local, mirror, timeoutMs: 20 });
    expect(await s1.saves.hydrate()).toMatchObject({ mode: 'passthrough', reason: 'timeout' });
    expect(local.get(PROGRESS)).toBe('restored');
    s1.saves.write(PROGRESS, 'played-after-restore');
    mirror.hangSet = null;
    await setup({ local, mirror }).saves.hydrate();
    expect(local.get(PROGRESS)).toBe('played-after-restore');
    expect(mirror.data.get(PROGRESS)).toBe('played-after-restore');
  });
});

describe('unmirrored record upkeep', () => {
  it('a later successful mirror write of the same key clears it', async () => {
    const { saves, local, mirror } = setup();
    await saves.hydrate();
    mirror!.failSet = (k) => k === CURRENCY;
    saves.write(CURRENCY, '500');
    await tick();
    expect(JSON.parse(local.get(UNMIRRORED_KEY) ?? '[]')).toEqual([CURRENCY]);
    mirror!.failSet = () => false;
    saves.write(CURRENCY, '600');
    await tick();
    expect(mirror!.data.get(CURRENCY)).toBe('600');
    expect(local.get(UNMIRRORED_KEY)).toBeNull();
  });
});

describe('Saves.remove', () => {
  const DEAD = `${P}progress:v8`;

  it('deletes from the mirror first, then localStorage; the next hydrate does not bring it back', async () => {
    const local = memoryKV({ [PROGRESS]: 'p', [DEAD]: 'dead' });
    const mirror = fakeMirror();
    const { saves } = setup({ local, mirror });
    await saves.hydrate();
    await tick();
    let localAtMirrorDelete: string | null = 'unset';
    mirror.onRemove = (k) => {
      if (k === DEAD) localAtMirrorDelete = local.get(k);
    };
    expect(await saves.remove(DEAD)).toBe(true);
    expect(localAtMirrorDelete).toBe('dead'); // the mirror went first
    expect(local.get(DEAD)).toBeNull();
    expect(mirror.data.has(DEAD)).toBe(false);
    await setup({ local, mirror }).saves.hydrate();
    expect(local.get(DEAD)).toBeNull();
  });

  it('a failed mirror delete keeps localStorage (the two stay consistent) and is reported', async () => {
    const local = memoryKV({ [PROGRESS]: 'p' });
    const { saves, mirror, report } = setup({ local });
    await saves.hydrate();
    await tick();
    mirror!.failRemove = true;
    expect(await saves.remove(PROGRESS)).toBe(false);
    expect(local.get(PROGRESS)).toBe('p');
    expect(report).toHaveBeenCalledWith(expect.any(Error), `saves.mirrorRemove:${PROGRESS}`);
  });

  it('on native without a usable mirror it deletes nothing and says so', async () => {
    const local = memoryKV({ [PROGRESS]: 'p' });
    const { saves } = setup({ local, mirror: null });
    await saves.hydrate();
    expect(await saves.remove(PROGRESS)).toBe(false);
    expect(local.get(PROGRESS)).toBe('p');
  });

  it('on web it deletes from localStorage', async () => {
    const local = memoryKV({ [PROGRESS]: 'p' });
    const { saves } = setup({ local, native: false });
    expect(await saves.remove(PROGRESS)).toBe(true);
    expect(local.get(PROGRESS)).toBeNull();
  });

  it('drops a pending write for the key, so the flush cannot resurrect it', async () => {
    const { saves, mirror } = setup();
    await saves.hydrate();
    saves.write(STATS, 'x');
    expect(await saves.remove(STATS)).toBe(true);
    await tick();
    expect(mirror!.data.has(STATS)).toBe(false);
  });

  it('forgets the key in the unmirrored record', async () => {
    const { saves, local, mirror } = setup();
    await saves.hydrate();
    mirror!.failSet = (k) => k === CURRENCY;
    saves.write(CURRENCY, '1');
    await tick();
    mirror!.failSet = () => false;
    expect(await saves.remove(CURRENCY)).toBe(true);
    expect(local.get(UNMIRRORED_KEY)).toBeNull();
  });

  describe('in the migration context (ctx.remove)', () => {
    const dropDead: Migration = { version: 1, name: 'drop-dead', run: async (ctx) => ctx.remove(DEAD) };

    it('a ladder step deletes from both sides, and it stays deleted', async () => {
      const local = memoryKV({ [DEAD]: 'old' });
      const mirror = fakeMirror(seeded({ [DEAD]: 'old' }));
      const r = await setup({ local, mirror, ladder: [dropDead] }).saves.hydrate();
      expect(r.schema).toBe(1);
      expect(local.get(DEAD)).toBeNull();
      expect(mirror.data.has(DEAD)).toBe(false);
      await setup({ local, mirror, ladder: [dropDead] }).saves.hydrate();
      expect(local.get(DEAD)).toBeNull();
    });

    it('without a usable mirror the step does not complete and nothing is deleted', async () => {
      const local = memoryKV({ [DEAD]: 'old' });
      const r = await setup({ local, mirror: null, ladder: [dropDead] }).saves.hydrate();
      expect(r.schema).toBe(0);
      expect(local.get(DEAD)).toBe('old');
    });
  });
});

// Review fix: ghost:v1 (hundreds of KB of replay paths) would make every SharedPreferences apply() rewrite a huge XML
// and slow hydrate. It is local-only: losing it on a WebView wipe only costs the best-run trails.
describe('local-only keys (ghost:v1) never reach the mirror', () => {
  it("the app lists GhostStore's key as local-only", () => {
    expect(PLATFORM.SAVE_LOCAL_ONLY_KEYS).toContain(GHOST);
    const ghostStore = readFileSync(fileURLToPath(new URL('../utils/GhostStore.ts', import.meta.url)), 'utf8');
    expect(ghostStore).toContain(`const KEY = '${GHOST}'`);
  });

  it('a write is not mirrored', async () => {
    const { saves, local, mirror } = setup();
    await saves.hydrate();
    saves.write(GHOST, '{"1":[[1,2]]}');
    await tick();
    expect(local.get(GHOST)).toBe('{"1":[[1,2]]}');
    expect(mirror!.data.has(GHOST)).toBe(false);
  });

  it('migration 1 does not copy it and the heal does not push it', async () => {
    const local = memoryKV({ [GHOST]: 'paths', [PROGRESS]: 'p' });
    const mirror = fakeMirror();
    await setup({ local, mirror }).saves.hydrate();
    expect(mirror.data.has(GHOST)).toBe(false);
    await setup({ local, mirror }).saves.hydrate();
    expect(mirror.data.has(GHOST)).toBe(false);
  });

  it('a copy an earlier build mirrored is neither pulled nor kept in the mirror', async () => {
    const local = memoryKV();
    const mirror = fakeMirror(seeded({ [GHOST]: 'stale-paths' }));
    await setup({ local, mirror }).saves.hydrate();
    expect(local.get(GHOST)).toBeNull();
    expect(mirror.data.has(GHOST)).toBe(false);
  });
});

// Source guards: every persisted write goes through Saves.write, the plugin package never reaches the web bundle,
// and hydrate is wired before anything reads a store.
describe('save wiring source guards', () => {
  const srcRoot = fileURLToPath(new URL('../', import.meta.url));
  const rel = (f: string): string => relative(srcRoot, f).replace(/\\/g, '/');

  function sourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
      else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name)) out.push(full);
    }
    return out;
  }
  const code = (f: string): string => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const files = sourceFiles(srcRoot);
  const read = (p: string): string => code(join(srcRoot, p));

  it('only src/platform/saves.ts writes or removes localStorage keys', () => {
    const offenders = files.filter((f) => /localStorage\s*\.\s*(setItem|removeItem|clear)\b/.test(code(f))).map(rel);
    expect(offenders).toEqual(['platform/saves.ts']);
  });

  it('every *Store module persists through Saves.write and drops its cache on restore', () => {
    const stores = files.filter((f) => /[A-Za-z]+Store\.ts$/.test(f) && f.includes(`${join('src', 'utils')}`));
    expect(stores.length).toBe(11);
    for (const f of stores) {
      expect(code(f), rel(f)).toMatch(/Saves\.write\(/);
      expect(code(f), rel(f)).toMatch(/Saves\.onRestore\(/);
    }
  });

  it('never imports @capacitor/preferences as a value (it is reached by name through the native seam)', () => {
    const PKG = String.raw`['"]@capacitor\/preferences['"]`;
    const forms = [
      new RegExp(String.raw`\bimport\s+(?!type\b)[^;'"]*?\bfrom\s*${PKG}`),
      new RegExp(String.raw`\bimport\s*${PKG}`),
      new RegExp(String.raw`\bexport\s+(?!type\b)[^;'"]*?\bfrom\s*${PKG}`),
      new RegExp(String.raw`\bimport\s*\(\s*${PKG}\s*\)`),
      new RegExp(String.raw`\brequire\s*\(\s*${PKG}\s*\)`),
    ];
    const offenders = files.filter((f) => forms.some((re) => re.test(code(f)))).map(rel);
    expect(offenders).toEqual([]);
    expect(read('utils/native/preferences.ts')).toMatch(/registerPlugin<\w+>\(\s*'Preferences'\s*\)/);
  });

  it('saves.ts loads the seam only behind Capacitor.isNativePlatform()', () => {
    const src = read('platform/saves.ts');
    expect(src).toMatch(/Capacitor\.isNativePlatform\(\)/);
    expect(src).toMatch(/import\(\s*'\.\.\/utils\/native\/preferences'\s*\)/);
  });

  it('main.ts starts hydrate before the Phaser.Game exists and inits IAP only after it', () => {
    const main = read('main.ts');
    const hydrateAt = main.indexOf('Saves.hydrate()');
    expect(hydrateAt).toBeGreaterThan(-1);
    expect(hydrateAt).toBeLessThan(main.indexOf('new Phaser.Game('));
    expect(main).toMatch(/\.then\(\s*\(\)\s*=>\s*IAP\.initNative\(\)\s*\)/);
    expect(main.match(/IAP\.initNative\(/g)?.length).toBe(1);
  });

  it('BootScene waits for hydrate together with the fonts before leaving Boot', () => {
    const boot = read('scenes/BootScene.ts');
    expect(boot).toMatch(/const fontsReady = this\.loadFonts\(\)/);
    expect(boot).toMatch(
      /Promise\.all\(\s*\[\s*fontsReady\s*,\s*Saves\.hydrate\(\)\s*\]\s*\)[\s\S]*?\.then\(\(\) => this\.scene\.start\('CompanySplashScene'\)\)/,
    );
    expect(boot.match(/scene\.start\('CompanySplashScene'\)/g)?.length).toBe(1);
  });
});

// D-11 / D-12: Android Auto Backup and device transfer include only the two save locations, so third-party SDK
// SharedPreferences (ad ids, RevenueCat and Firebase installation ids) are not cloned onto another device. (The WebView
// Local Storage directory still holds every origin's localStorage, e.g. AdMob creatives; it cannot be split per origin.)
describe('Android backup rules', () => {
  const res = (p: string): string =>
    readFileSync(fileURLToPath(new URL(`../../android/app/src/main/${p}`, import.meta.url)), 'utf8');
  const INCLUDES = [
    { domain: 'sharedpref', path: 'CapacitorStorage.xml' },
    { domain: 'root', path: 'app_webview/Default/Local Storage/' },
  ];
  const rules = (xml: string): Array<{ tag: string; domain: string; path: string }> =>
    [...xml.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<(include|exclude)\s+domain="([^"]+)"\s+path="([^"]+)"\s*\/>/g)].map(
      (m) => ({ tag: m[1], domain: m[2], path: m[3] }),
    );
  const section = (xml: string, tag: string): string => {
    const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(xml);
    if (!m) throw new Error(`<${tag}> missing`);
    return m[1];
  };

  it('the manifest keeps backup on and points at both rule files', () => {
    const app = /<application\b[^>]*>/.exec(res('AndroidManifest.xml'))?.[0] ?? '';
    expect(app).toMatch(/android:allowBackup="true"/);
    expect(app).toMatch(/android:dataExtractionRules="@xml\/data_extraction_rules"/);
    expect(app).toMatch(/android:fullBackupContent="@xml\/backup_rules"/);
  });

  it('API 31+: cloud backup and device transfer each include exactly Preferences + WebView Local Storage', () => {
    const xml = res('res/xml/data_extraction_rules.xml');
    for (const tag of ['cloud-backup', 'device-transfer']) {
      const r = rules(section(xml, tag));
      expect(r.map(({ domain, path }) => ({ domain, path })), tag).toEqual(INCLUDES);
      expect(r.every((x) => x.tag === 'include'), tag).toBe(true);
    }
  });

  it('API 24-30: full-backup-content includes exactly the same two locations', () => {
    const xml = res('res/xml/backup_rules.xml');
    const r = rules(section(xml, 'full-backup-content'));
    expect(r.map(({ domain, path }) => ({ domain, path }))).toEqual(INCLUDES);
    expect(r.every((x) => x.tag === 'include')).toBe(true);
  });
});
