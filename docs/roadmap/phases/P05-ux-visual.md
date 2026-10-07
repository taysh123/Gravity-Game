# P05 — UX/UI, Visual & Motion System

> **Status:** PLANNED (2026-10-07; baseline `master @ d3c6aab`).
> - **P5-A slice** = execution **step 12**. It needs M0 and unblocks steps 13 and 14.
> - **P5 system** = execution **step 16**. It needs M1 and unblocks step 18 and M2.
>
> **Design spec:** [`../../design/UX-UI-MOTION.md`](../../design/UX-UI-MOTION.md) (all values, tokens, motion and choreography). This file is the *implementation plan*; it does not restate values unless a task depends on them.
>
> **Decisions:** D-13 (rendering, primary), D-08 (result screen), D-25 (13+). Also honours D-01, D-02, D-07, D-09, D-10, D-11, D-12, D-14, D-17, D-19, D-23, D-24, D-26, D-27, D-28.

---

## 1. Summary
P5 turns the existing Cinema-Mobile look into a reusable, measurable design system and fixes the render that makes the game look dim. It ships in two parts.

**P5-A (step 12, render correctness).** Small, independent and pulled early because store creative and honest playtests depend on it:
- remove the darkening camera bloom and the ball's postFX glow
- move the HUD into a parallel `HudScene`
- glow from additive sprites; static geometry baked once per level
- a pre-rendered vignette image
- quality tiers (Low/Mid/High) with render scale and a **persisted** FPS watchdog
- an Exo 2 wrapped hint chip
- a transparent logo re-export

**P5 system (step 16, design language):**
- three-layer tokens v2 (type 6 steps / 12 px floor, 4/8 spacing, elevation with modal α 0.96, semantic colours with measured contrast, world tokens that never collide with gameplay colours)
- the component kit (Button variants incl. honest Reward and Purchase, Modal, Toast queue, ScrollView with inertia, LevelNode path map, shop components, Settings v2)
- the motion vocabulary and trauma shake
- accessibility options
- the splash fast path and the EndScene finale

**Open conflicts.** These are listed here, not resolved. The plan follows DECISIONS.md where it speaks.

| # | Conflict | Plan default | Who decides |
|---|---|---|---|
| C1 | **D-07 vs game-speed assist.** D-07 says an "assisted clear" never earns the par star, but defines "assisted" only for the relief ladder. This plan keeps the par star earnable at 70/85% speed, because par is evaluated in sim time (D-01) | Par star stays earnable | Owner: confirm, or extend D-07 to cover game speed |
| C2 | **Research vs D-13 on bloom.** The research brief's High tier allows ≤5 postFX passes (an additive 2-step bloom via a custom PostFX). D-13 says the camera carries no postFX and rules out custom v3 pipelines | Follow D-13: 0 passes in every tier | — |
| C3 | **Roadmap vs D-13 on HUD architecture.** MASTER-ROADMAP P5 lists `utils/hudCamera.ts`; D-13 makes a parallel `HudScene` primary | Build `HudScene`; `hudCamera.ts` exists only as the fallback | — |
| C4 | **Research vs D-08 on auto-continue.** Research floats an opt-in "Auto-continue" setting; D-08 says no auto-advance | Not adopted | — |
| C5 | **Research vs audit on type scale and modal alpha.** Audit E.2: scale 12/14/16/20/24/32 and modal α 0.94. Research brief: 12/15/17/20/28/40 and 0.96 | Use the research brief (primary evidence and this brief) | — |
| C6 | **P4 vs P5-A on the obstacle angle fix.** MASTER-ROADMAP files it under P4; P5-A baking draws obstacles rotated. No shipped level sets an obstacle `angle`, so nothing changes visually | Fix lands in P5-A | P4 inherits the fix |
| C7 | **P3 vs P5-A on hints.** The hint *chip* is P5-A (step 12); hint *logic* and tiers are P3's `HintSystem` (step 10, D-07) | Whichever lands second integrates | — |

---

## 2. Scope

### 2.1 Systems
| Area | P5-A (step 12) | P5 system (step 16) |
|---|---|---|
| Rendering | Bloom/glow removal, vignette image, glow sprites, baked static layer, depth bands, HudScene, render scale k, quality tiers + persisted watchdog | High-contrast gameplay variant of the baked layer |
| Tokens | Minimal: `SURFACE_HUD_ALPHA 0.88`, `body` type token (needed by the hint chip) | Full `PRIM` / `UI` / `COMP` / `MOTION` / `WORLD_TOKENS` in `theme.config.ts` |
| Components | `HintChip` | Text factory, `drawSurface`, Button variants, IconButton 48, Toggle, Segmented, Chip, Badge, Card, Modal, Toast, ScrollView, LevelNode, Tabs, shop components; restyles ResultPanel / RunOverPanel / DeathStamp / PausePanel |
| Motion | — (the celebration bloom boost is replaced by a glow swell) | `utils/motion.ts`, `utils/shake.ts`, transition durations, choreography (result, death, unlock, boss, world ceremony) |
| Screens | GameScene / EndlessScene HUD move; MainMenu logo | Every scene migrated to tokens; Settings v2; Star Map ceremony; level path; shop; splash fast path; EndScene finale |
| Accessibility | — | Toggle-hold attractor, game-speed assist, high contrast, large text, flashes toggle, shake slider, haptics redundancy, distinct fail sounds |
| Assets | Transparent logo (`scripts/optimize-logos.mjs`) | Icon set additions (vector) |

### 2.2 Dependencies
| Needs | For | Why |
|---|---|---|
| **M0** (steps 0–7) | P5-A | D-12 store shape validation + Preferences mirror (new SettingsStore fields), Crashlytics custom-key plumbing (step 5), FixedStepper interpolation (glow sprites follow interpolated kinematic positions; D-01) |
| P0 step 2 (D-11) | P5 system T15 | Back router and minimal pause overlay exist; P5 restyles them and adds Endless pause |
| **P3 step 10** (D-07, D-08) | T18, hint integration | `ResultPanel`, `DeathStamp`, `HintSystem` and the relief ladder are built functionally in P3; P5 restyles and choreographs them |
| P1 `FixedStepper` | T22 game speed | Speed is implemented as wall→sim accumulation scale |
| P2 validators v2 | T07 | Adds the "hint ≤ 110 chars" rule (otherwise a Vitest over `LEVELS`) |
| **M1** | P5 system | Closed-beta telemetry and stable P4-α content before the system-wide restyle |
| Owner (D-19) | Not P5 | Store creative (step 14) applies the name; P5 only supplies the visual spec and the capture mode |

**Unblocks:**
- step 13 (P4-α tuning on an honest render)
- step 14 (store creative)
- step 18 (P7 shop uses the P5 shop components)
- M2

### 2.3 Difficulty · risk · upside
- **Difficulty:** engineering **M** · design **H** · QA **M** (device perf).
- **Risk: medium.**
  - **Render scale k** has the largest blast radius: 53 `scale.width/height` reads in 14 files and 18 raw pointer reads in 5 scenes. It sits behind `RENDER.SCALE_ENABLED`.
  - **HudScene input routing** relies on Phaser `globalTopOnly` [INFERRED; tested in T05].
  - The **look change** needs owner sign-off (D-13).
  - **GPU cost on low-end devices** is mitigated by tiers plus the persisted watchdog.
- **Upside: high.**
  - Brightness is restored (bloom costs −22% on flat areas and −48% on 1–2 px lines).
  - HUD contrast goes from 3.77:1 to ≥10:1.
  - Store-conversion assets become shootable.
  - Shop and level-select usability improve.
  - Accessibility parity.

### 2.4 Success metrics
| Metric | Target | Source |
|---|---|---|
| Gameplay peak luminance in captures | ≥230 (today 169–179) | MASTER P5 |
| HUD text contrast as rendered | ≥4.5:1 (spec ≥10.31:1) | MASTER P5 |
| Text under 12 px | 0 | MASTER P5 |
| Touch targets under 48 px | 0 (allowlist empty) | MASTER P5 |
| p95 frame time, Mid reference device | ≤20 ms | MASTER P5 |
| Reduced-motion audit | passes; steady-state brightness RM-on vs RM-off within ±2% | MASTER P5, D-13 |
| Camera postFX | 0 passes in all tiers | D-13 |
| Draw calls | Low ≤40 · Mid ≤60 · High ≤80 | D-13 |
| Watchdog | Stutter does not recur after a restart (downstep persisted) | audit H.4 |
| Returning cold start → menu interactive | splash ≤1.2 s | audit E.1 #13 |

### 2.5 Must NOT be done yet
- Illustrated art pipeline, 3D, Phaser 4 (D-28).
- Custom v3 render pipelines, including the research brief's "additive 2-step bloom on High" (D-13).
- An opt-in "auto-continue" after wins (D-08: no auto-advance).
- Economy or shop *logic* changes (P7, D-23); new currencies.
- Renaming or brand changes (D-19).
- `@capacitor/haptics` on Android (stays `navigator.vibrate` + `VIBRATE`, D-11; Capacitor Haptics comes with iOS, D-29).
- A native "60 fps battery" refresh plugin.
- A DOM overlay for screen readers (TalkBack).
- Level geometry or physics constants (P4, D-26).
- Raising the particle ceiling above 50.

---

## 3. Architecture plan

### 3.1 Layers
```
theme.config.ts  PRIM → UI → COMP, MOTION/EASE, WORLD_TOKENS     (data only)
fx.config.ts     QUALITY tiers, DEPTH bands, RENDER flags, SHAKE, GLOW, VIGNETTE_TEX
physics.config   VIEW_W/H 390×844, gameplay colours (+ OBSTACLE_RIM, WALL_LINE)
        │
utils/ (pure, TDD)  quality.ts · renderScale.ts · motion.ts · shake.ts · scrollPhysics.ts
                    pathLayout.ts · contrast.ts · haptics.ts · toastQueue (in Toast.ts, pure core)
        │
ui/ (Phaser)        text.ts · glass.ts(drawSurface) · Button · IconButton · Toggle · Segmented · Chip
                    Badge · Card · Modal · Toast · HintChip · ScrollView · LevelNode · Tabs · shop/*
        │
scenes/             HudScene (new, parallel) over GameScene/EndlessScene; all others consume ui/
```

### 3.2 Render path (after P5-A)
| Pass | Contents |
|---|---|
| Host main camera | origin (0,0), zoom k, scroll 0 + shake offset, **no postFX** |
| Draw order | atmosphere (−100…−80) → vignette image (−60) → baked static RT (0) → ADD glow band (2) → dynamic entities (3–9) → ball (10) → juice (40–46) |
| `HudScene` camera | zoom k, never shaken or zoomed. Contents: HUD chips, nav toolbar (pitch 56), hint chip, title cards, DeathStamp, Result/RunOver panels, toasts, pause |
| Overlay scenes | `SettingsScene` stays a separate overlay scene, brought to top over HudScene |

### 3.3 Quality controller (`utils/quality.ts`)
- **Pure core:**
  - `startTier({deviceMemory, cores})`
  - `watchdog(samplesMs[]) → 'hold' | 'down'` (rolling 3 s; p50 > 20 or p95 > 33 ms → down)
  - `effectiveTier(settings, appVersion)`
  - `budgets(tier)`
- **Runtime shell:**
  - Samples `game.loop.delta` per frame in hosts.
  - Persists `gfxDownstep` through SettingsStore (D-12 mirror).
  - Applies particle, comet and glow budgets immediately, and render scale at the next scene start.
  - Sets Crashlytics keys.

### 3.4 Render scale (`utils/renderScale.ts`)
- `kNeeded = displayWidthCss × DPR / 390`. Tier caps: Low 1, Mid 1.5, High min(kNeeded, 2). `?gfx=capture` (DEV) = 1080/390.
- The game is created at 390k × 844k in `main.ts`.
- `setupCamera(cam, k)` sets origin (0,0) and zoom k. `punch(cam, p)` zooms k·p and offsets scroll by `(W/2)(1−1/p), (H/2)(1−1/p)`, keeping the centre fixed.
- A per-scene `ADDED_TO_SCENE` hook sets `Text.setResolution(k)` [INFERRED, verify T06].
- Layout reads use `PHYSICS.VIEW_W/H`. Pointer reads use `worldX/worldY`.

### 3.5 HudScene contract
- **Launch:** the host launches it in `create()`, or calls `hud.reset(data)` if it is already active.
- **Lifecycle:** not stopped on `scene.restart` (no flicker). Stopped via `transitions.fadeToScene` when the host leaves; both cameras fade in sync.
- **API:** direct methods (no manager, per CLAUDE.md): `setLabel`, `setClock(ms, state)`, `showHint`, `showTitleCard`, `showDeathStamp`, `showResult`, `toast`, `blockerRects()`.
- **Integration:**
  - No `screen_view` (D-14).
  - Modals register with the back router (D-11).
  - `RENDER.HUD_SCENE = false` falls back to Layers + a second camera with `ignore()` (the D-13 fallback). That path would live in `utils/hudCamera.ts` and is only built if T05's input test fails.

### 3.6 Motion and accessibility resolution
- `utils/motion.ts` is the **only** place that reads `reducedMotionActive()`, `flashes` and `shake` for UI motion. It returns resolved specs (`{duration, ease, scaleFrom…}` or `null`).
- Scenes never branch on RM directly except for entity internals already written that way (Ball, Attractor, CosmicBackground), which are migrated in T17.
- `utils/shake.ts` is a pure function of (trauma, t, seed). The host applies it as a scroll offset.

---

## 4. Files / modules affected
All "Modify" paths were verified to exist on 2026-10-07.

### 4.1 Create
| Path | Task | Purpose |
|---|---|---|
| `src/utils/quality.ts` + `quality.test.ts` | T01 | Tiers, budgets, persisted watchdog |
| `src/utils/renderScale.ts` + `renderScale.test.ts` | T06 | k computation, camera setup, centred punch math |
| `src/scenes/HudScene.ts` | T05 | Parallel HUD/overlay scene |
| `src/ui/HintChip.ts` | T07 | Exo 2 wrapped hint chip |
| `src/utils/devGlStats.ts` | T03 | DEV-only draw-call counter (wraps `drawElements` / `drawArrays`) + perf overlay `?debug=perf` |
| `src/utils/sourceLint.test.ts` | T02 → T26 | Source scans: no `postFX.add*`, no `addBloom` / `addGlow` / `addVignette`, no `'Arial'`, no `cameras.main.shake(` outside `shake.ts`, no `fontSize` < 12, raw-hex allowlist that only shrinks |
| `scripts/audit/luminance_check.py` | T09 | Playwright (Python, `--disable-gpu --use-gl=swiftshader`): renderer snapshot (readPixels) luminance gates. `scripts/audit/` is a subdirectory, so the `.gitignore` rule `scripts/*.py` doesn't apply and it is committed |
| `scripts/audit/contrast_render.py` | T09 | As-rendered text-vs-background contrast for HUD, hint, result, settings |
| `scripts/audit/touch_targets.py` | T14 | Walks every scene's interactive list: hit rect ≥48×48 logical, gaps ≥8 px. Writes `scripts/audit/touch-baseline.json` |
| `scripts/audit/reduced_motion_audit.py` | T17 | RM on: camera offset/zoom invariants, frozen parallax, no flashes, brightness parity |
| `src/utils/contrast.ts` + `contrast.test.ts` | T10 | Pure WCAG luminance/ratio + CIEDE2000; asserts every token pair in the spec |
| `src/utils/motion.ts` + `motion.test.ts` | T17 | `MOTION` resolver (RM, flashes) |
| `src/utils/shake.ts` + `shake.test.ts` | T17 | Trauma model |
| `src/utils/haptics.ts` + `haptics.test.ts` | T22 | Event → pattern map; settings gate |
| `src/utils/scrollPhysics.ts` + `scrollPhysics.test.ts` | T19 | Drag threshold, velocity, decay, rubber band |
| `src/utils/pathLayout.ts` + `pathLayout.test.ts` | T20 | Level-node positions for 8–12 nodes |
| `src/ui/text.ts` | T11 | Type-scale factory (size, line height, large text, resolution k) |
| `src/ui/Segmented.ts`, `Chip.ts`, `Badge.ts`, `Card.ts` | T14 | Controls |
| `src/ui/Modal.ts` | T15 | One overlay grammar + back-router registration |
| `src/ui/Toast.ts` (+ pure queue core tested in `toastQueue.test.ts`) | T16 | Toast queue |
| `src/ui/ScrollView.ts` | T19 | Inertial scroll container |
| `src/ui/LevelNode.ts` | T20 | Level path node |
| `src/ui/Tabs.ts`, `src/ui/shop/PreviewStage.ts`, `ItemRow.ts`, `StickyActionBar.ts`, `BundleCard.ts` | T21 | Shop kit |

### 4.2 Modify
| Path | Task(s) | Change |
|---|---|---|
| `src/config/fx.config.ts` | T01–T04, T17 | Add `QUALITY`, `DEPTH`, `RENDER` flags, `GLOW`, `VIGNETTE_TEX`, `SHAKE`. Delete `BLOOM_*`, `BALL_GLOW_*`, `FPS_DOWNGRADE_*`, `VIGNETTE_*` postFX params, and `CELEB_*.bloomBoost` / `shakeIntensity` (→ trauma) |
| `src/config/theme.config.ts` | T07 (minimal), T10–T12, T26 | Tokens v2; `THEME` facade, removed in T26 |
| `src/config/physics.config.ts` | T04, T06 | `VIEW_W/H`, `COLOR_OBSTACLE_RIM #7A8BA3`, `COLOR_WALL_LINE`; retire `COLOR_HINT_TEXT`, `COLOR_STAR_EMPTY` → token |
| `src/config/splash.config.ts` | T17, T24 | `SCENE_FADE_MS` → `MOTION.scene`; fast-path timings; `MENU_FILL_SECONDARY 0x2a2f48` retired |
| `src/config/worldThemes.ts`, `src/config/worlds.ts` | T10 | Colours → `WORLD_TOKENS` (v2 accents); delete the unused `worlds.ts` `theme` field (coordinate with the D-05 world list) |
| `src/main.ts` | T01, T05, T06 | Tier + k at boot, game size 390k×844k, register `HudScene` |
| `src/utils/SettingsStore.ts` | T01, T22, T23, T24 | v2 fields (§5) |
| `src/utils/fx.ts`, `src/utils/fx.test.ts` | T01 | `shouldDowngradeFx` superseded by `quality.watchdog` |
| `src/utils/celebration.ts`, `celebration.test.ts` | T02, T17 | `bloomBoost` → `glowSwell`; shake → trauma |
| `src/utils/Crash.ts` | T01 | Custom keys `gfx_tier`, `render_scale`, `gfx_p50_ms`, `gfx_p95_ms` |
| `src/utils/transitions.ts` | T05, T17 | Companion-scene fade/stop; durations from `MOTION`; `VIEW` sizes |
| `src/utils/a11y.ts` | T17 | Unchanged API; `motion.ts` becomes its only UI caller |
| `src/utils/textFit.ts` | T11 | Floors re-derived (≥12 px) |
| `src/utils/AudioSynth.ts` | T17, T22 | `playTap`, `playFailHazard`, `playFailTimeout`, `playNearGoal` |
| `src/utils/ProgressStore.ts` | T20, T25 | `ceremonySeen`, `finaleSeen` (+ migration) |
| `src/utils/Leaderboard.ts` | T22 | Run result carries `assist` and is not submitted when true |
| `src/scenes/BootScene.ts` | T02, T24 | Generate the `vignette` texture; load the company logo lazily (fast path) |
| `src/scenes/GameScene.ts` | T02–T07, T17, T18, T22 | Delete `applyScenePostFX` / `watchdogFx` (`:294-319`); bake; glow; HUD → HudScene (`createHud`, `createCountdown`, `createParChip`, `createNav`, title cards, `showHint`, `showWinOverlay`, `deathFeedback`); shake/punch via helpers; toggle mode; speed |
| `src/scenes/EndlessScene.ts` | T03, T05, T15, T17, T18, T22 | Score/overlays → HudScene; pause button; `pill()` → Button variants; shake |
| `src/scenes/SettingsScene.ts` | T05, T23 | `bringToTop` over HudScene; Settings v2 sheet |
| `src/scenes/MainMenuScene.ts` | T08, T14, T16 | Trimmed alpha logo; labelled icons; GRAVITY RUN as a real secondary button; chest toast → Toast |
| `src/scenes/WorldMapScene.ts` | T19, T20 | ScrollView; nodes ≥48 hit; ceremony |
| `src/scenes/LevelSelectScene.ts` | T19, T20 | Grid → LevelNode path |
| `src/scenes/CosmeticsScene.ts` | T17, T19, T21 | Shop kit; delete `cameras.main.shake` (`:217/291/364`) |
| `src/scenes/AchievementsScene.ts`, `RunSelectScene.ts` | T12, T14, T19 | Card/ScrollView/tokens |
| `src/scenes/CompanySplashScene.ts`, `IntroSplashScene.ts` | T17, T24 | Fast path; remove the intro `cam.shake` (`:140`) under the shake model |
| `src/scenes/EndScene.ts` | T25 | Finale sequence |
| `src/entities/Ball.ts` | T02, T03 | Delete `postFX.addGlow` (`:60-70`); glow sprite; trail budget |
| `src/entities/Goal.ts`, `Attractor.ts`, `Portal.ts`, `Magnet.ts`, `Collectible.ts`, `Orb.ts` | T03 | Glow sprites; redraw only on state change; RM freeze at mean α |
| `src/entities/Hazard.ts` | T04, T22 | Static geometry cache; high-contrast dashes |
| `src/entities/Obstacle.ts`, `GravityZone.ts`, `MovingPlatform.ts`, `Gate.ts` | T04 | Static parts baked; obstacle rotated + rim |
| `src/entities/CosmicBackground.ts` | T03, T17 | Tier comets/parallax; fill oversized by `SHAKE.MAX_PX` |
| `src/ui/Button.ts`, `IconButton.ts`, `Toggle.ts`, `icons.ts`, `glass.ts` | T13–T14, T12 | Variants, 48 targets, icons, `drawSurface` |
| `scripts/optimize-logos.mjs`, `assets/images/gravity-flow-logo.png` | T08 | Alpha key-out + sparkle crop + trim |
| `.github/workflows/ci.yml` | T26 | Optional `audit` job (Python Playwright) once stable; Vitest gates are already in `npm test` |
| `CLAUDE.md`, `docs/device-playtest-checklist.md`, `docs/media/README.md`, `CHANGELOG.md` | T09, T26 | See §13 |

---

## 5. Data-model changes

### 5.1 `SettingsStore` (key `gravity-flow:settings`, schema v2; validated and mirrored per D-12)
| Field | Type | Default | Task | Validation / notes |
|---|---|---|---|---|
| `quality` | `'auto' \| 'low' \| 'mid' \| 'high'` | `'auto'` | T01 | Unknown → `'auto'` |
| `gfxDownstep` | `{ tier: 'low' \| 'mid'; appVersion: string; at: number } \| null` | `null` | T01 | Ignored when `appVersion` ≠ current (re-probe on update) |
| `shake` | `0 \| 50 \| 100` | `100` | T17 | Clamped to the set |
| `flashes` | `boolean` | `true` | T17 | |
| `textSize` | `'normal' \| 'large'` | `'normal'` | T11 | |
| `attractorMode` | `'hold' \| 'toggle'` | `'hold'` | T22 | |
| `gameSpeed` | `100 \| 85 \| 70` | `100` | T22 | |
| `highContrast` | `boolean` | `false` | T22 | |
| `seenIntro` | `boolean` | `false` | T24 | Migration: `true` if `seenTutorial` or any progress exists |
| `reduceMotion` | `MotionPref` (existing) | `'system'` | — | UI becomes Segmented (System/On/Off) |

### 5.2 `ProgressStore` (id-keyed per D-05; fields added after P2's v2 migration)
| Field | Type | Default / migration |
|---|---|---|
| `ceremonySeen` | `string[]` (world ids) | On first load: every world whose boss is already cleared, so existing players don't get 14 ceremonies at once |
| `finaleSeen` | `boolean` | `true` if the final level is already cleared |

### 5.3 Other data
- **Endless / Weekly run result:** `assist: boolean` (from `gameSpeed < 100`). Stored locally; never submitted to boards (D-17, P8).
- **Config tables** (data, not persisted): `QUALITY`, `DEPTH`, `GLOW`, `SHAKE`, `MOTION`, `WORLD_TOKENS` (§4.2).
- **Level data:** no schema change. Validator rule `hint.length ≤ 110` (P2 validators v2, or `src/config/levels/hints.test.ts` if P2 isn't merged).
- **Analytics:** no new events (taxonomy v2 is P6, D-14). Crashlytics custom keys only.

---

## 6. UI changes (per screen)
| Screen | P5-A | P5 system |
|---|---|---|
| Gameplay HUD | Moves to HudScene; nav pitch 52 → 56; E2-HUD 0.88; label chip floor 13.6 px | Fixed-width digit cells; boss label `text.primary` + crown (not hazard red) |
| Hint | Arial 17 unwrapped → HintChip (Exo 2 15/21, wrap 320, ≤3 lines, E2-HUD) | Large-text aware |
| Win / result | Rendered in HudScene (no shake or zoom on it) | D-08 ResultPanel choreography (§5.1 of the spec): NEXT / RETRY / LEVELS; honest reward button; toasts never between CTAs |
| Death | Overlay in HudScene | DeathStamp ≤600 ms, cause icon, distinct sounds |
| Endless | Score in HudScene | Pause button + PausePanel; RunOverPanel (RETRY primary, inert scrim, "Watch ad · Revive") |
| Main menu | Transparent logo | Labelled top icons; GRAVITY RUN as a secondary Button; one attention cue at a time; Toast for the chest |
| Star Map | — | ScrollView; node hit ≥48; v2 accents; world-complete ceremony; auto-centre |
| Level select | — | LevelNode zig-zag path (64 / 88 boss), current-node CTA, lock glyph, empty stars 3.93:1 |
| Shop (Cosmetics) | — | Tabs 48; PreviewStage try-on; ItemRow live minis; StickyActionBar; BundleCard; store prices; no camera shake |
| Achievements / RunSelect | — | Card + ScrollView + tokens |
| Settings | Over HudScene | Scrollable E3 sheet, 7 sections incl. Privacy (D-10) and About/version (D-20) |
| Splashes | — | Fast path ≤1.2 s for returning players; one skip tap |
| End | — | Finale: reunion vignette → stats → credits → Gravity Run / Replay a world |

---

## 7. Gameplay changes
Physics constants and the force formula are **untouched** (D-26), and so is level data (P4). Visual and input changes:

1. **Readability:** obstacle rim `#7A8BA3` (5.55:1; the fill alone is 2.12:1) and arena line `#7A8BA3`.
   - Obstacles are baked **rotated**. No shipped level sets an obstacle `angle` (grep: only `src/config/levels/_template.ts`), so the latent render bug is fixed with no visible level change.
2. **Glow:**
   - The ball/goal/attractor glow sprites replace shader glow at about the same perceived size.
   - Glow follows **interpolated** render positions (D-01) and is never tweened.
3. **Juice:**
   - Shake becomes the isotropic trauma model.
   - Punch values are unchanged (1.03–1.07).
   - Death punch 1.05 / 90 ms is kept, subject to RM.
   - These are feel changes and need owner sign-off.
4. **Toggle attractor mode (T22):**
   - Implemented in the **input latch** (D-01): the toggled `on` state is latched per step.
   - Replays and determinism are unaffected.
   - A tap that ends with <12 px movement and <250 ms removes the attractor.
5. **Game speed (T22):**
   - `FixedStepper.advance(frameMs × speed)`. The number of steps per wall second falls; every step is still `SIM_STEP_MS`, so trajectories are bit-identical per step.
   - Par, countdown and best time stay in sim time, so the wall-clock par is effectively rescaled by 1/speed.
6. **Boss / title card input:** while the card shows, the first tap skips it and is **consumed**; the next press arms the sim (D-02). This is an interface rule for P3.
7. **Low tier** reduces particles, trail, comets and glow quads (§4.7 of the spec).

---

## 8. Test strategy

### 8.1 Unit (Vitest, CI-blocking via `npm test`)
| Test file | Asserts |
|---|---|
| `quality.test.ts` | Start-tier table (`deviceMemory` 0.5/1/2 → Low, 3/4 → Mid, 6/8 + cores ≥6 → High, missing → Mid); watchdog p50/p95 thresholds over synthetic 3 s windows at 60/90/120/144 Hz; one-step-down only; no in-session upgrade; downstep ignored on a new `appVersion`; manual tier disables auto; `budgets()` per tier match the spec table |
| `renderScale.test.ts` | `kNeeded` for 1080/1440/720-px phones; tier caps; capture mode; centred-punch scroll math keeps the view centre fixed for p ∈ {1.03…1.07} |
| `contrast.test.ts` | Every `UI.text.*` ≥4.5 on E1/E2/E3/E4 and the E3 worst case; HUD tokens ≥4.5 over white beneath E2-HUD; non-text ≥3; ink-on-fill pairs (9.96 / 13.37 / 6.48 / 10.89); world rules WT-3/4/5 (ΔE2000 ≥12 to the trio, adjacent ≥15, numerals ≥4.5); the in-play atmosphere peak (WT-2) ≤0.035 |
| `sourceLint.test.ts` | Bans (§4.1); `fontSize` literals <12; `Arial`; `cameras.main.shake(`; `postFX`; raw-hex allowlist (shrinks to 0 by T26) |
| `typeScale.test.ts` (in `text.ts` tests) | All steps ≥12; large-text multipliers; `textFit` floors × sizes ≥12 |
| `shake.test.ts` | trauma² curve; linear decay 1.6/s; clamp 1; slider 0/0.5/1; RM → 0; isotropy (x/y RMS within 5%); determinism (same seed → same offsets) |
| `motion.test.ts` | Every `MOTION` class returns its RM equivalent; flashes-off variants; exits ≤70% of entries |
| `scrollPhysics.test.ts` | 8 px tap/drag threshold; least-squares velocity; `e^(−t/325)` decay; rubber band 0.5 + max 80; RM clamp |
| `pathLayout.test.ts` | 8–12 nodes inside the safe rect; centre spacing ≥72; boss ⌀88 last; no overlaps |
| `toastQueue.test.ts` | One visible; FIFO; max 3 pending with priority drop; never scheduled during result 0–1300 ms |
| `haptics.test.ts` | Each feedback event maps to a pattern; settings gate; every audio cue has a haptic or visual twin |
| `SettingsStore` tests (extend P0's validation tests) | v2 defaults; invalid enums → defaults; `seenIntro` migration |
| `celebration.test.ts` | `glowSwell` / trauma per tier; monotonic escalation |
| Game speed (in P1 stepper tests) | `advance(frameMs×speed)` → steps/sec scale; per-step state bit-identical to 100% |

### 8.2 Browser (Python Playwright, `--disable-gpu --use-gl=swiftshader`, committed in `scripts/audit/`)
| Script | Method | Gate |
|---|---|---|
| `luminance_check.py` | Load L45 (attractor held), L10 boss and W4 levels via the DEV `window.__game` handle; capture with `game.renderer.snapshot` (gl.readPixels) | Peak luminance ≥230; a 2 px goal/attractor line core ≥95% of its source channel max; +4 px halo ≥15% of core (physics brief Q6); camera `postFX` list length 0 |
| `contrast_render.py` | Map Text bounds → canvas px; text colour = brightest glyph cluster, background = median of the chip area outside glyphs | HUD label/timer/hint/result/settings text ≥4.5:1 as rendered, including with the ball under the chip |
| `touch_targets.py` | Iterate every scene's `input` list; hit area × world transform → logical px | ≥48×48 and ≥8 px gaps; results diffed against `touch-baseline.json`, which must be empty at T26 |
| `reduced_motion_audit.py` | Set `reduceMotion='on'` in localStorage before boot; run boot → menu → level win → death → Star Map → shop | Camera scroll offset 0 and zoom == k on every sampled frame; no tweens targeting cameras; star `tilePosition` constant for 60 frames; comets 0; ≤0 full-screen flashes; steady-state frame mean luminance RM-on vs RM-off within ±2% (D-13) |
| `boot_smoke` (existing pattern) | All scenes, including HudScene with both hosts | Zero console errors; 200× restart leak probe flat (scenes, textures, listeners) |

### 8.3 Device (HUMAN DEVICE TEST; rows added to `docs/device-playtest-checklist.md`)
**Reference devices:**
- **Low:** ≤2 GB RAM, 60 Hz.
- **Mid:** 4 GB, 120 Hz A-series.
- **High:** ≥6 GB.

**Procedure:**
1. Use the `?debug=perf` overlay (tier, k, p50/p95 frame ms, draw calls).
2. Run a 60 s scripted boss level at 60 and 120 Hz.
3. Run a 10-minute soak, recording battery % and thermal state.
4. Force-trigger the watchdog, kill the app, relaunch, and confirm it **starts at the lower tier**.
5. Check text sharpness at k = 1.5 / 2.
6. Check haptic feel, toggle-mode playability and game-speed feel.
7. Toggle the system "Remove animations" setting and confirm the `System` RM mode follows it.

---

## 9. Migration
| What | How | Player-visible |
|---|---|---|
| Settings v1 → v2 | Additive fields with defaults; D-12 validator fills invalid fields; `seenIntro` inferred | Existing players get Auto quality and the fast-path splash |
| Progress (`ceremonySeen`, `finaleSeen`) | Inferred from cleared bosses / final level | No ceremony flood |
| `THEME` → tokens v2 | `THEME` facade maps to `UI` / `COMP`; scenes migrate one at a time behind before/after screenshots; facade deleted in T26 | Gradual |
| World colours | `WORLD_TOKENS` replaces `worldThemes.ts` colours; `worlds.ts` `theme` deleted | Star Map colours for W1/3/4/8/11/12/13/14/15 change |
| Render | Default tier Mid → k 1.5 on capable devices | Sharper text, brighter play |
| HUD layout | Toolbar 172 → 176 px wide; label chip at `label` 17 | Minor |
| Store screenshots / video | Re-shot in step 14 after P5-A (raw captures are gitignored under `docs/media/raw/`) | New listing assets |

---

## 10. Rollback
- **Granularity:** each task lands as small logical commits. Rollback = `git revert` of that task's commits. No player data is destroyed by any task: settings and progress fields are additive, and older builds ignore unknown fields via `{...DEFAULTS, ...parsed}`.
- **Runtime flags** in `fx.config.ts` `RENDER` / `QUALITY`, with no rebuild of other systems needed:

  | Flag | `false` means |
  |---|---|
  | `RENDER.HUD_SCENE` | In-scene HUD (fallback: Layers + second camera) |
  | `RENDER.SCALE_ENABLED` | k = 1 for every tier |
  | `RENDER.BAKE_STATIC` | Per-entity Graphics as today, plus the rim |
  | `QUALITY.WATCHDOG_ENABLED` | No auto-downstep |

  Accessibility: `A11Y.GAME_SPEED_ENABLED` hides the row and forces 100.
- **Bloom removal has no flag.** It is a D-13 decision; the rollback is a revert.
- **World accents** are data. Reverting `WORLD_TOKENS` restores the old colours.

---

## 11. Performance
| Budget | Low | Mid | High |
|---|---|---|---|
| Render scale k | 1.0 | 1.5 | ≤2.0 |
| Camera / object postFX passes | 0 / 0 | 0 / 0 | 0 / 0 |
| Draw calls | ≤40 | ≤60 | ≤80 |
| Particles / trail / comets / glow quads | 20/8/0/24 | 40/16/1/40 | 50/24/2/60 |
| Frame time | p95 ≤33 ms | p95 ≤20 ms | p95 ≤20 ms |
| Overdraw (play, excl. bursts) | ≤1.5 MP | ≤1.5 MP × 2.25 | ≤1.5 MP × 4 |

**Expected savings** [INFERRED from the physics brief Q6; confirmed on device in T09]:
- **Today, per frame at k = 1:** about 47M texel fetches (bloom 14.5M + ball glow 32M + vignette) and about 13 full-frame passes.
- **After:**

  | k | Texel fetches |
  |---|---|
  | 1 | ≈0.9M |
  | 1.5 | ≈2.0M |
  | 2 | ≈3.5M |

**Memory:**
- Backbuffer: 1.32 / 2.96 / 5.27 MB.
- Baked RT: 1.12 / 2.53 / 4.49 MB.
- Vignette: +0.14 MB.
- Fast-path splash: −2.2 MB.
- JS heap must stay ≤ baseline + 5 MB (audit baseline ≈30 MB).

**Monitoring:**
- Crashlytics keys `gfx_tier`, `render_scale`, `gfx_p50_ms`, `gfx_p95_ms` feed the tier defaults.
- Regression gate: the T09/T26 device run must meet the table before the step closes.

---

## 12. Platform
| Platform | Notes |
|---|---|
| Android WebView ≥87 (D-11) | `navigator.deviceMemory` + `hardwareConcurrency` available (Chromium). Refresh 60/90/120/144 Hz: the watchdog uses frame **time** percentiles, not fps. `prefers-reduced-motion` should reflect system "Remove animations" [INFERRED → device test]. Edge-to-edge insets via CSS `env()` (D-11 SystemBars `insetsHandling:'css'`), used by HudScene through `safeAreaInsetsScaled`. Predictive Back → Modal stack (D-11). Haptics: `navigator.vibrate` + `VIBRATE` permission (D-11) |
| WebGL vs Canvas | Phaser `AUTO`. On a Canvas fallback, ADD glow sprites degrade gracefully, there are no postFX, and the tier is forced to Low |
| Web (primary dev target) | Hover states only under `(hover: hover)`; wheel on ScrollView; keyboard focus ring `info` 2 px; `?gfx=capture` and `?debug=perf` are DEV-only (`import.meta.env.DEV`) |
| iOS (D-29, P12) | Same code. `@capacitor/haptics` for the haptic map; Safari RM media query; re-run the touch/contrast audits |

---

## 13. Documentation
- `docs/design/UX-UI-MOTION.md`: kept as the spec of record. Each task that changes a value updates it in the same commit.
- `CLAUDE.md` architecture: HudScene in the scene flow; tokens v2 in `theme.config.ts`; `fx.config.ts` QUALITY/DEPTH/RENDER; the rule "no postFX, no `cam.shake`, text via `ui/text.ts`".
- `docs/STATUS.md` (from step 0): P5-A/P5 gate results; current tier defaults.
- `CHANGELOG.md`: player-visible changes (brightness, HUD, accessibility options, Star Map colours).
- `docs/device-playtest-checklist.md`: the P5 device rows (§8.3).
- `docs/media/README.md`: the 9:16 capture recipe (`?gfx=capture`, crop y-range, caption band 346 px) for step 14.
- This file: task status and completion evidence.

---

## 14. Validation criteria
| # | Criterion | Evidence | Class |
|---|---|---|---|
| V1 | No camera or object postFX anywhere | `sourceLint.test.ts` + `luminance_check.py` (camera postFX list = 0) | VERIFIED |
| V2 | Gameplay peak luminance ≥230; 2 px line core ≥95%; halo ≥15% | `luminance_check.py` | VERIFIED |
| V3 | HUD / hint / result text ≥4.5:1 as rendered | `contrast_render.py` | VERIFIED |
| V4 | Token contrast and world-colour rules (WT-1…5) | `contrast.test.ts` | VERIFIED |
| V5 | HUD does not move during shake or punch | Playwright: HUD chip pixel bounds identical across win frames | VERIFIED |
| V6 | No text <12 px; no Arial | `sourceLint.test.ts` + text-object scan in `touch_targets.py` | VERIFIED |
| V7 | All touch targets ≥48, gaps ≥8 | `touch_targets.py` (baseline empty) | VERIFIED |
| V8 | RM audit passes; brightness parity ±2% | `reduced_motion_audit.py` | VERIFIED |
| V9 | Watchdog downstep persists across restart | Unit (VERIFIED) + kill/relaunch on device | VERIFIED + HUMAN DEVICE TEST |
| V10 | p95 ≤20 ms on Mid; ≤33 ms on Low; draw calls within tier | `?debug=perf` on the reference devices | HUMAN DEVICE TEST |
| V11 | Battery/thermal no worse than the pre-P5-A build (10-min soak) | Device soak | HUMAN DEVICE TEST |
| V12 | Texel-fetch reduction ≈98% at k = 1 | Derived from the Q6 cost model | INFERRED |
| V13 | HudScene input consumes HUD taps (no attractor spawn) | Playwright tap test | VERIFIED |
| V14 | Text crisp at k 1.5 / 2 | Device visual check | HUMAN DEVICE TEST |
| V15 | Hints ≤3 lines and within 342 px for every level | Playwright over all levels with `hint` | VERIFIED |
| V16 | Logo has alpha; no navy square or sparkle | Script asserts on PNG + menu capture | VERIFIED |
| V17 | Result screen per D-08 (NEXT live at 1300, tap fast-forwards, offer ≤ primary size and after it) | Playwright timeline probe | VERIFIED |
| V18 | Toggle mode and game speed keep replay determinism | Stepper/replay tests (P1 harness) | VERIFIED |
| V19 | `System` RM follows the Android "Remove animations" setting | Device | HUMAN DEVICE TEST |
| V20 | Splash fast path ≤1.2 s for returning players | Playwright timing (VERIFIED) + device cold start | VERIFIED + HUMAN DEVICE TEST |
| V21 | Gates `tsc`, `vitest`, `build`, `assembleDebug`, boot smoke, `npm audit` (MASTER §6) | Command output | VERIFIED |

---

## 15. Exact completion definition
**P5-A (step 12) is complete when all of the following hold:**
1. T01–T09 are merged.
2. V1, V2, V3, V5, V9 (unit part), V13, V15, V16 and V21 are VERIFIED with command output recorded in `docs/STATUS.md`.
3. V10, V11 and V14 have been run on at least the Mid and Low reference devices and logged in the device checklist.
4. The owner has signed off the new look from before/after captures of L2, L45, a W4 level and the L10 boss.
5. `FX.BLOOM_*` and `BALL_GLOW_*` no longer exist.
6. Step 13 can start on the new render.

**P5 system (step 16) is complete when all of the following hold:**
1. T10–T26 are merged.
2. Every MASTER P5 success metric (§2.4) is met with its evidence class.
3. `touch-baseline.json` is empty, the raw-hex allowlist is empty and the `THEME` facade is deleted.
4. Every scene uses `ui/` components and `ui/text.ts`.
5. Settings v2 ships all seven sections, including D-10 privacy rows.
6. The RM audit passes on every flow.
7. The spec doc matches the code: changed values are updated.
8. P7 (step 18) can build the shop on `ui/shop/*` without new primitives.

**The phase is complete** when both of the above hold and `docs/STATUS.md`, `CHANGELOG.md` and `CLAUDE.md` reflect it.

---

## 16. Task breakdown

### 16.1 Slice P5-A — execution step 12 (needs M0)
| ID | Goal | Files | Tests | Done when |
|---|---|---|---|---|
| **P05-T01** | Quality tiers + persisted watchdog | C `src/utils/quality.ts`, `quality.test.ts`. M `fx.config.ts` (`QUALITY`), `SettingsStore.ts` (`quality`, `gfxDownstep`), `fx.ts` / `fx.test.ts`, `Crash.ts`, `main.ts` | `quality.test.ts` (§8.1) | Unit green; tier and budgets readable at boot; forced downstep survives reload in the browser |
| **P05-T02** | Remove camera bloom + ball postFX glow; vignette as a pre-rendered image | M `GameScene.ts` (delete `:291-319`, celebration bloom `:1120-1127`), `Ball.ts` (`:60-70`), `fx.config.ts`, `celebration.ts` / `.test.ts`, `BootScene.ts` (`vignette` texture). C `src/utils/sourceLint.test.ts` | `sourceLint` (no postFX), `celebration.test.ts`, `luminance_check.py` first run | Zero postFX in `src/`; L45 peak ≥230; win celebration swell visible without bloom |
| **P05-T03** | Additive glow sprites, depth bands, tier budgets, perf overlay | M `Ball.ts`, `Goal.ts`, `Attractor.ts`, `Portal.ts`, `Magnet.ts`, `Collectible.ts`, `Orb.ts`, `CosmicBackground.ts`, `GameScene.ts` (`emitGoalBurst` → `quality.particles`), `EndlessScene.ts`, `fx.config.ts` (`DEPTH`, `GLOW`). C `src/utils/devGlStats.ts` | Unit: particle clamp, glow-budget priority, RM freeze-at-mean helper | Draw calls ≤ tier budget on L45 / L10 / L150 in `?debug=perf`; glows positioned from interpolated state |
| **P05-T04** | Bake static geometry once per level | M `Obstacle.ts` (rotation + rim), `GravityZone.ts` (static frame vs animated chevrons), `MovingPlatform.ts` (track), `Portal.ts` (link), `Gate.ts` (frame), `Hazard.ts` (static cache), `GameScene.ts` (`createWorldBounds` / `createFromConfig`), `physics.config.ts` (`COLOR_OBSTACLE_RIM`, `COLOR_WALL_LINE`) | Playwright: static geometry pixel positions vs pre-bake within 1 px on 15 boss levels; obstacle-edge contrast ≥3:1; all levels boot | One RT per level; no per-frame redraw of static parts; `RENDER.BAKE_STATIC` flag works both ways |
| **P05-T05** | HudScene (HUD and overlays off the world camera) | C `src/scenes/HudScene.ts`. M `main.ts`, `GameScene.ts` (HUD, nav, title cards, hint, win overlay, death feedback), `EndlessScene.ts` (score, run-over), `transitions.ts` (companion fade/stop), `SettingsScene.ts` (`bringToTop`), `fx.config.ts` (`RENDER.HUD_SCENE`) | Playwright: V5 (HUD static during shake/punch), V13 (HUD tap doesn't spawn the attractor), 200× restart leak probe, boot smoke; `contrast_render.py` HUD ≥4.5 | HUD and overlays render from HudScene in both hosts; restart doesn't flicker; Settings opens above it; no `screen_view` from HudScene |
| **P05-T06** | Render scale k + text sharpness + capture mode | C `src/utils/renderScale.ts` + test. M `main.ts`, `physics.config.ts` (`VIEW_W/H`), the 12 scenes plus `CosmicBackground.ts` and `transitions.ts` that read `scale.width/height` (53 reads → `VIEW`), the pointer reads in Achievements / Cosmetics / Game / LevelSelect / WorldMap (18 → `worldX/Y`), `HudScene.ts`; per-scene `ADDED_TO_SCENE` text-resolution hook | `renderScale.test.ts`; Playwright at k 1 / 1.5 / 2: layout bounds identical in logical px, hit tests correct, scroll-factor-0 objects placed correctly | Mid/High render at 1.5 / ≤2 with crisp text; `RENDER.SCALE_ENABLED=false` restores k = 1; `?gfx=capture` produces a 1080-wide frame |
| **P05-T07** | Hint chip (Exo 2, wrapped) | C `src/ui/HintChip.ts`. M `GameScene.ts` `showHint` (or P3 `HintSystem` if merged), `theme.config.ts` (`SURFACE_HUD_ALPHA 0.88`, `body` token), `physics.config.ts` (retire `COLOR_HINT_TEXT`); hint-length rule (P2 validator or `src/config/levels/hints.test.ts`) | V15 Playwright over every level with a hint; contrast ≥4.5 as rendered; length rule ≤110 | No Arial in `src/`; every hint ≤3 lines inside 342 px; dismiss on first touch / 5 s |
| **P05-T08** | Transparent logo re-export | M `scripts/optimize-logos.mjs` (`alphaKey` navy (1,7,36) with feathering, sparkle-region crop, trim + 8 px, RGBA), `assets/images/gravity-flow-logo.png`, `MainMenuScene.ts` / `IntroSplashScene.ts` (scale for the trimmed bounds) | Script self-check: alpha channel present, corners α = 0, sparkle bbox α = 0; menu capture has no navy block around the logo | V16 VERIFIED; owner visual OK |
| **P05-T09** | P5-A verification and sign-off | C `scripts/audit/luminance_check.py`, `scripts/audit/contrast_render.py`. M `docs/device-playtest-checklist.md`, `CLAUDE.md`, `CHANGELOG.md`, `docs/STATUS.md` | All §8.1 P5-A units; V1–V3, V5, V13, V15, V16, V21; device V10, V11, V14 | P5-A completion definition (§15) met |

### 16.2 P5 system — execution step 16 (needs M1; T18 also needs P3 step 10)
| ID | Goal | Files | Tests | Done when |
|---|---|---|---|---|
| **P05-T10** | Tokens v2 (`PRIM` / `UI` / `COMP` / `MOTION` / `WORLD_TOKENS`) + measured gates | M `theme.config.ts`, `worldThemes.ts`, `worlds.ts` (drop `theme`), `CosmicBackground.ts`, `WorldMapScene.ts`, `LevelSelectScene.ts`, `GameScene.ts` (title card). C `src/utils/contrast.ts` + test | `contrast.test.ts` (all spec numbers), `sourceLint` hex allowlist | Every spec value exists as a token; WT-1 lint passes; the v2 world accents render |
| **P05-T11** | Text factory, 6-step type scale, Large text | C `src/ui/text.ts`. M all scenes' `add.text`, `textFit.ts` floors, `theme.config.ts` (`HUD_LABEL_MIN_SCALE` re-derived) | `typeScale` tests; `sourceLint` `fontSize` <12 = 0; Playwright: Large text reflows with no overlap or clipping on every scene | 18 sizes → 6; no sub-12 text; Orbitron caps-only |
| **P05-T12** | Surfaces, spacing, radii | M `ui/glass.ts` (`drawSurface` E0–E4, HUD 0.88, modal 0.96), every scene's literals per the spec's mapping table | Contrast as rendered on Settings and Result (E3 0.96); screenshot diff review | No off-grid spacing literals in `ui/` and the migrated scenes |
| **P05-T13** | Icon set additions + glyph replacement | M `src/ui/icons.ts` (≈26 new + 2 redraws); scenes using `✦ ◆ ▶ ★ ▾ ← ▲` | Unit: every `IconName` draws within its box (bounds probe); `sourceLint` bans structural glyphs in labels | No font glyph used as a structural icon |
| **P05-T14** | Controls: Button variants (primary / secondary / tertiary / destructive / reward / purchase + disabled), IconButton 48 + micro-label, Toggle, Segmented, Chip, Badge, Card; MainMenu migration | M `ui/Button.ts`, `IconButton.ts`, `Toggle.ts`, `MainMenuScene.ts`, `EndlessScene.ts` (`pill` removed), `GameScene.ts` offer pills. C `Segmented.ts`, `Chip.ts`, `Badge.ts`, `Card.ts`, `scripts/audit/touch_targets.py` | `touch_targets.py` baseline created then shrinking; contrast on variants; reward label must match `/^Watch ad · /` (unit) | Every interactive control from the kit; Reward/Purchase per D-08/D-09/D-24 |
| **P05-T15** | Modal + PausePanel + Endless pause + back router | C `src/ui/Modal.ts`. M P0's pause overlay → `ui/PausePanel.ts`, `SettingsScene.ts`, `EndlessScene.ts` (pause IconButton), `main.ts` back router registration | Playwright: scrim tap closes only dismissable modals; Back closes / resumes per D-11; Endless pause freezes `simMs` | One overlay grammar everywhere; no stray-tap exits |
| **P05-T16** | Toast queue | C `src/ui/Toast.ts` (+ `toastQueue.test.ts`). M `GameScene.ts` toasts (`:1439-1497`), `MainMenuScene.ts` chest toast | `toastQueue.test.ts`; Playwright: no toast intersects result CTAs | All toasts go through the queue |
| **P05-T17** | Motion module, trauma shake, camera rules, tap sound, RM audit | C `src/utils/motion.ts`, `src/utils/shake.ts` (+ tests), `scripts/audit/reduced_motion_audit.py`. M `GameScene.ts` (`:1129-1130`, `:1634-1636`), `EndlessScene.ts:356`, `IntroSplashScene.ts:140`, `CosmeticsScene.ts` (delete shakes), `transitions.ts`, `splash.config.ts`, `CosmicBackground.ts`, `Ball.ts`, `Attractor.ts`, `celebration.ts`, `AudioSynth.ts` (`playTap`), `SettingsStore.ts` (`shake`, `flashes`) | `shake.test.ts`, `motion.test.ts`, `sourceLint` (no `cam.shake`), V8 | Zero direct `cameras.main.shake`; ≤1 idle loop per screen; RM audit green |
| **P05-T18** | ResultPanel / RunOverPanel / DeathStamp restyle + choreography | M P3's `src/ui/ResultPanel.ts`, `src/ui/DeathStamp.ts`, `EndlessScene.ts` run-over | V17 timeline probe; offer appears ≥1500 ms, only when an ad is loaded, ≤240×48; DeathStamp → control ≤600 ms | D-08 fully met in both modes |
| **P05-T19** | ScrollView + migration of 4 scenes | C `src/ui/ScrollView.ts`, `src/utils/scrollPhysics.ts` (+ test). M `LevelSelectScene.ts`, `WorldMapScene.ts`, `CosmeticsScene.ts`, `AchievementsScene.ts` | `scrollPhysics.test.ts`; Playwright fling: momentum, rubber band, tap-vs-drag | One scroll implementation in the codebase |
| **P05-T20** | LevelNode path map, auto-centre, world-complete ceremony | C `src/ui/LevelNode.ts`, `src/utils/pathLayout.ts` (+ test). M `LevelSelectScene.ts`, `WorldMapScene.ts`, `ProgressStore.ts` (`ceremonySeen` + migration) | `pathLayout.test.ts`; Playwright: current node centred; ceremony plays once and skip jumps to the end state; RM variant | Path fills the screen; boss/current/locked/skipped states distinct without colour |
| **P05-T21** | Shop components | C `src/ui/Tabs.ts`, `src/ui/shop/{PreviewStage,ItemRow,StickyActionBar,BundleCard}.ts`. M `CosmeticsScene.ts` (`:92-364`) | Playwright: try-on doesn't change the equipped item; can't-afford path shows reason + route; prices only from the IAP layer (unit: no `$`/currency literals in `ui/shop`) | Shop per spec; currency-agnostic (D-23-ready) |
| **P05-T22** | Accessibility options | M input latch (P1 `src/sim` input), `FixedStepper` speed scale, `GameScene.ts` / `EndlessScene.ts`, `Hazard.ts` / `Magnet.ts` / `Obstacle.ts` (high contrast), `AudioSynth.ts` (fail sounds, near-goal), `SettingsStore.ts`, `Leaderboard.ts` (`assist`). C `src/utils/haptics.ts` (+ test) | V18; `haptics.test.ts`; Playwright: toggle mode place/move/remove; speed 70% → sim clock at 0.7× wall; high-contrast pixel check (hazard outline present) | All seven options functional and persisted |
| **P05-T23** | Settings v2 | M `SettingsScene.ts` (scrollable E3 sheet, 7 sections, D-10 privacy rows, D-20 version string), `SettingsStore.ts` | Playwright: every row reachable, ≥48 targets, Back closes; privacy-choices row visible only when UMP is REQUIRED (mocked) | Settings matches spec §2.11 |
| **P05-T24** | Splash fast path | M `CompanySplashScene.ts`, `IntroSplashScene.ts`, `BootScene.ts` (lazy company logo), `splash.config.ts`, `SettingsStore.ts` (`seenIntro`) | Playwright timing: first launch full, returning ≤1.2 s, one tap skips both; never blocks the D-10 consent flow | V20 |
| **P05-T25** | EndScene finale sequence | M `EndScene.ts`, `ProgressStore.ts` (`finaleSeen`) | Playwright: vignette skippable, stats values match the stores, CTAs route to Gravity Run / Star Map; RM variant | No "Play Again → L1"; finale per spec §5.6 |
| **P05-T26** | P5 system verification and sign-off | M `theme.config.ts` (delete `THEME` facade), `.github/workflows/ci.yml` (optional audit job), `CLAUDE.md`, `docs/STATUS.md`, `CHANGELOG.md`, `docs/media/README.md`, `docs/device-playtest-checklist.md`, `docs/design/UX-UI-MOTION.md` | Full §8 suite; device run V9–V11, V14, V19, V20 | P5 system completion definition (§15) met |
