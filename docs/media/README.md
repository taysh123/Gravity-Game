# Gravity Flow — Media Production Package

The complete, commercially-publishable visual package for **GRAVITY FLOW** (True Story Labs):
Google Play, the App Store (future), GitHub, a portfolio site, and LinkedIn/CV. Everything here is
captured automatically from the live build, then curated.

- **Captured:** 2026-06-14 from `v1.0.0-rc.1` (150 levels / 15 worlds).
- **Source of truth for state:** [`../project-status.md`](../project-status.md).
- **Caption / ASO strategy reference:** [`../store/aso.md`](../store/aso.md) · [`../store/listing.md`](../store/listing.md).

## Regenerate (reproducible)

```bash
npm run dev                          # http://localhost:5173 (dev exposes window.__game)
python scripts/capture_media.py      # all stills -> docs/media/raw/<profile>/  (gitignored)
python scripts/capture_frames.py     # GIF frame sequences -> docs/media/raw/frames/
node   scripts/assemble_gifs.mjs     # -> docs/media/github/*.gif
node   scripts/curate_media.mjs       # raw -> curated finals (this folder's committed sets)
```

Capture seeds a fully-progressed save (all 150 levels 3-starred, healthy currency, a lively
owned/locked store, a live daily streak, all 14 achievements) so every system shows its best.
**Raw dumps are gitignored** (`docs/media/raw/`); only the curated finals below are committed.

---

## A. Strongest visual selling points

What the game actually shows, ranked for impact on **players** and **recruiters**:

| Tier | System | Why it sells | Where captured |
|------|--------|--------------|----------------|
| Hero | **Star Map** ("THE COSMOS") | 15 worlds on a constellation path — scope + polish at a glance | `WorldMapScene` |
| Hero | **15 themed worlds** | distinct cosmic palettes per chapter = depth | `LevelSelectScene {world}` ×15 |
| Hero | **Gravity Run** | arcade adrenaline hook (Endless + Weekly leaderboard) | `RunSelectScene` / `EndlessScene` |
| Core | **Boss finales** | per-world set-pieces ("THE SINGULARITY", "THE LONG WAY HOME") | `GameScene {level:10…150}` |
| Core | **Core mechanic in motion** | hold-to-pull arc + trail + sonar reach ring | gameplay + held attractor |
| Core | **Cosmetics store** | 28 cosmetics, 5 rarities, locked previews — monetization, not intrusive | `CosmeticsScene {tab}` |
| Core | **Achievements** | 14 achievements, progression depth | `AchievementsScene` |
| Support | **3-star win** | "PERFECT! LEVEL COMPLETE ★★★" + rewarded 2× | win overlay |
| Support | **Daily Challenge** | live-service retention (streak + badge on the menu) | `MainMenuScene` |

**Deliberately not shown:** splash/boot frames, empty arenas, debug overlays, near-duplicate world
panels, bare settings as a "feature", locked/greyed content as the focus.

---

## B. Final sets — recommended order, why, and captions

### Google Play — `store/android/` (1080×2160, full-res)
Funnel: hook → mechanic → spectacle → replay → stakes → depth → mastery. Captions go in the Play
console editor (top third, safe-area, one accent glow per shot — see `../store/aso.md §2`).

| # | File | Shows | Caption |
|---|------|-------|---------|
| 1 | `01-star-map.png` | The Cosmos world map | **Journey 150 levels across 15 worlds.** |
| 2 | `02-gameplay-pull.png` | Hold-to-pull, portals + currents (Rifts) | **Hold to pull. Guide the star home.** |
| 3 | `03-boss-singularity.png` | Boss "THE SINGULARITY" | **15 worlds. 15 bosses, all different.** |
| 4 | `04-gravity-run.png` | Gravity Run hub | **Endless mode + a weekly challenge.** |
| 5 | `05-hazards-peril.png` | Hazard saw + timer (Peril) | **Dodge the hazards. Beat the clock.** |
| 6 | `06-cosmetics.png` | Cosmetics store, rarities | **Unlock 28 skins, trails & effects.** |
| 7 | `07-achievements.png` | Achievements list | **Chase 3 stars and 14 achievements.** |
| 8 | `08-three-star-win.png` | 3-star LEVEL COMPLETE | **Master every level. Perfect every run.** |

### App Store iPhone 6.7" — `store/ios/iphone-6.7/` (1290×2796, full-res)
Mirrors the Play order (`01`…`08`). The game's 0.462 aspect matches the 6.7" frame almost exactly,
so these are clean. *Apple wants real-device/simulator captures for submission — regenerate there;
these are publish-quality previews.*

### App Store iPad 12.9" — `store/ios/ipad-12.9/` (2048×2732)
⚠️ **Letterboxed previews.** The portrait game (0.462) sits centred on the iPad's 0.75 frame with
seamless cosmic side bars. Usable as placeholders; **regenerate on a real iPad/simulator** before
an iOS submission. Order: `01-star-map`, `02-gameplay`, `03-world-currents`, `04-gravity-run`,
`05-boss-finale`.

### GitHub README — `github/`
- **GIFs** (autoplay in markdown): `gravity-pull.gif` (the mechanic), `endless-climb.gif` (Gravity
  Run), `win-celebration.gif` (absorb + burst + overlay pop).
- **`hero-star-map.png`** — top-of-README banner.
- **`gallery-01…06`** — gameplay · boss · gravity-run · cosmetics · achievements · win.

### Portfolio — `portfolio/`
- **`hero-boss-finale.png`** — wide hero (boss "THE LONG WAY HOME", every mechanic on screen).
- **Gameplay gallery** `01…08`: star-map · gameplay (Rifts) · gameplay (Peril) · boss · gravity-run
  · cosmetics · achievements · world-select. Shows variety, polish, and systems depth.

### LinkedIn / CV — `linkedin/`
- **`01-design-star-map.png`** — game-design quality (the world-journey at a glance).
- **`02-engineering-gameplay.png`** — engineering quality (multiple physics systems composited live;
  pair with the architecture note: *"one entity + one `LevelConfig` field per mechanic"*).

---

## C. Inventory

```
docs/media/
  store/android/            8  1080×2160  Google Play
  store/ios/iphone-6.7/     8  1290×2796  App Store 6.7" (clean)
  store/ios/ipad-12.9/      5  2048×2732  App Store 12.9" (letterboxed previews)
  github/                  10  hero + 6 gallery (640–900w) + 3 GIFs
  portfolio/                9  hero + 8 gallery (760–1000w)
  linkedin/                 2  design + engineering picks (820w)
  raw/                     —  full capture dump (GITIGNORED; regenerate any time)
```
Total committed ≈ 15 MB. The `raw/` dump (android 53 · iPhone 12 · iPad 5 · GIF frames) stays local.

---

## D. Still requires manual capture (real device)

Automation drives scenes via the dev hook but cannot reproduce finger input or true device chrome:

1. **Real-finger gameplay video / trailer** — Play & App Store promo video, and live drag feel.
2. **On-device store captures** — Apple prefers real-device/simulator screenshots for submission;
   the iOS sets here are browser-rendered previews (iPad ones are letterboxed).
3. **Haptics / audio** — not visual; demonstrate in a captured video.
4. **The warp transition GIF** — the ~800ms star-streak warp is hard to trigger headlessly; grab it
   from a screen recording if wanted.
5. **Daily/Weekly "live" states** — seeded here; a real streak/leaderboard screenshot is nicer once
   there's real play history.
