// Persisted premium currency (Cosmic Fragments) — localStorage. Mirrors
// CurrencyStore (Stardust). Earned from rewarded ads, achievements, and collection
// milestones; spent on epic/legendary/mythic cosmetics. Thin store, no manager.
const KEY = 'gravity-flow:fragments:v1';

let cache: number | null = null;

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
    localStorage.setItem(KEY, JSON.stringify(cache ?? 0));
  } catch {
    // storage disabled — keep in-memory
  }
}

export const FragmentStore = {
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
