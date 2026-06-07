import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 8 — Convergence · currents + gate + platform + magnet (four at once).
// Lift up, commit right through the gate, time the platform, ride the well home.
export const level62: LevelConfig = {
  ball:      { x: 80, y: 660 },
  goal:      { x: 300, y: 120, radius: 24 },
  obstacles: [],
  gravityZones: [
    { x: 80, y: 480, width: 100, height: 280, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  gates: [
    { x: 170, y: 330, width: 16, height: 200, dir: { x: 1, y: 0 } }, // commit right after the lift
  ],
  movingPlatforms: [
    { x: 250, y: 210, width: 130, height: 16, to: { x: 330, y: 210 }, durationMs: 1100 },
  ],
  magnets: [
    { x: 300, y: 160, polarity: 'attract' },
  ],
  collectible: { x: 80, y: 200 }, // top of the lift, off-route
  hint:      'Lift, commit right, time the gate, ride the well',
  parTimeMs: 19000,
};
