import type { LevelConfig } from '../../types';

// World 4 — Peril · teach: a spiked hazard sits dead centre. Touching red fails
// the run — route the ball around it to the goal.
export const level17: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 110, radius: 42 },
  obstacles: [],
  hazards: [
    { x: 180, y: 390, radius: 38 },
  ],
  collectible: { x: 300, y: 390 }, // tucked beside the hazard
  hint:      "Don't touch the red — route around it",
  parTimeMs: 11000,
};
