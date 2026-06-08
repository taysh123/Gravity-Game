import type { LevelConfig } from '../../types';

// World 6 — Rifts · SIGNATURE "HALL OF MIRRORS": three sealed chambers stacked up
// the arena, each reachable only through a rift. Hop chamber to chamber — find the
// next mouth, breach upward, repeat — until the last rift drops you by the goal.
export const level81: LevelConfig = {
  ball:      { x: 180, y: 690 },
  goal:      { x: 180, y: 90, radius: 28 },
  obstacles: [
    { x: 180, y: 525, width: 360, height: 14 }, // c1 / c2 divider
    { x: 180, y: 355, width: 360, height: 14 }, // c2 / c3 divider
    { x: 180, y: 185, width: 360, height: 14 }, // c3 / top divider
  ],
  portals: [
    { a: { x: 180, y: 600 }, b: { x: 300, y: 470 } }, // c1 -> c2 (right)
    { a: { x: 90,  y: 400 }, b: { x: 300, y: 300 } }, // c2 (left) -> c3 (right)
    { a: { x: 90,  y: 250 }, b: { x: 180, y: 130 } }, // c3 (left) -> top, by the goal
  ],
  hazards: [
    // A spinning arm patrols the middle chamber — the signature gets a memorable
    // moment of motion. Hop along the chamber edges, around the sweep.
    { x: 180, y: 495, radius: 16, pivot: { x: 180, y: 440 }, durationMs: 2800 },
  ],
  collectible: { x: 300, y: 250 }, // tucked in c3, off the direct hop
  title:     'HALL OF MIRRORS',
  hint:      'Hop the rifts, chamber by chamber — mind the spinning arm',
  parTimeMs: 20000,
};
