import { describe, it, expect } from 'vitest';
import { streakTier, streakMilestone } from './streak';
import { RETENTION } from '../config/retention.config';

describe('streakTier', () => {
  it('is empty (level 0) below the first tier', () => {
    expect(streakTier(0)).toEqual({ label: '', level: 0 });
    expect(streakTier(1)).toEqual({ label: '', level: 0 });
    expect(streakTier(2)).toEqual({ label: '', level: 0 });
  });

  it('reaches FLOW (level 1) at the low threshold', () => {
    expect(streakTier(3)).toEqual({ label: '×3 FLOW', level: 1 });
    expect(streakTier(4)).toEqual({ label: '×4 FLOW', level: 1 });
  });

  it('reaches BLAZE (level 2) at the mid threshold', () => {
    expect(streakTier(5)).toEqual({ label: '×5 BLAZE', level: 2 });
    expect(streakTier(7)).toEqual({ label: '×7 BLAZE', level: 2 });
  });

  it('reaches NOVA (level 3) at the high threshold and stays there', () => {
    expect(streakTier(8)).toEqual({ label: '×8 NOVA', level: 3 });
    expect(streakTier(20)).toEqual({ label: '×20 NOVA', level: 3 });
  });
});

describe('streakMilestone', () => {
  it('fires at exact configured thresholds', () => {
    for (const m of RETENTION.STREAK_MILESTONES) {
      expect(streakMilestone(m.count)).toBe(m.stardust);
    }
  });

  it('is zero off-threshold and at zero', () => {
    expect(streakMilestone(0)).toBe(0);
    expect(streakMilestone(1)).toBe(0);
    expect(streakMilestone(4)).toBe(0);
    expect(streakMilestone(6)).toBe(0);
    expect(streakMilestone(13)).toBe(0);
    expect(streakMilestone(100)).toBe(0);
  });

  it('escalates in size across thresholds (bigger streak = bigger bonus)', () => {
    const amounts = RETENTION.STREAK_MILESTONES.map((m) => m.stardust);
    for (let i = 1; i < amounts.length; i++) {
      expect(amounts[i]).toBeGreaterThan(amounts[i - 1]);
    }
  });
});
