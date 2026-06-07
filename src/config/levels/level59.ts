import type { LevelConfig } from '../../types';

// World 8 — Convergence · platforms + hazards + gate. Commit up through the gate,
// then thread a sliding platform and a sweeping saw to the goal.
export const level59: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 120, radius: 26 },
  obstacles: [],
  gates: [
    { x: 180, y: 560, width: 360, height: 16, dir: { x: 0, y: -1 } },
  ],
  movingPlatforms: [
    { x: 120, y: 440, width: 150, height: 16, to: { x: 240, y: 440 }, durationMs: 1100 },
  ],
  hazards: [
    { x: 90, y: 280, radius: 24, to: { x: 270, y: 280 }, durationMs: 1200 },
  ],
  collectible: { x: 300, y: 500 }, // off-route between gate and platform
  hint:      'Commit up, then time the platform and saw',
  parTimeMs: 18000,
};
