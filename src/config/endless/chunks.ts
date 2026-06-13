import type { ObstacleConfig, HazardConfig, GravityZoneConfig, MagnetConfig, Vec2 } from '../../types';
import { PHYSICS } from '../physics.config';

// ─────────────────────────────────────────────────────────────────────────────
// GRAVITY RUN — handcrafted run "chunks" (the flagship endless mode, G1).
//
// A RunChunk is a fixed-height vertical SEGMENT authored in chunk-local coords
// (x: 0..PLAY_WIDTH, y: 0..height, y=0 = TOP of the chunk). The endless scene
// stitches a seeded sequence of these, scrolling them downward past a star the
// player keeps alive with the attractor. Handcrafted segments (not raw procedural)
// keep the run fair + on-brand; the weekly seed makes everyone's run identical for
// a fair leaderboard. `tier` gates when a chunk can appear (difficulty ramp).
//
// Hazard `to` is a chunk-local horizontal sweep range (the scene animates the
// horizontal motion; the downward scroll is applied by the scene, not by `to`).
// ─────────────────────────────────────────────────────────────────────────────
export interface RunChunk {
  id: string;
  tier: number;             // 0 = open/easy … higher = denser/harder (gates appearance)
  height: number;           // vertical extent in px
  obstacles?: ObstacleConfig[];
  hazards?: HazardConfig[];
  gravityZones?: GravityZoneConfig[];
  magnets?: MagnetConfig[];
  stars?: Vec2[];           // collectible score pickups
}

const W = PHYSICS.PLAY_WIDTH; // 360
const H = 560;                // standard chunk height
const GZ = PHYSICS.GRAVITY_ZONE_STRENGTH;

// Tier 0 — breathers / gentle (always available; the run opens with these).
const breather: RunChunk = {
  id: 'breather', tier: 0, height: H,
  stars: [{ x: W / 2, y: 280 }],
};
const drift: RunChunk = {
  id: 'drift', tier: 0, height: H,
  gravityZones: [{ x: 90, y: 280, width: 120, height: 360, dir: { x: 1, y: 0 }, strength: GZ * 0.6 }],
  stars: [{ x: 250, y: 200 }, { x: 250, y: 360 }],
};
const lanes: RunChunk = {
  id: 'lanes', tier: 0, height: H,
  obstacles: [{ x: 130, y: 280, width: 16, height: 240 }],
  stars: [{ x: 250, y: 280 }],
};

// Tier 1 — first real hazards (one threat, clear gap).
const sawSweep: RunChunk = {
  id: 'sawSweep', tier: 1, height: H,
  hazards: [{ x: 80, y: 280, radius: 24, to: { x: 280, y: 280 }, durationMs: 1200 }],
  stars: [{ x: W / 2, y: 120 }],
};
const pillars: RunChunk = {
  id: 'pillars', tier: 1, height: H,
  obstacles: [
    { x: 110, y: 200, width: 90, height: 16 },
    { x: 250, y: 360, width: 90, height: 16 },
  ],
  stars: [{ x: 250, y: 200 }, { x: 110, y: 360 }],
};

// Tier 2 — combinations / forced precision.
const twinSaws: RunChunk = {
  id: 'twinSaws', tier: 2, height: H,
  hazards: [
    { x: 60, y: 200, radius: 22, to: { x: 300, y: 200 }, durationMs: 1100 },
    { x: 300, y: 360, radius: 22, to: { x: 60, y: 360 }, durationMs: 1100 },
  ],
  stars: [{ x: W / 2, y: 280 }],
};
const magnetSlalom: RunChunk = {
  id: 'magnetSlalom', tier: 2, height: H,
  magnets: [{ x: 130, y: 220, polarity: 'repel' }, { x: 240, y: 360, polarity: 'repel' }],
  stars: [{ x: 250, y: 220 }, { x: 110, y: 360 }],
};

// Tier 3 — dense gauntlets (late-run pressure).
const gauntlet: RunChunk = {
  id: 'gauntlet', tier: 3, height: H,
  obstacles: [{ x: 250, y: 200, width: 120, height: 16 }],
  hazards: [{ x: 80, y: 360, radius: 22, to: { x: 280, y: 360 }, durationMs: 1000 }],
  gravityZones: [{ x: 300, y: 280, width: 90, height: 360, dir: { x: 0, y: -1 }, strength: GZ }],
  stars: [{ x: 60, y: 200 }],
};
const beamRun: RunChunk = {
  id: 'beamRun', tier: 3, height: H,
  hazards: [{ x: W / 2, y: 280, width: 360, height: 12, pulseMs: 1400 }],
  stars: [{ x: W / 2, y: 120 }, { x: W / 2, y: 440 }],
};

// The full pool (order is irrelevant; the generator picks by tier + seed).
export const CHUNKS: RunChunk[] = [
  breather, drift, lanes,
  sawSweep, pillars,
  twinSaws, magnetSlalom,
  gauntlet, beamRun,
];
