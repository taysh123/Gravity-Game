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

// name -> { maxLong, palette, knockout }. Palette quantization shrinks opaque
// art well; transparent art uses full RGBA. `knockout` removes a uniform light
// background (feathered white → alpha) so a logo card sits cleanly on the dark
// cosmic theme.
const TARGETS = {
  'gravity-flow-logo.png': { maxLong: 896, palette: true, knockout: false },
  'true-story-labs-logo.png': { maxLong: 1024, palette: false, knockout: true },
};

// Feather near-white, low-saturation pixels (the card background) to transparent.
async function knockoutWhite(pipeline) {
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    if (lum > 205 && sat < 30) {
      data[i + 3] = Math.max(0, Math.min(255, Math.round((220 - lum) * 17)));
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
}

for (const [name, { maxLong, palette, knockout }] of Object.entries(TARGETS)) {
  const src = resolve(rawDir, name);
  const dst = resolve(outDir, name);
  const before = await sharp(src).metadata();
  let pipeline = sharp(src).resize({
    width: maxLong,
    height: maxLong,
    fit: 'inside',
    withoutEnlargement: true,
    kernel: 'lanczos3',
  });
  if (knockout) pipeline = await knockoutWhite(pipeline);
  await pipeline.png({ palette, quality: 90, compressionLevel: 9, effort: 10 }).toFile(dst);
  const after = await sharp(dst).metadata();
  const outKB = (statSync(dst).size / 1024).toFixed(0);
  console.log(
    `${name}: ${before.width}x${before.height} -> ${after.width}x${after.height}, ${outKB} KB`,
  );
}
