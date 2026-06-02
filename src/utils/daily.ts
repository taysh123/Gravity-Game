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

// Deterministic level for a given day. Same day → same level; spreads across days.
export function dailyLevelFor(d: Date, levelCount: number): number {
  if (levelCount <= 1) return 1;
  // FNV-1a hash of the date key — stable across sessions/devices.
  let h = 0x811c9dc5;
  const key = dateKey(d);
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (Math.abs(h) % levelCount) + 1;
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
