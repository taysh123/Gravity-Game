import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 13 — Ascension · master: the longest single line yet — lift, rift across,
// well, and a saw at the summit. Small goal, tight par. Every mechanic, one breath.
export const level141: LevelConfig = {
  ball:      { x: 80, y: 690 },
  goal:      { x: 300, y: 120, radius: 24 },
  obstacles: [],
  gravityZones: [
    { x: 80, y: 540, width: 110, height: 200, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  portals: [
    { a: { x: 80, y: 330 }, b: { x: 300, y: 330 } }, // cross the arena
  ],
  magnets: [
    { x: 300, y: 200, polarity: 'attract' },
  ],
  hazards: [
    { x: 180, y: 240, radius: 20, to: { x: 300, y: 240 }, durationMs: 1000 },
  ],
  collectible: { x: 80, y: 260 },
  hint:      'Lift, rift, well — slip the saw home',
  parTimeMs: 20000,
};
