import type { LevelConfig } from '../../types';

// World 11 — Labyrinth · SIGNATURE "HALL OF ECHOES": shelves split the arena into
// floors, and two rifts chain a zigzag up through them. Each mouth drops you onto
// the next floor — read the whole hall, then ride the echoes home.
export const level122: LevelConfig = {
  ball:      { x: 90, y: 700 },
  goal:      { x: 180, y: 110, radius: 26 },
  obstacles: [
    { x: 150, y: 520, width: 240, height: 16 }, // lower shelf (x30..270), gap right
    { x: 210, y: 300, width: 240, height: 16 }, // upper shelf (x90..330), gap left
  ],
  portals: [
    { a: { x: 90, y: 600 }, b: { x: 320, y: 410 } },  // up to the mid floor, far side
    { a: { x: 320, y: 360 }, b: { x: 90, y: 190 } },  // up to the top floor, near the goal
  ],
  collectible: { x: 300, y: 600 }, // off-route, lower floor
  title:     'HALL OF ECHOES',
  hint:      'Chain the rifts up through the hall',
  camera:    { introZoom: 1.5 },
  parTimeMs: 19000,
};
