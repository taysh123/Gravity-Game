// Pure logic for GRAVITY RUN (the endless flagship mode): a deterministic,
// weekly-seeded sequence of handcrafted run chunks with a difficulty ramp. No
// Phaser, no storage → trivially testable (mirrors utils/daily.ts).
import { CHUNKS, type RunChunk } from '../config/endless/chunks';

// FNV-1a hash of a string — stable across sessions/devices (same as daily.ts).
function fnv(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32 — a tiny deterministic PRNG seeded from a 32-bit int. Returns a
// function yielding floats in [0, 1).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The week's seed key (UTC, week-aligned). Everyone playing in the same week gets
// the same run → a fair weekly leaderboard. Local date is fine; runs reset weekly.
export function weekKey(d: Date): string {
  const days = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
  return `gw${Math.floor(days / 7)}`;
}

// Unlock one harder tier every N chunks of distance — the difficulty ramp.
const RAMP_EVERY = 3;

// Deterministic chunk sequence for a seed: tier-gated by distance, no immediate
// repeats when avoidable. Same seed + count → identical run, every device.
export function generateRun(seedKey: string, count: number, chunks: RunChunk[] = CHUNKS): RunChunk[] {
  const rng = mulberry32(fnv(seedKey));
  const maxTier = chunks.reduce((m, c) => Math.max(m, c.tier), 0);
  const run: RunChunk[] = [];
  let prevId = '';
  for (let i = 0; i < count; i++) {
    const allowed = Math.min(maxTier, Math.floor(i / RAMP_EVERY));
    let pool = chunks.filter((c) => c.tier <= allowed);
    const noRepeat = pool.filter((c) => c.id !== prevId);
    if (noRepeat.length) pool = noRepeat;
    const pick = pool[Math.floor(rng() * pool.length)] ?? chunks[0];
    run.push(pick);
    prevId = pick.id;
  }
  return run;
}

// Run score from distance travelled (px) + stars collected. Pure so the HUD and
// the result/leaderboard all agree. Distance dominates; stars are a style bonus.
export function runScore(distancePx: number, stars: number): number {
  return Math.floor(distancePx / 10) + stars * 25;
}
