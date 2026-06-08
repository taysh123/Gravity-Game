import type { LevelConfig } from '../../types';

// World 7 — Gates · SIGNATURE "THE LOCKWORKS": three one-way dividers stacked up the
// arena, each with its gate offset to the opposite side — so the climb zig-zags,
// left to right to centre, and every door slams behind you. A clockwork of gates.
export const level85: LevelConfig = {
  ball:      { x: 90, y: 690 },
  goal:      { x: 180, y: 90, radius: 28 },
  obstacles: [
    // Solid halves pairing each up-gate (the gate fills the other half).
    { x: 275, y: 540, width: 180, height: 16 }, // band 1: solid right (gate is left)
    { x: 90,  y: 370, width: 170, height: 16 }, // band 2: solid left  (gate is right)
    { x: 45,  y: 200, width: 80,  height: 16 }, // band 3: solid far-left  (gate is centre)
    { x: 320, y: 200, width: 90,  height: 16 }, // band 3: solid far-right
  ],
  gates: [
    { x: 90,  y: 540, width: 170, height: 14, dir: { x: 0, y: -1 } }, // band 1 up-gate (left,  x 5..175)
    { x: 270, y: 370, width: 170, height: 14, dir: { x: 0, y: -1 } }, // band 2 up-gate (right, x 185..355)
    { x: 180, y: 200, width: 170, height: 14, dir: { x: 0, y: -1 } }, // band 3 up-gate (centre, x 95..265)
  ],
  hazards: [
    // A pulsing laser across the left-to-right crossing between bands 1 and 2 —
    // the gateworks now ticks. Cross on the dark beat. (Signature motion moment.)
    { x: 180, y: 455, width: 120, height: 12, pulseMs: 1700 },
  ],
  collectible: { x: 310, y: 460 }, // tucked right, between bands 1 and 2 (past the beam)
  title:     'THE LOCKWORKS',
  hint:      'Thread the gateworks — each door one way, and time the beam',
  parTimeMs: 19000,
};
