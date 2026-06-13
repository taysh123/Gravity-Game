import type { LevelConfig } from '../../types';

// World 15 — Homecoming · combine 2: commit up through a gate, rift across the
// sealed wall, and let an attract well reel you the final stretch home.
export const level160: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 180, y: 130, radius: 26 },
  obstacles: [
    { x: 180, y: 380, width: 360, height: 16 }, // sealed wall
  ],
  gates: [
    { x: 180, y: 560, width: 360, height: 16, dir: { x: 0, y: -1 } },
  ],
  portals: [
    { a: { x: 180, y: 470 }, b: { x: 300, y: 270 } },
  ],
  magnets: [
    { x: 300, y: 180, polarity: 'attract' },
  ],
  collectible: { x: 60, y: 470 },
  hint:      'Commit, rift, into the pull',
  parTimeMs: 18000,
};
