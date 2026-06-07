import type { LevelConfig } from '../../types';

// World 6 — Rifts · BOSS "THE BREACH": punch through the sealed wall via the rift —
// but it flings you out into a saw-swept void. Time two sweeping saws on the climb
// and break for the goal before the clock runs out.
export const level82: LevelConfig = {
  ball:      { x: 180, y: 680 },
  goal:      { x: 180, y: 100, radius: 24 },
  obstacles: [
    { x: 180, y: 470, width: 360, height: 16 }, // sealed wall — the breach is the only way up
  ],
  portals: [
    { a: { x: 180, y: 560 }, b: { x: 300, y: 360 } }, // breach to the upper-right void
  ],
  hazards: [
    { x: 90,  y: 330, radius: 22, to: { x: 300, y: 330 }, durationMs: 1000 }, // saw 1
    { x: 300, y: 180, radius: 22, to: { x: 60,  y: 180 }, durationMs: 1100 }, // saw 2, guards the goal
  ],
  collectible: { x: 300, y: 560 }, // beside the lower mouth — grab before you commit
  boss:      true,
  title:     'THE BREACH',
  hint:      'Breach the wall, time the saws — beat the clock',
  parTimeMs: 12000,
  timeLimitMs: 16000,
};
