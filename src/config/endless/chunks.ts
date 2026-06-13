import type { ObstacleConfig, HazardConfig, GravityZoneConfig, MagnetConfig, Vec2 } from '../../types';
import { PHYSICS } from '../physics.config';

// ─────────────────────────────────────────────────────────────────────────────
// GRAVITY RUN — handcrafted run "chunks".
//
// A RunChunk is a fixed-height vertical SEGMENT authored in chunk-local coords
// (x: 0..PLAY_WIDTH, y: 0..height, y=0 = TOP). The endless scene stitches a seeded
// sequence of these, scrolling them past a star the player keeps alive with the
// attractor. Handcrafted (not raw procedural) keeps runs fair + on-brand.
//
// AUTHORING RULES (kept honest by chunks.test.ts):
//   • Every chunk must leave a navigable safe lane (>= ~48px gap at each obstacle
//     row) that survives at max scroll speed — static walls never fully block.
//   • `tier` gates appearance (the difficulty ramp). `tag` drives the generator's
//     no-same-family-in-a-row variety rule.
//   • Hazard `to` is a chunk-local horizontal sweep range; the scene applies the
//     downward scroll. Beams (`pulseMs`) are timed — leave a lane or telegraph.
// ─────────────────────────────────────────────────────────────────────────────
export type ChunkTag = 'open' | 'wall' | 'saw' | 'zone' | 'magnet' | 'beam';

export interface RunChunk {
  id: string;
  tier: number;             // 0 = open/easy … higher = denser/harder
  tag: ChunkTag;            // family — used to avoid same-family back-to-back
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

// ── Tier 0 — breathers / gentle (the run always opens here) ──────────────────
const breather: RunChunk = { id: 'breather', tier: 0, tag: 'open', height: H, stars: [{ x: W / 2, y: 280 }] };
const starfield: RunChunk = { id: 'starfield', tier: 0, tag: 'open', height: H, stars: [{ x: 90, y: 160 }, { x: 270, y: 300 }, { x: 160, y: 440 }] };
const drift: RunChunk = {
  id: 'drift', tier: 0, tag: 'zone', height: H,
  gravityZones: [{ x: 90, y: 280, width: 120, height: 360, dir: { x: 1, y: 0 }, strength: GZ * 0.6 }],
  stars: [{ x: 250, y: 200 }, { x: 250, y: 360 }],
};
const lanes: RunChunk = {
  id: 'lanes', tier: 0, tag: 'wall', height: H,
  obstacles: [{ x: 130, y: 280, width: 16, height: 240 }], // clear lanes both sides
  stars: [{ x: 250, y: 280 }],
};

// ── Tier 1 — first real threats (one obstacle, clear gap) ────────────────────
const sawSweep: RunChunk = {
  id: 'sawSweep', tier: 1, tag: 'saw', height: H,
  hazards: [{ x: 80, y: 280, radius: 24, to: { x: 280, y: 280 }, durationMs: 1200 }],
  stars: [{ x: W / 2, y: 120 }],
};
const pillars: RunChunk = {
  id: 'pillars', tier: 1, tag: 'wall', height: H,
  obstacles: [{ x: 110, y: 200, width: 90, height: 16 }, { x: 250, y: 360, width: 90, height: 16 }],
  stars: [{ x: 250, y: 200 }, { x: 110, y: 360 }],
};
const updraftLane: RunChunk = {
  id: 'updraftLane', tier: 1, tag: 'zone', height: H,
  gravityZones: [{ x: 280, y: 280, width: 120, height: 400, dir: { x: 0, y: -1 }, strength: GZ }],
  stars: [{ x: 90, y: 200 }],
};
const swingWell: RunChunk = {
  id: 'swingWell', tier: 1, tag: 'magnet', height: H,
  magnets: [{ x: 240, y: 280, polarity: 'attract' }],
  stars: [{ x: 120, y: 180 }],
};
const downGap: RunChunk = {
  id: 'downGap', tier: 1, tag: 'wall', height: H,
  obstacles: [{ x: 120, y: 280, width: 200, height: 16 }], // x20..220 — clear gap on the right
  stars: [{ x: 300, y: 180 }],
};

// ── Tier 2 — combinations / forced precision ─────────────────────────────────
const twinSaws: RunChunk = {
  id: 'twinSaws', tier: 2, tag: 'saw', height: H,
  hazards: [
    { x: 60, y: 200, radius: 22, to: { x: 300, y: 200 }, durationMs: 1100 },
    { x: 300, y: 360, radius: 22, to: { x: 60, y: 360 }, durationMs: 1100 },
  ],
  stars: [{ x: W / 2, y: 280 }],
};
const magnetSlalom: RunChunk = {
  id: 'magnetSlalom', tier: 2, tag: 'magnet', height: H,
  magnets: [{ x: 130, y: 220, polarity: 'repel' }, { x: 240, y: 360, polarity: 'repel' }],
  stars: [{ x: 250, y: 220 }, { x: 110, y: 360 }],
};
const zigzag: RunChunk = {
  id: 'zigzag', tier: 2, tag: 'wall', height: H,
  obstacles: [{ x: 130, y: 360, width: 220, height: 16 }, { x: 250, y: 200, width: 220, height: 16 }],
  stars: [{ x: 300, y: 360 }, { x: 60, y: 200 }],
};
const windSaw: RunChunk = {
  id: 'windSaw', tier: 2, tag: 'zone', height: H,
  gravityZones: [{ x: 180, y: 300, width: 300, height: 150, dir: { x: 1, y: 0 }, strength: GZ * 0.6 }],
  hazards: [{ x: 300, y: 200, radius: 22, to: { x: 120, y: 200 }, durationMs: 1100 }],
  stars: [{ x: 90, y: 360 }],
};
const repelGate: RunChunk = {
  id: 'repelGate', tier: 2, tag: 'magnet', height: H,
  obstacles: [{ x: 120, y: 300, width: 200, height: 16 }], // gap right
  magnets: [{ x: 290, y: 200, polarity: 'repel' }],
  stars: [{ x: 120, y: 180 }],
};
const beamSlot: RunChunk = {
  id: 'beamSlot', tier: 2, tag: 'beam', height: H,
  hazards: [{ x: 90, y: 280, width: 200, height: 12, pulseMs: 1400 }], // covers ~x0..190; right lane always open
  stars: [{ x: 300, y: 160 }, { x: 300, y: 400 }],
};

// ── Tier 3 — dense set-pieces (late-run pressure) ────────────────────────────
const gauntlet: RunChunk = {
  id: 'gauntlet', tier: 3, tag: 'saw', height: H,
  obstacles: [{ x: 250, y: 200, width: 120, height: 16 }],
  hazards: [{ x: 80, y: 360, radius: 22, to: { x: 280, y: 360 }, durationMs: 1000 }],
  gravityZones: [{ x: 300, y: 280, width: 90, height: 360, dir: { x: 0, y: -1 }, strength: GZ }],
  stars: [{ x: 60, y: 200 }],
};
const beamRun: RunChunk = {
  id: 'beamRun', tier: 3, tag: 'beam', height: H,
  hazards: [{ x: W / 2, y: 280, width: 360, height: 12, pulseMs: 1400 }], // timed — cross when dark
  stars: [{ x: W / 2, y: 120 }, { x: W / 2, y: 440 }],
};
const doubleBeam: RunChunk = {
  id: 'doubleBeam', tier: 3, tag: 'beam', height: H,
  hazards: [
    { x: 90, y: 220, width: 200, height: 12, pulseMs: 1400, phaseMs: 0 },
    { x: 270, y: 380, width: 200, height: 12, pulseMs: 1400, phaseMs: 700 },
  ],
  stars: [{ x: 300, y: 220 }, { x: 60, y: 380 }],
};
const sawMaze: RunChunk = {
  id: 'sawMaze', tier: 3, tag: 'wall', height: H,
  obstacles: [{ x: 130, y: 360, width: 220, height: 16 }, { x: 250, y: 200, width: 220, height: 16 }],
  hazards: [{ x: 90, y: 280, radius: 20, to: { x: 280, y: 280 }, durationMs: 1000 }],
  stars: [{ x: 300, y: 360 }],
};
const binaryWell: RunChunk = {
  id: 'binaryWell', tier: 3, tag: 'magnet', height: H,
  magnets: [{ x: 180, y: 300, polarity: 'repel' }, { x: 300, y: 180, polarity: 'attract' }],
  stars: [{ x: 120, y: 300 }],
};

// The full pool (order is irrelevant; the generator picks by tier + seed + variety).
export const CHUNKS: RunChunk[] = [
  breather, starfield, drift, lanes,
  sawSweep, pillars, updraftLane, swingWell, downGap,
  twinSaws, magnetSlalom, zigzag, windSaw, repelGate, beamSlot,
  gauntlet, beamRun, doubleBeam, sawMaze, binaryWell,
];
