import { describe, it, expect } from 'vitest';
import {
  dateKey,
  dailyLevelFor,
  nextStreak,
  effectiveStreak,
  dailyChallengeFor,
  streakReward,
  nextStreakWithFreeze,
  effectiveStreakWithFreeze,
} from './daily';

describe('dateKey', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(dateKey(new Date(2026, 5, 2))).toBe('2026-06-02'); // month is 0-based → June
    expect(dateKey(new Date(2026, 0, 9))).toBe('2026-01-09');
  });
});

describe('dailyLevelFor', () => {
  it('is deterministic for the same day', () => {
    const d = new Date(2026, 5, 2);
    expect(dailyLevelFor(d, 27)).toBe(dailyLevelFor(d, 27));
  });

  it('always returns a level within [1, levelCount]', () => {
    for (let day = 1; day <= 60; day++) {
      const lvl = dailyLevelFor(new Date(2026, 2, day), 27);
      expect(lvl).toBeGreaterThanOrEqual(1);
      expect(lvl).toBeLessThanOrEqual(27);
    }
  });

  it('returns 1 when there is only one level', () => {
    expect(dailyLevelFor(new Date(2026, 5, 2), 1)).toBe(1);
  });

  it('varies across days (not a constant)', () => {
    const picks = new Set<number>();
    for (let day = 1; day <= 30; day++) picks.add(dailyLevelFor(new Date(2026, 4, day), 27));
    expect(picks.size).toBeGreaterThan(1);
  });
});

describe('nextStreak', () => {
  it('starts a streak at 1 with no prior play', () => {
    expect(nextStreak({ lastPlayedDate: '', streak: 0 }, '2026-06-02')).toBe(1);
  });

  it('increments when the previous play was yesterday', () => {
    expect(nextStreak({ lastPlayedDate: '2026-06-01', streak: 3 }, '2026-06-02')).toBe(4);
  });

  it('is idempotent when already played today', () => {
    expect(nextStreak({ lastPlayedDate: '2026-06-02', streak: 3 }, '2026-06-02')).toBe(3);
  });

  it('resets to 1 when a day was missed', () => {
    expect(nextStreak({ lastPlayedDate: '2026-05-31', streak: 5 }, '2026-06-02')).toBe(1);
  });
});

describe('dailyChallengeFor', () => {
  it('is deterministic and in range for a day', () => {
    const d = new Date(2026, 5, 2);
    const a = dailyChallengeFor(d, 10);
    const b = dailyChallengeFor(d, 10);
    expect(a).toEqual(b);
    expect(a.index).toBeGreaterThanOrEqual(0);
    expect(a.index).toBeLessThan(10);
    expect(['none', 'timed', 'gemRush']).toContain(a.modifier);
  });
  it('varies the level across days', () => {
    const picks = new Set<number>();
    for (let day = 1; day <= 25; day++) picks.add(dailyChallengeFor(new Date(2026, 7, day), 10).index);
    expect(picks.size).toBeGreaterThan(1);
  });
  it('handles an empty pool safely', () => {
    expect(dailyChallengeFor(new Date(2026, 5, 2), 0).index).toBe(0);
  });
});

describe('streakReward', () => {
  it('rewards milestones', () => {
    expect(streakReward(3)).toBe(10);
    expect(streakReward(7)).toBe(25);
    expect(streakReward(14)).toBe(50);
    expect(streakReward(30)).toBe(100);
  });
  it('is zero off-milestone and at zero', () => {
    expect(streakReward(0)).toBe(0);
    expect(streakReward(5)).toBe(0);
  });
});

describe('effectiveStreak (display)', () => {
  it('shows the streak when played today', () => {
    expect(effectiveStreak({ lastPlayedDate: '2026-06-02', streak: 4 }, '2026-06-02')).toBe(4);
  });

  it('keeps the streak alive when the last play was yesterday', () => {
    expect(effectiveStreak({ lastPlayedDate: '2026-06-01', streak: 4 }, '2026-06-02')).toBe(4);
  });

  it('shows 0 once a day has been missed', () => {
    expect(effectiveStreak({ lastPlayedDate: '2026-05-31', streak: 5 }, '2026-06-02')).toBe(0);
    expect(effectiveStreak({ lastPlayedDate: '', streak: 0 }, '2026-06-02')).toBe(0);
  });
});

// Wave 2b Task 5 — streak protection: a held freeze token forgives EXACTLY one
// missed day (a 2-day gap). Regression-guard: the no-freeze path must stay
// byte-identical to nextStreak/effectiveStreak (existing cases above are
// UNCHANGED — these are additive sibling functions, not replacements).
describe('nextStreakWithFreeze', () => {
  it('matches nextStreak exactly whenever hasFreeze is false (regression guard)', () => {
    const cases: Array<{ state: { lastPlayedDate: string; streak: number }; today: string }> = [
      { state: { lastPlayedDate: '', streak: 0 }, today: '2026-06-02' },
      { state: { lastPlayedDate: '2026-06-01', streak: 3 }, today: '2026-06-02' },
      { state: { lastPlayedDate: '2026-06-02', streak: 3 }, today: '2026-06-02' },
      { state: { lastPlayedDate: '2026-05-31', streak: 5 }, today: '2026-06-02' }, // 2-day gap
      { state: { lastPlayedDate: '2026-05-30', streak: 5 }, today: '2026-06-02' }, // 3-day gap
    ];
    for (const { state, today } of cases) {
      expect(nextStreakWithFreeze(state, today, false)).toEqual({
        streak: nextStreak(state, today),
        usedFreeze: false,
      });
    }
  });

  it('is idempotent when already played today, freeze or not', () => {
    expect(nextStreakWithFreeze({ lastPlayedDate: '2026-06-02', streak: 3 }, '2026-06-02', true)).toEqual({
      streak: 3,
      usedFreeze: false,
    });
  });

  it('increments on a consecutive day without touching the freeze', () => {
    expect(nextStreakWithFreeze({ lastPlayedDate: '2026-06-01', streak: 3 }, '2026-06-02', true)).toEqual({
      streak: 4,
      usedFreeze: false,
    });
  });

  it('forgives a 2-day gap (one missed day) when a freeze is held: keeps + increments, and consumes it', () => {
    expect(nextStreakWithFreeze({ lastPlayedDate: '2026-05-31', streak: 5 }, '2026-06-02', true)).toEqual({
      streak: 6,
      usedFreeze: true,
    });
  });

  it('without a freeze, that same 2-day gap resets to 1 (existing behavior, unchanged)', () => {
    expect(nextStreakWithFreeze({ lastPlayedDate: '2026-05-31', streak: 5 }, '2026-06-02', false)).toEqual({
      streak: 1,
      usedFreeze: false,
    });
  });

  it('a freeze cannot forgive a gap larger than one missed day (3+ days still resets)', () => {
    expect(nextStreakWithFreeze({ lastPlayedDate: '2026-05-30', streak: 5 }, '2026-06-02', true)).toEqual({
      streak: 1,
      usedFreeze: false,
    });
  });
});

describe('effectiveStreakWithFreeze (display)', () => {
  it('matches effectiveStreak exactly whenever hasFreeze is false (regression guard)', () => {
    const cases: Array<{ state: { lastPlayedDate: string; streak: number }; today: string }> = [
      { state: { lastPlayedDate: '2026-06-02', streak: 4 }, today: '2026-06-02' },
      { state: { lastPlayedDate: '2026-06-01', streak: 4 }, today: '2026-06-02' },
      { state: { lastPlayedDate: '2026-05-31', streak: 5 }, today: '2026-06-02' },
      { state: { lastPlayedDate: '', streak: 0 }, today: '2026-06-02' },
    ];
    for (const { state, today } of cases) {
      expect(effectiveStreakWithFreeze(state, today, false)).toBe(effectiveStreak(state, today));
    }
  });

  it('keeps showing the streak across a 2-day gap when a freeze is held (not yet consumed)', () => {
    expect(effectiveStreakWithFreeze({ lastPlayedDate: '2026-05-31', streak: 5 }, '2026-06-02', true)).toBe(5);
  });

  it('still shows 0 beyond a 2-day gap even with a freeze (forgives exactly one missed day)', () => {
    expect(effectiveStreakWithFreeze({ lastPlayedDate: '2026-05-30', streak: 5 }, '2026-06-02', true)).toBe(0);
  });
});
