import type { LevelConfig } from '../../types';

// World 3 — Clockwork · teach: a barrier slides across a central gap, opening and
// closing it. Time the ball's run up through the gap while it's open.
export const level12: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 110, radius: 46 },
  obstacles: [
    { x: 70,  y: 390, width: 120, height: 18 }, // left wall  (x 10..130)
    { x: 290, y: 390, width: 120, height: 18 }, // right wall (x 230..350)
  ],
  movingPlatforms: [
    { x: 180, y: 390, width: 110, height: 18, to: { x: 60, y: 390 }, durationMs: 1300 },
  ],
  collectible: { x: 180, y: 250 },
  hint:      'Time your run through the gap',
  parTimeMs: 16000,
};
