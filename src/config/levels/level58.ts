import type { LevelConfig } from '../../types';

// World 8 — Convergence · magnets + portals. A repeller guards the centre and a
// wall blocks the climb — take the rift around them to the goal.
export const level58: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 300, y: 140, radius: 28 },
  obstacles: [
    { x: 170, y: 500, width: 300, height: 16 }, // wall x20..320, gap far right
  ],
  magnets: [
    { x: 200, y: 430, polarity: 'repel' },
  ],
  portals: [
    { a: { x: 90, y: 560 }, b: { x: 300, y: 300 } },
  ],
  hazards: [
    { x: 300, y: 230, radius: 18, to: { x: 220, y: 230 }, durationMs: 1100 }, // a saw on the climb after the rift
  ],
  collectible: { x: 90, y: 300 }, // off-route, upper-left
  hint:      'Rift past the push — then time the saw to the goal',
  parTimeMs: 17000,
};
