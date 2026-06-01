import type { LevelConfig } from '../../types';

// World 4 — Peril · develop: a saw sweeps across the middle. Time the ball up
// past it when it's on the far side.
export const level21: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 110, radius: 42 },
  obstacles: [],
  hazards: [
    { x: 90, y: 390, radius: 28, to: { x: 270, y: 390 }, durationMs: 1400 },
  ],
  collectible: { x: 180, y: 250 },
  hint:      'Time the sweeping saw',
  parTimeMs: 17000,
};
