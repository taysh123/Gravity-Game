// Persisted soft currency (Stardust) — localStorage. Thin store, mirrors the
// other *Store utilities. Spent on cosmetics; earned from wins/daily/achievements.
import { Saves } from '../platform/saves';
const KEY = 'gravity-flow:currency:v1';

let cache: number | null = null;
// Saves.hydrate() may restore this key from the Preferences mirror after an early read: drop the cache.
Saves.onRestore(KEY, () => {
  cache = null;
});

function load(): number {
  if (cache !== null) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? Math.max(0, Math.floor(Number(JSON.parse(raw)) || 0)) : 0;
  } catch {
    cache = 0;
  }
  return cache;
}

function persist(): void {
  try {
    Saves.write(KEY, JSON.stringify(cache ?? 0));
  } catch {
    // storage disabled — keep in-memory
  }
}

export const CurrencyStore = {
  balance(): number {
    return load();
  },
  add(n: number): number {
    cache = load() + Math.max(0, Math.floor(n));
    persist();
    return cache;
  },
  // Spend if affordable; returns true on success.
  trySpend(n: number): boolean {
    const cost = Math.max(0, Math.floor(n));
    if (load() < cost) return false;
    cache = load() - cost;
    persist();
    return true;
  },
};
