// Persisted Daily Challenge state (localStorage). Thin store — mirrors
// ProgressStore/SettingsStore. All date + streak math lives in `daily.ts`.
import { dateKey, dailyLevelFor, nextStreak, effectiveStreak, type DailyState } from './daily';

interface StoredDaily extends DailyState {
  bestStreak: number;
}

const KEY = 'gravity-flow:daily';
const EMPTY: StoredDaily = { lastPlayedDate: '', streak: 0, bestStreak: 0 };

let cache: StoredDaily | null = null;

function load(): StoredDaily {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as StoredDaily) } : { ...EMPTY };
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

export const DailyStore = {
  // The level number for today (deterministic). `levelCount` = LEVELS.length.
  levelFor(levelCount: number, now: Date = new Date()): number {
    return dailyLevelFor(now, levelCount);
  },

  isDoneToday(now: Date = new Date()): boolean {
    return load().lastPlayedDate === dateKey(now);
  },

  // Live streak for display (0 once a day is missed).
  currentStreak(now: Date = new Date()): number {
    return effectiveStreak(load(), dateKey(now));
  },

  bestStreak(): number {
    return load().bestStreak;
  },

  // Record a completed daily run. Idempotent within the same day.
  recordWin(now: Date = new Date()): number {
    const state = load();
    const today = dateKey(now);
    const streak = nextStreak(state, today);
    cache = {
      lastPlayedDate: today,
      streak,
      bestStreak: Math.max(state.bestStreak, streak),
    };
    persist();
    return streak;
  },
};
