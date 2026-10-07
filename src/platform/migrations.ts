// Save-data migration ladder (D-12; docs/roadmap/phases/P00-foundation.md §5, §9). An ordered, versioned list run
// by Saves.hydrate() after the localStorage <-> Preferences reconcile, so every step sees the reconciled data and its
// writes go through Saves.write (mirrored). `gravity-flow:save:schema` records the highest version completed.
//
//   1  mirror-seed            copy localStorage into the @capacitor/preferences mirror once (P00-T13, here)
//   2  premium-entitlements   seed `entitlements:v1` from the legacy `premium` flag      (P00-T16, to be appended)
//   3  dead-key-cleanup       remove `progress:v1…v8`, and `cosmetics:v1` once v2 exists (P00-T22, to be appended;
//                             delete through ctx.remove so the mirror loses the keys too)
//
// Rules for every step: idempotent (a crash mid-step is simply re-run on the next boot), ordered (a step that does
// not complete stops the ladder, so later steps never run on data an earlier step has not finished), and reported
// through `ctx.report`, never thrown into the boot.
import type { AsyncKV, KV } from './saves';

export const SAVE_SCHEMA_KEY = 'gravity-flow:save:schema';
// Lives in the mirror only: it says "the mirror holds a complete copy", which is a fact about the mirror.
export const MIGRATED_V1_KEY = 'gravity-flow:save:migratedV1';

export interface MigrationContext {
  readonly local: KV;
  // null on web, with PLATFORM.SAVE_MIRROR_ENABLED = false, or when the plugin is unavailable.
  readonly mirror: AsyncKV | null;
  readonly prefix: string;
  // True for keys that belong in the mirror (save prefix, not local-only bookkeeping, not the marker).
  isMirrored(key: string): boolean;
  // Saves.write: localStorage now, the mirror after hydrate.
  write(key: string, value: string): void;
  // Mirrored delete: the mirror first, then localStorage. Resolves false (nothing deleted) when the mirror exists on
  // this platform but is not usable now, or the mirror delete failed; a step should then resolve false and retry.
  // Never delete with ctx.local.remove(): the next hydrate would restore the key from the mirror.
  remove(key: string): Promise<boolean>;
  // Crash.recordError in the app. Steps report their own failures and resolve false; they never throw on purpose.
  report(error: unknown, context: string): void;
}

export interface Migration {
  readonly version: number;
  readonly name: string;
  // Run on every hydrate even once recorded. Only for steps whose effect lives outside localStorage and can be lost
  // or first become possible on its own (the mirror can be wiped, or appear when the kill switch is turned back on).
  // Such a step must be cheap when already in effect.
  readonly recheck?: boolean;
  // Resolves true when the step is complete. false (or a throw) = not complete: retried on the next boot.
  run(ctx: MigrationContext): Promise<boolean>;
}

// Migration 1: seed the mirror from localStorage. Gate: the marker in the MIRROR, not the schema number, because the
// mirror can be lost or become available independently of localStorage.
//   - No mirror: nothing to seed now. Completes; the recheck seeds the mirror on the first hydrate that has one.
//   - Marker present: already seeded. From then on the mirror is the durable copy and is never overwritten here.
//   - Otherwise localStorage is the source: every save key is copied (overwriting what an interrupted earlier run
//     left behind), and the marker is written LAST, only after every copy resolved. A failure leaves it unset, so
//     the whole copy is redone next boot. Nothing is ever deleted, on either side.
export async function migrateV1(ctx: MigrationContext): Promise<boolean> {
  const { local, mirror } = ctx;
  if (!mirror) return true;
  if ((await mirror.get(MIGRATED_V1_KEY)) === '1') return true;
  const copies: Array<Promise<void>> = [];
  for (const key of local.keys()) {
    if (!ctx.isMirrored(key)) continue;
    const value = local.get(key);
    if (value !== null) copies.push(mirror.set(key, value));
  }
  const failed = (await Promise.allSettled(copies)).find((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failed) {
    ctx.report(failed.reason, 'saves.migration:mirror-seed');
    return false;
  }
  try {
    await mirror.set(MIGRATED_V1_KEY, '1');
  } catch (error) {
    ctx.report(error, 'saves.migration:mirror-seed');
    return false;
  }
  return true;
}

export const MIGRATIONS: readonly Migration[] = [{ version: 1, name: 'mirror-seed', recheck: true, run: migrateV1 }];

// The recorded ladder version; 0 when missing or unreadable (every step is idempotent, so re-running is safe).
export function readSchema(local: KV): number {
  const raw = local.get(SAVE_SCHEMA_KEY);
  if (raw === null || !/^\d+$/.test(raw)) return 0;
  return Number(raw);
}

// Runs the ladder from `from` (the recorded version) and returns the new version. Steps above `from` run in order and
// the version is recorded after each one, so an interrupted ladder resumes where it stopped; the first one that does
// not complete stops it. `recheck` steps at or below `from` are re-run, but their outcome blocks nothing (they were
// completed once already). Never rejects: an unexpected throw is reported and counts as "not complete".
export async function runMigrations(
  ctx: MigrationContext,
  from: number,
  ladder: readonly Migration[] = MIGRATIONS,
): Promise<number> {
  let at = from;
  for (const step of ladder) {
    const isNew = step.version > at;
    if (!isNew && !step.recheck) continue;
    let ok = false;
    try {
      ok = await step.run(ctx);
    } catch (error) {
      ctx.report(error, `saves.migration:${step.name}`);
    }
    if (!isNew) continue;
    if (!ok) break;
    at = step.version;
    ctx.write(SAVE_SCHEMA_KEY, String(at));
  }
  return at;
}
