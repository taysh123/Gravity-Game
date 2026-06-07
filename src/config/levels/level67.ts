import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 · SIGNATURE "THE EYE": alternating crosswind bands form a storm; they
// cancel up the centre where a calm updraft "eye" lifts you to the goal. Read the
// whole system and thread the eye. The Currents poster level.
export const level67: LevelConfig = {
  ball:      { x: 180, y: 700 },
  goal:      { x: 180, y: 120, radius: 28 },
  obstacles: [],
  gravityZones: [
    { x: 180, y: 560, width: 300, height: 80, dir: { x: 1, y: 0 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.7 },
    { x: 180, y: 450, width: 300, height: 80, dir: { x: -1, y: 0 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.7 },
    { x: 180, y: 340, width: 300, height: 80, dir: { x: 1, y: 0 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.7 },
    { x: 180, y: 235, width: 120, height: 130, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH }, // the calm eye
  ],
  collectible: { x: 310, y: 450 }, // out in a band — the risky grab
  title:     'THE EYE',
  hint:      'Find the calm eye of the storm',
  parTimeMs: 19000,
};
