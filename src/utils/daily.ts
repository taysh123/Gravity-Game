// Pure logic for the Daily Challenge: a deterministic per-day level pick and the
// streak math. No storage here (DailyStore wraps this with localStorage), so it
// stays trivially testable.

export interface DailyState {
  lastPlayedDate: string; // '' = never played; otherwise a YYYY-MM-DD key
  streak: number;
}

// Local calendar day as YYYY-MM-DD (the challenge resets at the player's midnight).
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Whole days from key `a` to key `b` (b - a). Parsed at UTC midnight so DST
// shifts can't produce a fractional/off-by-one day.
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const ams = Date.UTC(ay, am - 1, ad);
  const bms = Date.UTC(by, bm - 1, bd);
  return Math.round((bms - ams) / 86_400_000);
}

// FNV-1a hash of a string — stable across sessions/devices.
function fnv(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h);
}

// Deterministic campaign level for a given day (legacy daily; kept for compat).
export function dailyLevelFor(d: Date, levelCount: number): number {
  if (levelCount <= 1) return 1;
  return (fnv(dateKey(d)) % levelCount) + 1;
}

// Daily 2.0 — a rotating modifier keeps the daily fresh even with a finite pool.
export type DailyModifier = 'none' | 'timed' | 'gemRush';
// 'none' weighted higher so most days play straight.
const MODIFIERS: DailyModifier[] = ['none', 'none', 'timed', 'gemRush'];

// Deterministic daily pick: which curated daily level + which modifier, from the
// date. Different hash bits drive index vs modifier so they aren't correlated.
export function dailyChallengeFor(d: Date, poolSize: number): { index: number; modifier: DailyModifier } {
  const h = fnv(dateKey(d));
  const index = poolSize > 0 ? h % poolSize : 0;
  const modifier = MODIFIERS[(h >>> 5) % MODIFIERS.length];
  return { index, modifier };
}

// Bonus Stardust for hitting a streak milestone (3 / 7 / 14 / 30 days).
export function streakReward(streak: number): number {
  if (streak > 0 && streak % 30 === 0) return 100;
  if (streak > 0 && streak % 14 === 0) return 50;
  if (streak > 0 && streak % 7 === 0) return 25;
  if (streak > 0 && streak % 3 === 0) return 10;
  return 0;
}

// The streak value after completing today's challenge.
export function nextStreak(state: DailyState, today: string): number {
  if (state.lastPlayedDate === today) return state.streak; // already counted today
  if (state.lastPlayedDate && daysBetween(state.lastPlayedDate, today) === 1) {
    return state.streak + 1; // consecutive day
  }
  return 1; // first play or a broken streak
}

// The streak to display now: alive only if the last play was today or yesterday.
export function effectiveStreak(state: DailyState, today: string): number {
  if (!state.lastPlayedDate) return 0;
  const gap = daysBetween(state.lastPlayedDate, today);
  return gap === 0 || gap === 1 ? state.streak : 0;
}
