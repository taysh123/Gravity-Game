import type { LevelConfig } from '../../types';

// World 1 · L9 — AHA (decoy): the inviting centre gap leads up into a sealed
// dead-end box (where the gem tempts you). The real, faster route is the narrow
// far-LEFT gap that wraps up around the box to the goal. "The obvious way is a trap."
export const level29: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 120, radius: 30 },
  obstacles: [
    { x: 95,  y: 440, width: 130, height: 14 }, // lower-left wall (x 30..160)
    { x: 265, y: 440, width: 130, height: 14 }, // lower-right wall (x 200..330) — gaps: centre 160..200, far-left 0..30, far-right 330..360
    { x: 180, y: 340, width: 130, height: 14 }, // dead-end box roof (x 115..245)
    { x: 120, y: 390, width: 14, height: 100 },  // box left wall
    { x: 240, y: 390, width: 14, height: 100 },  // box right wall — center gap feeds into this capped box
  ],
  collectible: { x: 180, y: 400 }, // inside the dead-end box — the bait
  hint:      'The obvious way is a trap',
  parTimeMs: 16000,
};
