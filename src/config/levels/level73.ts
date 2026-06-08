import type { LevelConfig } from '../../types';

// World 4 — Peril · SIGNATURE "THE FORGE": a descent. The goal is at the BOTTOM,
// and the way down is a shaft of three saw-pistons firing across it on an
// alternating rhythm. Ease the ball down, timing each piston's clear window.
// The poster reaction level — memorable by name.
export const level73: LevelConfig = {
  ball:      { x: 180, y: 90 },
  goal:      { x: 180, y: 700, radius: 34 },
  obstacles: [],
  hazards: [
    // Three pistons, staggered in height, alternating start sides → a rhythm
    // with a travelling safe window down the shaft.
    { x: 60,  y: 250, radius: 24, to: { x: 300, y: 250 }, durationMs: 950 },  // L→R
    { x: 300, y: 410, radius: 24, to: { x: 60,  y: 410 }, durationMs: 950 },  // R→L (opposite phase)
    { x: 60,  y: 560, radius: 24, to: { x: 300, y: 560 }, durationMs: 950 },  // L→R
    { x: 300, y: 480, width: 16, height: 120, pulseMs: 1500 }, // an ember beam guarding the gem pocket
  ],
  collectible: { x: 335, y: 480 }, // deep right pocket, behind the ember beam — time it on the dark beat
  title:     'THE FORGE',
  hint:      'Descend the forge — time the pistons (and the ember beam for the gem)',
  parTimeMs: 15000,
};
