import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 15 — Homecoming · combine: an updraft lifts you, an attract well draws you
// across, and a saw patrols between — the mechanics that taught you, woven together.
export const level159: LevelConfig = {
  ball:      { x: 80, y: 680 },
  goal:      { x: 300, y: 130, radius: 26 },
  obstacles: [],
  gravityZones: [
    { x: 80, y: 480, width: 110, height: 280, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  magnets: [
    { x: 290, y: 280, polarity: 'attract' },
  ],
  hazards: [
    { x: 200, y: 380, radius: 22, to: { x: 200, y: 520 }, durationMs: 1100 },
  ],
  collectible: { x: 80, y: 220 },
  hint:      'Lift, swing, slip the saw',
  parTimeMs: 18000,
};
