import type { LevelConfig } from '../../types';

// World 7 — Gates · AHA (plan the gem first): the goal is an easy climb up the open
// left side. But the gem is expensive — it sits past a RIGHT-gate, and the only way
// back up from there is a one-way UP-gate. Grabbing it is a committed right-then-up
// detour you must plan before you start, not grab in passing.
export const level84: LevelConfig = {
  ball:      { x: 90, y: 660 },
  goal:      { x: 150, y: 130, radius: 34 },
  obstacles: [],
  gates: [
    { x: 235, y: 560, width: 16, height: 200, dir: { x: 1, y: 0 } },  // right-gate to the gem (no return)
    { x: 290, y: 430, width: 140, height: 16, dir: { x: 0, y: -1 } }, // up-gate back out of the right side
  ],
  collectible: { x: 315, y: 560 }, // behind the right-gate — the expensive star
  hint:      'The gem costs a one-way detour — plan it before you climb',
  parTimeMs: 17000,
};
