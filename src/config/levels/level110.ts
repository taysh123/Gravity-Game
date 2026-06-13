import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 10 — Binary · combine 2: an updraft lifts you on the left, and an attract
// well up-right pulls you across to the goal. Chain the current into the pull.
export const level110: LevelConfig = {
  ball:      { x: 80, y: 660 },
  goal:      { x: 300, y: 150, radius: 30 },
  obstacles: [],
  gravityZones: [
    { x: 80, y: 430, width: 120, height: 340, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  magnets: [
    { x: 280, y: 300, polarity: 'attract' },
  ],
  collectible: { x: 80, y: 200 }, // top of the lift
  hint:      'Ride the lift, let the well pull you across',
  parTimeMs: 15000,
};
