import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 13 — Ascension · combine 2: commit up through the gate, fight a crosswind
// across the middle, and dodge a saw — on the clock. A relentless, rising sprint.
export const level140: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 180, y: 120, radius: 26 },
  obstacles: [],
  gates: [
    { x: 180, y: 560, width: 360, height: 16, dir: { x: 0, y: -1 } },
  ],
  gravityZones: [
    { x: 180, y: 380, width: 300, height: 120, dir: { x: 1, y: 0 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.7 },
  ],
  hazards: [
    { x: 300, y: 380, radius: 22, to: { x: 300, y: 240 }, durationMs: 1100 },
  ],
  collectible: { x: 60, y: 480 },
  hint:      'Commit, fight the wind, dodge — fast',
  parTimeMs: 13000,
  timeLimitMs: 19000,
};
