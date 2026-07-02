# Gravity Flow — Media Production Package

The complete, commercially-publishable visual package for **GRAVITY FLOW** (True Story Labs):
Google Play, the App Store (future), GitHub, a portfolio site, and LinkedIn/CV. Everything here is
captured automatically from the live build, then curated.

- **Captured:** 2026-07-02 from `v1.0.0-rc.1` (150 levels / 15 worlds) — Wave 4 Task 2 refresh
  (2 new/refreshed hero GIFs + a re-curated Google Play set; see §B/§C below).
- **Boss shot re-captured:** 2026-07-02, after the long-title HUD-fit fix landed on `master` — the
  Google Play `03-boss-finale.png` now shows the true campaign finale **"THE LONG WAY HOME" (L150)**
  with its title fitting cleanly (no icon-toolbar collision). See §B row 3 / §E (resolved).
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
| Core | **3-star celebration (new juice)** | "PERFECT! LEVEL COMPLETE ★★★" + `×5 BLAZE` streak + a star-milestone toast, escalating in | win overlay |
| Support | **Daily reward + streak protection** | gold DAILY REWARD chest on the menu + an earned streak-freeze ("· protected") | `MainMenuScene` |
| Support | **Honest bundle framing** | truthful per-bundle value lines + one config-flagged BEST VALUE tag (cosmetic-only, no P2W) | `CosmeticsScene {tab:'bundle'}` |
| Support | **Living world** | reactive nebula background, a held attractor's tendrils/lensing at full charge, and drifting comets | gameplay (long hold) |

**Deliberately not shown:** splash/boot frames, empty arenas, debug overlays, near-duplicate world
panels, bare settings as a "feature", locked/greyed content as the focus, or any clipped-title frame
(see the known-issue note in §E).

---

## B. Final sets — recommended order, why, and captions

### Google Play — `store/android/` (1080×2160, full-res)
Mirrored 1:1 into `docs/store/assets/screenshots/` (the Play Console submission folder). Funnel:
hook → mechanic → tension → spectacle → new-juice → retention → store → replay. Captions go in the
Play console editor (top third, safe-area, one accent glow per shot — see `../store/aso.md §2`).

| # | File | Shows | Caption |
|---|------|-------|---------|
| 1 | `01-star-map.png` | The Cosmos world map | **Journey 150 levels across 15 worlds.** |
| 2 | `02-gameplay-pull.png` | Hold-to-pull, portals + currents (Rifts) | **Hold to pull. Guide the star home.** |
| 3 | `03-boss-finale.png` | Boss finale "THE LONG WAY HOME" (L150) | **15 worlds. 15 bosses, all different.** |
| 4 | `04-three-star-win.png` | 3-star LEVEL COMPLETE + `×5 BLAZE` + milestone toast | **Master every level. Perfect every run.** |
| 5 | `05-daily-rewards.png` | Main menu, gold DAILY REWARD chest + streak-protected | **Daily rewards. Never lose your streak.** |
| 6 | `06-cosmetics-bundle.png` | Store, Bundles tab, honest BEST VALUE tag | **Cosmetic bundles — no pay-to-win, ever.** |
| 7 | `07-hazards-peril.png` | Hazard saw + timer (Peril) | **Dodge the hazards. Beat the clock.** |
| 8 | `08-gravity-run.png` | Gravity Run hub | **Endless mode + a weekly challenge.** |

Dropped `achievements` from this set to hold the Play count at a strong 8 while making room for the
Wave 2-3 retention/store shots (5-6 above) — achievements stays in the GitHub/portfolio galleries
below for players/recruiters who want more depth. `03-boss-finale.png` now sources `boss-l150`
("THE LONG WAY HOME", the true campaign finale) — re-captured once the long-title HUD-fit fix landed
(§E), so the chip fits/ellipsises clear of the icons and the title card shrink-fits on-screen. (The
GitHub `gallery-02-boss` and portfolio `04` still use the short-title `boss-l060` "THE BREACH" as a
distinct, equally strong boss moment — untouched this pass.)

### App Store iPhone 6.7" — `store/ios/iphone-6.7/` (1290×2796, full-res)
Mirrors the Play order (`01`…`08`, still the pre-refresh 8-shot layout — preview-quality only, not
re-funneled this wave). The game's 0.462 aspect matches the 6.7" frame almost exactly, so these are
clean. `03-boss-finale.png` crops the clipped title strip off the L150 raw frame (see §E) rather than
re-capturing a whole extra iOS profile shot for a media-only wave. *Apple wants real-device/simulator
captures for submission — regenerate there; these are publish-quality previews.*

### App Store iPad 12.9" — `store/ios/ipad-12.9/` (2048×2732)
⚠️ **Letterboxed previews.** The portrait game (0.462) sits centred on the iPad's 0.75 frame with
seamless cosmic side bars. Usable as placeholders; **regenerate on a real iPad/simulator** before
an iOS submission. Order: `01-star-map`, `02-gameplay`, `03-world-currents`, `04-gravity-run`,
`05-boss-finale` (also crop-fixed, same clipped-title strip as iPhone above).

### GitHub README — `github/`
- **2 hero GIFs** (autoplay in markdown): `win-celebration.gif` — the 3-star celebration
  ESCALATION (absorb → card pop → stars-in → PERFECT! → `×5 BLAZE` + milestone toast settling in);
  `living-world.gif` — World 15's reactive background + a held attractor at full charge
  (tendrils/lensing) + a drifting comet. Both refreshed/added this wave; kept lean (545-800 KB).
- **2 supporting GIFs** (unchanged mechanics, not superseded): `gravity-pull.gif` (the core
  mechanic), `endless-climb.gif` (Gravity Run).
- **`hero-star-map.png`** — top-of-README banner.
- **`gallery-01…06`** — gameplay · boss ("THE BREACH") · gravity-run · cosmetics · achievements · win.

### Portfolio — `portfolio/`
- **`hero-boss-finale.png`** — wide hero (boss "THE LONG WAY HOME", every mechanic on screen). Its
  raw source has the same clipped-title chip as the Play boss shot (see §E) — cropped off the top
  ~9.5% of the frame here instead of switching levels, since this ONE spot specifically wants the
  true campaign finale.
- **Gameplay gallery** `01…08`: star-map · gameplay (Rifts) · gameplay (Peril) · boss ("THE BREACH")
  · gravity-run · cosmetics · achievements · world-select. Shows variety, polish, and systems depth.

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
  github/                  11  hero + 6 gallery (640–900w) + 4 GIFs (2 hero + 2 supporting)
  portfolio/                9  hero + 8 gallery (760–1000w)
  linkedin/                 2  design + engineering picks (820w)
  raw/                     —  full capture dump (GITIGNORED; regenerate any time)

docs/store/assets/
  screenshots/              8  1080×2160  Google Play Console submission (mirrors store/android/)
  icon-512.png, feature-1024x500.png      unchanged this wave
```
Total committed ≈ 16 MB (`docs/media` ~15.9 MB + `docs/store/assets` ~5.4 MB, some overlap via the
Play mirror). The `raw/` dump (android 59 · iPhone 12 · iPad 5 · 4 GIF frame sequences) stays local.

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

---

## E. Resolved — long-title HUD clip fixed (2026-07-02)

**Long boss/signature titles no longer clip the top-right icon toolbar.** Previously
`GameScene.createHud()`'s title chip sized itself to `label.width + 28` at a fixed top-left position
while the home/settings/restart icon row sat at an independent fixed top-right position, so a long
title (`THE LONG WAY HOME` L150, `THE SINGULARITY` L50/L140, `THE EYE OF THE STORM` L120, …) ran under
the icons. **Fixed** on `master` (branch `feat/fix-boss-title-overflow`, merged): the chip now
shrink-fits then ellipsises to the space before the icon row, and the centre title card shrink-fits
to the safe-area width — pure, tested helpers in `src/utils/textFit.ts`, tuned via `theme.config.ts`
(no gameplay/physics touched). Verified by rendering the worst cases (`THE LONG WAY HOME` L150 and the
20-char `THE EYE OF THE STORM` L120): chip truncates clear of the icons, title card stays on-screen.

The Google Play `03-boss-finale.png` was re-captured against the fix and now ships the true campaign
finale `boss-l150` ("THE LONG WAY HOME") with its title fitting cleanly. **Not re-captured this pass**
(still legacy pre-fix frames, crop-fixed as before — regenerate on a real device before an iOS
submission): the iOS/iPad `*-boss-finale.png` previews and the portfolio `hero-boss-finale.png`.
