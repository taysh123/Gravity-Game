import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 — Currents · combine (zone + hazard): a rightward crosswind nudges you
// toward a spike on the right. Counter the wind and climb left to the goal — the
// spike is only a threat if you let the wind carry you. 1★ = counter-steer.
export const level10: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 150, y: 120, radius: 36 },
  obstacles: [],
  gravityZones: [
    { x: 180, y: 400, width: 320, height: 200, dir: { x: 1, y: 0 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.7 },
  ],
  hazards: [
    { x: 320, y: 400, radius: 28 }, // downwind — where the current wants to take you
  ],
  collectible: { x: 300, y: 250 }, // up-right, past the wind (risk/reward)
  hint:      'The wind pushes you toward the spike — counter it',
  parTimeMs: 14000,
};
