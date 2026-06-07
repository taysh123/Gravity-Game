import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 8 — Convergence · currents + portal + magnet. Ride the lift into the rift,
// emerge on the right, and let the well reel you into the goal.
export const level60: LevelConfig = {
  ball:      { x: 80, y: 660 },
  goal:      { x: 300, y: 130, radius: 26 },
  obstacles: [
    { x: 200, y: 360, width: 16, height: 260 }, // divider between columns
  ],
  gravityZones: [
    { x: 80, y: 440, width: 110, height: 320, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  portals: [
    { a: { x: 80, y: 200 }, b: { x: 300, y: 280 } },
  ],
  magnets: [
    { x: 300, y: 200, polarity: 'attract' },
  ],
  collectible: { x: 200, y: 620 }, // off-route, bottom-centre
  hint:      'Lift, rift, and the well brings you home',
  parTimeMs: 18000,
};
