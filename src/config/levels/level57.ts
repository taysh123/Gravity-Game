import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 8 — Convergence · currents + gates. Ride the updraft, then commit up
// through the one-way gate. Grab the low gem first — the gate won't let you back.
export const level57: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 120, radius: 28 },
  obstacles: [
    { x: 300, y: 250, width: 120, height: 16 }, // top ledge to steer around
  ],
  gravityZones: [
    { x: 180, y: 520, width: 140, height: 200, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  gates: [
    { x: 180, y: 380, width: 200, height: 16, dir: { x: 0, y: -1 } },
  ],
  collectible: { x: 300, y: 560 }, // low-right — grab before committing up
  hint:      'Lift up, then commit through the gate',
  parTimeMs: 16000,
};
