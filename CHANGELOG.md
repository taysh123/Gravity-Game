# Changelog — GRAVITY FLOW

Internal project changelog (newest first). Store-facing "What's new" copy lives in
`docs/store/release-notes.md`. Versions track `package.json`; the Android `versionName` / `versionCode` are derived from it
(D-20, `docs/release/RUNBOOK.md` section 4).

## [Unreleased]
- **Product vision and research traceability (2026-10-14):** `docs/PRODUCT-VISION.md` is the authority on why and what. Every claim is labelled Decided, Built, Proposed or Owner input needed, and it lists the open owner questions without answering them. MASTER-ROADMAP §16 maps all 34 competitor lessons in the research audit to a task, an experiment, a deferral or a rejection. P00-T26 gains a docs consistency sweep for older texts that amendments overrode.
- **Vercel web build repaired (P00-T28, B-14, 2026-10-14):** `.vercelignore` no longer excludes `scripts/`. Since `95953fc` the `src` release-guard tests had imported `scripts/lib/*.d.mts`, so `tsc` failed on Vercel's upload (TS2307) while local runs and CI passed. The new guard `src/config/deployIgnore.test.ts` checks every file the compiler reads against `.vercelignore`, using gitignore matching.
- **Research audit tracked and corrected (P00-T27, A-27, 2026-10-14):** the market research audit and its six notes are tracked verbatim, and the preliminary report is archived to `docs/archive/2026-10-14/`. Three revisions (r2–r4) correct overstated citations and the percentile wording, withdraw the claim that light ads explain physics games' ratings (r4), add the Data safety dependency of an M0 closed test, record that the source video was never analyzed, and add a revision log.
- **Planning review fix pass (A-28, 2026-10-14):**
  - The delivery stages now match EXECUTION-ORDER: Stage G runs alongside F from M0, and the launch moves to Stage H.
  - The experiments are renamed EXP-01–EXP-12.
  - A-28 records that a first Play release cannot use a staged rollout; the rollout plans now say so.
- **Planning sync (P00-T29, A-26/A-27, 2026-10-14):** MASTER-ROADMAP gains §8–§15:
  - delivery stages A–H, an executable task inventory and owner actions OA-01–OA-16;
  - the experiment backlog (EXP-01–EXP-12), first-player milestones and a post-test 30/60/90 plan;
  - risks R-48–R-51 and a change log.

  STATUS gains a Task board, the only task-state dashboard, and open bug B-14 (Vercel web build failing since `95953fc`). P00-T29, T27 and T28 run before P00-T21, and the review fold-ins for T21–T26 are now recorded in the P00 phase doc. Entries for P00-T06–T24 are backfilled in P00-T26; until then see `git log`.
- **Versioning (D-20, P00-T05):** `package.json` is the one version file: `version` is `1.0.0` (the rc label now lives only in git
  tags) and the new `androidBuild` is `1`. `versionCode = MAJOR*1_000_000 + MINOR*10_000 + PATCH*100 + BUILD`, so the next
  Play upload is **1000001** (an AAB with versionCode 1 is already on Play). `versionName` stays `1.0.0`.
  `android/app/build.gradle` derives both from `package.json` (fails the build when MINOR/PATCH/BUILD leave 0-99 or the code
  exceeds Play's 2_100_000_000), with a `printVersionCode` task; `node scripts/version.mjs` (`--code`, `--name`,
  `--bump-build`, `--check`) and `scripts/lib/versionCode.mjs` are the JS side and the facts generator uses the same code.
- **Repo hygiene (P00-T04):** the machine-specific `org.gradle.java.home` is gone from `android/gradle.properties` (pass JDK 21 per
  invocation, see the RUNBOOK); the dead `.ai/*` symlinks are untracked and `.ai/` is ignored; release builds reference
  `proguard-android-optimize.txt` (AGP 9 readiness; R8 stays off for 1.0).

## [1.0.0-rc.1] — release candidate (launch-locked, pre-publication)
The 1.0 launch candidate: feature- & content-complete, repo-side launch-ready, store copy accurate.
Code is functionally identical to `v0.15.0` — this RC marks the locked launch candidate pending the
**device 1★ fairness + Endless/Star-Map feel playtest** and the Play Console upload.
- Android marketing version `versionName 1.0.0` / `versionCode 1` (the first Play release).
- Launch command-center, audit & roadmaps: `docs/archive/2026-10-07/LAUNCH-READINESS.md`; release plan: `docs/archive/2026-10-07/RELEASE-v1.0.0.md` (superseded by `docs/release/RUNBOOK.md`).
- **`[1.0.0]` is cut at public launch** (production rollout) — see the release plan. RC builds may iterate
  (`rc.2`, `rc.3`, …) if the device playtest forces tuning.
- **Media & presentation (docs-only, 2026-06-14):** full **Screenshot & Media Production Pass** — a
  multi-destination visual package in `docs/media/` (Google Play / App Store / GitHub / portfolio /
  LinkedIn) + 3 animated README GIFs, auto-captured from the 150-level build (`scripts/capture_media.py`
  → `curate_media.mjs`); **portfolio-grade root `README.md`**; Play `docs/store/assets/screenshots/`
  refreshed to the Star Map + 150-level content. Strategy/inventory/captions: `docs/media/README.md`.

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
- Docs: `docs/archive/2026-10-07/growth-architecture.md` (events / LTC / PGS / social seams).

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
