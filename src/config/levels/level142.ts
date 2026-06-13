import type { LevelConfig } from '../../types';

// World 13 — Ascension · SIGNATURE "THE ASCENT": a tower of sealed floors, each
// reached by a rift, with a saw sweeping the summit. Climb the rifts floor by floor
// to the highest goal in the cosmos. The journey made vertical.
export const level142: LevelConfig = {
  ball:      { x: 180, y: 720 },
  goal:      { x: 180, y: 90, radius: 24 },
  obstacles: [
    { x: 180, y: 520, width: 360, height: 14 }, // floor 1 ceiling
    { x: 180, y: 300, width: 360, height: 14 }, // floor 2 ceiling
  ],
  portals: [
    { a: { x: 180, y: 600 }, b: { x: 300, y: 410 } }, // up to floor 2 (far side)
    { a: { x: 300, y: 360 }, b: { x: 180, y: 190 } }, // up to the summit (near the goal)
  ],
  hazards: [
    { x: 90, y: 150, radius: 20, to: { x: 300, y: 150 }, durationMs: 1000 }, // saw at the summit
  ],
  collectible: { x: 300, y: 600 }, // off-route, ground floor
  title:     'THE ASCENT',
  hint:      'Climb the rifts, floor by floor',
  camera:    { introZoom: 1.6 },
  parTimeMs: 20000,
};
