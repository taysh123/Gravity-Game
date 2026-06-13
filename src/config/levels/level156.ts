import type { LevelConfig } from '../../types';

// World 15 — Homecoming · reprise 3: a wall, and the rift through it — the door
// home. Step through and you're nearly there.
export const level156: LevelConfig = {
  ball:      { x: 180, y: 680 },
  goal:      { x: 180, y: 140, radius: 28 },
  obstacles: [
    { x: 180, y: 430, width: 360, height: 16 }, // sealed wall
  ],
  portals: [
    { a: { x: 180, y: 540 }, b: { x: 180, y: 300 } },
  ],
  collectible: { x: 300, y: 560 },
  hint:      'Through the rift, almost home',
  parTimeMs: 14000,
};
