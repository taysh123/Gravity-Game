import type { LevelConfig } from '../../types';

// World 11 — Labyrinth · combine 2: commit up through a partial gate on the left,
// then a rift carries you across to the goal's side. Plan the two-step route.
export const level120: LevelConfig = {
  ball:      { x: 90, y: 680 },
  goal:      { x: 300, y: 140, radius: 30 },
  obstacles: [],
  gates: [
    { x: 120, y: 480, width: 240, height: 16, dir: { x: 0, y: -1 } }, // up-gate over the left column
  ],
  portals: [
    { a: { x: 120, y: 300 }, b: { x: 300, y: 260 } }, // cross to the goal side
  ],
  collectible: { x: 90, y: 250 },
  hint:      'Commit up, then rift across',
  parTimeMs: 16000,
};
