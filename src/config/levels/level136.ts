import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 13 — Ascension · develop: a crosswind low, a sliding platform mid, an
// attract well high. Drift across the wind, time the gap, let the well finish it.
export const level136: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 180, y: 120, radius: 28 },
  obstacles: [],
  gravityZones: [
    { x: 180, y: 520, width: 300, height: 120, dir: { x: 1, y: 0 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.7 },
  ],
  movingPlatforms: [
    { x: 120, y: 360, width: 140, height: 16, to: { x: 240, y: 360 }, durationMs: 1100 },
  ],
  magnets: [
    { x: 180, y: 200, polarity: 'attract' },
  ],
  collectible: { x: 60, y: 560 },
  hint:      'Drift, time the gate, into the well',
  parTimeMs: 18000,
};
