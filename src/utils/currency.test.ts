import { describe, it, expect } from 'vitest';
import { stardustForWin } from './currency';

describe('stardustForWin', () => {
  it('awards base + 3 per star for a campaign level', () => {
    expect(stardustForWin(1, false)).toBe(8); // 5 + 3
    expect(stardustForWin(3, false)).toBe(14); // 5 + 9
  });
  it('awards more for the daily', () => {
    expect(stardustForWin(1, true)).toBe(18); // 15 + 3
    expect(stardustForWin(3, true)).toBe(24); // 15 + 9
  });
  it('never goes below the base', () => {
    expect(stardustForWin(0, false)).toBe(5);
    expect(stardustForWin(-2, false)).toBe(5);
  });
});
