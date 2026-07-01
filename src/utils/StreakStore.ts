// Persisted win-streak (consecutive campaign wins) — localStorage. Thin store,
// mirrors CurrencyStore/DailyStore. All tier/milestone math lives in streak.ts
// (pure, tested). Broken ONLY by a death (GameScene.triggerDeath) — a manual
// restart (R key / nav) or leaving a level is a player choice, not a loss, and
// must never call reset().
const KEY = 'gravity-flow:streak:v1';

interface StoredStreak {
  current: number;
  best: number;
}

const EMPTY: StoredStreak = { current: 0, best: 0 };

let cache: StoredStreak | null = null;

function load(): StoredStreak {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as StoredStreak) } : { ...EMPTY };
  } catch {
    cache = { ...EMPTY };
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

export const StreakStore = {
  current(): number {
    return load().current;
  },

  best(): number {
    return load().best;
  },

  // Record a campaign win: increment + persist the running streak (and the
  // best-ever), and return the new count.
  win(): number {
    const s = load();
    const next = s.current + 1;
    cache = { current: next, best: Math.max(s.best, next) };
    persist();
    return next;
  },

  // Break the streak — call ONLY from GameScene.triggerDeath.
  reset(): void {
    const s = load();
    if (s.current === 0) return; // already broken — skip the redundant write
    cache = { current: 0, best: s.best };
    persist();
  },
};
