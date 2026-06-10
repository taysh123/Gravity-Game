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
| `screenshots/01..08-*.png` | **1080×2160** (2:1) | phone screenshots, max side ≤ 2× min | ✅ ready (8 frames) |

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
1 main menu · 2 The Comet · 3 Constellation · 4 THE GEARWORKS · 5 THE LOCKWORKS ·
6 world map · 7 store · 8 settings. Caption copy (optional overlay in Play's editor) is in
`docs/store/aso.md §2`.

## To swap a final
Edit `RECOMMENDED` in `scripts/finalize_brand.mjs` (e.g. `icon: 'orbit'`) and run
`node scripts/finalize_brand.mjs`.

## Still outstanding (not store-listing graphics)
- In-app **launcher icon** (default Capacitor robot) — generate adaptive mipmaps from the
  chosen master via `@capacitor/assets`. Production-polish step.
