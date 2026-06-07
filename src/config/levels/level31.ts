import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 · combine (predict drift under threat): a crosswind shoves you toward a
// spike on the right. Read the drift and counter it as you climb to the goal.
export const level31: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 150, y: 120, radius: 32 },
  obstacles: [],
  gravityZones: [
    { x: 180, y: 400, width: 320, height: 200, dir: { x: 1, y: 0 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.7 },
  ],
  hazards: [
    { x: 320, y: 400, radius: 28 }, // downwind — where the current wants to take you
  ],
  collectible: { x: 300, y: 250 }, // up-right, past the wind (risk/reward)
  hint:      'The wind pushes you toward the spike — read it',
  parTimeMs: 14000,
};
