# Changelog — GRAVITY FLOW

Internal project changelog (newest first). Store-facing "What's new" copy lives in
`docs/store/release-notes.md`. Versions track `package.json`; the Android marketing
version is `versionName` / `versionCode` in `android/app/build.gradle`.

## [0.15.0] — Star Map presentation milestone
- **The Star Map** (`WorldMapScene`): world progression is now a journey — 15 worlds as
  glowing destination nodes on a winding constellation path (per-world accent, roman
  numeral, star tally, locks + next-world teaser), auto-centred on your current world.
- **Themed per-world panels** (`LevelSelectScene`): the cosmos recolours to each world's
  palette with a roman + name + subtitle header.
- **Warp transitions** (`transitions.warpToScene`): a cinematic star-streak + accent-bloom
  jump when entering a world / from the menu (reduced-motion → fade).
- **Gravity Run feel v3**: a faster, more exciting endless ramp (~76 → 234 px/s over a
  ~45s run) while staying fair (start grace + safe-lane chunks).
- Docs: `docs/growth-architecture.md` (events / LTC / PGS / social seams).

## [0.14.x] — Gravity Run + content + economy
- **Gravity Run** flagship endless mode (`EndlessScene`): camera-scroll vertical climb
  reusing every campaign entity; **Endless** (random seed each run) + **Weekly Challenge**
  (fixed weekly seed + leaderboard) via a `RunSelectScene` hub; RETRY, Revive (rewarded,
  off the ranked board), 2× Stardust, shareable result card; 20 handcrafted chunks with a
  validator + a variety/pacing generator (all TDD).
- **150 levels / 15 worlds** (expanded from 56 / 8): Worlds 9–15 are new combination /
  tension / mastery worlds reusing the 7 mechanics; per-world themes + adaptive audio.
- Cosmetic **unlock fanfare** + COLLECTION-COMPLETE flourish.
- **Economy + store** (Sprint 2.5): 28 cosmetics, dual currency (Stardust + Cosmic
  Fragments), tabbed premium store, bundles + Remove-Ads + Restore, rewarded loops.
- **Native + monetization** (Sprint 2): Capacitor Android wrap; AdMob, RevenueCat
  Remove-Ads, Firebase Analytics + Crashlytics — guarded native seams (web-safe).

## [0.x] — Foundations → content
- 7 mechanics (attractor, gravity zones, magnets, portals, moving platforms, hazards,
  one-way gates); 3-star scoring + sequential unlock; Daily Challenge + streaks;
  achievements; ghost-trail PBs; weekly-leaderboard-ready interface.
- Premium startup presentation (company/intro splash → menu), glassmorphic design system,
  self-hosted Orbitron + Exo 2, cosmic background, settings + a11y (reduced-motion, safe-area).
- Release engineering: Android signing pipeline, UMP consent, privacy policy, store assets.

[0.15.0]: https://github.com/taysh123/Gravity-Game/releases/tag/v0.15.0
