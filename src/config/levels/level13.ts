import type { LevelConfig } from '../../types';

// World 3 — Clockwork · develop: a vertical bar sweeps across the open middle.
// Send the ball across when the bar is on the far side.
export const level13: LevelConfig = {
  ball:      { x: 65, y: 640 },
  goal:      { x: 310, y: 150, radius: 36 },
  obstacles: [],
  movingPlatforms: [
    { x: 130, y: 400, width: 18, height: 230, to: { x: 290, y: 400 }, durationMs: 1500 },
  ],
  collectible: { x: 200, y: 300 },
  hint:      'Slip past the sweeping bar',
  parTimeMs: 13000,
};
