import type { LevelConfig } from '../../types';

// World 6 — Rifts · combine: the rift drops you on the right, where an attract
// well reels you up to the goal. Use the well's pull on the exit.
export const level46: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 300, y: 130, radius: 32 },
  obstacles: [
    { x: 160, y: 430, width: 300, height: 16 }, // wall x10..310 — gap far right
  ],
  portals: [
    { a: { x: 90, y: 540 }, b: { x: 300, y: 300 } },
  ],
  magnets: [
    { x: 300, y: 200, polarity: 'attract' }, // reels the exit up to the goal
  ],
  collectible: { x: 90, y: 250 }, // off-route, upper-left
  hint:      'Exit the rift into the pull',
  parTimeMs: 16000,
};
