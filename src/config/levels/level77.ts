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
  collectible: { x: 180, y: 380 }, // dead centre — the heart of the binary
  title:     'THE BINARY STAR',
  hint:      'Thread the neutral line — straight through the heart',
  parTimeMs: 15000,
};
