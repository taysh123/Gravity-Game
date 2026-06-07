import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 · BOSS "THE MAELSTROM": three sections — lift+carry, a downdraft to
// fight through, then a banded vortex with a saw at its heart. Ride the storm to
// the core. The Currents capstone.
export const level68: LevelConfig = {
  ball:      { x: 180, y: 710 },
  goal:      { x: 180, y: 90, radius: 24 },
  obstacles: [],
  gravityZones: [
    { x: 90, y: 610, width: 120, height: 200, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },        // §1 lift
    { x: 235, y: 520, width: 200, height: 80, dir: { x: 1, y: 0 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.9 },   // §1 carry
    { x: 180, y: 380, width: 170, height: 150, dir: { x: 0, y: 1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.8 },  // §2 downdraft
    { x: 180, y: 220, width: 280, height: 70, dir: { x: -1, y: 0 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.7 },  // §3 band
    { x: 180, y: 140, width: 120, height: 90, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },        // §3 eye to goal
  ],
  hazards: [
    { x: 90, y: 170, radius: 22, to: { x: 270, y: 170 }, durationMs: 1200 }, // saw at the heart
  ],
  collectible: { x: 305, y: 600 }, // off-route
  title:     'THE MAELSTROM',
  boss:      true,
  hint:      'Ride the storm to its heart',
  parTimeMs: 26000,
};
