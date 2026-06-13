import type { LevelConfig } from '../../types';

// World 9 — Gauntlet · BOSS "THE CRUCIBLE": a forge that never stops turning. A
// rotating arm scythes the centre while a saw sweeps the floor; the only way up is
// the side lanes past the central wall. Endurance, no clock — read the spin, commit.
export const level103: LevelConfig = {
  ball:      { x: 180, y: 700 },
  goal:      { x: 180, y: 100, radius: 28 },
  obstacles: [
    { x: 180, y: 430, width: 200, height: 16 }, // central wall — climb the side lanes
  ],
  hazards: [
    { x: 180, y: 240, radius: 22, pivot: { x: 180, y: 300 }, durationMs: 2600 }, // rotating arm
    { x: 90, y: 580, radius: 24, to: { x: 270, y: 580 }, durationMs: 1300 },     // floor saw
  ],
  collectible: { x: 300, y: 560 }, // off-route, low-right
  boss:      true,
  title:     'THE CRUCIBLE',
  hint:      'Read the spin — take the side lanes home',
  camera:    { introZoom: 1.6 },
  parTimeMs: 22000,
};
