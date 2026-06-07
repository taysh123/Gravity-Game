import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 — Currents · master: the three-current zig-zag (right → up → left) with
// a spike near the top transition. Chain the currents to a small goal and round
// the spike. 1★ achievable; the off-route gem + par are the mastery layer.
export const level32: LevelConfig = {
  ball:      { x: 180, y: 670 },
  goal:      { x: 180, y: 110, radius: 28 },
  obstacles: [],
  gravityZones: [
    { x: 90, y: 540, width: 130, height: 180, dir: { x: 1, y: 0 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.8 },
    { x: 280, y: 370, width: 120, height: 220, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
    { x: 160, y: 220, width: 220, height: 90, dir: { x: -1, y: 0 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.8 },
  ],
  hazards: [
    { x: 285, y: 285, radius: 24 }, // at the updraft → leftward transition
  ],
  collectible: { x: 310, y: 180 }, // against the final leftward push — off-route
  hint:      'Ride the currents: right, up, left — dodge the spike',
  parTimeMs: 17000,
};
