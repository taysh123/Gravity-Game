import type { LevelConfig } from '../../types';

// World 4 — Peril · timed: a hard countdown. Reach the goal before the clock
// runs out (it fails the run) — and don't clip the hazard on the way.
export const level19: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 120, radius: 40 },
  obstacles: [],
  hazards: [
    { x: 110, y: 400, radius: 28 },
  ],
  collectible: { x: 290, y: 400 },
  hint:      'Beat the clock — reach the goal in time',
  parTimeMs: 6000,
  timeLimitMs: 8000,
};
