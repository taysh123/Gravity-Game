import type { LevelConfig } from '../../types';

// World 4 — Peril · AHA (decoy): the wide, inviting centre gap — straight above
// the ball, with the gem just beyond — is a trap: a saw sweeps it constantly.
// The safe road to the goal is the unguarded gap off to the left. The obvious
// way is the wrong way.
export const level72: LevelConfig = {
  ball:      { x: 180, y: 680 },
  goal:      { x: 65, y: 110, radius: 34 },
  obstacles: [
    // Barrier at y=430 with a left gap (x 20..90, SAFE → goal) and a centre gap
    // (x 150..230, guarded → gem). Three segments leave those two openings.
    { x: 120, y: 430, width: 60, height: 16 },  // between the two gaps (x 90..150)
    { x: 295, y: 430, width: 130, height: 16 }, // right of centre gap (x 230..360)
  ],
  hazards: [
    // Fast saw patrolling the centre gap — the bait route is never safe enough.
    { x: 150, y: 430, radius: 24, to: { x: 230, y: 430 }, durationMs: 950 },
  ],
  collectible: { x: 190, y: 360 }, // in the guarded centre pocket — the risky 2nd star
  hint:      'The open centre is a trap — find the safe gap',
  parTimeMs: 13000,
};
