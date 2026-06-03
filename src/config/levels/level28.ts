import type { LevelConfig } from '../../types';

// World 1 — Foundations · twist: a narrow vertical channel. Route the ball up
// into the ~60px slot and rise through it — pure precision steering, no margin.
export const level28: LevelConfig = {
  ball:      { x: 90, y: 670 },
  goal:      { x: 190, y: 120, radius: 30 },
  obstacles: [
    { x: 150, y: 400, width: 16, height: 300 }, // left wall of the channel  (y 250..550)
    { x: 230, y: 400, width: 16, height: 300 }, // right wall — slot ~x158..222
  ],
  collectible: { x: 310, y: 600 }, // bottom-right, away from the channel line
  hint:      'Rise through the narrow channel',
  parTimeMs: 17000,
};
