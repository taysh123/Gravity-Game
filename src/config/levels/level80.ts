import type { LevelConfig } from '../../types';

// World 6 — Rifts · AHA (think backwards): the goal sits in a sealed nook, top-left.
// Nothing reaches it directly — the only mouth that *exits* inside the nook is fed
// by the far rift down in the bottom-right. So travel AWAY from the goal, into the
// far rift, to emerge right beside it.
export const level80: LevelConfig = {
  ball:      { x: 300, y: 660 },
  goal:      { x: 90, y: 160, radius: 30 },
  obstacles: [
    { x: 90, y: 300, width: 200, height: 16 }, // nook floor (x 0..190)
    { x: 183, y: 200, width: 16, height: 230 }, // nook right wall (x 175..191, y 85..315)
  ],
  portals: [
    { a: { x: 90, y: 250 }, b: { x: 300, y: 560 } }, // A is inside the sealed nook; B is the far rift
  ],
  collectible: { x: 300, y: 300 }, // off-route, mid-right
  hint:      'To reach the goal, enter the far rift',
  parTimeMs: 15000,
};
