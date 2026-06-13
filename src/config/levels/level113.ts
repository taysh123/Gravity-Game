import type { LevelConfig } from '../../types';

// World 10 — Binary · BOSS "THE PULSAR": a repel core pushes everything outward
// while an arm scythes around it. Orbit the core — let its push carry you wide of
// the arm — and time your break for the goal above. Orbital mastery, no clock.
export const level113: LevelConfig = {
  ball:      { x: 180, y: 700 },
  goal:      { x: 180, y: 100, radius: 28 },
  obstacles: [],
  magnets: [
    { x: 180, y: 400, polarity: 'repel' }, // the pulsar core
  ],
  hazards: [
    { x: 180, y: 250, radius: 22, pivot: { x: 180, y: 400 }, durationMs: 2400 }, // rotating arm around the core
  ],
  collectible: { x: 300, y: 300 }, // off-route, caught in the outer orbit
  boss:      true,
  title:     'THE PULSAR',
  hint:      'Orbit the core — time your break home',
  camera:    { introZoom: 1.6 },
  parTimeMs: 22000,
};
