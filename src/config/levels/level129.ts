import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 12 — Tempest · combine: an updraft fires you up the centre while a saw
// sweeps the lane above — all on a tight clock. Enter the lift at the right beat.
export const level129: LevelConfig = {
  ball:      { x: 180, y: 680 },
  goal:      { x: 180, y: 120, radius: 28 },
  obstacles: [],
  gravityZones: [
    { x: 180, y: 560, width: 140, height: 180, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  hazards: [
    { x: 90, y: 340, radius: 24, to: { x: 270, y: 340 }, durationMs: 1100 },
  ],
  collectible: { x: 300, y: 260 },
  hint:      'Lift past the saw — fast',
  parTimeMs: 11000,
  timeLimitMs: 16000,
};
