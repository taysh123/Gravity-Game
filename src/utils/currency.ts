// Pure soft-currency ("Stardust") award math — no storage/Phaser, so it's testable.
// Stardust is earned by playing and spent on cosmetics (and, later, optionally
// doubled by a rewarded ad). It never affects gameplay/difficulty.

export function stardustForWin(stars: number, isDaily: boolean): number {
  const base = isDaily ? 15 : 5; // the daily is worth more, to pull players back
  return base + Math.max(0, stars) * 3; // +3 per star earned
}
