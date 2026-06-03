import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 — Currents · combine: ride the left updraft, then steer right through
// the wall gap to the goal. Current lifts, routing finishes.
export const level8: LevelConfig = {
  ball:      { x: 80, y: 650 },
  goal:      { x: 285, y: 150, radius: 36 },
  obstacles: [
    { x: 110, y: 250, width: 200, height: 18 }, // spans x 10..210; gap on the right
  ],
  gravityZones: [
    { x: 80, y: 430, width: 120, height: 320, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  collectible: { x: 285, y: 350 },
  hint:      'Let the current lift you, then steer to the goal',
  parTimeMs: 11000,
};
