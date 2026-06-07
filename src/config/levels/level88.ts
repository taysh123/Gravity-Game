import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 8 — Convergence · AHA (improvise): two honest ways up. Ride the updraft
// through the left gap, OR take the rift on the right — both reach the goal. There's
// no single intended line; read the board and pick yours.
export const level88: LevelConfig = {
  ball:      { x: 180, y: 670 },
  goal:      { x: 180, y: 120, radius: 30 },
  obstacles: [
    { x: 180, y: 430, width: 200, height: 16 }, // centre wall — left gap x20..80, right gap x280..340
  ],
  gravityZones: [
    { x: 50, y: 470, width: 90, height: 300, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH }, // left route: lift
  ],
  portals: [
    { a: { x: 310, y: 560 }, b: { x: 180, y: 250 } }, // right route: rift to near the goal
  ],
  collectible: { x: 50, y: 200 }, // top of the updraft (left-route reward)
  hint:      'More than one way up — pick yours',
  parTimeMs: 17000,
};
