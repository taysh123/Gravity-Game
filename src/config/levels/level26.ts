import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 5 — Wells · combine: an updraft lifts you on the left; an attract well up
// on the right then pulls you across to the goal. Current + well chained.
export const level26: LevelConfig = {
  ball:      { x: 80, y: 650 },
  goal:      { x: 300, y: 150, radius: 42 },
  obstacles: [],
  gravityZones: [
    { x: 80, y: 430, width: 120, height: 340, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  magnets: [
    { x: 280, y: 300, polarity: 'attract' },
  ],
  collectible: { x: 80, y: 200 }, // top of the updraft
  hint:      'Ride the lift, let the well pull you across',
  parTimeMs: 18000,
};
