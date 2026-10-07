# Decision Register

> **What this is.** The architecture and product decisions of record for the next evolution of the game. Every plan in `docs/` must conform to these. Changing a decision means editing this file (new status + date + reason) before changing the code.
> **Evidence.** The research briefs are in `docs/research/` (summary: `RESEARCH-SUMMARY.md`) and the baseline audit is `docs/audit/2026-10-07/STATE-AUDIT.md`.
> **Amendments.** Where the §Amendments section at the end conflicts with an entry body, the amendment wins (it records the plan-review outcome of 2026-10-07).
> **Statuses:**
> - **ACCEPTED**: implement as written.
> - **PROPOSED**: implement unless data contradicts it.
> - **USER-GATED**: needs an owner decision before implementation.
> - **DEFERRED**: intentionally not now.

| ID | Decision | Status | Phase | Evidence |
|---|---|---|---|---|
| D-01 | Fixed-step physics contract | ACCEPTED | P1 | physics brief; audit H.2 |
| D-02 | Simulation starts on first touch ("armed") | ACCEPTED | P1/P3 | game-design §1, §3; W1–8 sim |
| D-03 | Per-step gameplay checks; win beats hazard in the same step | ACCEPTED | P1 | W1–8 sim (L74) |
| D-04 | Zone strength rebalanced against the attractor | PROPOSED | P4 | game-design §0.1 |
| D-05 | Level data model v2 with stable ids | ACCEPTED | P2 | game-design §1; audit C |
| D-06 | Shared pure sim + headless level-QA bot | ACCEPTED | P2 | game-design §6 |
| D-07 | Fail-relief ladder + open-frontier unlock | ACCEPTED | P3 | game-design §2 |
| D-08 | Result screen: NEXT/RETRY, no auto-advance | ACCEPTED | P3 | UX brief Q3; game-design §3 |
| D-09 | Entitlement-as-truth purchases, store prices | ACCEPTED | P0 | monetization Q1–2 |
| D-10 | Consent-first boot, privacy entry points | ACCEPTED | P0 | monetization Q3–4; retention Q1; launch §2–4 |
| D-11 | Android platform contract | ACCEPTED | P0 | android brief |
| D-12 | Durable saves | ACCEPTED | P0 (mirror) / P6 (cloud) | android Q10 |
| D-13 | Rendering: no darkening bloom, HUD camera, quality tiers | ACCEPTED | P5 (slice 5A early) | UX Q5; physics Q6 |
| D-14 | Analytics taxonomy v2 + Remote Config | ACCEPTED | P0 (hygiene) / P6 | retention Q1–3 |
| D-15 | Local notifications, opt-in, ≤1/day | ACCEPTED | P6 | retention Q5; android Q7 |
| D-16 | Social: share card + in-app review first | ACCEPTED | P9 | retention Q6 |
| D-17 | Leaderboards on Play Games Services v2 via local plugin | ACCEPTED | P8 | retention Q8; android Q9 |
| D-18 | Login chest pauses instead of resetting | ACCEPTED | P6 | retention Q4 (EU DFA) |
| D-19 | Rename only after the naming study + owner choice | USER-GATED | P11 | launch §6; naming brief |
| D-20 | Versioning & release engineering | ACCEPTED | P0 | launch §7 |
| D-21 | Daily: unlimited attempts, one payout/day, share card | ACCEPTED | P6 | game-design §8; retention Q6 |
| D-22 | Gravity Run 2.0 content model | ACCEPTED | P8 | game-design §7 |
| D-23 | Single earn-only soft currency | PROPOSED | P7 | monetization Q5 |
| D-24 | Interstitial & rewarded policy | ACCEPTED | P0 (plumbing) / P7 (tuning) | monetization Q3–4, Q6 |
| D-25 | Target audience 13+ | ACCEPTED (owner, 2026-10-07) | P0 | launch §3 |
| D-26 | Inverse-square attractor formula unchanged | ACCEPTED (standing rule) | all | CLAUDE.md |
| D-27 | Quality before count: levels may be cut, replaced or reordered | ACCEPTED (owner) | P4 | owner brief; audit C |
| D-28 | Phaser stays on 3.90 for 1.0 | ACCEPTED | — | physics Q7 |
| D-29 | iOS port after the Android launch | DEFERRED | P12 | launch §8 |
| D-30 | Battle pass, event currency, Firestore boards, friend ghosts | DEFERRED | — | retention Q7–8; monetization |
| D-31 | Gravity Run unlocks after World 1 | ACCEPTED | P8 (gate lands P3) | GRAVITY-RUN.md |
| D-32 | Custom/friend seeds never post scores | ACCEPTED | P8/P9 | GRAVITY-RUN.md |
| D-33 | Shipped Endless chunks are frozen (retune = new chunk id) | ACCEPTED | P8 | GRAVITY-RUN.md |
| D-34 | Stars are per-run (best single run); gem-vs-par tension is intended | ACCEPTED | P3 | LEVEL-ENGINE review |
| D-35 | Services move to `src/services/` in P0 (path alias for later plans) | ACCEPTED | P0 | TECHNICAL-ARCHITECTURE.md |
| D-36 | Tracked Node Playwright scripts replace untracked Python ones | ACCEPTED | P0/P1 | P00/P01 plans |
| D-37 | "No-Ads+ with rewards without watching" | USER-GATED (default off) | P7 | MONETIZATION.md |

---

## D-01 Fixed-step physics contract (ACCEPTED)
**Problem.** Phaser 3.90's Matter world advances on a fixed-step accumulator. `Engine.update` runs 0..N times per render frame. Matter clears `body.force` after each step. The game applies forces once per *render* frame (`GameScene.ts:915-917`, `EndlessScene.ts:227-229`). As a result:
- At 120 Hz, two frames' forces accumulate into one step, about 2× pull.
- At 30 fps, only the first of two steps gets a force, about ½ pull.

Measured velocity after 0.5 s: 0.41 / 0.85 / 1.34 / 1.87 / 2.29 at 30 / 60 / 90 / 120 / 144 Hz.

**Decision.** Use our own fixed-step loop. The research brief verified this against Phaser 3.90 source and in a Node sim.
1. **Stepper.** Set `matter.autoUpdate: false`. A shared `FixedStepper` (`src/sim/FixedStepper.ts`) advances the sim in `SIM_STEP_MS = 1000/60` steps:
   - the accumulator starts at a half-step (phase bias, which stops 0/2-step jitter at 60 Hz)
   - `SIM_MAX_STEPS = 4` per frame, with the backlog dropped beyond that (slow-mo, never a death spiral)
   - frame time clamped to `SIM_MAX_FRAME_MS = 100`

   It returns an interpolation alpha for rendering. GameScene and EndlessScene both use it, so there are two callers.
2. **One `fixedStep()` per step, in a fixed order:**
   1. latch input (attractor on/x/y, sampled once and logged for replay)
   2. kinematics at `simMs + S` (platforms, hazards, beams, goal drift, all pure functions of sim time)
   3. update gates (before collision detection)
   4. apply forces (attractor + zones + magnets via pure `src/sim/forces.ts`)
   5. `world.step(S)`
   6. portals → gem/orbs → win/hazard/timeout/out-of-bounds

   It returns `false` when the run ends, which stops the remaining steps. Side effects (audio, haptics, analytics) are queued and flushed after the loop, so the step stays pure and can run headless.
3. **Sim clock.** `simMs` is the sum of executed steps and is the only gameplay clock. It drives countdown, par, best time and ghost timestamps. A lint test bans `game.loop.time`, `this.time.now` and `Date.now` in gameplay code. Paused scenes don't step, so Settings, background and ads freeze time automatically.
4. **Kinematic objects.** No Phaser tweens on gameplay objects.
   - Static moving bodies use `Body.setPosition(body, p, PLATFORM_IMPART_VELOCITY)`. It defaults to `false` for parity with today's behaviour and can be enabled per level.
   - Tweens are kept for UI and juice only.
5. **Rendering.** The ball and kinematic objects are drawn at `lerp(prev, cur, alpha)`. Pulses and juice are per frame.
6. **Never** use `fps.limit`. It causes 40/48 fps judder on 120/144 Hz panels.

**Calibration.**
- The dev display is **120 Hz** (verified 2026-10-07 via `Win32_VideoController`). Every in-browser tuning session therefore felt about **2.08×** the nominal per-step force.
- P1 adds one uniform `FORCE_SCALE` multiplier applied to attractor, zone and magnet forces. Formula shape is unchanged (D-26); only constants change.
- **Provisional default: 2.08**, which preserves the feel the game was authored and played with. Status: PROPOSED until the owner does an A/B feel test on device (1.0 vs 1.5 vs 2.08).
- The level-QA bot (P2) always runs with the configured scale, and P4 retunes content against it.

**Acceptance.**
- A headless harness drives `game.loop.step(t)` at 30/60/90/120/144 Hz with ±1 ms jitter. After exactly N steps the ball state is **bit-identical** at every rate.
- Sim time stays within one step of wall time over 10 s.
- At 60 Hz, every frame runs exactly one step.
- The input-log replay reproduces the same final-state hash in the browser and in Node.

**Rejected alternatives.**
- The `beforeupdate` hotfix: correct for forces, but leaves checks per frame, tweens on wall time and smoothing lag (−28% sim time for 1.5 s after a refresh switch).
- `fps.limit`.

## D-02 Simulation is armed on first touch (ACCEPTED)
Until the player first presses, the level is a frozen, readable preview: no physics steps, no clock, and moving hazards hold their t=0 pose. The first press arms the simulation, which starts `simMs`.

**Why.**
- Self-solving levels (L11/L12 win with zero input) become impossible.
- Time spent under a title card no longer counts.
- Par becomes "time from your first touch".

The ghost and replay recorder start at arm. The Gravity Run start grace stays separate: Endless arms on scene start, after a countdown.

## D-03 Per-step checks; win precedence (ACCEPTED)
If the ball centre is inside the goal radius at the end of a step, the step resolves as a **win**, even if a hazard also overlaps. This fixes the L74-class "dead inside the goal" deaths.

Validators also forbid any hazard sweep or kill band from intersecting the goal disc (D-06 static rule G-03).

## D-04 Zone strength rebalanced (PROPOSED → confirmed by P2 bot fight-test)
`GRAVITY_ZONE_STRENGTH` = 6.0e-4 is 1.3× the attractor's **maximum** clamped pull and about 22× its pull at the edge of reach. Currents therefore can't be fought, which is what makes lift levels self-solve. The reference strength moves to roughly the attractor force at 120–140 px (≈1.3–1.8e-4). Per-zone `strength` multipliers remain for deliberate "ride-only" currents.

**This is a content-retune change.** It happens in P4 with bot verification, never as a blind constant edit.

## D-05 Level data model v2 (ACCEPTED)
- Every level gets a **stable string `id`** (e.g. `w02-currents-03`). Progress, ghosts and stars are keyed by `id`, never by campaign index.
- On first launch after the update, a one-time migration maps old `progress:v9` index keys to ids.
- New fields:
  - `idea` (one sentence; required)
  - `role` (`sandbox|experiment|develop|breather|twist|combine|mastery|boss|remix`)
  - `teaches` and `uses` (mechanic ids)
  - `tags`
  - `boss` metadata (`phases[]`)
  - `relief` (hint tiers)
  - `rewards` (optional)
  - `variants` (remix rules)
- The world list moves from index ranges to explicit `levels: id[]` per world. Reordering or cutting levels is then a data edit.

Full spec: `docs/architecture/LEVEL-ENGINE.md`.

## D-06 Shared pure sim + headless level-QA bot (ACCEPTED)
- Extract the physics and gameplay rules into `src/sim/` (pure TypeScript, no Phaser scene dependency). It runs on Phaser's bundled Matter 0.20 CommonJS build.
- **GameScene and EndlessScene become thin renderers** around the sim. CLAUDE.md requires a second caller before extracting code; the QA bot is that caller.
- **Bot:** a Node CLI `scripts/levelsim/` with agents:
  - A0 no-input
  - A1 nudge grid
  - A2 pursuit
  - A3 wall-hug
  - A4 random search
  - A5 beam search
  - A6 noisy expert
  - mechanic ablation
- It produces a machine-readable `level-quality-report.json` plus a Markdown summary.
- **CI:** static validators are blocking. The fast bot agents (A0–A3) are blocking. The slow agents run nightly and report only.

Full spec: `docs/architecture/LEVEL-QA-SIMULATION.md`.

## D-07 Fail relief + open frontier (ACCEPTED)
**Relief ladder (per level):**
- 3 consecutive fails → tier-1 hint, stated as what to *notice*, never the route.
- 6 fails → "Show me": the bot's route plays as a ghost once.
- 10 fails or 4 min on the level → "Skip for now". The level stays hollow-badged.

**Rules:**
- An assisted clear earns ★1 and the gem, but **never the par star**.
- The route ghost is free the first time per level. After that it costs an earned hint token or an optional rewarded ad.
- **Hints are never sold for money** (D-24).

**Open frontier:** the two levels after the furthest cleared level are always open. The next world opens at 8/10 cleared or at a star threshold.

## D-08 Result screen (ACCEPTED)
- **No auto-advance.** Actions are **NEXT** (primary), **RETRY** (secondary), **LEVELS** (tertiary).
- Tapping during the star reveal skips the reveal; it never navigates.
- A missed star shows a factual line, e.g. "Par 9.5 s · you 11.2 s".
- **Offers:**
  - The rewarded offer uses the reward style and the explicit label "Watch ad · …".
  - It is never the biggest element and never appears before the primary action is live.
- **Interstitials** fire only after NEXT is tapped (D-24).
- Title cards and camera-intro zoom play **once per level per session**. Retries go straight to play.
- **Death:** a cause stamp of ≤600 ms ("Hazard", "Time's up"), then respawn.

## D-09 Purchases (ACCEPTED)
- RevenueCat proxy registered as `'Purchases'`, or the official package dynamically imported inside the native guard.
- **Entitlements are the source of truth:**

  | Entitlement | Granted by |
  |---|---|
  | `no_ads` | `remove_ads`, `starter_pack`, `founders_pack` |
  | `pack_starter` | `starter_pack` |
  | `pack_premium_collection` | `premium_collection_pack` |
  | `pack_founders` | `founders_pack` |

  Bundle cosmetics are **derived from active entitlements**. A localStorage snapshot keeps reads synchronous.
- All one-time products are **non-consumable** in RevenueCat.
- `purchasePackage` receives the exact package object from `getOfferings()`. There is no `[0]` fallback.
- **Error handling by code:**

  | Code | Meaning | Handling |
  |---|---|---|
  | 1 | Cancelled | Silent |
  | 6 | Already purchased | Run restore |
  | 20 | Pending | "Unlocks automatically" + customer-info listener |
  | 10 / 35 | Network / offline | Friendly message |

- `getCustomerInfo()` is called explicitly after `configure`.
- Prices come only from the store's `priceString`.
- Starter is hidden once `no_ads` is owned.
- `MainActivity` uses `launchMode="singleTop"`.

## D-10 Consent-first boot (ACCEPTED)
**Boot order:**
1. Firebase initialises with **all four Consent Mode defaults denied** (manifest flags).
2. UMP `requestConsentInfo` → `showConsentForm` if required.
3. `AdMob.initialize({ maxAdContentRating: 'PG' })` **only when `canRequestAds`**.
4. `FirebaseAnalytics.setConsent(...)` from the UMP outcome.
5. Crashlytics collection follows the analytics choice (pending a legal check; default: enabled after consent resolves).

**Settings gains:**
- "Privacy choices", shown when the requirement status is REQUIRED (`showPrivacyOptionsForm`)
- "Privacy policy" link
- "Reset analytics data"

The manifest gets `google_analytics_automatic_screen_reporting_enabled=false`.

## D-11 Android platform contract (ACCEPTED)
**Dependencies:**
- `@capacitor/*` 8.5.2, which fixes critical advisory GHSA-rvm3-566m-v7fv
- `@capacitor/app` 8.1.2
- capacitor-firebase 8.5.2
- purchases-capacitor 13.7.0
- AdMob 8.2.x in a separate soak commit

**Back router** (`main.ts`): overlay → pause menu → parent scene → MainMenu. On MainMenu the handler is disabled, so the system does a warm background exit. `exitApp()` is never called.

**Background/foreground** (`visibilitychange` + App `pause`):
- Pause gameplay and show the pause overlay (never auto-resume).
- `AudioContext.suspend()`.
- The sim clock doesn't advance.
- Ad and IAP flows are excluded via in-flight flags.

**Manifest and config:**
- `appCategory="game"`
- `screenOrientation="portrait"`
- `VIBRATE`
- `dataExtractionRules` + `fullBackupContent` (include only Preferences + WebView Local Storage)
- dark `windowBackground`
- `minWebViewVersion: 87` + `server.errorPath` update page
- `SystemBars {style:'DARK', insetsHandling:'css'}`
- vite `build.target: 'es2020'`

**Also:**
- Renderer-crash recovery in `MainActivity`: recreate, max 2 times.
- **Never change `androidScheme` or `hostname`.** That would orphan saves.

## D-12 Durable saves (ACCEPTED)
- All stores write through to `@capacitor/preferences` as well as localStorage.
- Hydrate before Boot completes. A one-time migration copies localStorage → Preferences.
- Every store validates its shape on load (schema + version) and keeps a last-good backup key. A corrupt store restores from the backup instead of wiping.
- **Later (P6):** PGS Saved Games with a pure `mergeSave()`: max stars, min best time, union of gems and achievements.

## D-13 Rendering (ACCEPTED)
**Remove the costly post-effects.**
- Remove the camera Bloom. It is `mix(orig, blur·s, 0.5)`, a crossfade with no threshold. Measured on 1–2 px neon lines it gives **−48%**, and −22% on flat areas.
- Remove the ball's `postFX.addGlow` (`Ball.ts:69`). It is the single most expensive effect: a full-frame target at 96 taps per pixel.
- Replace the vignette with a pre-rendered gradient image. The camera then carries **no postFX at all**.

**Get the glow cheaply instead.**
- Neon look = a crisp core stroke plus wider low-alpha strokes, plus **additive glow sprites** (the existing `'glow'` texture with `BlendModes.ADD`). That is one batched quad per glowing object.
- Static level geometry is baked once per level into a `RenderTexture`.

**HUD.** The HUD and overlays move to a parallel `HudScene`, so camera shake and zoom can't touch them. The fallback is Layers plus a second camera using `ignore`.

**Quality tiers.** Low, Mid and High set:
- render scale
- particle, comet and glow-quad budgets
- draw-call budgets: Low ≤40, Mid ≤60, High ≤80

The tier is chosen from device memory, then stepped down by an FPS watchdog. The down-step is **persisted**.

**Accessibility.** Reduced motion never changes brightness.

**Not doing:** custom v3 render pipelines. Phaser 4 removes the pipeline system.

## D-14 Analytics + Remote Config (ACCEPTED)
**P0 hygiene:**
- Delete the reserved custom `session_start`.
- Add a pre-consent queue.
- Add manual `screen_view` per scene.
- Add name/param validation tests.

**P6 taxonomy:** see `docs/analytics/ANALYTICS-PLAN.md`.
- `level_start` / `level_end{success,cause,attempt,duration_ms,…}`
- `post_score`, `earn/spend_virtual_currency`, `tutorial_*`, `share`, `notif_*`
- 10 user properties

**Remote Config:**
- Activate cached values at boot, then fetch during the splash with a 3 s timeout.
- All values go through a pure, clamped `rcConfig.ts`.
- Daily, Weekly and event changes are **dated overrides**, never retroactive.

## D-15 Notifications (ACCEPTED, P6)
- `@capacitor/local-notifications`, inexact scheduling only, `SCHEDULE_EXACT_ALARM` removed.
- **Prompt:** an in-game pre-prompt after the 2nd Daily win or a streak of 3. Never in session 1.
- **Cadence:** ≤1 per day, ≤4 per week; quiet hours 21:00–09:00; cancel and reschedule on every launch.
- **Types:** daily ready · streak saver · weekly reset · comeback on days 3/7/14, then stop.

## D-16 Social (ACCEPTED, P9)
1. Spoiler-free Daily share card (image + text, `@capacitor/share` + Filesystem).
2. Play In-App Review at positive moments only.
3. Weekly-seed challenge links through App Links. This requires a GitHub user site or a custom domain for `assetlinks.json`, which also hosts `app-ads.txt`.

Friend ghosts and referral rewards are deferred.

## D-17 Leaderboards (ACCEPTED, P8)
- Play Games Services v2 through a **local in-app Capacitor plugin** (`play-services-games-v2:22.1.0`). No community plugin fits Capacitor 8 + AGP 8.13.
- **Boards:**
  - Weekly Run (tamper protection + upper bound)
  - Endless all-time (no revives)
- **The Weekly seed's `weekKey` boundary moves to match PGS weekly reset (Sunday 07:00 UTC).**
- The Daily stays local (local-midnight habit). Web keeps local scores.
- **Until boards ship, all copy says "your best", never "leaderboard".**

## D-18 Login chest pauses (ACCEPTED)
A missed day pauses the 7-day ladder instead of resetting it to day 1. This removes the pattern targeted by the EU Digital Fairness Act.

A one-time comeback gift is given after 7+ days away, at most once per lapse.

## D-19 Naming (USER-GATED)
- No renaming anything in the repo until the owner picks a name from `docs/launch/NAMING-STUDY.md` and runs a professional trademark knockout (US/EU/IL).
- The display name will be centralised in one `BRAND` config so the rename is a single data change plus asset swaps.
- The package id `com.truestorylabs.gravityflow` is **permanent** (an AAB was already uploaded) and is not user-visible.

## D-20 Versioning (ACCEPTED)
- `versionCode = MAJOR*1_000_000 + MINOR*10_000 + PATCH*100 + BUILD`, derived from one version file. It is monotonic, and the next upload must be ≥2 (1.0.0 build 1 → 1000001 satisfies this).
- `versionName` = semver.
- The rc label lives in the git tag.
- The same AAB is promoted Internal → Closed → Production.
- `proguard-android.txt` → `proguard-android-optimize.txt` (AGP 9 readiness). R8 stays off for 1.0.
- Play App Signing, plus the upload key backed up in two places.

## D-21 Daily (ACCEPTED, P6)
- Unlimited attempts. **One currency payout per day.** The streak is kept by any clear.
- First-try result, best time and attempt count are recorded.
- Spoiler-free share card.
- Gated until World 1 is complete. Only mechanics the player has already been taught are allowed.
- The pool comes from the level pipeline (curated + bot-verified), published as dated Remote Config overrides.

## D-22 Gravity Run 2.0 (ACCEPTED, P8)
- **Content:** authored chunks × x-mirror × bot-verified jitter (±10% speed, ±12 px). That is 20 chunks → ≥40 authored within 3 months.
- **Structure:**
  - biome phases every 6 chunks
  - a rest chunk after every 3 hard ones
  - escalation past the speed cap by **composition**, not speed
  - seam envelopes, bot-checked over every chunk pair
- **Scoring:** score = height, plus small gem bonuses; Alto-style 3 active goals.
- Pause button. Best-height marker. PB ghost. Telemetry. PGS boards (D-17).

## D-23 Single earn-only soft currency (PROPOSED, P7)
- Merge Fragments into Stardust at ×10, on both earnings and prices (value-neutral migration).
- **Real money buys items, never currency.** This stays outside the EU CPC virtual-currency regime.
- **New sinks:** a rotating Spotlight discount (Stardust only, no countdown timers), procedural recolors, seasonal drops.
- Prestige cosmetics are unlocked directly by achievements.

## D-24 Ads policy (ACCEPTED)
**Plumbing (P0):**
- Preload.
- Rewarded is event-driven (`Rewarded`/`Dismissed`/`FailedToShow`) with a 5 s watchdog.
- Offers are hidden when no ad is loaded.
- Busy guards.
- The interstitial is **awaited before** `scene.restart` and skipped if not ready.
- Any rewarded view resets the interstitial clock.

**Tuning caps (P7, Remote Config):**
- No interstitial before lifetime level 12.
- ≥180 s **and** ≥3 completions since the last full-screen ad.
- ≤4 per session, ≤10 per day.
- Never after a death or a failure streak, never at level start.
- The 2× offer at most once per 3 wins and 4 per day.

**Never:** sell hints for money, gate progress, or use fake urgency.

## D-25 Target audience 13+ (ACCEPTED by owner 2026-10-07)
- Content rating stays "Everyone".
- No Families policy.
- `maxAdContentRating = 'PG'`.
- No global child-directed tags.
- Keep the art non-childish in marketing.
- A Play Age Signals plugin is planned before 2027-01-01 (CA AB 1043).

## D-26 Attractor formula unchanged (standing rule)
`force = dir · STRENGTH / max(dist, MIN_DIST)²`, zero beyond `MAX_DIST`. Only constants may be tuned. D-01 changes *when* the force is applied, not *what* it is.

## D-27 Quality before count (ACCEPTED by owner)
The 150 levels are raw material.
- Literal copies are replaced or relabelled as remixes.
- Bypassed and self-solving levels are reworked.
- Worlds may hold 8–12 levels.
- Retired or cut levels can return as post-game remix or expert content.

The level count is an outcome, not a goal.

## D-28 Phaser 3.90 for 1.0 (ACCEPTED)
No engine migration before launch. Re-evaluate Phaser 4 after launch, behind the `src/sim/` boundary, which keeps gameplay rules engine-agnostic.

## D-29 iOS after Android (DEFERRED)
About 6–10 dev-days. Requires macOS + Xcode 26, ATT, SKAdNetwork, privacy manifests, StoreKit via RevenueCat, and `@capacitor/haptics`. Scheduled in P12 once the Android launch is stable.

## D-30 Deferred systems
- Battle or season pass (needs a content pipeline and DAU)
- Event currency (a third currency)
- Firestore leaderboards and friend ghosts (backend plus moderation)
- Referral rewards (fraud)
- FCM campaigns (≤2 per month, later)

Revisit each one only when the metrics in `SUCCESS-METRICS.md` justify it.


---

## Amendments (plan review, 2026-10-07)
Each domain plan writer listed conflicts instead of resolving them silently. These are the resolutions.

| # | Amends | Resolution |
|---|---|---|
| A-01 | D-02 | Arming stops *zero-input* wins only. One tap can still let a strong zone carry the ball home (L11/L12), so P4 must still fix those levels. Agent A0 tests "armed, no force". **Gravity Run arms at scene start** (it has no countdown). |
| A-02 | D-03 | Precedence within a step: **win > timeout > hazard > out-of-bounds**. A legacy mode reproducing hazard-first stays available in the sim for audit comparisons only. |
| A-03 | D-05 | Ids are **permanent, name-based slugs** (e.g. `updraft-surf`). They are never renamed and never encode world or slot, so moving a level doesn't make its id lie. Level data moves to `src/content/levels/` with re-export shims during migration. |
| A-04 | D-06 | Static validators use a **ratchet baseline**: today's known defects are recorded, and only *new* errors block CI until P4 clears the baseline. Slow-agent rules (noisy-success band, "boss easier than L9") are nightly warnings. **EndlessScene converts to `RunSim` in P8**, not P2. |
| A-05 | D-07 | **Any assist** (relief-ladder route/skip *or* the accessibility game-speed assist) withholds **only the par star**. Progress, ★1 and the gem are unaffected. |
| A-06 | D-09 | Product set extends to `supporter_pack`, seasonal packs, and **cosmetic-only "twin" SKUs** (e.g. `starter_cosmetic`), so `no_ads` owners can still get Starter's Galaxy Trail without paying for Remove Ads twice. On Android, a **silent restore** runs once on a fresh install when the entitlement snapshot is empty (third-party prefs are excluded from backup per D-11). |
| A-07 | D-10, D-25 | The AdMob value is `maxAdContentRating: MaxAdContentRating.ParentalGuidance` (plugin enum), not `'PG'`. |
| A-08 | D-11 | Add `@capacitor/preferences@8.0.1`. The **Endless pause button and pause overlay** move into the P0 platform contract (back router + background pause). |
| A-09 | D-12 | P6 builds the pure, tested `mergeSave()`. **P8 wires it to PGS Saved Games** (the plugin lands in P8). |
| A-10 | D-14 | `level_start` / `level_end{success,cause,attempt,duration_ms}` land in **P0 step 5**, so M1 has attempt data. Level params carry both `level_id` (stable slug) and `level` (campaign index). |
| A-11 | D-15 | Pre-prompt trigger: the **2nd Daily win or the first world completion, whichever comes first**. Never in session 1. Comeback reminders on days 3/7/14 count toward a weekly cap of ≤3 for players without an active streak. |
| A-12 | D-16, D-21 | **P6 builds the Daily share card in full** (text grid + image + native share). **P9** extends sharing to Gravity Run cards and challenge links. **In-App Review moves to M2 (P6)**: at most once per 60 days, 3 per lifetime, only at positive moments. |
| A-13 | D-17 | The PGS plugin is **Java** (the app has `MainActivity.java` and no Kotlin setup). The **`weekKey` realignment to Sunday 07:00 UTC moves into P6**, before launch, so no migration is needed. Verify across the 2026-11-01 DST change on device. |
| A-14 | D-19 | The knockout search covers **US, EU, UK, IL**. The **closed test may start under the working title**. The rename gates **production (M2)**, not M1. |
| A-15 | D-20 | Milestone tags continue the existing rc series: **M0 = `v1.0.0-rc.2`, M1 = `v1.0.0-rc.3`, M2 = `v1.0.0-rc.4`, launch = `v1.0.0`**. The versionCode script and preflight (P12-T01–T08) are pulled into P0 step 0. |
| A-16 | D-21 | The shared Daily ships **three tiers per date**, so every player gets a puzzle using only mechanics they've been taught. |
| A-17 | D-22 | Jitter adds a third dimension: **hazard timing offset** (bot-verified). |
| A-18 | MASTER-ROADMAP §P6 | Retention targets re-baselined to published bands: **D1 ≥ 30%, D7 ≥ 8%, D30 ≥ 3%**. Stretch targets live in `SUCCESS-METRICS.md`. |
| A-19 | D-01 | `FORCE_SCALE` 2.08 (sim) vs 2.2 (field measurement): the owner's on-device A/B (1.0 / 1.5 / 2.08 / 2.2) is a **gate before M0**. |
| A-20 | CLAUDE.md | Browser automation moves from untracked Python Playwright to **tracked Node Playwright** scripts under `scripts/` (CI-runnable). CLAUDE.md is updated in P0 step 0. |
| A-21 | D-19 | D-19 covers **only the product name**. World and level titles are content: P4 may rename them (L80 → "ALMOST HOME", duplicate titles fixed). The **anti-gravity field** mechanic is not adopted (it borders on D-26) and stays USER-GATED. |
| A-22 | D-08, D-24 | The result-screen rewarded offer sits **below** the NEXT/RETRY row, in tertiary position, never above or before the primary action. This resolves UX-UI-MOTION vs MONETIZATION. |
| A-23 | D-06 | The noisy-expert success gate uses **bands per level role** (sandbox/teach ≥ 90%, develop 60–90%, mastery/boss 40–75%) rather than one 40–90% band. The open frontier opens the next world at **80% of world size** (worlds may hold 8–12 levels, D-27). |
| A-24 | D-09 | The Starter Pack card is **hidden only when `no_ads` is owned through a different product** (Remove Ads or Founders). When Starter itself is owned, its card stays and shows **Owned**, so it does not vanish at the moment of purchase. Bundle-only cosmetics whose bundle is hidden do not cross-sell to it. |
| A-25 | D-10 | UMP `OBTAINED` says only that a choice was made: after "Do not consent", `canRequestAds` is still true (limited ads), so **`canRequestAds` gates ads only** and never Firebase consent. For `OBTAINED`, the four Firebase types follow the IAB TCF purpose consents (`IABTCF_PurposeConsents`, read by the read-only `ConsentSignals` plugin) using Google's published mapping: P1 → `ad_storage` + `ad_user_data`; P7 → `ad_user_data`; P3 and P4 → `ad_personalization` ([Google: implement TCF strings](https://developers.google.com/tag-platform/security/guides/implement-TCF-strings)). Two stricter project choices go beyond Google: `ad_personalization` also requires P1, and `analytics_storage`, which Google does not map, requires P1 (device storage, ePrivacy Art. 5(3)). A missing or malformed TCF string or an unknown `gdprApplies` grants **nothing**. A US-state opt-out (GPP) is not yet mapped to Firebase: STATUS B-13. Crashlytics is enabled before `Ads.init`, so crash reporting never waits on the ad SDK (D-10.5 order). |

