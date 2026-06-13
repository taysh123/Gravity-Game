import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 — Currents · develop: an updraft column on the left lifts you fast, but
// the goal is up and to the RIGHT. Ride the lift, then break out of the current
// at the top and steer across — reading where a current stops being useful.
export const level93: LevelConfig = {
  ball:      { x: 90, y: 660 },
  goal:      { x: 290, y: 150, radius: 38 },
  obstacles: [],
  gravityZones: [
    { x: 90, y: 430, width: 120, height: 360, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  collectible: { x: 90, y: 175 }, // top of the lift — past where you break right (off-route)
  hint:      'Ride the lift, then break for the goal',
  parTimeMs: 13000,
};
