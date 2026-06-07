import type { LevelConfig } from '../../types';

// World 4 — Peril · BOSS "THE INFERNO": the climax. Three escalating bands under
// a hard countdown — thread the flanking spikes, time a fast sweep, then slip a
// tight twin-saw window guarding the goal. Everything Peril taught, at once.
export const level74: LevelConfig = {
  ball:      { x: 180, y: 680 },
  goal:      { x: 180, y: 110, radius: 28 },
  obstacles: [],
  hazards: [
    // Band 1 — flanking spikes leave a centre lane (~112px between edges).
    { x: 110, y: 540, radius: 24 },
    { x: 270, y: 540, radius: 24 },
    // Band 2 — a fast saw sweeps the mid lane.
    { x: 60,  y: 390, radius: 24, to: { x: 300, y: 390 }, durationMs: 1000 },
    // Band 3 — a saw guards the approach to the goal (opposite phase).
    { x: 300, y: 240, radius: 22, to: { x: 60,  y: 240 }, durationMs: 1100 },
  ],
  collectible: { x: 305, y: 540 }, // beside the right spike — the brave 2nd star
  boss:      true,
  title:     'THE INFERNO',
  hint:      'Thread the spikes, time the saws — beat the clock',
  parTimeMs: 11000,
  timeLimitMs: 14000,
};
