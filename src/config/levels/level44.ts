import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 6 — Rifts · combine: an updraft on the left feeds the ball up into the
// rift; it emerges by the goal on the right. A divider stops you flying direct.
export const level44: LevelConfig = {
  ball:      { x: 110, y: 660 },
  goal:      { x: 300, y: 130, radius: 34 },
  obstacles: [
    { x: 230, y: 320, width: 16, height: 240 }, // divider between the two columns
  ],
  gravityZones: [
    { x: 110, y: 450, width: 110, height: 320, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  portals: [
    { a: { x: 110, y: 200 }, b: { x: 300, y: 230 } }, // A at the top of the lift, B by the goal
  ],
  collectible: { x: 200, y: 610 }, // off-route, bottom-centre
  hint:      'Let the lift feed you into the rift',
  parTimeMs: 15000,
};
