import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 14 — Singularity · combine 2: an updraft, a sliding gate, and a patrolling
// saw all stand between you and a tiny goal. Time each beat exactly to thread up.
export const level150: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 180, y: 110, radius: 22 },
  obstacles: [],
  gravityZones: [
    { x: 180, y: 560, width: 130, height: 170, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  movingPlatforms: [
    { x: 110, y: 340, width: 140, height: 16, to: { x: 250, y: 340 }, durationMs: 1000 },
  ],
  hazards: [
    { x: 300, y: 430, radius: 20, to: { x: 300, y: 560 }, durationMs: 1000 },
  ],
  collectible: { x: 60, y: 560 },
  hint:      'Lift, time the gate, mind the saw',
  parTimeMs: 18000,
};
