// Leaderboard-ready architecture. Daily results are recorded in a structured form
// behind this interface; the local impl persists to localStorage now, and Sprint 2+
// can swap in Google Play Games Services / a backend without touching callers.
export interface DailyResult {
  date: string; // YYYY-MM-DD
  index: number; // which curated daily level
  modifier: string;
  timeMs: number;
  stars: number;
}

// Gravity Run — best score per weekly seed. Same swap-to-PGS philosophy: callers
// only touch submitRun/bestRun; the local impl can be replaced by Play Games
// Services / a backend later without changing EndlessScene.
export interface RunResult {
  week: string; // weekKey(date) — the weekly seed everyone shares
  score: number;
  date: string; // YYYY-MM-DD the best was set
}

const KEY = 'gravity-flow:leaderboard:daily';
const RUN_KEY = 'gravity-flow:leaderboard:run';
const ENDLESS_KEY = 'gravity-flow:leaderboard:endless'; // all-time personal best (random runs)

function read(): DailyResult[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DailyResult[]) : [];
  } catch {
    return [];
  }
}

export const Leaderboard = {
  // Record (best-per-day) a daily result. Keeps the fastest time for each date.
  submitDaily(r: DailyResult): void {
    const all = read();
    const existing = all.find((x) => x.date === r.date);
    if (existing) {
      if (r.stars > existing.stars || (r.stars === existing.stars && r.timeMs < existing.timeMs)) {
        Object.assign(existing, r);
      }
    } else {
      all.push(r);
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {
      // storage disabled — keep nothing
    }
  },

  recentDaily(n = 14): DailyResult[] {
    return read().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, n);
  },

  // Record a run if it beats this week's best. Returns the (possibly new) best.
  submitRun(r: RunResult): number {
    let all: RunResult[] = [];
    try {
      const raw = localStorage.getItem(RUN_KEY);
      all = raw ? (JSON.parse(raw) as RunResult[]) : [];
    } catch { all = []; }
    const existing = all.find((x) => x.week === r.week);
    if (existing) {
      if (r.score > existing.score) { existing.score = r.score; existing.date = r.date; }
    } else {
      all.push(r);
    }
    try { localStorage.setItem(RUN_KEY, JSON.stringify(all)); } catch { /* storage off */ }
    return this.bestRun(r.week);
  },

  // This week's best run score (0 if none yet).
  bestRun(week: string): number {
    try {
      const raw = localStorage.getItem(RUN_KEY);
      const all = raw ? (JSON.parse(raw) as RunResult[]) : [];
      return all.find((x) => x.week === week)?.score ?? 0;
    } catch { return 0; }
  },

  // Endless mode (random seeds, not globally rankable) — a single all-time personal
  // best. Same swap-to-PGS shape: a global "all-time Endless" board can replace this.
  submitEndless(score: number): number {
    const best = this.bestEndless();
    if (score > best) {
      try { localStorage.setItem(ENDLESS_KEY, String(score)); } catch { /* storage off */ }
      return score;
    }
    return best;
  },

  bestEndless(): number {
    try { return Number(localStorage.getItem(ENDLESS_KEY)) || 0; } catch { return 0; }
  },
};
