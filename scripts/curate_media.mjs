// Curate the raw capture dump (docs/media/raw, gitignored) into the committed,
// per-destination final sets. Store folders get full-resolution masters; the
// web destinations (GitHub / portfolio / LinkedIn) get downscaled copies so the
// repo stays lean. Reproducible — re-run after a fresh capture.
//
// Usage:  node scripts/curate_media.mjs   (after capture_media.py + assemble_gifs.mjs)
import sharp from 'sharp';
import { mkdirSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';

const A = 'docs/media/raw/android';
const I = 'docs/media/raw/iphone67';
const P = 'docs/media/raw/ipad';

const fresh = (dir) => { rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true }); };

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

// Some boss/signature levels carry a long title ("THE LONG WAY HOME", "THE
// SINGULARITY" at L50/L140) whose HUD chip overlaps the top-right icon
// toolbar on portrait viewports — a real layout bug (chip width = text width,
// independent of the fixed-position icon row), filed for a future gameplay
// wave (game code is FROZEN this media wave). Non-clipping boss levels are
// preferred everywhere (see PLAY/GH/PF below); the ONE spot that specifically
// wants the campaign-FINALE boss (L150, "every mechanic on screen") crops the
// clipped top strip instead of swapping levels. ~9.5% of height clears the
// chip/icon row on every captured profile (icons sit at the same top fraction
// regardless of a profile's horizontal pillarboxing).
const CROP_TOP_FRAC = 0.095;
const cropTop = (meta) => Math.round(meta.height * CROP_TOP_FRAC);
const copyCropTop = async (src, dst) => {
  if (!existsSync(src)) { console.warn('missing:', src); return; }
  mkdirSync(dirname(dst), { recursive: true });
  const img = sharp(src);
  const meta = await img.metadata();
  const top = cropTop(meta);
  await img.extract({ left: 0, top, width: meta.width, height: meta.height - top }).png().toFile(dst);
};
const webCropTop = async (src, dst, width) => {
  if (!existsSync(src)) { console.warn('missing:', src); return; }
  mkdirSync(dirname(dst), { recursive: true });
  const img = sharp(src);
  const meta = await img.metadata();
  const top = cropTop(meta);
  await img.extract({ left: 0, top, width: meta.width, height: meta.height - top })
    .resize({ width })
    .png({ quality: 90 })
    .toFile(dst);
};

// --- Google Play (full-res 1080x2160, store order) -------------------------
// Funnel: hook -> mechanic -> spectacle -> new-juice -> retention -> store ->
// tension -> replay. boss-l060 ("THE BREACH") replaces the old boss-l050
// ("THE SINGULARITY") source — l050's title chip clips the icon toolbar (see
// CROP_TOP_FRAC note); l060 has a short, non-clipping title and a strong
// teal/orange contrast. 24/25 are the Wave 2-3 retention + honest-store shots
// (daily chest + streak-protected, bundle BEST VALUE) called out for this set;
// achievements is dropped to hold the count at a strong 8 (still shown in the
// GitHub/portfolio galleries for players/recruiters who want more depth).
const PLAY = [
  ['02-star-map', '01-star-map'],
  ['play-l055', '02-gameplay-pull'],
  ['boss-l060', '03-boss-finale'],
  ['11-win-overlay', '04-three-star-win'],
  ['24-daily-reward-chest', '05-daily-rewards'],
  ['25-cosmetics-bundle', '06-cosmetics-bundle'],
  ['play-l035', '07-hazards-peril'],
  ['03-gravity-run-hub', '08-gravity-run'],
];
fresh('docs/media/store/android');
for (const [s, d] of PLAY) copy(`${A}/${s}.png`, `docs/media/store/android/${d}.png`);
// Mirrored 1:1 into the Play Console submission folder (docs/store/assets).
fresh('docs/store/assets/screenshots');
for (const [s, d] of PLAY) copy(`${A}/${s}.png`, `docs/store/assets/screenshots/${d}.png`);

// --- App Store iPhone 6.7" (full-res 1290x2796, mirrors Play order) --------
// Preview-quality only (Apple wants real-device/simulator captures for an
// actual submission — see docs/media/README.md §D). 03-boss-finale crops the
// same clipped title strip off the L150 raw frame rather than re-capturing a
// whole extra iOS profile shot for this media-only wave.
const IOS = [
  ['02-star-map', '01-star-map'],
  ['04-play-rifts', '02-gameplay-pull'],
  ['11-boss-finale', '03-boss-finale', 'crop'],
  ['05-endless-climb', '04-gravity-run'],
  ['12-play-peril', '05-hazards-peril'],
  ['06-cosmetics', '06-cosmetics'],
  ['07-achievements', '07-achievements'],
  ['10-win-overlay', '08-three-star-win'],
];
fresh('docs/media/store/ios/iphone-6.7');
for (const [s, d, mode] of IOS) {
  const src = `${I}/${s}.png`;
  const dst = `docs/media/store/ios/iphone-6.7/${d}.png`;
  if (mode === 'crop') await copyCropTop(src, dst);
  else copy(src, dst);
}

// --- App Store iPad 12.9" (full-res 2048x2732, LETTERBOXED previews) -------
const IPAD = [
  ['01-star-map', '01-star-map'],
  ['02-play-rifts', '02-gameplay'],
  ['03-world-currents', '03-world-currents'],
  ['04-endless-climb', '04-gravity-run'],
  ['05-boss-finale', '05-boss-finale', 'crop'],
];
fresh('docs/media/store/ios/ipad-12.9');
for (const [s, d, mode] of IPAD) {
  const src = `${P}/${s}.png`;
  const dst = `docs/media/store/ios/ipad-12.9/${d}.png`;
  if (mode === 'crop') await copyCropTop(src, dst);
  else copy(src, dst);
}

// --- GitHub README (downscaled stills; the 2 hero GIFs are already in place
// at docs/media/github/*.gif via scripts/assemble_gifs.mjs) ----------------
const GH = [
  ['02-star-map', 'hero-star-map', 900],
  ['play-l055', 'gallery-01-gameplay', 640],
  ['boss-l060', 'gallery-02-boss', 640],
  ['03-gravity-run-hub', 'gallery-03-gravity-run', 640],
  ['07-cosmetics-skins', 'gallery-04-cosmetics', 640],
  ['06-achievements', 'gallery-05-achievements', 640],
  ['11-win-overlay', 'gallery-06-win', 640],
];
for (const [s, d, w] of GH) await web(`${A}/${s}.png`, `docs/media/github/${d}.png`, w);

// --- Portfolio (downscaled hero + gallery + feature/technical showcase) ----
// hero-boss-finale keeps the true campaign-finale boss (L150, "every
// mechanic on screen") but crops off its clipped title strip (see
// CROP_TOP_FRAC). The gallery boss pick (04) uses the non-clipping L60 BREACH
// frame instead, so the two boss shots in this set read as distinct moments.
const PF = [
  ['boss-l150', 'hero-boss-finale', 1000, 'crop'],
  ['02-star-map', '01-star-map', 760],
  ['play-l055', '02-gameplay-rifts', 760],
  ['play-l035', '03-gameplay-peril', 760],
  ['boss-l060', '04-boss-finale', 760],
  ['03-gravity-run-hub', '05-gravity-run', 760],
  ['09-cosmetics-arrivals', '06-cosmetics', 760],
  ['06-achievements', '07-achievements', 760],
  ['world-06-rifts', '08-world-select', 760],
];
fresh('docs/media/portfolio');
for (const [s, d, w, mode] of PF) {
  const src = `${A}/${s}.png`;
  const dst = `docs/media/portfolio/${d}.png`;
  if (mode === 'crop') await webCropTop(src, dst, w);
  else await web(src, dst, w);
}

// --- LinkedIn / CV (one design pick, one engineering pick) -----------------
fresh('docs/media/linkedin');
await web(`${A}/02-star-map.png`, 'docs/media/linkedin/01-design-star-map.png', 820);
await web(`${A}/play-l055.png`, 'docs/media/linkedin/02-engineering-gameplay.png', 820);

console.log('curation complete');
