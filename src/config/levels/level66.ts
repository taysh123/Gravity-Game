import type { LevelConfig } from '../../types';

// World 1 · L7 — BOSS "THE COLLAPSE": the camera reveals a tall shaft, then you
// DESCEND it — the inverse silhouette of the climbing Gauntlet. Weave down through
// five offset gaps, slip two spikes, and settle the star into its home at the
// bottom (which blooms as you near it). A set-piece descent, not a generic climb.
export const level66: LevelConfig = {
  ball:      { x: 180, y: 90 },
  goal:      { x: 180, y: 690, radius: 28 },
  obstacles: [
    { x: 110, y: 190, width: 200, height: 14 }, // §1 gap right
    { x: 250, y: 305, width: 200, height: 14 }, // §1 gap left
    { x: 110, y: 420, width: 200, height: 14 }, // §2 gap right
    { x: 250, y: 535, width: 200, height: 14 }, // §3 gap left
    { x: 110, y: 630, width: 200, height: 14 }, // §3 gap right (above the home)
  ],
  hazards: [
    { x: 300, y: 360, radius: 24 }, // §2 spike by the right gap
    { x: 90,  y: 480, radius: 24 }, // §3 spike by the left gap
  ],
  camera:    { introZoom: 1.9 }, // reveal the full shaft before the descent
  collectible: { x: 300, y: 190 }, // off-route, top
  title:     'THE COLLAPSE',
  boss:      true,
  hint:      'Descend the shaft — bring the star home',
  parTimeMs: 26000,
};
