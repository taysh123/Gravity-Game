import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 · flow control: a central downdraft pushes back. Power straight up
// through it (fast, the gem line), or arc around the still sides (safe). Manage
// the flow against you.
export const level8: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 120, radius: 34 },
  obstacles: [],
  gravityZones: [
    { x: 180, y: 380, width: 150, height: 300, dir: { x: 0, y: 1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.85 },
  ],
  collectible: { x: 180, y: 360 }, // dead centre of the downdraft — the hard line
  hint:      'Push through the downdraft — or go around',
  parTimeMs: 14000,
};
