// Tracks once-per-day rewarded claims (e.g. free Fragments) so opt-in rewards can
// be daily-capped. Thin store, localStorage, keyed by reward name -> claim date.
const KEY = 'gravity-flow:rewards:v1';

function todayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

let cache: Record<string, string> | null = null;

function load(): Record<string, string> {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // storage disabled — keep in-memory
  }
}

export const RewardStore = {
  claimedToday(key: string, now: Date = new Date()): boolean {
    return load()[key] === todayKey(now);
  },
  claim(key: string, now: Date = new Date()): void {
    load()[key] = todayKey(now);
    persist();
  },
  // Permanent one-time claims (collection / milestone rewards): presence = claimed.
  claimedEver(key: string): boolean {
    return key in load();
  },
};
