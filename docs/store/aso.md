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
  slingshot, logic puzzle, offline puzzle game, star, cosmic, no wifi game.
- **Brand:** GRAVITY FLOW, True Story Labs.
- **Title slot** carries the strongest term: `GRAVITY FLOW — Physics Puzzle`.
- **Short description** leads with the verb + fantasy: “Hold to pull a lost star
  home.” (the hook + the core mechanic in one line).

## 2. Screenshot plan (6–8, portrait)
Capture from the web build (`npm run dev`, **1080×2160** device frame — exactly 2:1, within
Play's "max side ≤ 2× min side" cap; 1080×2340 is over and gets rejected). Each pairs ONE
moment with ONE short benefit caption (top third, safe-area-aware, high contrast on
the dark sky). Order = a mini funnel: hook → variety → mastery → depth.
1. **The Comet** (L2) — the star streaks across on its trail. *“Hold to pull. Guide
   the star home.”* (teaches the verb in one image)
2. **Constellation** (L3) — orbs connected into a constellation on win. *“Collect the
   stars — draw the constellation.”* (screenshot-worthy delight)
3. **THE GEARWORKS** (L20) — the spinning gear-arm mid-sweep. *“Time the machine.”*
   (shows the new alive danger)
4. **THE LOCKWORKS** (L48) — the pulsing laser corridor. *“Thread the gateworks.”*
   (tension + spectacle)
5. **A boss STAR FREED** beat (e.g. THE MAELSTROM/HOMECOMING) — red arena + banner.
   *“Eight worlds. Eight bosses, all different.”* (scope)
6. **Mastery HUD** — the live par chip + faint ghost trail of a best run. *“Beat your
   best. Chase 3 stars.”* (replay / skill hook)
7. **World map / level select** — star badges across worlds. *“56 hand-tuned levels.”*
8. *(optional)* **Cosmetics** — a ball theme. *“Earn cosmetic star themes.”*

Caption spec: Orbitron display for the headline word, Exo 2 for the rest; ≥40px type
at export size; keep text clear of the top notch + bottom gesture bar (~10% insets);
one accent-glow color per shot matched to that world’s palette; never cover the focal
moment.

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
