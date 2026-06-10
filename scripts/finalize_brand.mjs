// Promote the recommended icon/feature concepts to the FINAL store files.
// - icon  -> docs/store/assets/icon-512.png  as 32-bit RGBA PNG (Play hi-res icon spec)
// - feature-> docs/store/assets/feature-1024x500.png (24-bit, Play feature spec)
// Change RECOMMENDED below to swap which concept becomes final.
//
// Usage:  node scripts/finalize_brand.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const A = (p) => resolve(root, 'docs/store/assets', p);

const RECOMMENDED = { icon: 'vortex', feature: 'vignette' };

// Icon: force a 32-bit (RGBA) PNG at exactly 512x512.
await sharp(A(`icon-concepts/${RECOMMENDED.icon}.png`))
  .resize(512, 512)
  .ensureAlpha()            // -> 4 channels = 32-bit
  .png()
  .toFile(A('icon-512.png'));

// Feature: 24-bit (no alpha) at exactly 1024x500 — exactly what Play wants.
await sharp(A(`feature-concepts/${RECOMMENDED.feature}.png`))
  .resize(1024, 500)
  .removeAlpha()
  .png()
  .toFile(A('feature-1024x500.png'));

const im = await sharp(A('icon-512.png')).metadata();
const fm = await sharp(A('feature-1024x500.png')).metadata();
console.log(`icon-512.png      ${im.width}x${im.height}  channels=${im.channels} (${im.channels === 4 ? '32-bit OK' : 'NOT 32-bit'})  <- ${RECOMMENDED.icon}`);
console.log(`feature-1024x500  ${fm.width}x${fm.height}  channels=${fm.channels}  <- ${RECOMMENDED.feature}`);
