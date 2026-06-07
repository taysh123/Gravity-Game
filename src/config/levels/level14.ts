import type { LevelConfig } from '../../types';

// World 3 · timing decision: two lanes, two rhythms. The left bar sweeps fast (a
// tight window, but the gem + par are up there); the right bar is slow and safe.
// Pick the rhythm you can read.
export const level14: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 120, radius: 34 },
  obstacles: [],
  movingPlatforms: [
    { x: 90, y: 400, width: 16, height: 210, to: { x: 160, y: 400 }, durationMs: 850 },  // left lane — fast
    { x: 270, y: 400, width: 16, height: 210, to: { x: 200, y: 400 }, durationMs: 1600 }, // right lane — slow
  ],
  collectible: { x: 90, y: 200 }, // up the fast lane
  hint:      'Fast lane for the gem, slow lane to be safe',
  parTimeMs: 16000,
};
