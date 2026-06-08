import type { LevelConfig } from '../../types';

// World 6 — Rifts · BOSS "THE BREACH" → PUZZLE-BOSS. No clock, no saws — one big
// rift-lock to crack. The goal sits in a fully sealed core; the obvious centre
// mouth is a decoy that loops you back. The real breach is a two-hop chain: take
// the side rift into the mid chamber, cross it, then take the far rift up into the
// core. Read the network, reject the bait, route it. Spatial insight over reflexes.
export const level82: LevelConfig = {
  ball:      { x: 180, y: 680 },
  goal:      { x: 180, y: 110, radius: 26 },
  obstacles: [
    { x: 180, y: 200, width: 360, height: 16 }, // seals the core (goal chamber)
    { x: 180, y: 440, width: 240, height: 16 }, // mid divider (edge gaps)
  ],
  portals: [
    { a: { x: 180, y: 600 }, b: { x: 300, y: 640 } }, // DECOY: the obvious mouth loops back down
    { a: { x: 300, y: 560 }, b: { x: 90,  y: 320 } }, // breach 1: side rift -> mid chamber (left)
    { a: { x: 300, y: 300 }, b: { x: 180, y: 150 } }, // breach 2: far rift -> sealed core, by the goal
  ],
  collectible: { x: 300, y: 400 }, // mid chamber, off the breach chain
  boss:      true,
  title:     'THE BREACH',
  hint:      'No clock — the centre rift is bait. Find the chain that breaches the core',
  parTimeMs: 16000,
};
