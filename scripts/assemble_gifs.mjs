// Assemble the captured frame sequences (scripts/capture_frames.py) into animated
// GIFs for the README, using sharp's animated `join` (already a devDependency).
// Output -> docs/media/github/*.gif. Skips any clip whose frames are missing.
//
// Usage:  node scripts/assemble_gifs.mjs
import sharp from 'sharp';
import { readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const FRAMES = 'docs/media/raw/frames';
const OUT = 'docs/media/github';
const WIDTH = 320; // downscale source frames -> light GIFs
// GIF palette/compression — capped colours + max effort keeps the noisy
// starfield backgrounds (the hardest content to compress) lean without
// dropping frames the escalation/loop needs to read clearly.
const GIF_OPTS = { colours: 144, effort: 10, loop: 0 };

const CLIPS = [
  { dir: 'gravity-pull', out: 'gravity-pull.gif', delay: 60 },
  { dir: 'endless-climb', out: 'endless-climb.gif', delay: 55 },
  // Hero 1 — 3-star celebration escalation (Wave 2-3 new juice: BLAZE streak +
  // milestone toast). Near real-time playback so the staggered star-pop /
  // PERFECT! / toast entrance reads clearly. stride:2 halves the frame count
  // (still >= one sample per ~140ms beat) to keep the file lean.
  { dir: 'win-celebration', out: 'win-celebration.gif', delay: 140, stride: 2 },
  // Hero 2 — living-world / attractor loop (World 15: tendrils + lensing +
  // reactive background + a drifting comet). Captured over ~10s of real dwell
  // time (guarantees a comet crossing); stride:2 + a longer per-frame delay
  // keeps the same real-time coverage at half the frames/size.
  { dir: 'living-world', out: 'living-world.gif', delay: 280, stride: 2 },
];

mkdirSync(OUT, { recursive: true });

for (const c of CLIPS) {
  const dir = join(FRAMES, c.dir);
  if (!existsSync(dir)) { console.warn('skip (no dir):', c.dir); continue; }
  let files = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
  if (!files.length) { console.warn('skip (no frames):', c.dir); continue; }
  if (c.stride) files = files.filter((_, i) => i % c.stride === 0);

  const buffers = [];
  for (const f of files) {
    buffers.push(await sharp(join(dir, f)).resize({ width: WIDTH }).png().toBuffer());
  }
  await sharp(buffers, { join: { animated: true } })
    .gif({ ...GIF_OPTS, delay: c.delay })
    .toFile(join(OUT, c.out));
  console.log('wrote', c.out, `(${files.length} frames)`);
}
