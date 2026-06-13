import type { LevelConfig } from '../../types';

// World 9 — Gauntlet · teach (precision): a single bar sweeps the open middle.
// Read its rhythm and send the star through when the lane is clear. Re-establishes
// the world's emphasis — timing under tighter margins than the early game.
export const level94: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 180, y: 120, radius: 36 },
  obstacles: [],
  movingPlatforms: [
    { x: 110, y: 400, width: 18, height: 260, to: { x: 250, y: 400 }, durationMs: 1500 },
  ],
  collectible: { x: 300, y: 300 },
  hint:      'Thread the sweeping bar',
  parTimeMs: 13000,
};
