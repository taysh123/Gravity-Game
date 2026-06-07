import type { LevelConfig } from '../../types';

// World 1 · L9 — AHA (decoy): the inviting wide CENTRE gap leads up into a sealed
// dead-end box (where the gem baits you). The real route is the equally-wide gap
// on the RIGHT, which wraps up around the box to the goal. "The obvious way is a
// trap." (Both gaps are 70px — comfortably wider than the 32px ball — so it's
// genuinely solvable; the earlier 30px side gaps were impassable.)
export const level29: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 120, radius: 30 },
  obstacles: [
    { x: 70,  y: 440, width: 140, height: 14 }, // lower-left wall (x 0..140)
    { x: 250, y: 440, width: 80, height: 14 },  // lower-mid wall (x 210..290) — gaps: centre 140..210, right 290..360 (both 70px)
    { x: 175, y: 340, width: 130, height: 14 }, // dead-end box roof (x 110..240)
    { x: 115, y: 390, width: 14, height: 100 },  // box left wall
    { x: 235, y: 390, width: 14, height: 100 },  // box right wall — the centre gap feeds into this capped box
  ],
  collectible: { x: 175, y: 400 }, // inside the dead-end box — the bait
  hint:      'The wide centre gap is a trap — go around',
  parTimeMs: 16000,
};
