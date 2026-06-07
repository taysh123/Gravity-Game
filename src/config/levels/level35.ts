import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 3 · AHA (sequencing): a maze with a sweeping guard at the top and a lift
// on the right. The route only works in one order — thread the gaps, ride up, and
// time the guard last. Plan the sequence.
export const level35: LevelConfig = {
  ball:      { x: 70, y: 660 },
  goal:      { x: 300, y: 110, radius: 26 },
  obstacles: [
    { x: 120, y: 480, width: 220, height: 16 }, // low wall, gap on the right
    { x: 250, y: 320, width: 220, height: 16 }, // mid wall, gap on the left
  ],
  gravityZones: [
    { x: 300, y: 470, width: 110, height: 140, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  movingPlatforms: [
    { x: 180, y: 185, width: 16, height: 150, to: { x: 320, y: 185 }, durationMs: 1300 }, // sweeping guard near the goal
  ],
  collectible: { x: 70, y: 250 }, // off-route, far left
  hint:      'Sequence the gaps, then time the guard',
  parTimeMs: 20000,
};
