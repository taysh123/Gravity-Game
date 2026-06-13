import type { LevelConfig } from '../../types';

// World 11 — Labyrinth · teach (spatial): a full-width wall seals the way up. The
// rift is the only path — enter the lower mouth, emerge above the wall.
export const level114: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 140, radius: 34 },
  obstacles: [
    { x: 180, y: 430, width: 360, height: 18 }, // sealed wall
  ],
  portals: [
    { a: { x: 180, y: 540 }, b: { x: 180, y: 300 } },
  ],
  collectible: { x: 300, y: 560 },
  hint:      'The rift is the only way up',
  parTimeMs: 13000,
};
