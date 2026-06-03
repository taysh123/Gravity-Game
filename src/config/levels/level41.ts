import type { LevelConfig } from '../../types';

// World 6 — Rifts · teach: a solid wall seals the arena. The only way up is the
// rift — pull the ball into the lower mouth and it reappears at the upper one.
export const level41: LevelConfig = {
  ball:      { x: 180, y: 670 },
  goal:      { x: 180, y: 120, radius: 44 },
  obstacles: [
    { x: 180, y: 400, width: 360, height: 18 }, // full-width wall — no way around
  ],
  portals: [
    { a: { x: 180, y: 530 }, b: { x: 180, y: 270 } }, // below the wall <-> above it
  ],
  collectible: { x: 300, y: 600 }, // off to the side, below
  hint:      'Enter the rift, appear across',
  parTimeMs: 12000,
};
