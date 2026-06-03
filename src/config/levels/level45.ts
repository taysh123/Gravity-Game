import type { LevelConfig } from '../../types';

// World 6 — Rifts · combine: through the rift, then a sliding gate guards the way
// to the goal. Jump across, then time the gate.
export const level45: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 120, radius: 32 },
  obstacles: [
    { x: 180, y: 430, width: 360, height: 18 }, // full-width wall — rift required
  ],
  portals: [
    { a: { x: 180, y: 540 }, b: { x: 180, y: 300 } },
  ],
  movingPlatforms: [
    { x: 120, y: 220, width: 150, height: 16, to: { x: 240, y: 220 }, durationMs: 1200 }, // gate above the exit
  ],
  collectible: { x: 300, y: 300 }, // off-route, beside the exit
  hint:      'Through the rift, then time the gate',
  parTimeMs: 16000,
};
