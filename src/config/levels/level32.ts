import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 — Currents · master: a three-current zig-zag — rightward low, updraft
// on the right, then a leftward push into the goal. Chain all three to a small goal.
export const level32: LevelConfig = {
  ball:      { x: 180, y: 670 },
  goal:      { x: 180, y: 110, radius: 28 },
  obstacles: [],
  gravityZones: [
    { x: 90, y: 540, width: 130, height: 180, dir: { x: 1, y: 0 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.8 },
    { x: 280, y: 370, width: 120, height: 220, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
    { x: 160, y: 220, width: 220, height: 90, dir: { x: -1, y: 0 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.8 },
  ],
  collectible: { x: 310, y: 180 }, // against the final leftward push — off-route
  hint:      'Ride the currents: right, up, left',
  parTimeMs: 17000,
};
