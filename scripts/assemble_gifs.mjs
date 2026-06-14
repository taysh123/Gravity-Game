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
const WIDTH = 360; // downscale source frames -> light GIFs

const CLIPS = [
  { dir: 'gravity-pull', out: 'gravity-pull.gif', delay: 60 },
  { dir: 'endless-climb', out: 'endless-climb.gif', delay: 55 },
  { dir: 'win-celebration', out: 'win-celebration.gif', delay: 75 },
];

mkdirSync(OUT, { recursive: true });

for (const c of CLIPS) {
  const dir = join(FRAMES, c.dir);
  if (!existsSync(dir)) { console.warn('skip (no dir):', c.dir); continue; }
  const files = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
  if (!files.length) { console.warn('skip (no frames):', c.dir); continue; }

  const buffers = [];
  for (const f of files) {
    buffers.push(await sharp(join(dir, f)).resize({ width: WIDTH }).png().toBuffer());
  }
  await sharp(buffers, { join: { animated: true } })
    .gif({ delay: c.delay, loop: 0 })
    .toFile(join(OUT, c.out));
  console.log('wrote', c.out, `(${files.length} frames)`);
}
