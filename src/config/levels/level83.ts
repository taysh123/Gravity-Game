import type { LevelConfig } from '../../types';

// World 7 — Gates · AHA (the only door is on top): the goal sits in a pit at the
// bottom, but the pit is walled on every side — its one opening is a DOWN-gate in
// the roof. So to reach the low goal you must first climb high, line up over the
// pit, and drop in. Counterintuitive: go up to go down.
export const level83: LevelConfig = {
  ball:      { x: 70, y: 680 },
  goal:      { x: 180, y: 680, radius: 34 },
  obstacles: [
    { x: 110, y: 640, width: 16, height: 180 }, // pit left wall  (y 550..730)
    { x: 250, y: 640, width: 16, height: 180 }, // pit right wall (y 550..730)
  ],
  gates: [
    { x: 180, y: 560, width: 140, height: 16, dir: { x: 0, y: 1 } }, // roof: down-only entry
  ],
  collectible: { x: 70, y: 250 }, // off-route, up the left climb
  hint:      'The only door is on top — climb up, then drop in',
  parTimeMs: 16000,
};
