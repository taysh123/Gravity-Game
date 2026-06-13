import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 15 — Homecoming · combine 3: every gift the cosmos gave — a lift, a rift
// across the arena, a well, and a saw to slip — in one flowing, unhurried run.
export const level161: LevelConfig = {
  ball:      { x: 80, y: 700 },
  goal:      { x: 300, y: 110, radius: 26 },
  obstacles: [
    { x: 230, y: 430, width: 16, height: 240 }, // divider
  ],
  gravityZones: [
    { x: 80, y: 560, width: 110, height: 180, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  portals: [
    { a: { x: 80, y: 330 }, b: { x: 300, y: 330 } },
  ],
  magnets: [
    { x: 300, y: 200, polarity: 'attract' },
  ],
  hazards: [
    { x: 200, y: 240, radius: 20, to: { x: 330, y: 240 }, durationMs: 1100 },
  ],
  collectible: { x: 180, y: 640 },
  hint:      'Every gift, one flowing run',
  parTimeMs: 20000,
};
