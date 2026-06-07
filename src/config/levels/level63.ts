import type { LevelConfig } from '../../types';

// World 8 — Convergence · timed: portals + repel well + saw, against the clock.
// Rift across, weave the push, dodge the saw — fast.
export const level63: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 120, radius: 24 },
  obstacles: [],
  portals: [
    { a: { x: 90, y: 560 }, b: { x: 300, y: 330 } },
  ],
  magnets: [
    { x: 180, y: 400, polarity: 'repel' },
  ],
  hazards: [
    { x: 90, y: 230, radius: 22, to: { x: 300, y: 230 }, durationMs: 1100 },
  ],
  collectible: { x: 300, y: 560 }, // off-route, by the lower mouth
  hint:      'Beat the clock: rift, weave the push, dodge the saw',
  parTimeMs: 12000,
  timeLimitMs: 16000,
};
