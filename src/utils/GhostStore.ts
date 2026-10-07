// Persisted personal-best ball paths (localStorage), one downsampled path per
// campaign level. Drives the faint "ghost" trail of your best run — the in-run
// mastery feedback that fuels the 3-star / one-more-try loop. Thin store, mirrors
// ProgressStore (not a manager).
import type { PathPoint } from './ghost';
import { Saves } from '../platform/saves';

const KEY = 'gravity-flow:ghost:v1';

let cache: Record<number, PathPoint[]> | null = null;
// Saves.hydrate() may restore this key from the Preferences mirror after an early read: drop the cache.
Saves.onRestore(KEY, () => {
  cache = null;
});

function load(): Record<number, PathPoint[]> {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Record<number, PathPoint[]>) : {};
  } catch {
    cache = {};
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

export const GhostStore = {
  get(level: number): PathPoint[] {
    return load()[level] ?? [];
  },

  // Overwrite the stored path (called only when the run is a new best time).
  save(level: number, path: PathPoint[]): void {
    load()[level] = path;
    persist();
  },
};
