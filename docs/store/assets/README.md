# Store Assets — GRAVITY FLOW

Generated launch assets for the Google Play listing. **Finals** are ready to upload;
**alternatives** are concepts to compare before locking branding. Regenerate with
`scripts/gen_brand_assets.py` (concepts) + `node scripts/finalize_brand.mjs` (finals) and
`scripts/capture_store_shots.py` (screenshots). *(The `.py` drivers are local-only per the
repo's `scripts/*.py` gitignore.)*

## Finals (upload these)
| File | Spec | Play requirement | Status |
|---|---|---|---|
| `icon-512.png` | 512×512, **32-bit PNG** | hi-res icon | ✅ ready (= **vortex** concept) |
| `feature-1024x500.png` | 1024×500, 24-bit | feature graphic | ✅ ready (= **vignette** concept) |
| `screenshots/01..08-*.png` | **1080×2160** (2:1) | phone screenshots, max side ≤ 2× min | ✅ ready (8 frames, **refreshed 2026-06-14** for the Star Map + 150-level build via `scripts/capture_media.py`) |

## Alternatives (pick one, then re-run finalize to swap)
**Icon concepts** — `icon-concepts/`
- `orbit.png` — centered star + tilted orbit ring + cyan attractor. Literal "gravity/orbit" read.
- `vortex.png` — accretion swirl pulling a star (**recommended**; matches the in-app vortex logo, most distinctive).
- `minimal.png` — single glowing star + gravity-lens ring, heavy negative space. Most legible at 48px.

**Feature-graphic concepts** — `feature-concepts/`
- `wordmark.png` — "GRAVITY FLOW" left + star/orbit motif right + tagline. Cleanest, most legible.
- `vortex.png` — cinematic cosmic swirl on the right, wordmark in a darkened-left zone. Atmospheric.
- `vignette.png` — a gameplay beat (goal + attractor + star + trail) with the wordmark (**recommended**; shows the verb).

## Screenshots (in order)
1 Star Map · 2 gameplay (hold-to-pull, Rifts) · 3 boss "THE SINGULARITY" · 4 Gravity Run hub ·
5 hazards + timer (Peril) · 6 cosmetics store · 7 achievements · 8 3-star LEVEL COMPLETE.
Caption copy (optional overlay in Play's editor) is in `docs/media/README.md §B` (and `docs/store/aso.md`).
The full multi-destination media package (Play / App Store / GitHub / portfolio / LinkedIn) lives in
`docs/media/` — regenerate everything with `scripts/capture_media.py` → `scripts/curate_media.mjs`.

## To swap a final
Edit `RECOMMENDED` in `scripts/finalize_brand.mjs` (e.g. `icon: 'orbit'`) and run
`node scripts/finalize_brand.mjs`.

## Still outstanding (not store-listing graphics)
- In-app **launcher icon** (default Capacitor robot) — generate adaptive mipmaps from the
  chosen master via `@capacitor/assets`. Production-polish step.
