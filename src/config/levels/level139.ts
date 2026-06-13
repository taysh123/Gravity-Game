import type { LevelConfig } from '../../types';

// World 13 — Ascension · combine: twin repel wells guard the mouth of a rift. Slip
// between the two pushes to reach the rift, which lifts you to the goal.
export const level139: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 180, y: 120, radius: 26 },
  obstacles: [],
  magnets: [
    { x: 110, y: 430, polarity: 'repel' },
    { x: 250, y: 430, polarity: 'repel' },
  ],
  portals: [
    { a: { x: 180, y: 540 }, b: { x: 180, y: 280 } },
  ],
  collectible: { x: 300, y: 560 },
  hint:      'Slip the pushes into the rift',
  parTimeMs: 18000,
};
