import type { LevelConfig } from '../../types';

// World 10 — Binary · SIGNATURE "THE BINARY STAR": twin attract wells flank the
// route up the middle — a gravitational saddle. Use one to slingshot, then the
// other to settle, threading the unstable line between two stars to the goal.
export const level112: LevelConfig = {
  ball:      { x: 180, y: 700 },
  goal:      { x: 180, y: 110, radius: 26 },
  obstacles: [],
  magnets: [
    { x: 110, y: 380, polarity: 'attract' },
    { x: 250, y: 380, polarity: 'attract' },
  ],
  collectible: { x: 180, y: 560 }, // low-centre, before the saddle
  title:     'THE BINARY STAR',
  hint:      'Thread the line between the twin stars',
  camera:    { introZoom: 1.5 },
  parTimeMs: 19000,
};
