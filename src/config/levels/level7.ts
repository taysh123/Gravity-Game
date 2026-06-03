import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 — Currents · teach: the ball starts inside an updraft column, so the
// current visibly lifts it from the first moment. The goal is offset, so the
// player still steers out of the current near the top. Aha: "use the current to
// travel further than one pull could."
export const level7: LevelConfig = {
  ball:      { x: 160, y: 640 },
  goal:      { x: 255, y: 120, radius: 44 },
  obstacles: [],
  gravityZones: [
    { x: 160, y: 410, width: 130, height: 480, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  collectible: { x: 160, y: 200 },
  hint:      'The current lifts you — steer out to the goal',
  parTimeMs: 9000,
};
