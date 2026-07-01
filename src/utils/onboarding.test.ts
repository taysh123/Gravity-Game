import { describe, it, expect } from 'vitest';
import { nextUnlockHint } from './onboarding';
import { WORLDS } from '../config/worlds';
import { LEVELS } from '../config/levels';

// Derive expectations from WORLDS/LEVELS so this stays valid as worlds grow —
// mirrors the approach in world.test.ts.
describe('nextUnlockHint', () => {
  it('returns a correct "N more to unlock <next world>" for a mid-world level', () => {
    // World 1 FOUNDATIONS is levels 1-10; level 2 is mid-world, 8 short of 10,
    // and World 2 is CURRENTS.
    expect(nextUnlockHint(2)).toBe('8 more to unlock CURRENTS');
    // One level later, one fewer remaining.
    expect(nextUnlockHint(3)).toBe('7 more to unlock CURRENTS');
  });

  it('returns null on a world\'s last level (nothing left to count down)', () => {
    for (const w of WORLDS.slice(0, -1)) {
      expect(nextUnlockHint(w.to)).toBeNull();
    }
  });

  it('returns null on every level of the final world (no next world to unlock)', () => {
    const last = WORLDS[WORLDS.length - 1];
    expect(nextUnlockHint(last.from)).toBeNull();
    expect(nextUnlockHint(last.from + 1)).toBeNull();
    expect(nextUnlockHint(last.to)).toBeNull();
  });

  it('returns null at campaign end / out-of-range levels', () => {
    expect(nextUnlockHint(LEVELS.length)).toBeNull();
    expect(nextUnlockHint(LEVELS.length + 1)).toBeNull();
  });

  it('never returns an empty or negative-remaining string for any in-campaign level', () => {
    for (let level = 1; level <= LEVELS.length; level++) {
      const hint = nextUnlockHint(level);
      if (hint === null) continue;
      expect(hint).toMatch(/^\d+ more to unlock .+$/);
      const remaining = Number(hint.split(' ')[0]);
      expect(remaining).toBeGreaterThan(0);
    }
  });
});
