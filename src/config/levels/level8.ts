import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 · L12 — SPECTACLE/SHOT "Whirlpool": four currents loop into a great
// clockwise vortex (up the left, across the top, down the right, back along the
// bottom). The camera reveals the swirl; ride its pull, then break inward to the
// calm eye where home waits. A rotating set-piece — the world's screenshot.
export const level8: LevelConfig = {
  ball:      { x: 180, y: 705 },
  goal:      { x: 180, y: 400, radius: 34 },
  obstacles: [],
  gravityZones: [
    { x: 70,  y: 400, width: 90,  height: 320, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH }, // left → up
    { x: 180, y: 270, width: 240, height: 80,  dir: { x: 1, y: 0 },  strength: PHYSICS.GRAVITY_ZONE_STRENGTH }, // top → right
    { x: 295, y: 400, width: 90,  height: 320, dir: { x: 0, y: 1 },  strength: PHYSICS.GRAVITY_ZONE_STRENGTH }, // right → down
    { x: 180, y: 555, width: 240, height: 80,  dir: { x: -1, y: 0 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH }, // bottom → left
  ],
  camera:    { introZoom: 1.6 }, // reveal the whole vortex
  collectible: { x: 180, y: 270 }, // on the swirl ring
  title:     'THE WHIRLPOOL',
  hint:      'Ride the whirlpool — break for the calm eye',
  parTimeMs: 16000,
};
