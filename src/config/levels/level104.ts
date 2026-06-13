import type { LevelConfig } from '../../types';

// World 10 — Binary · teach (orbital): a single attract well sits off the straight
// line. Let its pull bend your climb into a slingshot toward the goal up-right.
export const level104: LevelConfig = {
  ball:      { x: 70, y: 680 },
  goal:      { x: 300, y: 150, radius: 34 },
  obstacles: [],
  magnets: [
    { x: 210, y: 430, polarity: 'attract' },
  ],
  collectible: { x: 150, y: 300 },
  hint:      'Let the well swing you across',
  parTimeMs: 12000,
};
