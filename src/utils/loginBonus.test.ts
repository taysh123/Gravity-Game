import { describe, it, expect } from 'vitest';
import { loginBonusFor } from './loginBonus';
import { RETENTION } from '../config/retention.config';

describe('loginBonusFor', () => {
  it('returns the day-1 reward for the first login', () => {
    expect(loginBonusFor(1)).toEqual(RETENTION.LOGIN_BONUS_LADDER[0]);
  });

  it('climbs across the ladder up to day 7 (the best reward)', () => {
    const day7 = loginBonusFor(7);
    expect(day7).toEqual(RETENTION.LOGIN_BONUS_LADDER[6]);
    const allSd = RETENTION.LOGIN_BONUS_LADDER.map((t) => t.sd);
    expect(day7.sd).toBe(Math.max(...allSd)); // day 7 pays the most Stardust of the ladder
  });

  it('escalates (non-decreasing Stardust) day over day across the ladder', () => {
    const sds = RETENTION.LOGIN_BONUS_LADDER.map((_, i) => loginBonusFor(i + 1).sd);
    for (let i = 1; i < sds.length; i++) {
      expect(sds[i]).toBeGreaterThanOrEqual(sds[i - 1]);
    }
  });

  it('cycles back to day 1 once the ladder length is exceeded', () => {
    const len = RETENTION.LOGIN_BONUS_LADDER.length;
    expect(loginBonusFor(len + 1)).toEqual(loginBonusFor(1));
    expect(loginBonusFor(2 * len)).toEqual(loginBonusFor(len));
    expect(loginBonusFor(2 * len + 1)).toEqual(loginBonusFor(1));
  });

  it('treats a non-positive or fractional day defensively as day 1', () => {
    expect(loginBonusFor(0)).toEqual(loginBonusFor(1));
    expect(loginBonusFor(-3)).toEqual(loginBonusFor(1));
    expect(loginBonusFor(NaN)).toEqual(loginBonusFor(1));
  });

  it('never returns a negative reward across many days', () => {
    for (let d = 1; d <= 30; d++) {
      const r = loginBonusFor(d);
      expect(r.sd).toBeGreaterThanOrEqual(0);
      expect(r.fr).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns a fresh object each call (no shared-reference mutation risk)', () => {
    const a = loginBonusFor(3);
    const b = loginBonusFor(3);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});
