import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 3 · combine (lift + timing): an updraft raises you to a sliding gate at
// the top of the column. Ride up and sync your exit to the gate's opening.
export const level34: LevelConfig = {
  ball:      { x: 110, y: 660 },
  goal:      { x: 110, y: 110, radius: 30 },
  obstacles: [],
  gravityZones: [
    { x: 110, y: 450, width: 120, height: 300, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  movingPlatforms: [
    { x: 110, y: 250, width: 140, height: 16, to: { x: 250, y: 250 }, durationMs: 1200 }, // gate atop the lift
  ],
  collectible: { x: 300, y: 200 }, // top-right, past the gate's swing
  hint:      'Ride the lift, time the gate',
  parTimeMs: 17000,
};
