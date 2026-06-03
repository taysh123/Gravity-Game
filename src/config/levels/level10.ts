import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 — Currents · develop: a central downdraft pushes back. Power straight
// up through it, or arc around the sides where the air is still.
export const level10: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 110, radius: 36 },
  obstacles: [],
  gravityZones: [
    { x: 180, y: 360, width: 150, height: 260, dir: { x: 0, y: 1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.85 },
  ],
  collectible: { x: 180, y: 360 }, // dead centre of the downdraft — the hard line
  hint:      'Push up through the downdraft — or go around',
  parTimeMs: 13000,
};
