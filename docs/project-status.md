# Gravity Flow — Project Status (Single Source of Truth)

> **Resume in one line:** Read this file first, then continue from **[Release Readiness — Play Store Launch Prep](#release-readiness--play-store-launch-prep-current-phase)**.
> Quick version + Next Session Quick Start: `docs/session-handoff.md`. Release tracker: `docs/release-prep.md`.
> **Repository:** https://github.com/taysh123/Gravity-Game.git · branch `master` (synced, HEAD `a354492`).
> **Phase:** Google Play launch engineering (game is content-complete v0.14.0). **Privacy policy:** https://taysh123.github.io/Gravity-Game/

---

## Project Overview

- **Game vision.** A mobile-first physics puzzle game. The player never directly controls the ball —
  pressing/holding the screen creates a gravity attraction point that pulls the ball toward it (drag to
  move, release to remove). Core loop: *hold to pull, guide the ball to the goal.*
- **Brand.** Studio = **True Story Labs**. Game = **GRAVITY FLOW**. Premium cosmic identity.
- **Target platform.** iOS, Android, and web. **Web is the primary dev/test target** (Vite dev server).
- **Tech stack.** Phaser 3.80 · TypeScript (strict) · Matter.js (bundled in Phaser) · Vite 5 · Vitest.
- **Architecture (the golden rule).** *A new mechanic = one entity class + one optional `LevelConfig`
  field.* Mechanics are spawned in `GameScene.createFromConfig` and updated in `GameScene.update`.
  **No managers, no premature abstraction.** All constants live in config files (`physics.config.ts`,
  `theme.config.ts`, `splash.config.ts`). Visuals are runtime `Graphics`/vector icons + one bundled logo
  PNG + self-hosted fonts. Raw Matter via the `RawMatter` bridge (`utils/matter.ts`).
- **Major systems.** Scene flow (splash → menu → game), the attractor force model, the `LevelConfig`
  mechanic pipeline, a 3-star scoring + `ProgressStore` progression layer, a design-token UI system
  (`theme.config` + `ui/` components), and a Web-Audio synth.

**Scene flow:** `Boot → CompanySplash → IntroSplash → MainMenu → Game → End`, with `LevelSelect` and a
`Settings` overlay. See CLAUDE.md for the full diagram + folder structure.

---

## Current State

**Implemented & working (verified in browser via Playwright unless noted):**
- Full startup presentation: text-only True Story Labs company splash → cosmic intro (energy sphere →
  vortex → GRAVITY FLOW logo reveal, with synth audio) → main menu.
- Core gameplay: attractor pull (inverse-square), goal/win, restart, dim cosmic background.
- Mechanics: **gravity zones** (force fields), **magnets** (static attract/repel wells), **portals**
  (linked teleport pairs, carry velocity), **moving platforms** (timing barriers), **hazards**
  (fail-on-touch, static + moving saws), **collectible gems**, **timed levels** (hard countdown).
- Scoring: **3 stars** per level (complete / gem / under-par), persisted in `ProgressStore`
  (localStorage), shown on the win overlay + world-select; **sequential unlock**; menu **Continue**.
- Retention: **Daily Challenge** — a date-seeded level + consecutive-day streak (DAILY menu button,
  gold badge, `DAILY COMPLETE` overlay), persisted in `DailyStore`.
- Mastery feedback (P3): live **par chip** + personal-best **ghost trail** (`GhostStore`); two new "alive"
  hazard archetypes — **rotating arm** + **pulsing laser** (`utils/hazardMotion`) — distributed across all worlds.
- Economy + Store (Sprint 2.5, v0.14.0; **web-verified**): **28 cosmetics** across skins/trails/arrival
  effects (5 rarities, 6 collections); **dual currency** (Stardust + **Cosmic Fragments**, `FragmentStore`);
  tabbed **premium store** (`CosmeticsScene` — rarity badges, locked previews, owned/equipped, scroll);
  **bundles + Remove-Ads + Restore** (`IAP.buyBundle`); **rewarded loops** (2x Stardust on win, daily free
  Fragments, `RewardStore`); **retention rewards** (achievements/collections/star-milestones grant currency,
  `utils/Rewards`). Skins render style/accent; trails + arrival effects customize the ball trail + win burst.
  No P2W. Audit + reviews: `docs/store/monetization-review.md`.
- Native + Monetization (Sprint 2, v0.13.0; **code-complete, web-verified**): **Capacitor** Android wrap;
  **AdMob** (`Ads.ts`), **RevenueCat** Remove-Ads (`IAP.ts`), **Firebase Analytics** funnel + **Crashlytics**
  (`Analytics.ts`/`Crash.ts`) — all native plugins reached by-name via `registerPlugin` (`utils/native/*`),
  dynamic-import **guarded by `isNativePlatform()`** so the web build never bundles them. Ids in
  `config/monetization.config.ts` (AdMob test ids default). CI + `docs/release-android.md` + `docs/store/`
  (listing + ASO). *Native build / signing / store upload + accounts/ids are user gates.*
- UI/UX: glassmorphic design system, Orbitron+Exo 2 fonts, in-game glass toolbar (Home/Settings/Restart),
  settings overlay (Sound/Music/Haptics/Reduce-Motion), one-time Level-1 coach-mark, win/death feedback,
  full-surface button hit areas + press feedback, safe-area handling.
- Quality gates green: `npx tsc --noEmit` clean · `npm test` 44 tests pass (MathUtils 10 + scoring 6 +
  daily 12 + portal 5 + gate 5 + achievements 6) · `npm run build` clean · full flow **no console errors**.

**Caveat:** automated Playwright scripts verified that mechanics *function* (zone lifts, saw sweeps,
hazard kills, countdown fails). They **cannot** reproduce precise finger input, so per-level
**solvability/difficulty balance** is not yet verified — that needs a **human device playtest**.

---

## Release Readiness — Play Store Launch Prep (current phase)

The game is content-complete (v0.14.0); the active work is **shipping it to Google Play**.
**Canonical privacy-policy URL:** https://taysh123.github.io/Gravity-Game/ (this repo's GitHub
Pages, served from `docs/index.html`).

**Done this phase — all committed + pushed (HEAD `a354492`):**
- **Release signing** wired in Gradle (`android/app/build.gradle`) from a gitignored
  `android/keystore.properties`; upload key **`gravityflow-upload`** (`C:\Keys\gravityflow-upload.jks`,
  valid to 2051). `./gradlew signingReport` → release variant **Valid**. (`b79e849`)
- **First signed AAB** built + `jarsigner`-verified at
  `android/app/build/outputs/bundle/release/app-release.aab`. ⚠️ **Built 2026-06-10 — predates the UMP
  consent + branded icon, so REBUILD before uploading.**
- **UMP (GDPR) consent** gathered before `AdMob.initialize()` (`utils/Ads.ts` + `utils/native/admob.ts`),
  guarded + web-safe. (`dd49e3e`)
- **Privacy policy finalized**: source `docs/store/privacy-policy.md` + hosted HTML `docs/index.html`
  (mobile-friendly, no raw markdown). Contact `truestorylabs@gmail.com`; governing law = Israel;
  legal-requests / disclaimer / retention-exceptions clauses. (`cb13ff0`, `fe0bfc7`, `ddcfe8e`)
- **Store assets** in `docs/store/assets/`: **8 screenshots @ 1080×2160** (Play-compliant), **32-bit
  `icon-512.png`**, **`feature-1024x500.png`**, + concept alternatives (`icon-concepts/`,
  `feature-concepts/`); catalog `docs/store/assets/README.md`. (`693a2c9`)
- **Branded launcher icon** (vortex) replaces the default Capacitor robot — adaptive + legacy mipmaps
  at all densities via `@capacitor/assets` from `assets/icon-{foreground,background,only}.png`. (`a354492`)
- Firebase real `google-services.json` in `android/app/` (project `gravity-flow-e8dff`).
- Quality: `tsc` clean · **82 tests** · web build clean (firebase/admob/RC **not** bundled).

**Readiness by track:**
- **Internal Testing — code & assets READY; blocked only on user/Play-Console steps:** confirm Pages
  live → create Play Console app → App content (privacy URL + data safety + content rating + ads
  declaration + target audience) → Main store listing (paste `docs/store/listing.md` text + upload
  assets) → **rebuild AAB** → upload + add testers. *Test AdMob ids are fine for this track.*
- **Closed Testing — adds external accounts:** real **AdMob** app + 2 ad-unit ids → `config/
  monetization.config.ts` + `AndroidManifest.xml` → rebuild; AdMob **UMP consent message**;
  **RevenueCat** SDK key + Remove-Ads product + `premium` entitlement; **Play billing products**
  (`remove_ads` + the 3 bundles); on-device verify ads / interstitial cap / Remove-Ads / Restore /
  Analytics DebugView / Crashlytics; Play's new-personal-account tester+duration window.
- **Production — adds:** device **1★ fairness playtest**; final data safety / pricing / countries;
  promote → submit for review.

**Known issues / risks / blockers:**
- ⚠️ **The signed AAB is stale** (no UMP, old icon) — `cd android; ./gradlew bundleRelease` before upload.
- **GitHub Pages source must be `master` → `/docs`** so `…/Gravity-Game/` serves `docs/index.html`
  (otherwise that URL hits the game's root `index.html`). Verify after enabling Pages.
- **Jekyll exposure:** serving `/docs` publishes *all* of `docs/` (status, handoff, plans,
  monetization-review). No secrets — keystore + `google-services.json` are gitignored. Optional:
  add `docs/.nojekyll` or relocate internal docs.
- **1★ device fairness** is still unverified (long-standing gameplay gate; runnable on the internal build).
- `android/.idea/*` IDE files are tracked and show churn (cosmetic; candidate for gitignore).

**External-account tasks still required (cannot run locally):** Play Console (app, all App-content
forms, tracks, billing products, uploads); AdMob (real app + ad-unit ids, consent message); RevenueCat
(SDK key, product, entitlement); Firebase (done — optionally verify DebugView/Crashlytics on device).

---

## Completed Sprints

History lives in `docs/superpowers/plans/`. Summary:

### Sprint A — Foundations + Startup Flow
- **Objective:** stand up the game + a premium startup presentation.
- **Delivered:** Boot/Game/End loop; company splash, cosmic intro set-piece, main menu, level select;
  design-token UI (`theme.config`, self-hosted Orbitron+Exo 2), glass components, cosmic background;
  settings overlay (audio/haptics/motion); real True Story Labs logo (white-knockout).
- **Key commits:** `e953a67`, `c285dc7`, `786b02d`, `d23b2d6`, `643412c`, `2d588f3`, `e02db1d`,
  `0571cb9`, `97f9505`.
- **Lessons:** the broken "Sprint 4" WIP was stashed (`stash@{0}`) and rebuilt from clean `b5df2e6`;
  Vite `base:'./'` + no `public/` → assets must be **import-bundled**; canvas needs `document.fonts`
  awaited before first text render; overlay scenes need `scene.bringToTop()` (scene-list order bug).

### Sprint B — Onboarding & Game Feel ("Effortless First 30s")
- **Objective:** fix the first-time experience; add win/death juice.
- **Delivered:** Level 1 retuned within one attractor reach; attractor spawn "sonar-ping" + brighter
  reach ring; one-time animated coach-mark (`seenTutorial`); win juice (absorb flash + haptic pattern);
  death feedback (red flash + puff + fail tone). 
- **Key commits:** `014a879`, `6531d3f`, `960f120`, `6d14031`, `1e5ab7e`, `bb12a95`.
- **Lessons:** the inverse-square pull is very weak at distance — root cause of "finicky" control;
  **death was unreachable** in the walled arena (motivated hazards later).

### Sprint C — Depth, Variety & Replay
- **Objective:** add gameplay depth + replay.
- **Delivered:** **Gravity Zones** (World 2 Currents), **Moving Platforms** (World 3 Clockwork),
  **collectible gems**, **3-star scoring** + `ProgressStore`, **grouped world-select** (star badges +
  locks) + menu **Continue**; expanded to 16 levels / 3 worlds. Pure `scoring.ts` is TDD'd.
- **Key commits:** `a43c6ae`, `f9d2a00`, `aaab696`, `9bb5f99`, `1d40d6f`, `0921613`, `1239580`.
- **Lessons:** mechanics drop in cleanly via the `LevelConfig` rule; adding levels reflows the
  world-select grid (watch layout); Playwright canvas-button taps are flaky during Vite HMR reloads.

### Sprint E — Validate, then Expand (latest, in progress)
- **Objective:** shift from polish to a shippable product — add the next mechanic + a retention hook,
  validating balance first. Confirmed scope: tight (Magnets + Daily Challenge), balance pass first,
  ship-target (PWA vs Capacitor) deferred as the monetization/release gate.
- **Delivered (M1):** **Magnets** (`entities/Magnet.ts` + `LevelConfig.magnets` + `applyMagnetForces`,
  reusing the inverse-square model with signed attract/repel strength); **World 5 — Wells** (levels
  23-27); level-select compacted for a 5th world (cells stay ≥44px); dev-only `__game`/`__Phaser`
  Playwright hooks (stripped from prod).
- **Delivered (M2):** **Daily Challenge** — pure `utils/daily.ts` (date-seeded level pick + streak math,
  12 TDD tests) + `DailyStore.ts` (localStorage streak/bestStreak); a **DAILY** menu button with a gold
  attention badge + streak caption; `GameScene` `daily` flag → records streak on win, shows the
  `DAILY COMPLETE` overlay + streak, returns to the menu, persists, and survives restart.
- **Verified:** isolated attract pull + repel push (Playwright, no player input), World 5 reflow + magnet
  visuals; full daily flow (play→win→streak→persist→missed-day reset→keep-alive); `tsc`/**28 tests**/build
  green; no console errors.
- **Open in this sprint:** **M0 balance pass** — awaits human device playtest of W2-5.

### Sprint D — Tension & Clarity
- **Objective:** address playtest feedback (small buttons, weak pull, unfinished HUD, no stakes).
- **Delivered:** full-surface hit areas + press feedback (`THEME.HIT_PADDING`); **gravity tuning**
  (strength 1.5→2.6, min-dist 55→75); **HUD toolbar** redesign + gear icon; **Hazards** (fail-on-touch,
  static+moving); **timed levels** (hard countdown fail); **World 4 Peril** (6 levels) → 22 levels /
  4 worlds.
- **Key commits:** `3a0f936`, `3d387ac`, `dc0c0d1`, `dc0461a`, `8e8ba7c`, `59c03f1`, `206ab35`.
- **Lessons:** button "smallness" was glow-overhang + `pointerupoutside` drift, not hit-rect size;
  hazards finally make `triggerDeath` reachable; the world-select needed compacting for a 4th world.

---

## Current Gameplay Systems

- **Attractor physics** (`GameScene.applyAttractorForce`, `entities/Attractor.ts`): inverse-square,
  `force = dir * ATTRACTOR_STRENGTH / dist²`, clamped to `[MIN_DIST, ∞)`, zeroed past `MAX_DIST`.
  Current tuning: **STRENGTH 2.6, MIN_DIST 75, MAX_DIST 310**. Spawn shows a "sonar ping" to the reach.
- **Gravity zones** (`entities/GravityZone.ts`, `LevelConfig.gravityZones`): rect force fields (dir +
  strength); constant force while the ball is inside (reuses `applyForce`). Tinted by direction
  (cyan up / gold down / violet side) with drifting chevrons.
- **Magnets** (`entities/Magnet.ts`, `LevelConfig.magnets`): static force wells — `applyMagnetForces()`
  reuses the inverse-square attractor model with **signed strength** (+ attract / − repel), clamped to
  `[MAGNET_MIN_DIST, MAGNET_MAX_DIST]`. Cyan `+` well pulls; violet-magenta `−` well pushes; faint
  influence ring telegraphs reach.
- **Moving platforms** (`entities/MovingPlatform.ts`, `LevelConfig.movingPlatforms`): static barrier
  slid via `RawMatter.Body.setPosition` along a yoyo tween; a faint track telegraphs the path.
- **Hazards** (`entities/Hazard.ts`, `LevelConfig.hazards`): deadly red spiked node / striped bar.
  Four motions: static · linear sweep (`to`/`durationMs`) · **rotating arm** (`pivot` + `durationMs`,
  orbits a point — drawn with a spoke) · **pulsing laser beam** (`pulseMs`/`phaseMs` — a rect deadly only
  during its firing window, telegraphed dim-rail→charging→fire; `overlaps` gates on state). Overlap → fail.
  Pure motion math (on/off, orbit point) in `utils/hazardMotion` (TDD). *(Phase 3 added rotating + laser.)*
- **Mastery feedback** (P3): a live **par chip** (untimed levels — elapsed time, gold while under
  `parTimeMs`) and a faint **PB ghost trail** — `GameScene` records the ball path, saves a downsampled
  best run to `utils/GhostStore` (localStorage; `utils/ghost.downsamplePath` TDD'd), repainted on entry.
  Honors reduced-motion. Fuels the 3★ / "one more try" loop.
- **Collectibles** (`entities/Collectible.ts`, `LevelConfig.collectible`): optional gold gem; overlap →
  collected + chime; grants the 2nd star. *(Phase 3 moved many gems onto risky/skill lines — risk/reward.)*
- **Stars / scoring** (`utils/scoring.ts` TDD): ★ complete · ★ gem · ★ under `parTimeMs`. Computed in
  `triggerWin`, persisted via `ProgressStore`.
- **Progression** (`utils/ProgressStore.ts`): per-level `{stars, bestTimeMs, gem}` in localStorage;
  `isUnlocked` (sequential), `nextLevel` (menu Continue), `totalStars`.
- **Worlds** (`config/worlds.ts`): chapter metadata (name/theme/range) over the flat `LEVELS[]`.
- **Daily Challenge** (`utils/daily.ts` pure + `utils/DailyStore.ts` localStorage): a date-seeded level
  per day + a consecutive-day streak. Surfaced as a **DAILY** menu button (gold badge until done) and a
  `DAILY COMPLETE` overlay; a `daily` flag on `GameScene` routes the win to record the streak + return
  to the menu. Reuses existing levels — no new content to author.
- **Menus / onboarding:** `MainMenuScene` (PLAY/CONTINUE + LEVELS + settings gear, staggered entrance,
  ambient pad), `LevelSelectScene` (world-grouped, star badges, locks), one-time L1 `CoachMark`,
  per-level `hint`.
- **Settings** (`SettingsScene` overlay + `utils/SettingsStore.ts`): Sound / Music / Haptics /
  Reduce-Motion, persisted; wired into `AudioSynth` (Sound-gated SFX + Music ambient pad), haptics gate,
  and `reducedMotionActive()`.
- **Fail states:** **hazard contact** and **timeout** both → `triggerDeath` (red flash + ball puff +
  `playFail()` + sharp haptic → restart current level). Out-of-bounds death still exists but is rare.
- **Timers** (`LevelConfig.timeLimitMs`): top-center glass countdown chip; red + pulsing under
  `TIMER_WARN_MS` (3s); 0 → timeout fail. The par-time efficiency star is separate/universal.

---

## Current Content

> **⚠️ Active program (2026-06-14): 150-level expansion + polish — CONTENT COMPLETE at 150.** Plan of
> record: `docs/superpowers/plans/2026-06-14-expansion-150.md`. **Now at 150 levels / 15 worlds.** Launch
> timing deferred while polish/balance finishes. Key finding: the per-world visual identity + adaptive
> audio + win-celebration polish the old excitement audit asked for is **already built**, so the program
> led with content + targeted polish. **All 150 levels boot with zero console errors** (`scripts/smoke_levels.py`);
> per-level solvability/fairness still needs the human **device playtest** (`docs/device-playtest-checklist.md`).
> The 56-level snapshot below is superseded; structure/philosophy still apply.
>
> **GRAVITY RUN (endless flagship mode, built + v2 tuned):** a camera-scroll vertical climb (`EndlessScene`)
> reusing every campaign entity. **Two modes** via a `RunSelectScene` hub: **Endless** (random seed each
> attempt → fresh run every time; local best) and **Weekly Challenge** (fixed weekly seed + shared
> leaderboard `Leaderboard.submitRun/bestRun`). RUN OVER: **RETRY**, Revive (rewarded, off the ranked board),
> 2×-Stardust, shareable card (`utils/Share`). **20 handcrafted chunks** (`config/endless/chunks.ts` +
> validator) with a variety/pacing generator (`utils/endless.ts` — tier-0 opener, tension/release, no
> back-to-back id/tag, recency window) + a gentler readable ramp/onboarding. Strategy of record:
> `~/.claude/plans/pure-foraging-fiddle.md`. Open: human feel-playtest of the tuned ramp; optional PGS leaderboards.

- **15 worlds, 150 levels** — `LEVELS[]` ordered by world so chapter ranges are contiguous; a structural
  validator (`src/config/levels/levels.test.ts`) guards every level. Worlds 1–8 (the 7 mechanic worlds)
  grew 7→10 by promoting curated retired levels; Worlds 9–15 are new combination/tension/mastery worlds
  reusing the 7 mechanics (no new engine code):
  - **9 Gauntlet** (81-90) precision routing · **10 Binary** (91-100) orbital magnets ·
    **11 Labyrinth** (101-110) portals+gates · **12 Tempest** (111-120) timed + moving hazards ·
    **13 Ascension** (121-130) long journeys · **14 Singularity** (131-140) tight-margin mastery ·
    **15 Homecoming** (141-150) the finale arc → BOSS "THE LONG WAY HOME".
  - Each world keeps the teach→…→signature→boss arc; goal radii shrink and par tightens across the campaign.
  *(Original 56-level WOW-trim notes retained below for reference.)*
- **(Superseded snapshot) 8 worlds, 56 levels (8×7)** — `LEVELS[]` ordered by world so chapter ranges are contiguous. The whole
  campaign was trimmed to its strongest levels (Phase 1 = W1-3, Phase 2 = W4-8) with toys-before-tests,
  cut filler combine-stacks, and a fully rotated set of distinct boss archetypes:
  - **World 1 — Foundations** (1-7): attractor + static walls; toy First-Pull/Comet/Constellation; BOSS THE COLLAPSE (descent set-piece).
  - **World 2 — Currents** (8-14): gravity zones; toy Updraft-surf/Drifthome; signature THE EYE; BOSS THE MAELSTROM (chase).
  - **World 3 — Clockwork** (15-21): moving platforms; toy Gearslip/Orrery; signature THE GEARWORKS; BOSS THE MACHINE (mechanic-turned).
  - **World 4 — Peril** (22-28): hazards + timed; toy Sparkweave; signature THE FORGE; BOSS THE INFERNO (endurance, no clock).
  - **World 5 — Wells** (29-35): magnets; toy Swingby; signature THE BINARY STAR; BOSS THE SINGULARITY (orbit).
  - **World 6 — Rifts** (36-42): **portals**; toy Blink; signature HALL OF MIRRORS; BOSS THE BREACH (puzzle-boss, no clock).
  - **World 7 — Gates** (43-49): **one-way gates**; toy One-Way Door; signature THE LOCKWORKS; BOSS THE VAULT (lock-and-key, no clock).
  - **World 8 — Convergence** (50-56): all-mechanic synthesis/improvisation; signature THE CONFLUENCE; BOSS/FINALE HOMECOMING (the only timed boss).
  - *Retired levels stay on disk (un-imported) as future "Expert" packs. Balance awaits a device playtest for fairness.*
- **Progression structure:** sequential unlock (a level opens when the previous is ≥1★); world tally
  shown in the level-select. Every level has a `parTimeMs` and most have a `collectible`.
- **Difficulty curve:** each world follows **teach → develop → twist → combine → master**; 1★ is always
  meant to be reachable, with gems + par + (Peril) hazards/time as the opt-in skill layer.

---

## Design Decisions (do not forget)

- **Branding:** company **True Story Labs** (text-only premium splash; old photo-card logo retired);
  game **GRAVITY FLOW**. Use these names everywhere (splash, menu, end, docs).
- **Art direction:** premium **cosmic / gravity** identity — deep indigo space, nebula + parallax stars,
  glassmorphic "cinema-dark" panels, accent glows.
- **Typography:** **Orbitron** (display/wordmarks) + **Exo 2** (body/UI), **self-hosted woff2**
  (`npm run fonts:fetch`). Never Arial.
- **UX choices:** 44px+ touch targets with hit areas extended past the visible edge; immediate press
  feedback; safe-area insets; `prefers-reduced-motion` honored + user toggle; one cohesive in-game glass
  toolbar (not loose buttons); skip-on-touch splashes.
- **Progression philosophy:** sequential unlock, 3-star mastery layer, replay via gems + best-time + par.
- **Challenge philosophy:** **fair, not frustrating** — teach each mechanic in isolation before
  combining; 1★ always achievable; stars/hazards/timers are the opt-in skill ceiling.
- **Architecture rule:** one entity + one optional `LevelConfig` field per mechanic; **no managers**;
  constants in config; the attractor *formula* stays inverse-square (only its constants are tuned).
- **Force model:** never rewrite the inverse-square law; tune `STRENGTH`/`MIN_DIST`/`MAX_DIST` only.

---

## Open Issues

- **Level balance needs a device playtest (highest).** Worlds 2-4 geometry/par/`timeLimitMs`/gem
  placement are reasonable but unverified for solvability/fairness with real finger input. Likely
  suspects: Peril hazards being unavoidable, timed levels too tight, downdraft/crosswind strengths.
- **Gravity values are device-tunable.** STRENGTH 2.6 / MIN_DIST 75 were tuned in-browser; confirm feel
  on a phone.
- **Out-of-bounds death is rare** (walled arena) — hazards/timeouts are now the real fail paths.
- **Audio "Music"** is a subtle ambient pad only; no real soundtrack yet.

---

## Next Recommended Sprint

The content/mechanic roadmap is **paused** — the game is content-complete and the project is in the
**Google Play launch phase**. See **[Release Readiness — Play Store Launch Prep](#release-readiness--play-store-launch-prep-current-phase)**
above for the authoritative current state, and `docs/session-handoff.md` → *Next Session Quick Start*
for the immediate next actions. Release checklists per track live in `docs/release-prep.md`.

**Immediate next action:** rebuild the signed AAB (it predates UMP + the branded icon), then the
user-side Play Console steps (create app → App content → listing → upload to Internal Testing). The
**device 1★ fairness playtest** remains the open gameplay gate and can run on the internal build.

*(Content backlog kept for after launch: gameplay tuning from the device playtest, real soundtrack,
the retired "Expert" level packs on disk. Mechanic roadmap: `docs/superpowers/plans/`.)*

---

## Future Roadmap

Ranked in `docs/superpowers/plans/2026-06-01-mechanics-roadmap.md`. Highlights:
- **Magnets** (World 5 — Wells): static attract/repulse points. Cheap, high synergy. *Next mechanic.*
- **Portals** (World 6 — Rifts): paired teleport + velocity redirect.
- **One-way gates**, **rotating obstacles** (physics-risky), bounce pads (skip).
- **Advanced progression:** stars-gated world unlocks, best-time leaderboards, daily/challenge variants.
- **Audio:** a real ambient soundtrack beyond the pad.
- **Deployment / mobile release:** Capacitor/Cordova wrap or PWA; app-store assets; real-device QA
  (touch, haptics, audio-unlock, safe-area, 60fps).

---

## Resume Instructions

1. **Read this file first.** It is the single source of truth.
2. Skim `docs/session-handoff.md` for the 30-second version.
3. Continue from **[Release Readiness — Play Store Launch Prep](#release-readiness--play-store-launch-prep-current-phase)**
   (currently: rebuild the AAB, then user-side Play Console steps for Internal Testing).
4. Working conventions: plan first (`writing-plans` → `docs/superpowers/plans/`), one entity + one
   `LevelConfig` field per mechanic, all constants in config, verify in-browser before "done"
   (`npm run dev` + Playwright `--disable-gpu --use-gl=swiftshader`), keep `tsc`/tests/build green.
5. **Git/GitHub:** remote `origin` = https://github.com/taysh123/Gravity-Game.git, branch `master`
   (tracking set up). `git status` should be clean; commit per milestone and `git push` to keep GitHub
   in sync. (If a push needs auth, run `git push` yourself so the credential prompt works.)
