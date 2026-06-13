import type { LevelConfig } from '../../types';

// World 11 — Labyrinth · combine: commit up through the gate (no return), then a
// sealed wall forces the rift — take the portal up to the goal.
export const level119: LevelConfig = {
  ball:      { x: 180, y: 680 },
  goal:      { x: 180, y: 140, radius: 30 },
  obstacles: [
    { x: 180, y: 360, width: 360, height: 16 }, // sealed wall above the portal entry
  ],
  gates: [
    { x: 180, y: 560, width: 360, height: 16, dir: { x: 0, y: -1 } }, // up-gate, low
  ],
  portals: [
    { a: { x: 180, y: 460 }, b: { x: 180, y: 250 } }, // between gate and wall <-> above wall
  ],
  collectible: { x: 300, y: 460 },
  hint:      'Up through the gate, then take the rift',
  parTimeMs: 16000,
};
