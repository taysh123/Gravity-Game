import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 · prediction decision: two updraft columns. The right lift carries you
// up under the offset goal; the LEFT lift is capped — a dead-end trap. Predict
// which current actually reaches the goal before you commit.
export const level30: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 290, y: 130, radius: 34 },
  obstacles: [
    { x: 90, y: 165, width: 150, height: 14 }, // caps the LEFT column (the trap)
  ],
  gravityZones: [
    { x: 90, y: 420, width: 110, height: 420, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
    { x: 270, y: 420, width: 110, height: 420, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  collectible: { x: 90, y: 250 }, // under the cap — bait in the dead-end lift
  hint:      'Which current actually reaches the goal?',
  parTimeMs: 13000,
};
