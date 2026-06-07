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

const KEY = 'gravity-flow:leaderboard:daily';

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
};
