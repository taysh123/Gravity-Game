import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 — Currents · twist: a rightward crosswind fills the middle. Rise
// through it while counter-steering left so you don't get blown off the goal.
export const level9: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 150, y: 110, radius: 40 },
  obstacles: [],
  gravityZones: [
    { x: 195, y: 400, width: 330, height: 200, dir: { x: 1, y: 0 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.8 },
  ],
  collectible: { x: 300, y: 360 }, // downwind — drift into it, then fight back
  hint:      'Counter the crosswind as you climb',
  parTimeMs: 15000,
};
