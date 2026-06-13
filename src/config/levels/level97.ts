import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 9 — Gauntlet · develop 2: an updraft launches you up the centre, but a saw
// sweeps the lane above. Time your entry to the lift so you clear the blade.
export const level97: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 180, y: 120, radius: 32 },
  obstacles: [],
  gravityZones: [
    { x: 180, y: 560, width: 140, height: 180, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  hazards: [
    { x: 90, y: 340, radius: 24, to: { x: 270, y: 340 }, durationMs: 1200 },
  ],
  collectible: { x: 300, y: 260 },
  hint:      'Time the lift past the saw',
  parTimeMs: 14000,
};
