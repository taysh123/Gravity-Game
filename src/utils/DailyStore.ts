// Persisted Daily Challenge state (localStorage). Thin store — mirrors
// ProgressStore/SettingsStore. All date + streak math lives in `daily.ts`.
//
// Wave 2b Task 5 adds two ADDITIVE comeback hooks on top of the existing
// daily-challenge streak above (unchanged): an earned-only streak-freeze
// ("streak protection") and a daily login bonus keyed to its OWN
// consecutive-LOGIN-day counter (loginStreak/lastLoginDate) — deliberately
// separate from lastPlayedDate/streak, since a player can open the app
// without playing the daily challenge that day.
import {
  dateKey,
  dailyLevelFor,
  dailyChallengeFor,
  nextStreak,
  nextStreakWithFreeze,
  effectiveStreakWithFreeze,
  type DailyState,
  type DailyModifier,
} from './daily';
import { DAILY_LEVELS } from '../config/dailyLevels';
import { RewardStore } from './RewardStore';
import { grantLoginBonus } from './Rewards';
import { Analytics } from './Analytics';
import { streakFrozen } from './analyticsEvents';
import { RETENTION } from '../config/retention.config';

interface StoredDaily extends DailyState {
  bestStreak: number;
  freezeCount: number; // earned-only streak-protection tokens held — NEVER purchasable
  loginStreak: number; // consecutive-login-day counter (opening the app) — see claimLoginBonus
  lastLoginDate: string; // '' = never logged in; else a YYYY-MM-DD key driving loginStreak's gap logic
}

const KEY = 'gravity-flow:daily';
// Additive-only shape change (freezeCount/loginStreak/lastLoginDate are new
// fields, nothing existing changed meaning) — `{ ...EMPTY, ...stored }` below
// already defaults any field missing from old localStorage, so no KEY version
// bump is needed (mirrors how `bestStreak` was added onto this same KEY).
const EMPTY: StoredDaily = {
  lastPlayedDate: '',
  streak: 0,
  bestStreak: 0,
  freezeCount: 0,
  loginStreak: 0,
  lastLoginDate: '',
};

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

// Namespaced RewardStore key for "today's login bonus" — the once-per-day
// idempotency gate for claimLoginBonus (see Global Constraints: `"concern:id"`
// keys, e.g. `"login:2026-07-01"`).
function loginKey(today: string): string {
  return `login:${today}`;
}

export const DailyStore = {
  // The level number for today (deterministic). `levelCount` = LEVELS.length.
  // Legacy campaign-pick; the daily now uses todayChallenge() below.
  levelFor(levelCount: number, now: Date = new Date()): number {
    return dailyLevelFor(now, levelCount);
  },

  // Daily 2.0 — which curated daily level + modifier today.
  todayChallenge(now: Date = new Date()): { index: number; modifier: DailyModifier } {
    return dailyChallengeFor(now, DAILY_LEVELS.length);
  },

  isDoneToday(now: Date = new Date()): boolean {
    return load().lastPlayedDate === dateKey(now);
  },

  // Live streak for display (0 once a day is missed) — respects a held freeze:
  // a single missed day still reads as "alive" since the freeze could forgive
  // it (see daily.ts#effectiveStreakWithFreeze; identical to the old
  // effectiveStreak whenever no freeze is held).
  currentStreak(now: Date = new Date()): number {
    const state = load();
    return effectiveStreakWithFreeze(state, dateKey(now), state.freezeCount > 0);
  },

  bestStreak(): number {
    return load().bestStreak;
  },

  // Earned-only streak-protection tokens — NEVER purchasable. Granted only by
  // recordWin() crossing a streak milestone (RETENTION.STREAK_FREEZE_GRANT_EVERY).
  hasFreeze(): boolean {
    return load().freezeCount > 0;
  },

  freezeCount(): number {
    return load().freezeCount;
  },

  // Record a completed daily run. Idempotent within the same day. A held
  // freeze token silently forgives exactly one missed day
  // (daily.ts#nextStreakWithFreeze) and is consumed in that case; a fresh
  // token is earned back at the next streak milestone (capped so tokens
  // can't stockpile unboundedly).
  recordWin(now: Date = new Date()): number {
    const state = load();
    const today = dateKey(now);
    const { streak, usedFreeze } = nextStreakWithFreeze(state, today, state.freezeCount > 0);
    let freezeCount = state.freezeCount - (usedFreeze ? 1 : 0);
    // Guarded by `streak > state.streak` so this can't re-fire on the
    // already-counted-today replay path (scene.restart) or on a broken streak
    // that happens to land on a multiple of the cadence.
    const grewOntoMilestone = streak > state.streak && streak % RETENTION.STREAK_FREEZE_GRANT_EVERY === 0;
    if (grewOntoMilestone && freezeCount < RETENTION.STREAK_FREEZE_MAX) freezeCount += 1;
    cache = {
      ...state,
      lastPlayedDate: today,
      streak,
      bestStreak: Math.max(state.bestStreak, streak),
      freezeCount,
    };
    persist();
    if (usedFreeze) Analytics.track(streakFrozen(streak));
    return streak;
  },

  // Daily login bonus: a free Stardust/Fragments reward for opening the app,
  // escalating by CONSECUTIVE LOGIN DAYS — separate from (and independent of)
  // the daily-CHALLENGE streak above, since a player can open the app without
  // playing the daily. Idempotent: null if already claimed today.
  claimLoginBonus(now: Date = new Date()): { sd: number; fr: number } | null {
    const state = load();
    const today = dateKey(now);
    const key = loginKey(today);
    if (RewardStore.claimedToday(key, now)) return null;
    const loginState: DailyState = { lastPlayedDate: state.lastLoginDate, streak: state.loginStreak };
    const loginDay = nextStreak(loginState, today);
    const reward = grantLoginBonus(loginDay);
    RewardStore.claim(key, now);
    cache = { ...state, lastLoginDate: today, loginStreak: loginDay };
    persist();
    return reward;
  },

  // Read-only: has today's login bonus already been claimed? So the caller
  // (MainMenuScene) can render the chest's claimable/claimed state without a
  // side effect — claimLoginBonus() itself grants on the first call, so it
  // can't be used just to "peek" at the state.
  loginBonusClaimedToday(now: Date = new Date()): boolean {
    return RewardStore.claimedToday(loginKey(dateKey(now)), now);
  },
};
