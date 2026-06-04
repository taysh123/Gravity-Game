import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 7 — Gates · combine: an updraft carries the ball up through an up-gate.
// Grab the side gem first — once through the gate the current won't let you back.
export const level52: LevelConfig = {
  ball:      { x: 110, y: 660 },
  goal:      { x: 110, y: 150, radius: 34 },
  obstacles: [],
  gravityZones: [
    { x: 110, y: 450, width: 120, height: 320, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },
  ],
  gates: [
    { x: 110, y: 300, width: 200, height: 16, dir: { x: 0, y: -1 } }, // up-gate across the column
  ],
  collectible: { x: 280, y: 520 }, // off to the right, low — grab before riding up
  hint:      'Grab the gem, then ride up through the gate',
  parTimeMs: 16000,
};
