# ASO & Store Creative Plan — GRAVITY FLOW

App Store Optimization + the visual creative plan for the Play listing. Built to
ui-ux-pro-max standards: a clear value prop in the first frame, legible captions in
the portrait safe area, strong contrast, consistent cosmic brand, no clutter.

## 1. Keywords
Weave naturally into the title / short / full description — **no keyword stuffing**
(Play penalizes repetition; it indexes the full description).
- **Primary:** gravity puzzle, physics puzzle, one-touch / one-finger, space puzzle,
  relaxing puzzle game.
- **Secondary / long-tail:** hold to pull, brain teaser, minimalist puzzle, orbit /
  slingshot, logic puzzle, offline puzzle game, star, cosmic, no wifi game, endless
  runner, score chase, weekly challenge, leaderboard, star map, daily reward, win streak,
  cosmetic skins (no pay-to-win).
- **Brand:** GRAVITY FLOW, True Story Labs.
- **Title slot** carries the strongest term: `GRAVITY FLOW — Physics Puzzle`.
- **Short description** leads with the verb + fantasy: “Hold to pull a lost star
  home.” (the hook + the core mechanic in one line).

## 2. Screenshot plan (8, portrait)
Capture from the web build (`npm run dev`, **1080×2160** device frame — exactly 2:1, within
Play's "max side ≤ 2× min side" cap; 1080×2340 is over and gets rejected). Each pairs ONE
moment with ONE short benefit caption (top third, safe-area-aware, high contrast on
the dark sky). Order = a mini funnel: hook → mechanic → tension → spectacle → new-juice →
retention → store → replay.

**Refreshed 8-shot Play set** (2026-07-02, Wave 4 Task 2 — source + full inventory in
`docs/media/README.md §B`; files live in `docs/store/assets/screenshots/`):
1. `01-star-map.png` — The Cosmos world map. *“Journey 150 levels across 15 worlds.”*
   (scope, hook)
2. `02-gameplay-pull.png` — hold-to-pull with portals + currents (Rifts). *“Hold to
   pull. Guide the star home.”* (teaches the verb in one image)
3. `03-boss-finale.png` — boss “THE BREACH”. *“15 worlds. 15 bosses, all different.”*
   (tension + spectacle)
4. `04-three-star-win.png` — 3-star LEVEL COMPLETE + `×5 BLAZE` streak + a milestone
   toast. *“Master every level. Perfect every run.”* (the new celebratory juice, legible
   in a still)
5. `05-daily-rewards.png` — main menu, gold DAILY REWARD chest + a streak-protected
   badge. *“Daily rewards. Never lose your streak.”* (retention hook)
6. `06-cosmetics-bundle.png` — store, Bundles tab, the one honest BEST VALUE tag.
   *“Cosmetic bundles — no pay-to-win, ever.”* (honest-store framing)
7. `07-hazards-peril.png` — hazard saw + timer (Peril). *“Dodge the hazards. Beat the
   clock.”* (variety + tension)
8. `08-gravity-run.png` — the Gravity Run hub. *“Endless mode + a weekly challenge.”*
   (replayability / score-chase hook)

Caption spec: Orbitron display for the headline word, Exo 2 for the rest; ≥40px type
at export size; keep text clear of the top notch + bottom gesture bar (~10% insets);
one accent-glow color per shot matched to that world’s or system's palette; never cover
the focal moment. Every caption above is honest — a literal description or a fair, still-backed framing of what's on screen — no
claim a still can't back up.

## 3. App icon variants checklist
> **Generated concepts:** `docs/store/assets/icon-concepts/{orbit,vortex,minimal}.png` (512²).
> **Recommended final:** `docs/store/assets/icon-512.png` (32-bit, currently the **vortex** concept).
> Regenerate via `scripts/gen_brand_assets.py` then `node scripts/finalize_brand.mjs`.

Identity: deep-indigo cosmic field + the gravity “pulled star / orbit” motif + the
Orbitron wordmark feel. Provide:
- [ ] **Adaptive icon** — separate **foreground** (the star + orbit glow, centered in
  the inner 66% safe zone) and **background** (cosmic gradient/nebula) layers,
  108×108dp (432px @4x), foreground art within the 72dp safe circle.
- [ ] **Monochrome / themed icon** layer (Android 13+) — single-color silhouette of
  the star/orbit on transparent (Material You tinting).
- [ ] **Play hi-res icon** — 512×512, 32-bit PNG, no rounded corners (Play masks it).
- [ ] **In-build mipmaps** — mdpi→xxxhdpi densities generated from the master
  (Android Studio Image Asset, or `@capacitor/assets`).
- [ ] **Legibility check** — recognizable at 48px; holds up under circle/squircle/
  rounded masks; sufficient contrast in light and dark launchers.

## 4. Feature graphic (1024×500)
> **Generated concepts:** `docs/store/assets/feature-concepts/{wordmark,vortex,vignette}.png`.
> **Recommended final:** `docs/store/assets/feature-1024x500.png` (currently the **vignette** concept).

Wordmark **GRAVITY FLOW** (Orbitron) on the cosmic field with the star-and-orbit
motif and one tagline: *“Bring the lost star home.”* Keep the focal art off the far
left (Play overlays the install UI there on some surfaces).

## 5. Tagline bank
- “Bring the lost star home.” (primary)
- “Hold to pull. Find the flow.”
- “One touch. Infinite gravity.”
