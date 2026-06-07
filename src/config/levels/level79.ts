import type { LevelConfig } from '../../types';

// World 6 — Rifts · AHA (velocity-carry): the rift exits at the foot of a tall
// shaft with the goal at its top. The rift carries your speed through — so drift in
// slowly and you stall in the shaft; hit the lower mouth FAST and you're flung all
// the way up. Build a run-up before you enter.
export const level79: LevelConfig = {
  ball:      { x: 180, y: 660 },
  goal:      { x: 180, y: 110, radius: 26 },
  obstacles: [
    { x: 180, y: 450, width: 360, height: 18 }, // full-width seal — rift required
    { x: 145, y: 235, width: 16, height: 250 }, // shaft left wall
    { x: 215, y: 235, width: 16, height: 250 }, // shaft right wall (channel ~54px)
  ],
  portals: [
    { a: { x: 180, y: 555 }, b: { x: 180, y: 330 } }, // lower mouth -> foot of the shaft
  ],
  collectible: { x: 180, y: 170 }, // near the top of the shaft — only a fast carry reaches it cleanly
  hint:      'Hit the rift with speed — carry it up the shaft',
  parTimeMs: 15000,
};
