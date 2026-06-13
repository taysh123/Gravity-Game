import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 15 — Homecoming · reprise (the way home begins): after the singularity, a
// gentler beat — a broad updraft lifts the star toward a generous goal. Breathe,
// and begin the last journey home.
export const level154: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 180, y: 130, radius: 30 },
  obstacles: [],
  gravityZones: [
    { x: 180, y: 520, width: 150, height: 220, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  collectible: { x: 300, y: 300 },
  hint:      'One more journey home — ride the lift',
  parTimeMs: 13000,
};
