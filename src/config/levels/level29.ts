import type { LevelConfig } from '../../types';

// World 1 — Foundations · master: a full weave into a goal tucked behind a lip.
// Three alternating gaps, then a precise final approach into the top-right pocket.
export const level29: LevelConfig = {
  ball:      { x: 180, y: 670 },
  goal:      { x: 300, y: 120, radius: 24 },
  obstacles: [
    { x: 120, y: 560, width: 220, height: 16 }, // gap on the right
    { x: 240, y: 420, width: 220, height: 16 }, // gap on the left
    { x: 120, y: 280, width: 220, height: 16 }, // gap on the right
    { x: 250, y: 178, width: 150, height: 16 }, // lip — the goal sits tucked beneath/right of it
  ],
  collectible: { x: 60, y: 300 }, // far left — a real detour off the climb
  hint:      'Weave up to the tucked goal',
  parTimeMs: 19000,
};
