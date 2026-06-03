import type { LevelConfig } from '../../types';

// World 3 — Clockwork · twist: two bars sweep in opposite phase, faster than
// before (1.0s). Read the tighter rhythm and thread both gaps in one rise.
export const level33: LevelConfig = {
  ball:      { x: 180, y: 670 },
  goal:      { x: 180, y: 110, radius: 34 },
  obstacles: [],
  movingPlatforms: [
    { x: 120, y: 480, width: 150, height: 16, to: { x: 240, y: 480 }, durationMs: 1000 }, // lower, fast
    { x: 240, y: 300, width: 150, height: 16, to: { x: 120, y: 300 }, durationMs: 1000 }, // upper, opposite
  ],
  collectible: { x: 300, y: 390 }, // off to the side between the bars
  hint:      'Faster gates — read the rhythm',
  parTimeMs: 18000,
};
