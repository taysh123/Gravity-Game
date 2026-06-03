import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 4 — Peril · combine: a crosswind shoves you toward a hazard on the right.
// Counter the wind to climb past it safely.
export const level20: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 150, y: 110, radius: 34 },
  obstacles: [],
  gravityZones: [
    { x: 175, y: 400, width: 300, height: 150, dir: { x: 1, y: 0 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.7 },
  ],
  hazards: [
    { x: 305, y: 400, radius: 30 }, // downwind — where the current wants to take you
  ],
  collectible: { x: 250, y: 250 },
  hint:      'The wind pushes you toward danger — steer clear',
  parTimeMs: 13000,
};
