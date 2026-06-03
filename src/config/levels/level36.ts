import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 4 — Peril · combine: an updraft launches you, but a saw sweeps the lane
// above and a spike guards the low-right. Time the lift to clear the saw safely.
export const level36: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 110, radius: 30 },
  obstacles: [],
  gravityZones: [
    { x: 180, y: 560, width: 140, height: 160, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  hazards: [
    { x: 90, y: 380, radius: 26, to: { x: 270, y: 380 }, durationMs: 1300 }, // sweeping saw
    { x: 305, y: 560, radius: 24 }, // static spike, low-right
  ],
  collectible: { x: 300, y: 250 }, // top-right, past the saw's reach
  hint:      'Lift past the saw — mind the spike',
  parTimeMs: 14000,
};
