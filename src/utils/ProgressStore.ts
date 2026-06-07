// Persisted per-level progress (localStorage). Keeps the player's best result
// per level and drives stars, best-time, and sequential unlock. Thin store —
// mirrors SettingsStore, not a manager.

export interface LevelProgress {
  stars: number; // 0..3 (best achieved)
  bestTimeMs: number; // 0 = none yet
  gem: boolean; // gem ever collected
}

export interface RecordInput {
  stars: number;
  timeMs: number;
  gem: boolean;
  completed: boolean;
}

// v7: Phase-1 early-game WOW redesign — Worlds 1-3 trimmed 10->7 (renumbering
// everything after), so reset progress cleanly. (v6 = Worlds 4-8 to 10 each.)
const KEY = 'gravity-flow:progress:v7';
const EMPTY: LevelProgress = { stars: 0, bestTimeMs: 0, gem: false };

let cache: Record<number, LevelProgress> | null = null;

function load(): Record<number, LevelProgress> {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Record<number, LevelProgress>) : {};
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

export const ProgressStore = {
  get(level: number): LevelProgress {
    return { ...EMPTY, ...load()[level] };
  },

  // Merge a result, keeping the best of each dimension.
  record(level: number, r: RecordInput): void {
    const store = load();
    const prev = store[level] ?? { ...EMPTY };
    store[level] = {
      stars: Math.max(prev.stars, r.stars),
      gem: prev.gem || r.gem,
      bestTimeMs:
        r.completed && r.timeMs > 0
          ? prev.bestTimeMs > 0
            ? Math.min(prev.bestTimeMs, r.timeMs)
            : r.timeMs
          : prev.bestTimeMs,
    };
    persist();
  },

  isCompleted(level: number): boolean {
    return this.get(level).stars >= 1;
  },

  // Level 1 is always open; later levels unlock once the previous is completed.
  isUnlocked(level: number): boolean {
    return level <= 1 || this.isCompleted(level - 1);
  },

  // The furthest level the player can resume at (next uncompleted, capped at maxLevel).
  nextLevel(maxLevel: number): number {
    for (let n = 1; n <= maxLevel; n++) {
      if (!this.isCompleted(n)) return n;
    }
    return maxLevel;
  },

  totalStars(): number {
    return Object.values(load()).reduce((sum, p) => sum + (p.stars ?? 0), 0);
  },
};
