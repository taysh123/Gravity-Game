// Lifetime player stats (localStorage). Holds the event counters that aren't
// derivable from ProgressStore (deaths, portal jumps), and assembles the full
// StatsSnapshot for achievement evaluation by combining them with ProgressStore /
// DailyStore / world structure. Thin store — mirrors ProgressStore.
import type { StatsSnapshot } from './achievements';
import { ProgressStore } from './ProgressStore';
import { DailyStore } from './DailyStore';
import { LEVELS } from '../config/levels';
import { WORLDS } from '../config/worlds';

interface RawStats {
  deaths: number;
  portalJumps: number;
}

const KEY = 'gravity-flow:stats';
const EMPTY: RawStats = { deaths: 0, portalJumps: 0 };

let cache: RawStats | null = null;

function load(): RawStats {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as RawStats) } : { ...EMPTY };
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

export const StatsStore = {
  recordDeath(): void {
    load().deaths++;
    persist();
  },
  recordPortalJump(): void {
    load().portalJumps++;
    persist();
  },

  deaths(): number {
    return load().deaths;
  },
  portalJumps(): number {
    return load().portalJumps;
  },

  // Aggregate everything into the snapshot the achievements layer evaluates.
  collectSnapshot(): StatsSnapshot {
    const total = LEVELS.length;
    let levelsCompleted = 0;
    let perfectLevels = 0;
    let gemsOwned = 0;
    for (let n = 1; n <= total; n++) {
      const pr = ProgressStore.get(n);
      if (pr.stars >= 1) levelsCompleted++;
      if (pr.stars >= 3) perfectLevels++;
      if (pr.gem) gemsOwned++;
    }
    let worldsMastered = 0;
    for (const w of WORLDS) {
      if (w.from > total) continue;
      let all3 = true;
      for (let n = w.from; n <= Math.min(w.to, total); n++) {
        if (ProgressStore.get(n).stars < 3) {
          all3 = false;
          break;
        }
      }
      if (all3) worldsMastered++;
    }
    const raw = load();
    return {
      levelsCompleted,
      totalLevels: total,
      totalStars: ProgressStore.totalStars(),
      perfectLevels,
      gemsOwned,
      worldsMastered,
      portalJumps: raw.portalJumps,
      deaths: raw.deaths,
      bestDailyStreak: DailyStore.bestStreak(),
    };
  },
};
