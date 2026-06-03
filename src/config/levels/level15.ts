import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 3 — Clockwork · combine: an updraft lifts you, but a sliding gate guards
// the top. Ride up and time the gate together.
export const level15: LevelConfig = {
  ball:      { x: 110, y: 650 },
  goal:      { x: 110, y: 110, radius: 34 },
  obstacles: [],
  gravityZones: [
    { x: 110, y: 440, width: 120, height: 300, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  movingPlatforms: [
    { x: 110, y: 250, width: 130, height: 18, to: { x: 250, y: 250 }, durationMs: 1200 }, // gate at the top of the column
  ],
  collectible: { x: 110, y: 180 },
  hint:      'Ride the lift, time the gate',
  parTimeMs: 16000,
};
