import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 15 — Homecoming · develop: ride a lift to a one-way gate, then commit
// upward — the last threshold before the final approach.
export const level157: LevelConfig = {
  ball:      { x: 180, y: 680 },
  goal:      { x: 180, y: 130, radius: 28 },
  obstacles: [],
  gravityZones: [
    { x: 180, y: 520, width: 140, height: 200, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  gates: [
    { x: 180, y: 360, width: 200, height: 16, dir: { x: 0, y: -1 } },
  ],
  collectible: { x: 300, y: 560 },
  hint:      'Lift, then commit through the gate',
  parTimeMs: 16000,
};
