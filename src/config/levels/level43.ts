import type { LevelConfig } from '../../types';

// World 6 — Rifts · twist: the mouths sit far apart, so the rift carries you clear
// across the arena. A long wall blocks the direct climb — jump across instead.
export const level43: LevelConfig = {
  ball:      { x: 80, y: 660 },
  goal:      { x: 300, y: 140, radius: 38 },
  obstacles: [
    { x: 170, y: 420, width: 300, height: 16 }, // wall x20..320 — narrow gap far right
  ],
  portals: [
    { a: { x: 90, y: 520 }, b: { x: 280, y: 250 } }, // bottom-left -> upper-right
  ],
  hazards: [
    { x: 200, y: 195, radius: 22, to: { x: 340, y: 195 }, durationMs: 1200 }, // a saw sweeps the landing — time the rift exit
  ],
  collectible: { x: 90, y: 250 }, // off-route, upper-left
  hint:      'The far mouth carries you across — then time the saw to home',
  parTimeMs: 14000,
};
