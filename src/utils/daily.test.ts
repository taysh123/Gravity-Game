import { describe, it, expect } from 'vitest';
import { dateKey, dailyLevelFor, nextStreak, effectiveStreak } from './daily';

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
