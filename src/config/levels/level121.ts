import type { LevelConfig } from '../../types';

// World 11 — Labyrinth · combine 3: jump the rift across the wall, then a saw
// patrols the lane to the goal. Emerge, read the blade, slip past.
export const level121: LevelConfig = {
  ball:      { x: 70, y: 680 },
  goal:      { x: 300, y: 130, radius: 28 },
  obstacles: [
    { x: 180, y: 470, width: 360, height: 16 }, // full-width wall
  ],
  portals: [
    { a: { x: 90, y: 560 }, b: { x: 300, y: 340 } }, // cross to the right, above the wall
  ],
  hazards: [
    { x: 200, y: 220, radius: 24, to: { x: 320, y: 220 }, durationMs: 1200 }, // saw near the goal
  ],
  collectible: { x: 90, y: 300 },
  hint:      'Rift across, then dodge the saw',
  parTimeMs: 16000,
};
