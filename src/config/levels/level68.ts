import type { LevelConfig } from '../../types';
import { PHYSICS } from '../physics.config';

// World 2 · L14 — BOSS "THE MAELSTROM" (CHASE): home itself is adrift — the star's
// home slides back and forth across the eye of the storm while you fight up through
// a lift, a downdraft and a sweeping saw. You can't aim at a fixed point; you must
// READ the drift and intercept. A chase boss, not a static gauntlet.
export const level68: LevelConfig = {
  ball:      { x: 180, y: 705 },
  goal:      { x: 110, y: 165, radius: 28, to: { x: 250, y: 165 }, durationMs: 1700 }, // home drifts across the eye
  obstacles: [],
  gravityZones: [
    { x: 180, y: 600, width: 170, height: 220, dir: { x: 0, y: -1 }, strength: PHYSICS.GRAVITY_ZONE_STRENGTH },       // lift
    { x: 180, y: 400, width: 190, height: 150, dir: { x: 0, y: 1 },  strength: PHYSICS.GRAVITY_ZONE_STRENGTH * 0.8 }, // downdraft to fight
  ],
  hazards: [
    { x: 90, y: 285, radius: 22, to: { x: 270, y: 285 }, durationMs: 1200 }, // saw below the eye
  ],
  camera:    { introZoom: 1.8 },
  collectible: { x: 305, y: 600 }, // off-route
  title:     'THE MAELSTROM',
  boss:      true,
  hint:      'Read the drift — intercept the star at the eye',
  parTimeMs: 26000,
};
