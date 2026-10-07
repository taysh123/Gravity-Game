// Durable saves (D-12, P00-T13; docs/roadmap/phases/P00-foundation.md §3 step 2, §9). Every persisted key lives in
// localStorage under PLATFORM.SAVE_PREFIX and every store keeps reading it synchronously through its in-memory cache.
// On native, Saves also mirrors those keys into @capacitor/preferences (SharedPreferences "CapacitorStorage"), which
// survives what WebView storage does not and is one of the two locations Android Auto Backup carries (D-11). On web,
// Saves is a plain localStorage passthrough and the plugin is never loaded.
//
// write(key, value): localStorage first, synchronously (the caches and every read depend on it), then the mirror,
//   asynchronously and coalesced per key in a microtask, so a burst (StatsStore.recordPortalJump) costs one bridge call.
//   Writes made before hydrate settles are held and sent right after it. Saves.write never throws.
//
// hydrate(): started by main.ts before the Phaser.Game exists; BootScene awaits the same promise with the fonts.
//   1. Read every save key from the mirror (one keys() + parallel get()s).
//   2. Pull, mirror -> localStorage: a key localStorage lacks is restored (WebView storage loss). A key both hold with
//      different values follows the CONFLICT RULE below. Caches registered with onRestore() for a changed key are
//      dropped, so a read that happened before hydrate cannot shadow the restored value.
//   3. Push, localStorage -> mirror (seeded mirrors only): keys the mirror is known to be behind on (see "unmirrored")
//      and keys the mirror lacks.
//   4. The migration ladder (src/platform/migrations.ts). Migration 1 seeds an unseeded mirror with a full copy and
//      sets `save:migratedV1` (in the mirror) last.
//
// CONFLICT RULE (a key present on both sides with different values):
//   - Mirror not seeded yet (no migratedV1 marker): localStorage wins. It is the source migration 1 is copying from;
//     the mirror only holds an interrupted earlier copy.
//   - Mirror seeded: Preferences wins. It is the durable copy (SharedPreferences is flushed when the app stops, while
//     the WebView commits localStorage lazily), so after a kill or a storage fault it is the one to trust...
//   - ...EXCEPT for keys whose latest localStorage value is known not to have reached the mirror: writes held during
//     this hydrate, and keys recorded in `save:unmirrored` (a mirror write that failed, or any write made while the
//     mirror was off, unavailable or timed out). For those localStorage wins and is pushed. This is what keeps a
//     Preferences error from ever losing a localStorage write.
//
// FAILURE MODES (none throws into gameplay; failures go to Crash.recordError, once per context per session):
//   - Kill switch (PLATFORM.SAVE_MIRROR_ENABLED = false), plugin unavailable, or a bridge error while reading:
//     passthrough. localStorage only; every key written is recorded in `save:unmirrored` for the next mirrored launch.
//   - The bridge does not answer within PLATFORM.SAVE_HYDRATE_TIMEOUT_MS: Boot continues on localStorage
//     (passthrough + recording). A late answer is ignored; the migration ladder waits for the next launch.
//   - localStorage refuses a restore: passthrough WITHOUT write-through, so a store restarting from defaults can never
//     overwrite the only good copy (the mirror). The next launch retries the restore.
//   - A mirror write fails: the key is recorded as unmirrored; the localStorage write stands.
//   - localStorage refuses a write: on native it is reported and still mirrored (the next launch restores it); on web
//     it is ignored silently, as the stores always did.
// Nothing here ever deletes save data. `save:unmirrored` is local-only bookkeeping and the only key removed here.
import { Capacitor } from '@capacitor/core';
import { PLATFORM } from '../config/platform.config';
import { Crash } from '../utils/Crash';
import { MIGRATED_V1_KEY, MIGRATIONS, readSchema, runMigrations, type Migration, type MigrationContext } from './migrations';

// Synchronous key-value store (localStorage). set/remove may throw (quota, storage disabled); get/keys never do.
export interface KV {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
}

// The asynchronous mirror (@capacitor/preferences). Any call may reject.
export interface AsyncKV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  keys(): Promise<string[]>;
}

// Local-only JSON string[]: save keys whose latest localStorage value may not be in the mirror. Never mirrored.
export const UNMIRRORED_KEY = 'gravity-flow:save:unmirrored';

export type HydrateMode = 'web' | 'mirror' | 'passthrough';
export type PassthroughReason = 'disabled' | 'unavailable' | 'error' | 'timeout' | 'local-error';

export interface HydrateReport {
  mode: HydrateMode;
  reason: PassthroughReason | null;
  migrated: boolean; // migration 1 seeded the mirror during this hydrate
  restored: string[]; // mirror -> localStorage, localStorage had no value
  replaced: string[]; // mirror -> localStorage, the mirror won a conflict
  pushed: string[]; // localStorage -> mirror, the mirror was behind
  schema: number; // migration ladder version afterwards
  startMs: number;
  ms: number;
}

export interface SavesDeps {
  local: KV;
  native: boolean;
  mirrorEnabled: boolean;
  loadMirror(): Promise<AsyncKV | null>; // null = plugin unavailable
  report(error: unknown, context: string): void;
  now(): number;
  timeoutMs: number;
  prefix: string;
  ladder?: readonly Migration[];
  onHydrated?(report: HydrateReport): void;
}

export interface SavesApi {
  hydrate(): Promise<HydrateReport>; // memoized; never rejects
  write(key: string, value: string): void; // never throws
  // Drop an in-memory cache when hydrate restores or replaces `key` (stores register at module load).
  onRestore(key: string, reset: () => void): void;
}

type State = 'web' | 'hydrating' | 'mirror' | 'passthrough';
type Outcome = 'done' | 'local-error' | 'detached';

// A registerPlugin() proxy may throw synchronously; fold that into the promise.
function safeSet(mirror: AsyncKV, key: string, value: string): Promise<void> {
  try {
    return mirror.set(key, value);
  } catch (error) {
    return Promise.reject(error);
  }
}

export function createSaves(deps: SavesDeps): SavesApi {
  const { local, prefix } = deps;
  const ladder = deps.ladder ?? MIGRATIONS;
  let state: State = deps.native ? 'hydrating' : 'web';
  let mirror: AsyncKV | null = null;
  let trackUnmirrored = true; // false only when localStorage itself is failing (local-error)
  let detached = false; // hydrate timed out: its late answer must not touch localStorage
  let hydration: Promise<HydrateReport> | null = null;
  let flushQueued = false;
  let unmirrored: Set<string> | null = null;
  const pending = new Map<string, string>();
  const hooks = new Map<string, Array<() => void>>();
  const reported = new Set<string>();

  const isMirrored = (key: string): boolean =>
    key.startsWith(prefix) && key !== UNMIRRORED_KEY && key !== MIGRATED_V1_KEY;

  function reportOnce(error: unknown, context: string): void {
    if (reported.has(context)) return;
    reported.add(context);
    try {
      deps.report(error, context);
    } catch {
      // reporting must never break a save
    }
  }

  function unmirroredSet(): Set<string> {
    if (unmirrored) return unmirrored;
    const set = new Set<string>();
    unmirrored = set;
    const raw = local.get(UNMIRRORED_KEY);
    if (raw !== null) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.every((k): k is string => typeof k === 'string')) {
          throw new Error('save:unmirrored is not a string[]');
        }
        for (const key of parsed) set.add(key);
      } catch (error) {
        reportOnce(error, 'saves.unmirroredRecord');
      }
    }
    return set;
  }

  function saveUnmirrored(): void {
    const set = unmirroredSet();
    try {
      if (set.size) local.set(UNMIRRORED_KEY, JSON.stringify([...set]));
      else local.remove(UNMIRRORED_KEY);
    } catch (error) {
      reportOnce(error, 'saves.unmirroredRecord');
    }
  }

  function markUnmirrored(key: string): void {
    if (!trackUnmirrored) return;
    const set = unmirroredSet();
    if (set.has(key)) return;
    set.add(key);
    saveUnmirrored();
  }

  function flush(): void {
    flushQueued = false;
    const m = mirror;
    if (state !== 'mirror' || !m) return;
    const batch = [...pending];
    pending.clear();
    for (const [key, value] of batch) {
      safeSet(m, key, value).catch((error: unknown) => {
        markUnmirrored(key);
        reportOnce(error, `saves.mirrorWrite:${key}`);
      });
    }
  }

  function scheduleFlush(): void {
    if (flushQueued) return;
    flushQueued = true;
    queueMicrotask(flush);
  }

  function write(key: string, value: string): void {
    try {
      local.set(key, value);
    } catch (error) {
      // Web keeps the stores' old behaviour (private mode / storage off: silently in-memory only).
      if (state !== 'web') reportOnce(error, `saves.localWrite:${key}`);
    }
    if (state === 'web' || !isMirrored(key)) return;
    if (state === 'passthrough') {
      markUnmirrored(key);
      return;
    }
    pending.set(key, value);
    if (state === 'mirror') scheduleFlush();
  }

  function onRestore(key: string, reset: () => void): void {
    const list = hooks.get(key);
    if (list) list.push(reset);
    else hooks.set(key, [reset]);
  }

  function fireHooks(keys: readonly string[]): void {
    for (const key of keys) {
      for (const reset of hooks.get(key) ?? []) {
        try {
          reset();
        } catch (error) {
          reportOnce(error, `saves.onRestore:${key}`);
        }
      }
    }
  }

  function context(m: AsyncKV | null): MigrationContext {
    return { local, mirror: m, prefix, isMirrored, write, report: reportOnce };
  }

  function enterPassthrough(track: boolean): void {
    state = 'passthrough';
    mirror = null;
    trackUnmirrored = track;
    for (const key of pending.keys()) markUnmirrored(key);
    pending.clear();
  }

  // Steps 1-4 against a loaded mirror. Rejects only when the bridge fails while reading (step 1).
  async function reconcile(m: AsyncKV, report: HydrateReport): Promise<Outcome> {
    const keys = (await m.keys()).filter((k) => k.startsWith(prefix));
    const values = await Promise.all(keys.map((k) => m.get(k)));
    if (detached) return 'detached';
    const snapshot = new Map<string, string>();
    keys.forEach((k, i) => {
      const v = values[i];
      if (typeof v === 'string') snapshot.set(k, v);
    });
    const seeded = snapshot.get(MIGRATED_V1_KEY) === '1';
    const behind = unmirroredSet();

    // 2. Pull.
    let localFailed = false;
    for (const [key, value] of snapshot) {
      if (!isMirrored(key)) continue;
      const current = local.get(key);
      if (current === value) continue;
      if (current !== null && (pending.has(key) || behind.has(key))) continue; // local is newer
      if (current !== null && !seeded) continue; // before the seed, localStorage is the source
      try {
        local.set(key, value);
      } catch (error) {
        reportOnce(error, `saves.restore:${key}`);
        localFailed = true;
        break;
      }
      (current === null ? report.restored : report.replaced).push(key);
    }
    fireHooks([...report.restored, ...report.replaced]);
    if (localFailed) return 'local-error';

    // 3. Push (an unseeded mirror gets the full copy from migration 1 instead).
    if (seeded) {
      const keysToPush = new Set<string>([...behind].filter(isMirrored));
      for (const key of local.keys()) if (isMirrored(key) && !snapshot.has(key)) keysToPush.add(key);
      const batch: Array<[string, string]> = [];
      for (const key of keysToPush) {
        const value = local.get(key);
        if (value === null) behind.delete(key); // nothing local left to protect
        else batch.push([key, value]);
      }
      const results = await Promise.allSettled(batch.map(([k, v]) => safeSet(m, k, v)));
      results.forEach((result, i) => {
        const key = batch[i][0];
        if (result.status === 'fulfilled') {
          report.pushed.push(key);
          // After a timeout the session records its own writes in this set; a late push must not erase them.
          if (!detached) behind.delete(key);
        } else {
          reportOnce(result.reason, `saves.mirrorWrite:${key}`);
        }
      });
      saveUnmirrored();
    }
    if (detached) return 'detached';

    // 4. Ladder.
    report.schema = await runMigrations(context(m), readSchema(local), ladder);
    if (!seeded && (await m.get(MIGRATED_V1_KEY).catch(() => null)) === '1' && !detached) {
      report.migrated = true;
      behind.clear(); // migration 1 just copied every local key
      saveUnmirrored();
    }
    return 'done';
  }

  async function run(): Promise<HydrateReport> {
    const startMs = deps.now();
    const report: HydrateReport = {
      mode: 'web',
      reason: null,
      migrated: false,
      restored: [],
      replaced: [],
      pushed: [],
      schema: 0,
      startMs,
      ms: 0,
    };
    const finish = (): HydrateReport => {
      report.ms = Math.max(0, deps.now() - startMs);
      try {
        deps.onHydrated?.(report);
      } catch {
        // diagnostics only
      }
      return report;
    };
    const localLadder = async (): Promise<void> => {
      report.schema = await runMigrations(context(null), readSchema(local), ladder);
    };
    const passthrough = async (reason: PassthroughReason, track = true, ladderNow = true): Promise<HydrateReport> => {
      enterPassthrough(track);
      report.mode = 'passthrough';
      report.reason = reason;
      if (ladderNow) await localLadder();
      return finish();
    };

    try {
      if (state === 'web') {
        await localLadder();
        return finish();
      }
      if (!deps.mirrorEnabled) return await passthrough('disabled');

      // Loading the plugin and reconciling both run under the timeout: Boot must never wait on a silent bridge.
      let loaded: AsyncKV | null = null;
      const work = (async (): Promise<Outcome | 'unavailable'> => {
        loaded = await deps.loadMirror();
        if (!loaded) return 'unavailable';
        return reconcile(loaded, report);
      })();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<'timeout'>((resolve) => {
        timer = setTimeout(() => resolve('timeout'), deps.timeoutMs);
      });
      let outcome: Outcome | 'unavailable' | 'timeout' | 'error';
      try {
        outcome = await Promise.race([work, timeout]);
      } catch (error) {
        reportOnce(error, 'saves.hydrate');
        outcome = 'error';
      } finally {
        clearTimeout(timer);
      }
      if (outcome === 'timeout') {
        detached = true;
        work.catch(() => undefined); // a late failure no longer matters
        reportOnce(new Error(`hydrate timed out after ${deps.timeoutMs} ms`), 'saves.hydrate');
        // The ladder waits for the next launch: the detached reconcile may still be running it.
        return await passthrough('timeout', true, false);
      }
      if (outcome === 'unavailable') return await passthrough('unavailable');
      if (outcome === 'error' || outcome === 'detached' || !loaded) return await passthrough('error');
      if (outcome === 'local-error') return await passthrough('local-error', false);
      mirror = loaded;
      state = 'mirror';
      report.mode = 'mirror';
      if (pending.size) scheduleFlush();
      return finish();
    } catch (error) {
      reportOnce(error, 'saves.hydrate');
      if (state !== 'web') enterPassthrough(true);
      report.mode = state === 'web' ? 'web' : 'passthrough';
      report.reason = state === 'web' ? null : 'error';
      return finish();
    }
  }

  return {
    hydrate: () => (hydration ??= run()),
    write,
    onRestore,
  };
}

// ---- The app instance ---------------------------------------------------------------------------------------------

// localStorage behind the KV contract: reads never throw (storage disabled reads as empty); writes may.
const browserLocalStorage: KV = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    localStorage.setItem(key, value);
  },
  remove(key) {
    localStorage.removeItem(key);
  },
  keys() {
    try {
      const out: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key !== null) out.push(key);
      }
      return out;
    } catch {
      return [];
    }
  },
};

// Native only (createSaves never calls this on web). The seam module is loaded by NAME (registerPlugin), so the web
// bundle never contains the package. A registerPlugin() proxy is thenable, so it is never returned from this async
// function; the plain adapter object is.
async function loadPreferencesMirror(): Promise<AsyncKV | null> {
  if (!Capacitor.isPluginAvailable('Preferences')) return null;
  const { Preferences } = await import('../utils/native/preferences');
  return {
    get: async (key) => (await Preferences.get({ key })).value ?? null,
    set: (key, value) => Preferences.set({ key, value }),
    keys: async () => (await Preferences.keys()).keys,
  };
}

// V19: a User Timing entry in every build (read it on a device with chrome://inspect:
// performance.getEntriesByName('saves:hydrate')), and a console line in dev builds only.
function traceHydrate(r: HydrateReport): void {
  try {
    performance.measure('saves:hydrate', { start: r.startMs, duration: r.ms });
  } catch {
    // User Timing unavailable: diagnostics only
  }
  if (import.meta.env.DEV) {
    console.info(`[saves] hydrate ${r.ms.toFixed(1)} ms, ${r.mode}${r.reason ? ` (${r.reason})` : ''}`, r);
  }
}

export const Saves: SavesApi = createSaves({
  local: browserLocalStorage,
  native: Capacitor.isNativePlatform(),
  mirrorEnabled: PLATFORM.SAVE_MIRROR_ENABLED,
  loadMirror: loadPreferencesMirror,
  report: (error, context) => Crash.recordError(error, context),
  now: () => performance.now(),
  timeoutMs: PLATFORM.SAVE_HYDRATE_TIMEOUT_MS,
  prefix: PLATFORM.SAVE_PREFIX,
  onHydrated: traceHydrate,
});
