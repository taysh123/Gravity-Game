// Durable saves (D-12, P00-T13; docs/roadmap/phases/P00-foundation.md §3 step 2, §9). Every persisted key lives in
// localStorage under PLATFORM.SAVE_PREFIX and every store keeps reading it synchronously through its in-memory cache.
// On native, Saves also mirrors those keys into @capacitor/preferences (SharedPreferences "CapacitorStorage"), which
// survives what WebView storage does not and is one of the two locations Android Auto Backup carries (D-11). On web,
// Saves is a plain localStorage passthrough and the plugin is never loaded.
//
// write(key, value): localStorage first, synchronously (the caches and every read depend on it), then the mirror,
//   asynchronously and coalesced per key in a microtask, so a burst (StatsStore.recordPortalJump) costs one bridge call.
//   Writes made before hydrate settles are held and sent right after it. Saves.write never throws.
// remove(key): the mirror first, then localStorage, so a later hydrate cannot restore a deleted key. Without a usable
//   mirror on native it deletes nothing and resolves false (the caller retries later). For keys nothing writes any more.
// Local-only keys (PLATFORM.SAVE_LOCAL_ONLY_KEYS, i.e. ghost:v1, hundreds of KB of replay paths) are never mirrored:
//   every SharedPreferences apply() rewrites the whole XML, and losing them on a WebView wipe only costs best-run trails.
//
// hydrate(): started by main.ts before the Phaser.Game exists; BootScene awaits the same promise with the fonts.
//   1. Read every save key from the mirror (one keys() + parallel get()s).
//   2. Pull, mirror -> localStorage: a key localStorage lacks is restored (WebView storage loss). A key both hold with
//      different values follows the CONFLICT RULE below. Caches registered with onRestore() for a changed key are
//      dropped, so a read that happened before hydrate cannot shadow the restored value.
//   3. Push, localStorage -> mirror (seeded mirrors only): keys the mirror is known to be behind on (`save:unmirrored`)
//      and keys the mirror lacks. Stale copies of local-only keys are deleted from the mirror.
//   4. The migration ladder (src/platform/migrations.ts). Migration 1 seeds an unseeded mirror with a full copy and
//      sets `save:migratedV1` (in the mirror) last. While it runs, Saves.remove() is refused (resolves false and is
//      reported as `saves.removeInMigration`): it waits for hydrate(), which is waiting for the step, so a step that
//      called it would stall boot until the timeout below. Steps delete through ctx.remove.
//   Also, right after step 1: when the mirror lists PLATFORM.RENDERER_GONE_KEY (a native flag outside the save prefix,
//   written by MainActivity when it recreated the activity after a renderer crash, D-11), it is cleared and reported as
//   one non-fatal (src/platform/rendererGone.ts). It needs a usable mirror, so it waits for one like the other steps.
//
// CONFLICT RULE (a key present on both sides with different values):
//   - `save:unmirroredCreated` keys: the MIRROR wins, seeded or not. These are keys first written in a session that
//     had no usable mirror (kill switch, plugin missing, bridge error or timeout) while localStorage did not hold them
//     when that session started. If the mirror holds such a key, localStorage had lost it (a WebView wipe) and the
//     session's value grew from defaults, so it must never replace the full copy.
//   - Mirror not seeded yet (no migratedV1 marker): localStorage wins. It is the source migration 1 is copying from;
//     the mirror only holds an interrupted earlier copy.
//   - Mirror seeded: Preferences wins. It is the durable copy (SharedPreferences is flushed when the app stops, while
//     the WebView commits localStorage lazily), so after a kill or a storage fault it is the one to trust...
//   - ...EXCEPT for keys whose latest localStorage value is known not to have reached the mirror: writes held during
//     this hydrate, and `save:unmirrored` keys (a mirror write that failed, or a write in a session without a usable
//     mirror to a key localStorage already held when that session started). For those localStorage wins and is
//     pushed. This is what keeps a Preferences error from ever losing a localStorage write.
//
// FAILURE MODES (none throws into gameplay; failures go to Crash.recordError, once per context per session):
//   - Kill switch (PLATFORM.SAVE_MIRROR_ENABLED = false), plugin unavailable, or a bridge error while reading:
//     passthrough. localStorage only; every key written is recorded (`unmirrored` or `unmirroredCreated`, above).
//   - The bridge does not answer within PLATFORM.SAVE_HYDRATE_TIMEOUT_MS: Boot continues on localStorage
//     (passthrough + recording). A late answer is ignored; the migration ladder waits for the next launch.
//   - localStorage refuses a restore: passthrough WITHOUT write-through, so a store restarting from defaults can never
//     overwrite the only good copy (the mirror). The next launch retries the restore.
//   - A mirror write fails: the key is recorded as unmirrored; the localStorage write stands. A later successful write
//     of the same value clears the record.
//   - localStorage refuses a write: on native it is reported and still mirrored (the next launch restores it); on web
//     it is ignored silently, as the stores always did.
// Saves deletes save data only through remove(). The two records are local-only bookkeeping.
import { Capacitor } from '@capacitor/core';
import { PLATFORM } from '../config/platform.config';
import { Crash } from '../services/Crash';
import { consumeRendererGone } from './rendererGone';
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
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

// Local-only JSON string[]: keys whose latest localStorage value is newer than the mirror's (localStorage wins).
export const UNMIRRORED_KEY = 'gravity-flow:save:unmirrored';
// Local-only JSON string[]: keys first created in a session without a usable mirror (the mirror wins if it has them).
export const CREATED_UNMIRRORED_KEY = 'gravity-flow:save:unmirroredCreated';

export type HydrateMode = 'web' | 'mirror' | 'passthrough';
export type PassthroughReason = 'disabled' | 'unavailable' | 'error' | 'timeout' | 'local-error';

export interface HydrateReport {
  mode: HydrateMode;
  reason: PassthroughReason | null;
  migrated: boolean; // migration 1 seeded the mirror during this hydrate
  rendererGone: number; // renderer deaths read from the native marker and reported during this hydrate (0 = none)
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
  localOnly?: readonly string[]; // save keys kept out of the mirror
  ladder?: readonly Migration[];
  onHydrated?(report: HydrateReport): void;
}

export interface SavesApi {
  hydrate(): Promise<HydrateReport>; // memoized; never rejects
  write(key: string, value: string): void; // never throws
  // Mirror first, then localStorage. Resolves true when the key is gone from both; never rejects.
  remove(key: string): Promise<boolean>;
  // Drop an in-memory cache when hydrate restores or replaces `key` (stores register at module load).
  onRestore(key: string, reset: () => void): void;
}

type State = 'web' | 'hydrating' | 'mirror' | 'passthrough';
type Outcome = 'done' | 'local-error' | 'detached';

// A registerPlugin() proxy may throw synchronously; fold that into the promise.
function safeCall(call: () => Promise<void>): Promise<void> {
  try {
    return call();
  } catch (error) {
    return Promise.reject(error);
  }
}

export function createSaves(deps: SavesDeps): SavesApi {
  const { local, prefix } = deps;
  const ladder = deps.ladder ?? MIGRATIONS;
  const localOnly = new Set(deps.localOnly ?? []);
  const bookkeeping = new Set([UNMIRRORED_KEY, CREATED_UNMIRRORED_KEY, MIGRATED_V1_KEY]);
  let state: State = deps.native ? 'hydrating' : 'web';
  let mirror: AsyncKV | null = null;
  let trackUnmirrored = true; // false only when localStorage itself is failing (local-error)
  let detached = false; // hydrate timed out: its late answer must not touch localStorage
  let hydration: Promise<HydrateReport> | null = null;
  let migrating = false; // true while the ladder runs inside an unsettled hydrate(): remove() must fail fast
  let flushQueued = false;
  const pending = new Map<string, string>();
  const writeCount = new Map<string, number>();
  const hooks = new Map<string, Array<() => void>>();
  const reported = new Set<string>();

  const isMirrored = (key: string): boolean => key.startsWith(prefix) && !bookkeeping.has(key) && !localOnly.has(key);

  function reportOnce(error: unknown, context: string): void {
    if (reported.has(context)) return;
    reported.add(context);
    try {
      deps.report(error, context);
    } catch {
      // reporting must never break a save
    }
  }

  // A persisted, local-only list of keys (JSON string[]), loaded on first use.
  function localRecord(storageKey: string): {
    keys(): Set<string>;
    add(key: string): void;
    remove(key: string): void;
    clear(): void;
  } {
    let set: Set<string> | null = null;
    const keys = (): Set<string> => {
      if (set) return set;
      const loaded = new Set<string>();
      set = loaded;
      const raw = local.get(storageKey);
      if (raw !== null) {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (!Array.isArray(parsed) || !parsed.every((k): k is string => typeof k === 'string')) {
            throw new Error(`${storageKey} is not a string[]`);
          }
          for (const key of parsed) loaded.add(key);
        } catch (error) {
          reportOnce(error, 'saves.unmirroredRecord');
        }
      }
      return loaded;
    };
    const save = (): void => {
      const current = keys();
      try {
        if (current.size) local.set(storageKey, JSON.stringify([...current]));
        else local.remove(storageKey);
      } catch (error) {
        reportOnce(error, 'saves.unmirroredRecord');
      }
    };
    return {
      keys,
      add(key) {
        if (keys().has(key)) return;
        keys().add(key);
        save();
      },
      remove(key) {
        if (keys().delete(key)) save();
      },
      clear() {
        if (!keys().size && local.get(storageKey) === null) return;
        keys().clear();
        save();
      },
    };
  }

  const behind = localRecord(UNMIRRORED_KEY); // localStorage newer: it wins
  const created = localRecord(CREATED_UNMIRRORED_KEY); // grown without the key: the mirror wins
  // Keys whose localStorage value continues a known-good lineage: those held when this session started (minus the
  // ones still marked as created), plus everything the pull reconciled. Only these may claim "localStorage is newer".
  const trusted = new Set<string>(
    deps.native ? local.keys().filter((k) => isMirrored(k) && !created.keys().has(k)) : [],
  );

  // A write the mirror did not receive. In a mirrored session localStorage was reconciled at hydrate, so it is newer.
  // Without a usable mirror it is newer only for keys of a known-good lineage; a key the session created may be a
  // default rebuilt after a WebView wipe, and the mirror's copy (if any) must win next time.
  function markBehind(key: string): void {
    if (!trackUnmirrored || created.keys().has(key)) return;
    if (state === 'mirror' || trusted.has(key)) behind.add(key);
    else created.add(key);
  }

  function flush(): void {
    flushQueued = false;
    const m = mirror;
    if (state !== 'mirror' || !m) return;
    const batch = [...pending];
    pending.clear();
    for (const [key, value] of batch) {
      safeCall(() => m.set(key, value)).then(
        () => {
          if (local.get(key) === value) behind.remove(key); // the mirror caught up
        },
        (error: unknown) => {
          markBehind(key);
          reportOnce(error, `saves.mirrorWrite:${key}`);
        },
      );
    }
  }

  function scheduleFlush(): void {
    if (flushQueued) return;
    flushQueued = true;
    queueMicrotask(flush);
  }

  function write(key: string, value: string): void {
    writeCount.set(key, (writeCount.get(key) ?? 0) + 1);
    try {
      local.set(key, value);
    } catch (error) {
      // Web keeps the stores' old behaviour (private mode / storage off: silently in-memory only).
      if (state !== 'web') reportOnce(error, `saves.localWrite:${key}`);
    }
    if (state === 'web' || !isMirrored(key)) return;
    if (state === 'passthrough') {
      markBehind(key);
      return;
    }
    pending.set(key, value);
    if (state === 'mirror') scheduleFlush();
  }

  // Delete through `m` (the mirror in use, or null when there is none). On native a mirrored key is deleted from the
  // mirror first; without one nothing is deleted, since a local-only delete would be undone by the next hydrate.
  async function removeWith(m: AsyncKV | null, key: string): Promise<boolean> {
    if (deps.native && isMirrored(key)) {
      if (!m) return false;
      pending.delete(key);
      const writesBefore = writeCount.get(key) ?? 0;
      try {
        await safeCall(() => m.remove(key));
      } catch (error) {
        reportOnce(error, `saves.mirrorRemove:${key}`);
        return false;
      }
      if ((writeCount.get(key) ?? 0) !== writesBefore) return false; // written again meanwhile: keep the new value
    }
    try {
      local.remove(key);
    } catch (error) {
      if (deps.native) reportOnce(error, `saves.localRemove:${key}`);
      return false;
    }
    behind.remove(key);
    created.remove(key);
    return true;
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
    return { local, mirror: m, prefix, isMirrored, write, remove: (key) => removeWith(m, key), report: reportOnce };
  }

  // The ladder, with the re-entry guard raised for exactly as long as a step could be waiting on this hydrate.
  async function runLadder(m: AsyncKV | null): Promise<number> {
    migrating = true;
    try {
      return await runMigrations(context(m), readSchema(local), ladder);
    } finally {
      migrating = false;
    }
  }

  function enterPassthrough(track: boolean): void {
    state = 'passthrough';
    mirror = null;
    trackUnmirrored = track;
    for (const key of pending.keys()) markBehind(key);
    pending.clear();
  }

  // Steps 1-4 against a loaded mirror. Rejects only when the bridge fails while reading (step 1).
  async function reconcile(m: AsyncKV, report: HydrateReport): Promise<Outcome> {
    const listed = await m.keys();
    const keys = listed.filter((k) => k.startsWith(prefix));
    const values = await Promise.all(keys.map((k) => m.get(k)));
    if (detached) return 'detached';
    // Native flag, not save data: read by name only when listed, so a clean launch costs nothing extra.
    if (listed.includes(PLATFORM.RENDERER_GONE_KEY)) {
      report.rendererGone = await consumeRendererGone(m, PLATFORM.RENDERER_GONE_KEY, reportOnce);
      if (detached) return 'detached';
    }
    const snapshot = new Map<string, string>();
    keys.forEach((k, i) => {
      const v = values[i];
      if (typeof v === 'string') snapshot.set(k, v);
    });
    const seeded = snapshot.get(MIGRATED_V1_KEY) === '1';
    const newer = behind.keys();
    const regrown = created.keys();

    // 2. Pull.
    let localFailed = false;
    for (const [key, value] of snapshot) {
      if (!isMirrored(key)) continue;
      const current = local.get(key);
      if (current === value) continue;
      if (regrown.has(key)) {
        pending.delete(key); // grew from defaults: the mirror's full copy wins
      } else {
        if (current !== null && (pending.has(key) || newer.has(key))) continue; // local is newer
        if (current !== null && !seeded) continue; // before the seed, localStorage is the source
      }
      try {
        local.set(key, value);
      } catch (error) {
        reportOnce(error, `saves.restore:${key}`);
        localFailed = true;
        break;
      }
      behind.remove(key);
      (current === null ? report.restored : report.replaced).push(key);
    }
    fireHooks([...report.restored, ...report.replaced]);
    if (localFailed) return 'local-error';
    // localStorage is reconciled: what it holds now is a known-good lineage, and the created list has been applied.
    created.clear();
    for (const key of local.keys()) if (isMirrored(key)) trusted.add(key);

    // 3. Push (an unseeded mirror gets the full copy from migration 1 instead), and drop stale local-only copies.
    const stale = [...snapshot.keys()].filter((k) => localOnly.has(k));
    const drops = stale.map((k) => safeCall(() => m.remove(k)).catch((e: unknown) => reportOnce(e, `saves.mirrorRemove:${k}`)));
    if (seeded) {
      const keysToPush = new Set<string>([...newer].filter(isMirrored));
      for (const key of local.keys()) if (isMirrored(key) && !snapshot.has(key)) keysToPush.add(key);
      const batch: Array<[string, string]> = [];
      for (const key of keysToPush) {
        const value = local.get(key);
        if (value === null) behind.remove(key); // nothing local left to protect
        else batch.push([key, value]);
      }
      const results = await Promise.allSettled(batch.map(([k, v]) => safeCall(() => m.set(k, v))));
      results.forEach((result, i) => {
        const key = batch[i][0];
        if (result.status === 'fulfilled') {
          report.pushed.push(key);
          // After a timeout the session records its own writes; a late push must not erase them.
          if (!detached) behind.remove(key);
        } else {
          reportOnce(result.reason, `saves.mirrorWrite:${key}`);
        }
      });
    }
    await Promise.allSettled(drops);
    if (detached) return 'detached';

    // 4. Ladder.
    report.schema = await runLadder(m);
    if (!seeded && (await m.get(MIGRATED_V1_KEY).catch(() => null)) === '1' && !detached) {
      report.migrated = true;
      behind.clear(); // migration 1 just copied every local key
    }
    return 'done';
  }

  async function run(): Promise<HydrateReport> {
    const startMs = deps.now();
    const report: HydrateReport = {
      mode: 'web',
      reason: null,
      migrated: false,
      rendererGone: 0,
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
      report.schema = await runLadder(null);
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
        migrating = false; // hydrate() has settled, so a step that is still hung can no longer deadlock on it
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

  const hydrate = (): Promise<HydrateReport> => (hydration ??= run());

  async function remove(key: string): Promise<boolean> {
    if (migrating) {
      // Awaiting hydrate() here would wait on the step that called us. Refuse on every platform, so the mistake shows
      // up in the web dev loop too, not only on a device.
      const message = 'Saves.remove() was called from a migration step; use ctx.remove, Saves.remove waits for hydrate';
      reportOnce(new Error(message), 'saves.removeInMigration');
      return false;
    }
    if (deps.native && isMirrored(key)) await hydrate(); // memoized; never rejects
    return removeWith(state === 'mirror' ? mirror : null, key);
  }

  return { hydrate, write, remove, onRestore };
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
    remove: (key) => Preferences.remove({ key }),
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
  localOnly: PLATFORM.SAVE_LOCAL_ONLY_KEYS,
  onHydrated: traceHydrate,
});
