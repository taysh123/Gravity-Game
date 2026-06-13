import type { LevelConfig } from '../../types';

// World 14 — Singularity · twist: a zigzag weave to a pinpoint goal, against a hard
// clock. Precision and speed at once, with no margin for a wasted pass.
export const level148: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 300, y: 120, radius: 22 },
  obstacles: [
    { x: 130, y: 450, width: 220, height: 16 }, // gap on the right
    { x: 250, y: 300, width: 220, height: 16 }, // gap on the left
  ],
  collectible: { x: 70, y: 560 },
  hint:      'Weave fast — small goal, hard clock',
  parTimeMs: 10000,
  timeLimitMs: 15000,
};
