import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 · AHA (prediction relay): three currents chain into one route — lift up
// the left, a crosswind carries you across, a second lift raises you to the goal.
// Plan the whole flow path before you start.
export const level32: LevelConfig = {
  ball:      { x: 70, y: 660 },
  goal:      { x: 300, y: 130, radius: 28 },
  obstacles: [],
  gravityZones: [
    { x: 70, y: 500, width: 100, height: 260, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
    { x: 185, y: 350, width: 200, height: 80, dir: { x: 1, y: 0 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.9 },
    { x: 300, y: 230, width: 100, height: 200, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  collectible: { x: 70, y: 200 }, // top of the first lift, off-route
  hint:      'Plan the relay: up, across, up',
  parTimeMs: 17000,
};
