import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 — Currents · master: ride the left updraft, then a high crosswind
// carries you right toward the goal. Two currents chained into one route.
export const level11: LevelConfig = {
  ball:      { x: 70, y: 650 },
  goal:      { x: 300, y: 150, radius: 36 },
  obstacles: [
    { x: 150, y: 250, width: 160, height: 16 }, // ledge: drop onto the crosswind below it
  ],
  gravityZones: [
    { x: 70, y: 430, width: 110, height: 340, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
    { x: 250, y: 320, width: 220, height: 90, dir: { x: 1, y: 0 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.9 },
  ],
  collectible: { x: 70, y: 200 }, // top of the updraft, past the ledge
  hint:      'Updraft up, crosswind across',
  parTimeMs: 19000,
};
