import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 9 — Gauntlet · combine: an updraft on the left lifts you to a sliding gate
// at the top, while a spike sits mid-route. Lift, swing wide of the spike, and
// sync your exit to the gate's opening.
export const level99: LevelConfig = {
  ball:      { x: 80, y: 680 },
  goal:      { x: 300, y: 130, radius: 30 },
  obstacles: [],
  gravityZones: [
    { x: 80, y: 440, width: 110, height: 320, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  movingPlatforms: [
    { x: 200, y: 300, width: 140, height: 16, to: { x: 320, y: 300 }, durationMs: 1200 }, // gate near the goal
  ],
  hazards: [
    { x: 200, y: 520, radius: 24 }, // static spike on the swing line
  ],
  collectible: { x: 80, y: 200 }, // top of the lift
  hint:      'Lift, swing past the spike, time the gate',
  parTimeMs: 17000,
};
