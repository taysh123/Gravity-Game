// Asset optimization: downscale + quantize the splash logos.
//
// Source of truth: assets/raw/*.png (full-resolution originals, gitignored).
// Output:          assets/images/*.png (small, palette-quantized, committed).
//
// Run with: npm run optimize:assets
//
// Logos render at most ~900px wide on the highest-DPI phones (390px logical
// canvas FIT-scaled). We cap the long edge near that, then palette-quantize —
// glow gradients survive quantization well and shrink ~10x in bytes.

import sharp from 'sharp';
import { mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = resolve(root, 'assets/raw');
const outDir = resolve(root, 'assets/images');
mkdirSync(outDir, { recursive: true });

// name -> max long-edge px (crisp headroom over the largest rendered size)
const TARGETS = {
  'gravity-flow-logo.png': 896,
};

for (const [name, maxLong] of Object.entries(TARGETS)) {
  const src = resolve(rawDir, name);
  const dst = resolve(outDir, name);
  const before = (await sharp(src).metadata());
  await sharp(src)
    .resize({
      width: maxLong,
      height: maxLong,
      fit: 'inside',
      withoutEnlargement: true,
      kernel: 'lanczos3',
    })
    .png({ palette: true, quality: 90, compressionLevel: 9, effort: 10 })
    .toFile(dst);
  const after = await sharp(dst).metadata();
  const outKB = (statSync(dst).size / 1024).toFixed(0);
  console.log(
    `${name}: ${before.width}x${before.height} -> ${after.width}x${after.height}, ${outKB} KB`,
  );
}
