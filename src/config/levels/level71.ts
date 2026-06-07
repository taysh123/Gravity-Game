import type { LevelConfig } from '../../types';

// World 4 — Peril · AHA (safe-window): the ONLY gap up is swept by a saw that
// blocks it on a rhythm. You can't outrun it — wait below until the saw clears
// the gap, then dash through. Patience under pressure, not raw reaction.
export const level71: LevelConfig = {
  ball:      { x: 65, y: 690 },
  goal:      { x: 200, y: 110, radius: 40 },
  obstacles: [
    // Full-width barrier with a single ~90px gap on the left (x 20..110).
    { x: 235, y: 420, width: 250, height: 16 },
  ],
  hazards: [
    // Saw sweeps from over the gap (x75) out to the right — gap is open only
    // while the saw is away. The window is the whole puzzle.
    { x: 75, y: 420, radius: 24, to: { x: 300, y: 420 }, durationMs: 1300 },
  ],
  collectible: { x: 300, y: 250 }, // top-right detour, taken after clearing the gap
  hint:      'Wait for the saw to clear the gap — then go',
  parTimeMs: 13000,
};
