import type { LevelConfig } from '../../types';

// World 14 — Singularity · precision 4: a rift is the only way into a tight pocket
// behind a divider. Line up the entry — the exit drops you in a small, walled space.
export const level147: LevelConfig = {
  ball:      { x: 90, y: 690 },
  goal:      { x: 300, y: 140, radius: 24 },
  obstacles: [
    { x: 200, y: 430, width: 16, height: 240 }, // divider
    { x: 300, y: 300, width: 120, height: 16 }, // pocket floor
  ],
  portals: [
    { a: { x: 120, y: 560 }, b: { x: 300, y: 240 } }, // exit into the pocket
  ],
  collectible: { x: 120, y: 250 },
  hint:      'Rift into the pocket',
  parTimeMs: 16000,
};
