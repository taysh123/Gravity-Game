import type { LevelConfig } from '../../types';

// World 4 — Peril · twist: thread the wall gap, then slip past a hazard guarding
// the way up. Precise routing under threat.
export const level18: LevelConfig = {
  ball:      { x: 90, y: 660 },
  goal:      { x: 180, y: 110, radius: 40 },
  obstacles: [
    { x: 110, y: 430, width: 200, height: 18 }, // gap on the right (x 210..360)
  ],
  hazards: [
    { x: 285, y: 300, radius: 30 }, // guards the exit above the gap
  ],
  collectible: { x: 90, y: 250 },
  hint:      'Thread the gap, dodge the hazard',
  parTimeMs: 17000,
};
