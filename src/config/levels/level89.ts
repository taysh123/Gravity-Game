import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 8 — Convergence · SIGNATURE "THE CONFLUENCE": three currents pour in from
// below, left and right and meet at a single point — and that is where the rift
// waits. Ride the confluence into the mouth; it delivers you to the goal. Every
// force in the world, flowing to one place.
export const level89: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 180, y: 110, radius: 30 },
  obstacles: [],
  gravityZones: [
    { x: 180, y: 560, width: 140, height: 200, dir: { x: 0,  y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH }, // updraft from below
    { x: 95,  y: 430, width: 160, height: 120, dir: { x: 1,  y: 0 },  strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.8 }, // from the left
    { x: 270, y: 430, width: 160, height: 120, dir: { x: -1, y: 0 },  strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.8 }, // from the right
  ],
  portals: [
    { a: { x: 180, y: 420 }, b: { x: 180, y: 200 } }, // the confluence -> near the goal
  ],
  hazards: [
    // A spinning arm guards the final rise after the confluence rift — the finale
    // signature's memorable moment of motion. Emerge, read the spin, slip home.
    { x: 180, y: 150, radius: 16, pivot: { x: 180, y: 205 }, durationMs: 2600 },
  ],
  collectible: { x: 300, y: 430 }, // far edge of the right current, off-route
  title:     'THE CONFLUENCE',
  hint:      'Where the currents meet the rift waits — then time the spinning arm home',
  parTimeMs: 18000,
};
