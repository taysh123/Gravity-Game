import type { LevelConfig } from '../../types';

// World 13 — Ascension · twist: the climb inverts into a controlled descent. A
// sealed ceiling forces a downward rift, then a saw patrols the floor before the
// bottom pocket. Falling with purpose is the hardest kind of control.
export const level138: LevelConfig = {
  ball:      { x: 180, y: 110 },
  goal:      { x: 300, y: 690, radius: 28 },
  obstacles: [
    { x: 180, y: 350, width: 360, height: 16 }, // sealed shelf — rift required
  ],
  portals: [
    { a: { x: 180, y: 250 }, b: { x: 300, y: 450 } }, // drop through to the lower chamber
  ],
  hazards: [
    { x: 120, y: 570, radius: 22, to: { x: 300, y: 570 }, durationMs: 1200 },
  ],
  collectible: { x: 60, y: 250 },
  hint:      'Descend by rift, then dodge to the pocket',
  parTimeMs: 18000,
};
