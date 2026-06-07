// Persisted achievement unlocks (localStorage). Evaluates the pure achievements
// layer against a stats snapshot, persists the union, and reports what was newly
// unlocked (so the win overlay can toast it).
import { ACHIEVEMENTS, evaluate, type AchievementDef, type StatsSnapshot } from './achievements';

const KEY = 'gravity-flow:achievements';

let cache: Set<string> | null = null;

function load(): Set<string> {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    cache = new Set();
  }
  return cache;
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...(cache ?? [])]));
  } catch {
    // storage disabled — keep in-memory
  }
}

export const AchievementStore = {
  isUnlocked(id: string): boolean {
    return load().has(id);
  },

  unlockedCount(): number {
    return load().size;
  },

  // Merge the snapshot's satisfied achievements; return the ones newly unlocked.
  syncAndGetNew(snapshot: StatsSnapshot): AchievementDef[] {
    const have = load();
    const fresh = evaluate(snapshot).filter((id) => !have.has(id));
    if (fresh.length) {
      fresh.forEach((id) => have.add(id));
      persist();
    }
    return fresh
      .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
      .filter((a): a is AchievementDef => !!a);
  },
};
