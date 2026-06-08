import type { LevelConfig } from '../../types';

// World 6 — Rifts · twist: two rifts breach the wall, but the left exit is capped
// by a ledge — only the right rift leads up. Read the layout, pick the right one.
export const level47: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 120, radius: 30 },
  obstacles: [
    { x: 180, y: 430, width: 360, height: 18 }, // full-width wall
    { x: 90, y: 250, width: 170, height: 16 },  // ledge capping the LEFT exit
  ],
  portals: [
    { a: { x: 90, y: 540 }, b: { x: 90, y: 300 } },   // left rift -> under the ledge (dead end)
    { a: { x: 280, y: 540 }, b: { x: 290, y: 300 } }, // right rift -> open to the goal
  ],
  hazards: [
    { x: 90, y: 335, radius: 20 }, // a spike under the ledge — the WRONG rift now bites, not just stalls
  ],
  collectible: { x: 90, y: 360 }, // by the dead-end spike — the greedy, risky grab
  hint:      'Two rifts — pick wrong and the left one drops you on a spike',
  parTimeMs: 17000,
};
