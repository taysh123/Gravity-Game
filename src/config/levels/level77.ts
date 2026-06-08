import type { LevelConfig } from '../../types';

// World 5 — Wells · SIGNATURE "THE BINARY STAR": two attract wells face off across
// the arena. Climb the neutral line straight between them — their sideways pulls
// cancel only there; drift and one star captures you. The gem sits at the dead
// centre, the heart of the binary. A symmetric set-piece.
export const level77: LevelConfig = {
  ball:      { x: 180, y: 670 },
  goal:      { x: 180, y: 110, radius: 30 },
  obstacles: [],
  magnets: [
    { x: 90,  y: 380, polarity: 'attract' },
    { x: 270, y: 380, polarity: 'attract' },
  ],
  hazards: [
    // Each star has a burning core — drift off the neutral line, get captured, and
    // you fall into a spike. Capture now COSTS something; the 1-star route is the
    // clean centre thread.
    { x: 90,  y: 380, radius: 20 },
    { x: 270, y: 380, radius: 20 },
  ],
  collectible: { x: 180, y: 380 }, // dead centre — the safe heart of the binary
  title:     'THE BINARY STAR',
  hint:      'Thread the neutral line — drift and a star will pull you onto its core',
  parTimeMs: 15000,
};
