// Curate the raw capture dump (docs/media/raw, gitignored) into the committed,
// per-destination final sets. Store folders get full-resolution masters; the
// web destinations (GitHub / portfolio / LinkedIn) get downscaled copies so the
// repo stays lean. Reproducible — re-run after a fresh capture.
//
// Usage:  node scripts/curate_media.mjs   (after capture_media.py + assemble_gifs.mjs)
import sharp from 'sharp';
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const A = 'docs/media/raw/android';
const I = 'docs/media/raw/iphone67';
const P = 'docs/media/raw/ipad';

const copy = (src, dst) => {
  if (!existsSync(src)) { console.warn('missing:', src); return; }
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
};
const web = async (src, dst, width) => {
  if (!existsSync(src)) { console.warn('missing:', src); return; }
  mkdirSync(dirname(dst), { recursive: true });
  await sharp(src).resize({ width }).png({ quality: 90 }).toFile(dst);
};

// --- Google Play (full-res 1080x2160, store order) ------------------------
const PLAY = [
  ['02-star-map', '01-star-map'],
  ['play-l055', '02-gameplay-pull'],
  ['boss-l050', '03-boss-singularity'],
  ['03-gravity-run-hub', '04-gravity-run'],
  ['play-l035', '05-hazards-peril'],
  ['07-cosmetics-skins', '06-cosmetics'],
  ['06-achievements', '07-achievements'],
  ['11-win-overlay', '08-three-star-win'],
];
for (const [s, d] of PLAY) copy(`${A}/${s}.png`, `docs/media/store/android/${d}.png`);

// --- App Store iPhone 6.7" (full-res 1290x2796, mirrors Play order) -------
const IOS = [
  ['02-star-map', '01-star-map'],
  ['04-play-rifts', '02-gameplay-pull'],
  ['11-boss-finale', '03-boss-finale'],
  ['05-endless-climb', '04-gravity-run'],
  ['12-play-peril', '05-hazards-peril'],
  ['06-cosmetics', '06-cosmetics'],
  ['07-achievements', '07-achievements'],
  ['10-win-overlay', '08-three-star-win'],
];
for (const [s, d] of IOS) copy(`${I}/${s}.png`, `docs/media/store/ios/iphone-6.7/${d}.png`);

// --- App Store iPad 12.9" (full-res 2048x2732, LETTERBOXED previews) -------
const IPAD = [
  ['01-star-map', '01-star-map'],
  ['02-play-rifts', '02-gameplay'],
  ['03-world-currents', '03-world-currents'],
  ['04-endless-climb', '04-gravity-run'],
  ['05-boss-finale', '05-boss-finale'],
];
for (const [s, d] of IPAD) copy(`${P}/${s}.png`, `docs/media/store/ios/ipad-12.9/${d}.png`);

// --- GitHub README (downscaled stills; the 3 GIFs are already in place) ----
const GH = [
  ['02-star-map', 'hero-star-map', 900],
  ['play-l055', 'gallery-01-gameplay', 640],
  ['boss-l050', 'gallery-02-boss', 640],
  ['03-gravity-run-hub', 'gallery-03-gravity-run', 640],
  ['07-cosmetics-skins', 'gallery-04-cosmetics', 640],
  ['06-achievements', 'gallery-05-achievements', 640],
  ['11-win-overlay', 'gallery-06-win', 640],
];
for (const [s, d, w] of GH) await web(`${A}/${s}.png`, `docs/media/github/${d}.png`, w);

// --- Portfolio (downscaled hero + gallery + feature/technical showcase) ----
const PF = [
  ['boss-l150', 'hero-boss-finale', 1000],
  ['02-star-map', '01-star-map', 760],
  ['play-l055', '02-gameplay-rifts', 760],
  ['play-l035', '03-gameplay-peril', 760],
  ['boss-l050', '04-boss-singularity', 760],
  ['03-gravity-run-hub', '05-gravity-run', 760],
  ['09-cosmetics-arrivals', '06-cosmetics', 760],
  ['06-achievements', '07-achievements', 760],
  ['world-06-rifts', '08-world-select', 760],
];
for (const [s, d, w] of PF) await web(`${A}/${s}.png`, `docs/media/portfolio/${d}.png`, w);

// --- LinkedIn / CV (one design pick, one engineering pick) -----------------
await web(`${A}/02-star-map.png`, 'docs/media/linkedin/01-design-star-map.png', 820);
await web(`${A}/play-l055.png`, 'docs/media/linkedin/02-engineering-gameplay.png', 820);

console.log('curation complete');
