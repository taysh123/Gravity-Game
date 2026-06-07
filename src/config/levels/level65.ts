import type { LevelConfig } from '../../types';

// World 1 · L7 — SIGNATURE "THE GAUNTLET": a tight five-wall labyrinth that looks
// impossible at a glance but has one clean winding line. The world's poster level
// and the early "wow".
export const level65: LevelConfig = {
  ball:      { x: 180, y: 670 },
  goal:      { x: 180, y: 110, radius: 30 },
  obstacles: [
    { x: 120, y: 565, width: 210, height: 14 }, // gap on the right
    { x: 240, y: 470, width: 210, height: 14 }, // gap on the left
    { x: 120, y: 360, width: 210, height: 14 }, // gap on the right
    { x: 240, y: 255, width: 210, height: 14 }, // gap on the left
    { x: 120, y: 165, width: 210, height: 14 }, // gap on the right
  ],
  collectible: { x: 310, y: 510 }, // tucked on the winding route
  title:     'THE GAUNTLET',
  hint:      'Find the one clean line',
  parTimeMs: 20000,
};
