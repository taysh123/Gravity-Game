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
// function yielding floats in [0, 1). Exported so other pure modules (e.g.
// utils/comets.ts) and their tests can reuse the same deterministic RNG.
export function mulberry32(seed: number): () => number {
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
// Avoid repeating any of the last N chunk ids (variety — kills the "same run" feel).
const RECENCY_WINDOW = 4;

// Deterministic chunk sequence for a seed with variety + pacing rules:
//  • tier-gated by distance (the ramp); a tier-0 breather always opens the run;
//  • tension/release — a hard chunk (tier ≥ 2) is always followed by an easy one;
//  • no immediate id OR family(`tag`) repeat, and no repeat within a recency window.
// Each filter falls back gracefully so a pick always exists. Same seed → same run.
export function generateRun(seedKey: string, count: number, chunks: RunChunk[] = CHUNKS): RunChunk[] {
  const rng = mulberry32(fnv(seedKey));
  const maxTier = chunks.reduce((m, c) => Math.max(m, c.tier), 0);
  const run: RunChunk[] = [];
  const pick = (pool: RunChunk[]): RunChunk => pool[Math.floor(rng() * pool.length)] ?? chunks[0];

  for (let i = 0; i < count; i++) {
    const prev = run[i - 1];
    const allowed = Math.min(maxTier, Math.floor(i / RAMP_EVERY));
    let pool = chunks.filter((c) => c.tier <= allowed);

    // Tension/release: after a hard chunk, force an easy breather next.
    if (prev && prev.tier >= 2) {
      const easy = pool.filter((c) => c.tier <= 1);
      if (easy.length) pool = easy;
    }
    // Spread variety: avoid the last RECENCY_WINDOW ids (fall back to no-immediate-repeat).
    const recent = run.slice(-RECENCY_WINDOW).map((c) => c.id);
    let candidates = pool.filter((c) => !recent.includes(c.id));
    if (!candidates.length) candidates = prev ? pool.filter((c) => c.id !== prev.id) : pool;
    if (!candidates.length) candidates = pool;
    // Avoid the same family back-to-back (don't stack two saws / two beams …).
    if (prev) {
      const diffTag = candidates.filter((c) => c.tag !== prev.tag);
      if (diffTag.length) candidates = diffTag;
    }

    run.push(pick(candidates));
  }
  return run;
}

// Run score from distance travelled (px) + stars collected. Pure so the HUD and
// the result/leaderboard all agree. Distance dominates; stars are a style bonus.
export function runScore(distancePx: number, stars: number): number {
  return Math.floor(distancePx / 10) + stars * 25;
}

// Soft-currency (Stardust) earned for a run, scaling gently with score and capped
// so the campaign stays the main earner. Cosmetic economy only — never gameplay.
export function stardustForRun(score: number): number {
  return Math.min(60, Math.floor(score / 40));
}
