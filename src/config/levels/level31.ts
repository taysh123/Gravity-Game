import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 — Currents · combine: ride the left updraft, drop onto a ledge, then a
// high crosswind carries you right — but a wall waits downwind, so exit upward
// before it shoves you into it.
export const level31: LevelConfig = {
  ball:      { x: 80, y: 660 },
  goal:      { x: 300, y: 140, radius: 30 },
  obstacles: [
    { x: 150, y: 470, width: 160, height: 16 }, // ledge to drop onto
    { x: 330, y: 250, width: 16, height: 130 }, // right wall the crosswind pushes you toward
  ],
  gravityZones: [
    { x: 80, y: 440, width: 110, height: 340, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
    { x: 240, y: 250, width: 200, height: 90, dir: { x: 1, y: 0 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.9 },
  ],
  collectible: { x: 80, y: 180 }, // top of the updraft, past the ledge
  hint:      'Updraft up, ride the wind, exit before the wall',
  parTimeMs: 15000,
};
