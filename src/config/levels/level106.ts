import type { LevelConfig } from '../../types';

// World 10 — Binary · develop: through the wall's gap, then an attract well by the
// goal reels you the last stretch. Use the pull to finish the climb.
export const level106: LevelConfig = {
  ball:      { x: 80, y: 680 },
  goal:      { x: 300, y: 140, radius: 32 },
  obstacles: [
    { x: 120, y: 470, width: 200, height: 16 }, // gap on the right
  ],
  magnets: [
    { x: 290, y: 280, polarity: 'attract' },
  ],
  collectible: { x: 120, y: 300 },
  hint:      'Through the gap, into the pull',
  parTimeMs: 13000,
};
