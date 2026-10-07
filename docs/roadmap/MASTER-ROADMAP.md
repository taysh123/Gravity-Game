# Master Product Roadmap

> **Status:** plan of record from 2026-10-07 (baseline `master @ d3c6aab`).
>
> **How the planning docs fit together:**
> - Decisions: [`DECISIONS.md`](DECISIONS.md)
> - Order of work: [`EXECUTION-ORDER.md`](EXECUTION-ORDER.md)
> - Per-phase implementation plans: [`phases/`](phases/)
> - Ranking: [`FEATURE-MATRIX.md`](FEATURE-MATRIX.md)
> - Metrics: [`SUCCESS-METRICS.md`](SUCCESS-METRICS.md)
> - Risks: [`RISK-REGISTER.md`](RISK-REGISTER.md)
> - Evidence: [`../research/RESEARCH-SUMMARY.md`](../research/RESEARCH-SUMMARY.md) and the baseline audit [`../audit/2026-10-07/STATE-AUDIT.md`](../audit/2026-10-07/STATE-AUDIT.md)
>
> The game's working title stays "Gravity Flow" until the naming decision (D-19).

## 1. North star

We optimise for:
- more players **understanding the game instantly**
- more players **enjoying the core pull**
- more players **returning tomorrow**
- more players **mastering levels**
- more players **sharing**
- more players **choosing** optional ads and purchases

All of it on an architecture that can keep growing for years. We do **not** optimise for feature count or level count.

**The product thesis:** *"You don't move the star — you are gravity."*
- A one-touch, analog, skill-based physics puzzler with a premium cosmic identity.
- Short sessions (3–8 min).
- Fair, honest, cosmetic-only monetization.

**What blocks that today** (from the audit):
1. Trust: purchases, ads, consent, platform behaviour and determinism are broken.
2. Challenge: levels play themselves, wall-hug lanes, par is meaningless, copies.
3. Loop friction: no Retry, auto-advance, cutscenes replay, no relief.
4. Presentation: the render is dim, and so are the store assets.
5. Silence: no return channel and no online anything.

The roadmap fixes them **in that order**, because each depends on the one before:
- Content can't be tuned until physics is deterministic.
- Par can't be set until the loop's clock rules are final.
- Store creative can't be shot until the render is fixed.
- Retention can't be measured until consent-safe telemetry exists.

## 2. Prioritization framework
| Class | Meaning | Rule |
|---|---|---|
| **P0** | Correctness, security, compliance, launch blockers | Done first; nothing ships with an open P0 |
| **P1** | Foundational player value: physics, loop, level quality, render, durability | Done before growth features |
| **P2** | Retention, monetization, growth improvements | Built on P1 foundations; tuned by data |
| **P3** | Experiments and optional future systems | Only when metrics justify them |

**Ranking within a class.** Score = (Player value + Retention + Monetization + Virality, each 1–5) × Confidence (0.5–1.0) ÷ Effort (1–5), with a Risk penalty. The scoring is in [`FEATURE-MATRIX.md`](FEATURE-MATRIX.md).

**Tie-breaker:** the item that unblocks the most downstream items wins. Excitement is never a criterion.

## 3. Milestones
| Milestone | Contents | What it unlocks | Owner gate |
|---|---|---|---|
| **M0 — Truthful Build** | P0 + P1 | Internal-track upload (versionCode ≥ 1000001); owner device validation of purchases (license testers), ads, consent, back/pause, haptics, 30/60/120 Hz parity | Owner: AdMob/RC/Play product setup; device smoke |
| **M1 — Closed Beta** | M0 + P2 (bot v1 gates) + P3 + P4-α (first hour: Worlds 1–3) + P5-A (render/HUD/hint/logo) | Closed test (12 testers × 14 days if the app's dashboard requires it) with real telemetry, under the working title (A-14) | Owner: tester recruitment; name choice + TM knockout can run in parallel |
| **M2 — Launch Candidate** | M1 + P4 (full campaign) + P5 + P6 core (incl. In-App Review) + P7 core + P11 store/brand + **rename applied (D-19/A-14)** | Production staged rollout | Owner: production access, final name, store assets sign-off |
| **M3 — Live 1.x** | P8, P9, P10, P12 optimisation; iOS track | Growth and live ops by data | Owner: data review cadence |

## 4. Phases

> Phase numbers group the work by domain. **Execution interleaves phases by dependency** (see [`EXECUTION-ORDER.md`](EXECUTION-ORDER.md)).
>
> Changes from the suggested 12-phase list:
> - The **core loop (P3) comes before campaign redesign (P4)**. Par, star rules, the armed-clock semantics (D-02) and fail relief (D-07) define what "difficulty" means. Re-authoring 150 levels before they're fixed would mean tuning twice.
> - **Monetization bugs are in P0.** They are correctness defects; only the monetization *design* lives in P7.
> - **Render correctness (P5-A) is pulled early.** It's cheap, independent of the rest of P5, and required for honest playtests and store assets.

Difficulty scale: L / M / H / XH.

### P0 — Foundation & launch-blocker correctness
- **Objective:** a correct, compliant, honest, maintainable baseline with a single source of truth for state.
- **Player outcome:**
  - Purchases work and restore.
  - Ads never cover live play.
  - Consent is respected, Back and pause behave correctly, and haptics work.
  - Progress survives reinstall or backup, and the game never freezes on an error.
- **Business outcome:**
  - The app can earn and can pass Play/AdMob review.
  - Telemetry is lawful and correct.
  - Docs can be trusted again.
- **Systems affected:** docs/SSOT, repo hygiene, dependencies (Capacitor 8.5.2 security), IAP (`IAP.ts`, `native/revenueCat.ts`), Ads (`Ads.ts`, `native/admob.ts`, `interstitial.ts`), consent (UMP + Firebase consent mode), lifecycle (`main.ts`, `@capacitor/app`, `AudioSynth`), manifest/config, persistence (`*Store.ts` + Preferences mirror), error boundary (`Crash.ts`), analytics hygiene, store copy honesty, versioning.
- **Dependencies:** none (first phase).
- **Difficulty:** engineering M · design L · QA **H** (device-only behaviours).
- **Risk:** medium. Native behaviour can only be fully proven on a device; mitigated by unit-testing pure logic and a device checklist.
- **Expected upside:** turns a non-shippable RC into a shippable, monetizable build.
- **Success metrics:**
  - 0 open P0s
  - `npm audit --omit=dev` shows 0 critical
  - every purchase/restore/pending/refund row of the license-tester matrix passes (device)
  - no interstitial ever shown with `simMs` running
  - crash-free sessions ≥ 99.5% on internal
- **Must NOT be done yet:** gameplay/content changes, visual redesign, economy redesign, new features, renaming.
- **Plan:** [`phases/P00-foundation.md`](phases/P00-foundation.md)

### P1 — Core physics determinism
- **Objective:** identical gameplay at 30/60/90/120/144 Hz, plus deterministic restarts and replays (D-01–D-03).
- **Player outcome:** the pull feels the same on every phone; timers are fair; pausing, backgrounding or watching an ad never costs a star or a life.
- **Business outcome:** difficulty tuning, par, leaderboards and the QA bot become meaningful.
- **Systems affected:**
  - New `src/sim/` (forces, step hooks, sim clock, kinematics); new `src/sim/frameHarness` test.
  - `GameScene`/`EndlessScene` update loops; `Hazard`/`MovingPlatform`/`Goal` motion.
  - Timers (countdown, par chip, best time); ghost recorder.
- **Dependencies:** P0 lifecycle pause hooks.
- **Difficulty:** engineering **H** · design L · QA M (automated harness).
- **Risk:** medium-high. It touches every level's feel; mitigated by the multi-rate harness, before/after trajectory snapshots, and keeping constants unchanged.
- **Expected upside:** removes the largest hidden correctness bug; unblocks P2–P4 and P8 fairness.
- **Success metrics:**
  - Trajectory divergence across 30–144 Hz ≤ 1 px at t = 2 s for the fixed scenarios.
  - Replay determinism 100% (same input log → same outcome).
  - All timers on sim time; zero wall-clock reads in gameplay code (lint rule).
- **Must NOT be done yet:** par re-tuning, level edits, zone retune (D-04 waits for P2's fight test).
- **Plan:** [`phases/P01-physics.md`](phases/P01-physics.md)

### P2 — Level engine & level QA system
- **Objective:** a scalable content system: level data model v2 (D-05), strong static validators, a headless bot (D-06), and a machine-readable quality report, with CI gates.
- **Player outcome:** indirect but decisive. Every shipped level has to prove it is solvable, not self-solving, not bypassable, fair and distinct.
- **Business outcome:** content can scale to hundreds of levels without quality collapse; human playtest time goes only to flagged levels.
- **Systems affected:**
  - `src/types` (LevelConfig v2) and `src/config/levels/*` (ids, metadata).
  - `worlds.ts` (explicit level lists), with ProgressStore/GhostStore migration to ids.
  - New `scripts/levelsim/`, `src/sim/validate/` and CI.
- **Dependencies:** P1 (`src/sim/` + deterministic stepping).
- **Difficulty:** engineering **H** · design M · QA M.
- **Risk:** medium. Bot cost and false positives; mitigated by tiered agents, a "designer quick-check" (< 30 s) and human triage.
- **Expected upside:** **highest long-term leverage in the plan**; it's the quality engine for P4, P6 (dailies) and P8 (chunks).
- **Success metrics:**
  - 100% of levels have id/idea/role.
  - The report covers 150/150 levels.
  - Agents A0–A3 run in CI under 3 minutes.
  - Nightly A4–A6 + ablation complete.
  - Known audit defects reproduced by the bot: L11/L12 self-solve, L40 wall-hug, L60 decoy chain, L74 exit-in-hazard.
- **Must NOT be done yet:** mass level rewrites (that's P4); new mechanics.
- **Plans:** [`phases/P02-level-engine-qa.md`](phases/P02-level-engine-qa.md), [`../architecture/LEVEL-ENGINE.md`](../architecture/LEVEL-ENGINE.md), [`../architecture/LEVEL-QA-SIMULATION.md`](../architecture/LEVEL-QA-SIMULATION.md)

### P3 — Core "one more try" loop
- **Objective:** maximise clarity, agency, mastery, failure readability, reward and retry speed (D-02, D-07, D-08).
- **Player outcome:**
  - NEXT/RETRY with no auto-advance.
  - Instant, cause-stamped retries with no repeated cutscenes.
  - The clock starts on first touch.
  - Hints that teach without spoiling, and a relief ladder that keeps them moving.
  - Missed-star feedback that invites mastery.
- **Business outcome:** higher attempts per session, completion and D1. Interstitials move to a policy-safe placement (after NEXT).
- **Systems affected:**
  - `GameScene` (result/death/title-card flows): split into `ResultPanel`, `DeathStamp`, `HintSystem`, `ReliefLadder` modules.
  - `ProgressStore` (attempt counts, assisted flag, open frontier); `scoring.ts` (assisted ⇒ no par star).
  - `onboarding.ts`; hint data (question-style rewrite).
- **Dependencies:** P1 (armed sim clock), P2 (bot route for "Show me" ghosts).
- **Difficulty:** engineering M · design **H** · QA M.
- **Risk:** medium. The relief ladder could hollow out challenge; it's opt-in and par-star-excluded.
- **Expected upside:** high. This is the core loop the existing mastery systems were waiting for.
- **Success metrics:**
  - Death → control ≤ 600 ms.
  - Retry from result ≤ 1 tap.
  - Title cards on retry = 0.
  - FASR (first-attempt success rate) and APS (attempts per success) per level measurable.
  - Relief usage < 15% of attempts in W1–4 (telemetry, M1+).
- **Must NOT be done yet:** campaign-wide retuning (P4); economy changes (P7).
- **Plan:** [`phases/P03-core-loop.md`](phases/P03-core-loop.md)

### P4 — Campaign redesign & content quality
- **Objective:** a campaign that teaches → experiments → develops → twists → combines → masters, with a distinct identity for every world and a back half that feels different from the front.
- **Player outcome:** a real difficulty curve (sawtooth), no self-solving or bypassed levels, meaningful par and gems, bosses that are climaxes, and a finale that pays off "bring the star home".
- **Business outcome:** reviews, D7/D30, word of mouth; "plays itself" stops being the first impression.
- **Systems affected:** all level data; `worlds.ts`/`worldThemes.ts`; zone strength constant (D-04); 2–4 cheap mechanic variants (moving wells, polarity flip, anti-gravity field, limited presses); the `Obstacle` angle render fix; boss phase support.
- **Dependencies:** P2 (bot gates and metrics), P3 (par/relief semantics).
- **Difficulty:** engineering M · design **XH** · QA **H** (bot + human).
- **Risk:** high. It's the largest content effort. Mitigated by doing **P4-α (Worlds 1–3)** first for M1, then data-informed waves.
- **Expected upside:** very high. The campaign is the product.
- **Success metrics:**
  - 0 levels fail CI bot gates.
  - Duplicate score < 0.85 for every level pair (excluding labelled remixes).
  - Bot-derived par puts the 3★ rate at 25–40% (refit with human data).
  - Boss ≥ the world's hardest non-boss level.
  - FASR targets per world slot met in closed test.
- **Must NOT be done yet:** increasing the level count; new worlds; Expert packs.
- **Plans:** [`phases/P04-campaign.md`](phases/P04-campaign.md), [`../design/GAMEPLAY-DESIGN.md`](../design/GAMEPLAY-DESIGN.md)

### P5 — UX/UI, visual & motion system
- **Objective:**
  - A reusable design language (tokens v2, component kit, motion vocabulary).
  - A bright, readable render that works on low-end Android.
  - Accessibility options.
- **Player outcome:** looks premium in motion; clear hierarchy; consistent buttons and overlays; smooth scrolling; a satisfying shop; a finale ceremony; options for motion, text size and toggle-hold.
- **Business outcome:** store conversion, session length, shop conversion.
- **Systems affected:**
  - Rendering: `theme.config.ts` (tokens v2), new `utils/quality.ts`, a parallel `HudScene` (D-13; a second camera is only the fallback), `utils/motion.ts`, `utils/shake.ts`.
  - UI kit: `ui/*` (Button variants, Modal, ResultPanel, Toast, ScrollView, LevelNode, Shop components); Settings v2.
  - Screens and assets: splash fast path, EndScene finale, logo/icon assets.
- **Dependencies:** none for **P5-A** (render/HUD/hint/logo, scheduled early); the rest after P3 (ResultPanel) and alongside P4.
- **Difficulty:** engineering M · design **H** · QA M (device perf).
- **Risk:** medium. GPU cost on low-end devices; mitigated by quality tiers and a persisted watchdog.
- **Expected upside:** high for conversion and perceived quality.
- **Success metrics:**
  - Gameplay peak luminance ≥ 230 in captures.
  - HUD text contrast ≥ 4.5:1 as rendered.
  - 0 text under 12 px.
  - 0 touch targets under 48 px.
  - p95 frame time ≤ 20 ms on the Mid tier reference device.
  - Reduced-motion audit passes.
- **Must NOT be done yet:** illustrated art pipeline, 3D, Phaser 4.
- **Plans:** [`phases/P05-ux-visual.md`](phases/P05-ux-visual.md), [`../design/UX-UI-MOTION.md`](../design/UX-UI-MOTION.md)

### P6 — Retention & meta progression
- **Objective:** one coherent return loop (daily habit, weekly goal, mastery collection) without notification spam or dark patterns.
- **Player outcome:**
  - A Daily worth sharing.
  - Visible streaks and calendar.
  - Missions that send players across modes.
  - World and boss mastery rewards.
  - Post-campaign content (Remix, Boss Rush, Time Attack).
  - Gentle, opt-in reminders.
- **Business outcome:** D1/D7/D30, sessions/DAU, ad inventory; measurable through analytics v2.
- **Systems affected:**
  - Daily (pipeline, dated schedule, share card): `daily.ts`/`DailyStore`.
  - Login calendar (pause, not reset); missions (new); achievements v2 (+PGS mapping later).
  - Collections; post-game modes; local notifications; Remote Config; analytics taxonomy v2.
- **Dependencies:** P0 (consent), P2 (daily pipeline), P3/P4 (stable campaign), P5 components.
- **Difficulty:** engineering M · design H · QA M.
- **Risk:** medium. Regulation (EU DFA) and spam perception; mitigated by D-15/D-18.
- **Expected upside:** high for D7/D30.
- **Success metrics:**
  - D1 ≥ 30%, D7 ≥ 8%, D30 ≥ 3% (re-baselined to published bands, A-18; stretch targets in [`SUCCESS-METRICS.md`](SUCCESS-METRICS.md)).
  - Daily participation ≥ 25% of DAU.
  - Notification opt-in ≥ 35% of prompted players; notification disable rate < 3%/week.
- **Must NOT be done yet:** battle pass, event currency, server-run events.
- **Plans:** [`phases/P06-retention.md`](phases/P06-retention.md), [`../design/RETENTION.md`](../design/RETENTION.md), [`../analytics/ANALYTICS-PLAN.md`](../analytics/ANALYTICS-PLAN.md)

### P7 — Monetization design
- **Objective:** an intentional, ethical economy and offer architecture on top of the P0-correct plumbing.
- **Player outcome:** meaningful things to earn and spend; fair, clearly labelled optional ads; purchases that feel like support, not pressure.
- **Business outcome:** ARPDAU and payer conversion without hurting retention; a whale outlet that isn't predatory.
- **Systems affected:**
  - Currency merge (D-23) with migration; shop (Spotlight rotation, try-on previews).
  - Offers (Starter after the W1 boss, No-Ads+, Supporter, seasonal packs).
  - Ad caps via Remote Config; rewarded "Show me" token integration.
  - RevenueCat Offerings experiments.
- **Dependencies:** P0, P5 (shop components), P6 (Remote Config, telemetry).
- **Difficulty:** engineering M · design H · QA M (license testers).
- **Risk:** medium. Brand trust; mitigated by never selling currency, hints or progress.
- **Expected upside:** medium-high relative to today's $0.
- **Success metrics:**
  - Rewarded opt-in ≥ 20% of offers.
  - Interstitial impressions ≤ 1.5 per DAU.
  - Payer conversion ≥ 1.5%.
  - Retention delta between ad-cap cohorts within ±1 pp.
- **Must NOT be done yet:** subscriptions, gacha, energy, paid currency.
- **Plans:** [`phases/P07-monetization.md`](phases/P07-monetization.md), [`../design/MONETIZATION.md`](../design/MONETIZATION.md)

### P8 — Gravity Run 2.0 & competitive systems
- **Objective:** an endless/weekly mode players return to repeatedly (D-22, D-17).
- **Player outcome:** fresh-feeling runs; escalation after the speed cap; pause; PB ghost; a weekly board that's real.
- **Business outcome:** session frequency, ad inventory (revive), a social hook.
- **Systems affected:**
  - Endless content: chunk pipeline (authoring + validator + bot pair-check); `utils/endless.ts` (biomes, mirroring, jitter).
  - `EndlessScene` (pause, telemetry, missing mechanics).
  - Competition: local PGS plugin (Java, A-13); `Leaderboard.ts` swap. The `weekKey` alignment itself lands earlier, in P6.
- **Dependencies:** P1, P2 (bot), P0 lifecycle.
- **Difficulty:** engineering **H** · design H · QA M.
- **Risk:** medium (native plugin, anti-cheat).
- **Expected upside:** medium-high.
- **Success metrics:**
  - Runs/DAU ≥ 1.5 among Run adopters.
  - Weekly participation ≥ 15% of WAU.
  - Median run 60–180 s.
  - Leaderboard submit success ≥ 99%.
- **Must NOT be done yet:** Firestore boards, friend ghosts, tournaments.
- **Plans:** [`phases/P08-gravity-run.md`](phases/P08-gravity-run.md), [`../design/GRAVITY-RUN.md`](../design/GRAVITY-RUN.md)

### P9 — Social & viral
- **Objective:** turn satisfying moments into installs, with genuine fit only (D-16).
- **Player outcome:** share a Daily result card or a run; challenge a friend to a weekly seed.
- **Business outcome:** organic installs (K-factor), store rating volume.
- **Systems affected:**
  - Sharing: `@capacitor/share` + Filesystem, share-card renderer (`utils/Share.ts`).
  - Links: App Links + `assetlinks.json` on the user site/custom domain, web landing route, Install Referrer.
  - (In-App Review and the Daily share card moved to P6/M2, A-12.)
- **Dependencies:** P6 (daily), P8 (weekly seeds), P11 (domain/website).
- **Difficulty:** engineering M · design M · QA M.
- **Risk:** low-medium (link verification).
- **Expected upside:** medium, high variance.
- **Success metrics:** shares/DAU ≥ 3%; share→install attribution measured; rating ≥ 4.5 with volume.
- **Must NOT be done yet:** referral rewards, UGC browsing.
- **Plans:** [`phases/P09-social.md`](phases/P09-social.md), [`../design/SOCIAL-VIRAL.md`](../design/SOCIAL-VIRAL.md)

### P10 — Live ops seams
- **Objective:** extension points for seasons, events, modifiers and themed weeks, as **data, not a platform** (D-14, D-30).
- **Player outcome:** weekly modifier twists, seasonal palettes, earned limited cosmetics that return in a vault.
- **Business outcome:** reactivation; cosmetic event revenue at low operating cost.
- **Systems affected:** `event_calendar` Remote Config schema + client resolver; Weekly modifier rotation; seasonal palettes via `worldThemes`; earned cosmetic drops; event card in RunSelect/MainMenu.
- **Dependencies:** P6 (Remote Config), P7 (cosmetic pipeline), P8 (weekly).
- **Difficulty:** engineering M · design M · QA L.
- **Risk:** content-treadmill fatigue (solo dev).
- **Expected upside:** medium.
- **Success metrics:** event participation ≥ 20% of WAU; D7 of participants vs non-participants; zero crashes on unknown event kinds.
- **Must NOT be done yet:** battle pass, event currency, server events.
- **Plans:** [`phases/P10-live-ops.md`](phases/P10-live-ops.md), [`../design/LIVE-OPS.md`](../design/LIVE-OPS.md)

### P11 — Brand, ASO & store conversion
- **Objective:** a defensible name, honest and high-converting store presence, a website (also needed for app-ads.txt and assetlinks).
- **Player outcome:** understands the game from the first two screenshots; the name is memorable.
- **Business outcome:** store conversion, organic search, AdMob verification.
- **Systems affected:**
  - Brand: `BRAND` config, logo/icon/feature assets.
  - Store listing: copy, 9:16 screenshot set with captions, promo video, localization (top 9 languages), custom store listings, experiments.
  - Infrastructure: website + `app-ads.txt` + `assetlinks.json`.
- **Dependencies:** D-19 owner choice; P5-A render fix (before any capture); P4-α (content on screen).
- **Difficulty:** engineering L · design H · QA L.
- **Risk:** trademark (D-19).
- **Expected upside:** high (installs are the binding constraint).
- **Success metrics:** store listing conversion ≥ 30% (visitors → installers, organic); first-two-screenshots experiment winner; app-ads.txt verified.
- **Must NOT be done yet:** paid UA at scale.
- **Plans:** [`phases/P11-brand-aso.md`](phases/P11-brand-aso.md), [`../launch/STORE-LAUNCH-PLAN.md`](../launch/STORE-LAUNCH-PLAN.md), [`../launch/NAMING-STUDY.md`](../launch/NAMING-STUDY.md)

### P12 — Launch & post-launch optimisation
- **Objective:** ship safely, then improve by data. Includes the iOS port track (D-29).
- **Player outcome:** a stable launch; regular improvements.
- **Business outcome:** production access, staged rollout, vitals health, an analytics review cadence, iOS revenue later.
- **Systems affected:** release engineering (versionCode, CI Android build, tags/Releases), Play Console forms, vitals monitoring, A/B programme, iOS platform.
- **Dependencies:** M2.
- **Difficulty:** engineering M · design L · QA H.
- **Risk:** review rejection; vitals breach.
- **Expected upside:** realises all prior value.
- **Success metrics:**
  - Crash rate < 1.09%, ANR < 0.47%.
  - Staged rollout 20→50→100% without regressions.
  - Weekly metrics review held.
- **Must NOT be done yet:** iOS before the Android launch is stable.
- **Plans:** [`phases/P12-launch.md`](phases/P12-launch.md), [`../launch/STORE-LAUNCH-PLAN.md`](../launch/STORE-LAUNCH-PLAN.md)

## 5. Cross-cutting tracks
| Track | Where | Notes |
|---|---|---|
| Documentation & SSOT | P0 task 1, then every phase end | `docs/STATUS.md` (generated facts) + this roadmap + decisions |
| Analytics | P0 (hygiene/consent) → P6 (taxonomy v2) → continuous | Every event must answer a product question |
| Accessibility | P5 (system) + every UI task | Reduced motion, contrast, 48 px targets, toggle-hold |
| Performance | P1 (sim), P5 (render), every phase gate | Quality tiers; <20 bodies; particle budgets |
| Naming / brand | USER-GATED (D-19) → P11 | No repo renames until the owner decides |

## 6. Quality gates (every phase)
Each gate result is reported as **VERIFIED** (command output), **INFERRED**, or **REQUIRES HUMAN DEVICE TEST**.

1. `npx tsc --noEmit`
2. `npx vitest run`
3. `npm run build`
4. `./gradlew assembleDebug`, with the JDK passed via command line or env, never a committed path
5. The level validators + bot fast agents (from P2 on)
6. Headless boot smoke (all scenes, zero console errors)
7. The multi-rate physics harness (from P1 on)
8. `npm audit --omit=dev`
9. A code-review pass (`superpowers:requesting-code-review`)

## 7. Guardrails
- No feature for its own sake, and no level-count growth before quality.
- Don't rebuild working systems; reuse first.
- Never sacrifice low-end performance for visuals.
- No pay-to-win. Never sell currency, hints or progress.
- No ad spam; no unnecessary data collection.
- Bots are not human playtests.
- Never trust stale docs.
- Research before major architecture.
- Prefer data-driven systems, and keep the codebase simple.
