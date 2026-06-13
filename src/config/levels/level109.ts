import type { LevelConfig } from '../../types';

// World 10 — Binary · combine: an attract well reels you toward the goal, but a
// spike sits on the swing line. Let the pull work while you steer wide of the spike.
export const level109: LevelConfig = {
  ball:      { x: 80, y: 680 },
  goal:      { x: 300, y: 140, radius: 30 },
  obstacles: [],
  magnets: [
    { x: 285, y: 270, polarity: 'attract' },
  ],
  hazards: [
    { x: 200, y: 360, radius: 26 }, // on the swing line
  ],
  collectible: { x: 80, y: 220 },
  hint:      'Swing past the spike, into the well',
  parTimeMs: 15000,
};
