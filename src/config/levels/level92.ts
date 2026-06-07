import type { LevelConfig } from '../../types';

// World 3 · L18 — TOY/SHOT "Orrery": gather three orbs set like planets, weaving the
// slow sweep of a gear-bar, then bring the star home — the points connect into a
// clockwork constellation. A playful, screenshot-worthy multi-goal toy that gives
// the timing world a moment of delight (no fail). Gem off to the side = 3rd star.
export const level92: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 150, radius: 40 },
  obstacles: [],
  movingPlatforms: [
    { x: 110, y: 305, width: 120, height: 14, to: { x: 250, y: 305 }, durationMs: 1400 }, // gentle gear sweep (soft obstacle)
  ],
  collectibles: [
    { x: 180, y: 420 },
    { x: 85,  y: 520 },
    { x: 275, y: 520 },
  ],
  collectAllToWin: true,
  collectible: { x: 305, y: 240 }, // gold gem → 3rd star
  hint:      'Gather the orrery — connect the clockwork home',
  parTimeMs: 18000,
};
