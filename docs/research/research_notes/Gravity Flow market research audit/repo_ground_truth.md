# Gravity Flow: repository ground truth and audit of the market report's claims about Gravity Flow

**As of:** 2026-10-14. **Repo:** C:\Dev\Projects\Personal\Gravity Game, branch `p0-foundation`, HEAD `356e5e2` ("docs(status): facts block for the fix pass 1 tests (74 test files / 1515 tests)"). `origin/master` is at the same commit. Public repo root for all paths below: [taysh123/Gravity-Game](https://github.com/taysh123/Gravity-Game). Read-only research: no repo file was modified; `docs/research/deep-research-report.md` (untracked, 136 lines) was only read.

**Citation convention.** Sources are repo files, written as `path:line` relative to the repo root (these are the "links" for this task; there is no web source). Evidence tags on each finding:
- **[V]** VERIFIED: read in code or config at HEAD, or from a command run today (git, `gh`, grep).
- **[D]** DOCUMENTED: stated in a doc (STATUS, roadmap, design, audit, research brief) but not independently confirmed in code.
- **[P]** PLANNED: roadmap or design intent only; nothing built.
- **[O]** OWNER-REPORTED or lives in an external dashboard (Play Console, AdMob, RevenueCat); the repo cannot confirm it.

**Authority rule in this repo.** `docs/STATUS.md` is the only state document; `docs/roadmap/DECISIONS.md` amendments (A-xx) override decision bodies (`docs/STATUS.md:3`, `docs/roadmap/DECISIONS.md:5`). Phase plan files still print "Status: PLANNED" even for finished P0 tasks (`docs/roadmap/phases/P00-foundation.md:3`), so they are stale on status; trust STATUS and git.

**Headline for the report writer.** Gravity Flow is a one-touch hold-and-drag gravity-attractor puzzler (never tilt or swipe). It already ships, in code, most of what the market report proposes as "new": a daily login chest, a Daily Challenge with streak and earned freeze, a Weekly Challenge inside Gravity Run (endless mode), rewarded 2x and revive ads, a gated interstitial, a Remove Ads IAP plus cosmetic bundles, Firebase analytics and Crashlytics, offline play. It is NOT live: no public Play release, real ad/IAP ids are empty by design, physics is still frame-rate dependent (P1 not started), and the P0 foundation phase is 21 of 26 tasks done. The report gets the mechanic wrong ("tilt-gravity", "swipe gravity"), misnumbers several tasks (T22, T25, T26) and proposes some things the roadmap deliberately rejects (energy, currency packs, ad-to-retry in the campaign).

---

## 1. What is the core mechanic, and is there any tilt, swipe or accelerometer control?

### Takeaway
Press-and-hold creates an attractor at the finger; dragging moves it; release removes it. The ball feels an inverse-square pull; there is no world gravity. No tilt, accelerometer, gyroscope or swipe-gesture gameplay exists anywhere in code or in the plan.

### Cited Findings
- [V] Matter world gravity is zero: `gravity: { x: 0, y: 0 }` at `src/main.ts:41`. CLAUDE.md "Core Gameplay Principles" says the same ("No world gravity").
- [V] Input is pointer-only. `GameScene.setupInput()` at `src/scenes/GameScene.ts:508-541`: `pointerdown` spawns an `Attractor` at the pointer (513-526), `pointermove` moves it only while `pointer.isDown` (530-534), `pointerup` destroys it (536-540). Gravity Run uses the identical three handlers at `src/scenes/EndlessScene.ts:238-258`. Taps on HUD or UI are ignored (`GameScene.ts:516`, `EndlessScene.ts:243`).
- [V] Force model, `GameScene.applyAttractorForce` at `src/scenes/GameScene.ts:965-982`: zero beyond `ATTRACTOR_MAX_DIST`; distance clamped to at least `ATTRACTOR_MIN_DIST`; `mag = ATTRACTOR_STRENGTH / dist^2`; applied with `RawMatter.Body.applyForce`. Constants `src/config/physics.config.ts:5-7`: strength 2.6, min dist 75, max dist 310 (px). Peak pull is 4.62e-4 at 75 px (D-04 text, `docs/roadmap/DECISIONS.md:115-116`). Ball radius 16, restitution 0.65, air friction 0.02 (`physics.config.ts:10-13`).
- [V] The formula is a standing rule: D-26 "Inverse-square attractor formula unchanged" (`docs/roadmap/DECISIONS.md:39,385`); only constants may be tuned.
- [V] Other forces: gravity zones are directional fields at `GRAVITY_ZONE_STRENGTH` 6.0e-4 (`physics.config.ts:70`); magnets reuse the inverse-square model (strength 2.2, clamp 95, reach 190, `physics.config.ts:80-82`).
- [V] No tilt/sensor input exists. A case-insensitive search of all of `src/**` and `android/app/src/main` for `deviceorientation|devicemotion|accelerometer|gyroscope|tilt|swipe` returns zero hits. `package.json` dependencies hold only AdMob, Firebase Analytics/Crashlytics, Capacitor core/android/app/preferences, RevenueCat and Phaser (`package.json:22-32`): no motion or sensor plugin.
- [V] Other inputs: keyboard `R` restarts on web (`src/scenes/GameScene.ts:295,960`); Escape feeds the Back router (`src/platform/lifecycle.ts:143`); list screens drag-scroll (UI only).
- [D] The only docs mentioning "swipe" mean the Android edge back-gesture (`docs/research/android-capacitor.md:30`, risk R-44 in `docs/roadmap/RISK-REGISTER.md`); "tilt" means player frustration ("tilt loops", `docs/research/game-design.md:130`; `docs/architecture/LEVEL-QA-SIMULATION.md:457`) or a "tilted orbit ring" in a store-asset file description (`docs/store/assets/README.md:18`). No doc proposes tilt control.
- [D] The store hook is "Hold to pull a lost star home. One-touch gravity physics puzzles in deep space." (`docs/store/listing.md`, short description; `docs/store/aso.md`, "Hold to pull a lost star home."). Planned P11 trailer is led by "Hold to pull the star." (`docs/research/RESEARCH-SUMMARY.md:104`).
- [V] Fiction: the ball is "the lost star"; win overlay reads "STAR FREED" on bosses and the first win shows "You brought your first star home" (`src/config/retention.config.ts:13`, `src/scenes/GameScene.ts:1232`).
- [V] Onboarding of the mechanic: Level 1 puts the goal within one attractor reach, a one-time `CoachMark` ghost-dot demo (`GameScene.ts:875-890`, persisted `SettingsStore.seenTutorial`, `src/utils/SettingsStore.ts:12`), a "sonar ping" reach visual on every press (`src/entities/Attractor.ts`, `PHYSICS.SPAWN_PULSE_MS` 440), and a one-line `hint` on every level (150 of 150 levels have one; script count today).
- [V] **Physics is frame-rate dependent (open bug B-03).** Forces are applied once per render frame (`GameScene.ts:949`, `EndlessScene.ts:285`) while Matter steps on a fixed accumulator. D-01 measured velocity after 0.5 s of 0.41 / 0.85 / 1.34 / 1.87 / 2.29 at 30 / 60 / 90 / 120 / 144 Hz (`docs/roadmap/DECISIONS.md:59`). None of `FixedStepper`, `FORCE_SCALE`, `autoUpdate:false` or `simMs` exists in `src/` (grep returns nothing) and there is no `src/sim/` directory. So P1 has not started in code.
- [P] Accessibility option "attractorMode: hold | toggle" is planned in P5 (`docs/roadmap/phases/P05-ux-visual.md:56,260`); a game-speed assist and reduced-motion already partly exist.

### Inferences
- Any competitor lesson phrased around tilt/swipe/accelerometer control does not transfer; the right comparison class is one-touch hold or drag-to-aim games.
- The "pull strength per frame rate" problem is real and is the largest hidden correctness bug in the plan; the report's instinct (fixed timestep, test multiple rates) is aligned with D-01, but its mechanic description is wrong.

### Gaps
- Real-device feel across refresh rates is untested (owner `FORCE_SCALE` A/B at 1.0 / 1.5 / 2.08 / 2.2 is a pending gate before M0: `docs/STATUS.md:60`, A-19).

---

## 2. What content exists (levels, worlds, mechanics, bosses, quality flags)?

### Takeaway
150 campaign levels in 15 worlds of 10 (a boss at every 10th level), 7 mechanics, plus 8 Daily levels and 20 Gravity Run chunks. The 2026-10-07 audit judged the campaign broad but shallow (flat difficulty, copies, bypasses, self-solving levels); level data has not changed since that audit, and the redesign (P4) has not started.

### Cited Findings
- [V] Counts: `LEVELS` has 150 entries (`src/config/levels/index.ts:159-214`, confirmed by running the array); `WORLDS` has 15 (`src/config/worlds.ts:14-31`); facts block says 150 levels / 15 worlds, 8 daily levels, 20 run chunks, 14 achievements, 28 cosmetics, 3 bundles, 14 scenes, 163 level files on disk with 13 retired (6, 22, 31, 35, 37, 39, 40, 45, 48, 55, 56, 63, 64) (`docs/STATUS.md:17-20`). File number is not level number; `index.ts` order defines the level number.
- [V] Level data unchanged since the audit baseline `d3c6aab`: `git diff d3c6aab HEAD -- src/config/levels src/config/dailyLevels.ts src/config/endless src/config/worlds.ts` shows one comment-line change in `_template.ts`. So the audit's inventory (`docs/audit/2026-10-07/inventory/*.json`) still describes today's content.
- [V] Worlds and mechanic focus (`src/config/worlds.ts:17-31`; per-world mechanic counts computed by running the `LEVELS` array today; titled levels and bosses by `title`/`boss` fields):

| W | Name | Levels | Mechanic focus (levels using it) | Signature level / Boss (L10 of each world) |
|---|---|---|---|---|
| 1 | FOUNDATIONS | 1-10 | attractor, walls, gem, constellation orbs | THE GAUNTLET / THE COLLAPSE (first hazard appears in the boss) |
| 2 | CURRENTS | 11-20 | gravity zones (10) | THE EYE (L19) / THE MAELSTROM |
| 3 | CLOCKWORK | 21-30 | moving platforms (10) | THE GEARWORKS / THE MACHINE |
| 4 | PERIL | 31-40 | hazards (10), first timer | THE FORGE / THE INFERNO |
| 5 | WELLS | 41-50 | magnets attract/repel (10) | THE BINARY STAR / THE SINGULARITY |
| 6 | RIFTS | 51-60 | portals (10) | HALL OF MIRRORS / THE BREACH |
| 7 | GATES | 61-70 | one-way gates (10) | THE LOCKWORKS / THE VAULT |
| 8 | CONVERGENCE | 71-80 | combination (all 7) | THE CONFLUENCE / HOMECOMING (L80) |
| 9 | GAUNTLET | 81-90 | platforms+hazards+zones | THE GAUNTLET / THE CRUCIBLE |
| 10 | BINARY | 91-100 | dual magnets (10) | THE BINARY STAR / THE PULSAR |
| 11 | LABYRINTH | 101-110 | portals+gates | HALL OF ECHOES / THE WARDEN |
| 12 | TEMPEST | 111-120 | timed + moving hazards (7 timed) | THE TEMPEST / THE EYE OF THE STORM |
| 13 | ASCENSION | 121-130 | long multi-mechanic | THE ASCENT / THE SUMMIT |
| 14 | SINGULARITY | 131-140 | tight margins | THE EVENT HORIZON / THE SINGULARITY |
| 15 | HOMECOMING | 141-150 | finale | THE HOMEWARD PATH / THE LONG WAY HOME |

- [V] Totals across the 150 levels (computed today): hazards 71, gravity zones 42, magnets 43, portals 41, gates 27, moving platforms 18, timed levels 12, constellation (collect-all) levels 2; every level has a gem and a par time and a hint; 15 bosses (`boss: true`), 31 titled levels. Seven mechanics: attractor, gravity zones, magnets, portals, moving platforms, hazards (static / sweep / rotating arm / pulsing beam), one-way gates (`src/types/index.ts:1-100`; `docs/audit/2026-10-07/STATE-AUDIT.md:79`).
- [V] Stars: 1 for completing, 1 for the optional gem, 1 for time at or under `parTimeMs` (`src/utils/scoring.ts:19-23`). Level N+1 unlocks when N is completed (`src/utils/ProgressStore.ts:76-79`).
- [V] Win overlay: after a campaign win it auto-advances after 2800 ms (1550 ms daily) with NO Next/Retry buttons (`GameScene.ts:1178`); a death restarts the same level after `RESTART_DELAY_MS` 240 ms (`GameScene.ts:1664-1699`, `physics.config.ts:135`). P3 plans NEXT/RETRY (D-08).
- [D] **Level-quality findings (audit 2026-10-07, baseline `master @ d3c6aab`)** (`docs/audit/2026-10-07/STATE-AUDIT.md`):
  - Effective difficulty is flat at about 2/10 across W1-8 (replay-bot sim, section C.1/D); W9-15 plateau or regress; bots clear in 1-8 s against 12-20 s pars, so the par star is nearly free.
  - Self-solving: L11 wins with zero input in about 1.4 s, L12 in about 1.8 s (`inventory/flags.json` `idleOutcomes`: 2); L80 "HOMECOMING" is won 82% of the time by one 0.4 s nudge.
  - 12 level pairs have layout similarity 1.0 (10 campaign-to-campaign pairs; 2 pair a Daily level with a campaign or retired level) and 25 pairs score at or above 0.85 (`inventory/duplicates.json` `simPairs`): L43=L91=L142, L45=L97, L53=L103, L63=L102, L67=L106, L84=L116, L101=L143, L122=L136, plus L65=D6 and retired level39=D7. The inventory scores L149~L150 at 0.94; the audit text separately calls L150 a remake of the L80 boss with the identical hint string (`STATE-AUDIT.md:272`). Five shared-arena pairs. No byte-identical duplicates.
  - Flags from `inventory/flags.json`: 33 mechanic bypasses, 38 gem issues (33 gems on the shortest route), 10 goal-danger, 7 out-of-bounds-risk, 30 portal-exit warnings (16 deep), 6 trivial, 5 simple bosses, 1 unfair timer; no static impossibilities; no spawn danger; perf ceiling (<20 bodies) never exceeded (max 12).
  - Three bosses share one template (L90, L120, L130); duplicate titles: THE GAUNTLET (L8/L89), THE BINARY STAR (L49/L99), THE SINGULARITY (L50/L140). L80 is literally named "HOMECOMING" and plays as a false ending.
  - Hazard motion debuts inside boss/signature levels rather than being taught first.
  - Only **L100 THE PULSAR** and a few levels (L119, L118, L127, L139) are called standouts.
- [D] Daily pool: `DAILY_LEVELS` has 8 hand-made levels (`src/config/dailyLevels.ts:9`), chosen by FNV hash of the local date, with a modifier from `['none','none','timed','gemRush']` (`src/utils/daily.ts:47-55`). Audit: repeats about every 8 days, some are near-copies of campaign levels, and untaught mechanics are open on day 0 (`STATE-AUDIT.md:308`).
- [V] Gravity Run content: 20 chunks of 560 px, tiers 0/1/2/3 = 4/5/6/5, walls, zones, magnets, saws, beams only (`src/config/endless/chunks.ts:150`; `STATE-AUDIT.md:306`). Speed 76 to 250 px/s, cap reached at about 47 s (`physics.config.ts:141-144`).
- [P] The fix path: D-27 "quality before count: levels may be cut, replaced or reordered" (owner); P2 builds a headless level-QA bot (A0-A6) and validators; P4 reworks Worlds 1-3 first (for the closed beta), then waves for W4-15; no new worlds and no level-count growth before quality (`docs/roadmap/MASTER-ROADMAP.md:171-184`, `DECISIONS.md:388-395`). 13 retired levels are candidate post-game "Expert" content (deferred, F97 in `docs/roadmap/FEATURE-MATRIX.md:256`).

### Inferences
- "150 levels" is a quantity claim the repo itself treats as raw material: the roadmap says the count is an outcome, not a goal. Do not present level count as a strength without the audit caveats.
- Any report advice about "iterating on levels using competitor insights" lands on an already-scheduled, bot-gated workstream (P2 then P4), not on a gap.

### Gaps
- No human playtest data or closed-test telemetry exists; all difficulty numbers are bot or static-proxy estimates. Device playtesting of 150 levels has not happened.

---

## 3. Which modes and retention systems are implemented and working versus planned?

### Takeaway
Implemented in code: campaign with Star Map and 3-star mastery, Daily Challenge (with streak and earned freeze), a 7-day login chest, Gravity Run (Endless + Weekly Challenge, local leaderboard only), 14 achievements, win-streak tiers, personal-best ghost trail. Not built: notifications, Play Games Services leaderboards, cloud save, Remote Config, real share (clipboard only), in-app review, missions, events. Several shipped systems are weaker than they look (login ladder resets on a miss; Weekly says "Same run for everyone" with no board).

### Cited Findings
- [V] **Scenes (14)** registered at `src/main.ts:51-66`: Boot, CompanySplash, IntroSplash, MainMenu, LevelSelect, WorldMap, Achievements, Cosmetics, Settings, Pause, Game, Endless, RunSelect, End. `PauseScene` (T10) is new since the audit's 13.
- [V] **Star Map / WorldMap:** `src/scenes/WorldMapScene.ts` (15 worlds from `WORLDS`, themed via `src/config/worldThemes.ts`). The audit calls it a strongest feature (`STATE-AUDIT.md:401`).
- [V] **Daily Challenge:** `DailyStore.todayChallenge` picks one of 8 levels plus a modifier (`src/utils/DailyStore.ts:89-91`; `src/utils/daily.ts:51-56`); `timed` modifier sets a limit of par + 3 s, `gemRush` requires the gem (`src/scenes/GameScene.ts:228-233`). Daily win pays 15 + 3 per star Stardust (`src/utils/currency.ts:5-8`), replays pay again (audit flaw). Streak with milestone Stardust at 3/7/14/30 days of 10/25/50/100 (`src/utils/daily.ts:59-64`) and an **earned-only streak freeze** every 7 streak days, max 3, never purchasable (`src/config/retention.config.ts:97-98`, `DailyStore.ts:125-144`). A death restarts the daily level like any other; after a daily win the scene returns to the main menu (`GameScene.ts:1189-1191`). Replays can pay out again (audit flaw, fixed by D-21 in P6).
- [V] **Login bonus / daily reward ("chest"):** `DailyStore.claimLoginBonus` (`DailyStore.ts:151-163`), once per day, 7-day ladder of 10/12/15/18/22/28/40 Stardust with 0/0/1/0/1/1/3 Fragments, then cycles (`retention.config.ts:82-90`, `src/utils/loginBonus.ts:17-23`); chest button on the main menu (`src/scenes/MainMenuScene.ts:280-330`). A missed day resets the ladder to day 1 (`nextStreak` returns 1). Audit also says it can be claimed twice a local day because of a UTC/local key mismatch (`STATE-AUDIT.md:427`). D-18 plans "pause instead of reset" (P6).
- [V] **Gravity Run (endless):** `RunSelectScene` offers ENDLESS (random seed, personal best) and WEEKLY CHALLENGE (`src/scenes/RunSelectScene.ts:40-60`); `EndlessScene` has both modes (`EndlessScene.ts:82,98-99,144`). Weekly seed is `gw<floor(localDays/7)>` (`src/utils/endless.ts:31-34`), which resets at **Thursday local midnight** (epoch weekday); score = `floor(distance/10) + 25 x stars` (`endless.ts:80-82`); run payout `min(60, floor(score/40))` Stardust (`endless.ts:86-88`). Pause button exists in the run (`EndlessScene.ts:169`, P00-T10).
- [V] **Weekly leaderboard is local only:** `src/utils/Leaderboard.ts:1-60` stores to localStorage; yet the hub card still reads "Same run for everyone" (`RunSelectScene.ts:54`) and `docs/store/listing.md` still claims "weekly challenge leaderboard". STATUS lists this as open bug B-07 (metadata-policy risk), fixed by P00-T25 (`docs/STATUS.md:86`). Revived runs do not post to the weekly board (`EndlessScene.ts:424-431`).
- [V] **Achievements:** 14 definitions, all passive (`src/utils/achievements.ts:24-38`); toast + Stardust/Fragment rewards (`src/utils/Rewards.ts:40-46`); `AchievementsScene`. No Play Games mapping.
- [V] **Win streaks:** FLOW (3) / BLAZE (5) / NOVA (8) tiers, Stardust bonus 10/20/35/60 at 3/5/8/12 (`retention.config.ts:26-55`, `src/utils/streak.ts`); a campaign death resets it (`GameScene.ts:1664-1680`).
- [V] **Ghost:** personal-best ball path per campaign level, drawn as a faint trail (`src/utils/GhostStore.ts:1-20`, `GameScene.ts:151-155,264-268,669-672`). Not a racing ghost; off under reduced motion (audit).
- [V] **Near-miss lines** ("SO CLOSE", "from 3 stars - retry?") `retention.config.ts:57-66`; first-win hero beat; store nudge on every 6th eligible win (`src/config/monetization.config.ts:293-300`).
- [V] **Share:** Web Share then clipboard fallback, only on the Gravity Run result (`src/utils/Share.ts:11-35`, `EndlessScene.ts:569`); `@capacitor/share` is not installed.
- [V] **NOT built (no code, no dependency):** local notifications, Play Games Services (leaderboards, achievements, cloud/Saved Games), cloud save, Remote Config / A-B testing, in-app review, missions, events or seasons, level packs, friends/ghost racing, comeback gift. Proof: `package.json` has none of `@capacitor/local-notifications`, `@capacitor/share`, `firebase remote-config`, PGS; grep of `src/` for notification / PGS / cloud-save / remote-config strings returns nothing except the Share comment; `android/app/src/main/java/` holds only `MainActivity.java` and `ConsentSignalsPlugin.java`.
- [P] Planned by phase (see section 7): local notifications opt-in, at most 1/day, at most 4/week (D-15, P6); Daily v2 with 3 tiers per date, unlimited attempts, one payout per day, spoiler-free share card, gated after World 1 (D-21, A-16, P6); login ladder pauses (D-18); missions (3/day), weekly "Orbit" milestone track, mastery collections/boss seals, achievements v2 (26) and In-App Review (M2) (`docs/design/RETENTION.md:11-27,421`); PGS v2 boards (Weekly Run + Endless all-time) through a local Java plugin with `weekKey` moved to Sunday 07:00 UTC (D-17, A-13, P8); `mergeSave()` built in P6 and wired to PGS Saved Games in P8 (A-09); share cards/challenge links (P9); event calendar, weekly modifier rotation, seasonal palettes via Remote Config (P10). Battle pass, event currency, Firestore boards, friend ghosts, referral are DEFERRED (D-30).

### Inferences
- The report's "design a daily challenge mode", "weekly challenge mode" and "daily login reward" are not gaps; they are built and awaiting rework (P6) and honest copy (P00-T25).
- The retention gap that matters is the one the audit named "the biggest": zero re-engagement channels (no notifications), plus no way to measure retention until consent-safe analytics (T23, P6) land.

### Gaps
- Whether the login chest, Daily and Weekly behave correctly on a physical Android device is untested (device checklist rows are the owner's).
- I did not run the app; behaviour was read from code and from the audit's headless run.

---

## 4. What are the economy and monetization (products, ads, caps, rewarded placements)?

### Takeaway
Cosmetic-only, ethics-first monetization is built in code: two earn-only soft currencies (Stardust, Cosmic Fragments), 28 cosmetics, 4 IAP products (Remove Ads + 3 cosmetic bundles), 4 rewarded-ad placements, and a gated post-win interstitial. It cannot earn yet: real AdMob and RevenueCat ids are empty and the dashboards are owner work. There is no energy, no lives, no purchasable currency, no hint sales, and no watch-ad-to-retry in the campaign.

### Cited Findings
- [V] **Currencies.** Stardust (soft): campaign win = 5 + 3 per star, Daily win = 15 + 3 per star (`src/utils/currency.ts:5-8`), plus streak/login/achievement/run payouts (section 3). Cosmic Fragments (called "premium" in code) are earn-only: achievements, collection and star milestones, login chest, and one rewarded ad per day for +5 (`src/scenes/CosmeticsScene.ts:45,334-375`). Neither is purchasable; no IAP sells currency (`src/config/monetization.config.ts:212-216`, BUNDLES).
- [V] **Cosmetics: 28** (16 skins, 6 trails, 6 arrivals) in 6 collections `classic, cosmic, cyber, mythic, trails, arrivals` (`src/utils/cosmetics.ts:49-87`; `src/config/cosmetics.config.ts:5-22`). Stardust catalog: 6 items totalling 440 Stardust (Ember 40, Mint 40, Ion 70, Pulsar 70, Solar 110, Neon Core 110). Fragment items sum to 700 Fragments (14 items, 25-100 each). 5 items are bundle-only. Audit: the Stardust sink is exhausted by about L25-30 (about 2,500 Stardust unspendable by end of campaign), so the 2x ad and nudges lose meaning (`STATE-AUDIT.md:431-443`). Planned fix is D-23 (merge into one Stardust at x10, PROPOSED, P7).
- [V] **IAP products (4), all non-consumable** (`src/services/entitlements.ts:25-33`, `src/config/monetization.config.ts:132-153,212-216`): `remove_ads` (entitlement `no_ads`), `starter_pack` (no_ads + Galaxy Trail, tagged BEST VALUE, hidden when no_ads is owned through another product, A-24), `premium_collection_pack` (Black Hole skin + Lightning Strike arrival), `founders_pack` (no_ads + Phoenix Core + Dragon Heart). RevenueCat offering `default`, entitlements `no_ads, pack_starter, pack_premium_collection, pack_founders`. No price lives in code: only store `priceString` is shown (`monetization.config.ts:190-192`, D-09). Cosmetic ownership is derived from active entitlements, not granted locally. Web builds never sell: buy/restore resolve "unavailable" and the shop says "Available in the Android app" (`monetization.config.ts:224-232`).
- [V] **IDs are placeholders by design (T20).** `ADMOB_PROD` is empty strings (`monetization.config.ts:29-33`), `REVENUECAT_API_KEY_PROD` is `''` (line 41). Only the exact Vite mode `release` selects PROD; every other mode uses Google's public test ids (lines 20-24, 51-55). `npm run release:check` / `build:release` refuse empty or test ids, a non-`goog_` RevenueCat key, debug UMP overrides and a versionCode not above the last upload (`package.json:11-12,26`; `docs/STATUS.md:58,66`). On a device today, IAP stays "unconfigured" until the owner pastes the public `goog_` key (`docs/STATUS.md:57,80`). Owner gate state: AdMob and RevenueCat dashboards UNKNOWN; real ids OPEN.
- [V] **Rewarded placements (exactly 4), all opt-in, hidden unless an ad is loaded** (`src/ui/adOffer.ts`, `Ads.isRewardedReady()` `src/services/Ads.ts:380-385`; sources `campaign_2x`, `endless_2x`, `endless_revive`, `free_fragments`, `src/services/analyticsEvents.ts:87-91`):
  1. Campaign **2x Stardust** on the win overlay, offered on every non-Daily win with Stardust > 0 and an ad ready, below the panel, auto-advance cancelled (`src/scenes/GameScene.ts:1428-1470`). Cap per D-24 is not yet implemented (see below).
  2. Gravity Run **Revive** on the Run Over screen, once per run, revived runs never post to the weekly board (`EndlessScene.ts:483-494,528-545,424-431`).
  3. Gravity Run **2x** payout on Run Over (`EndlessScene.ts:492,553`).
  4. **Free Fragments** +5 per day in the shop (`CosmeticsScene.ts:334-375`).
  Outcomes come from plugin events with a 5 s watchdog, never from `showRewardVideoAd()` (`monetization.config.ts:75-91`, `Ads.ts:392-410`).
- [V] **No "watch ad to retry after fail" in the campaign.** `triggerDeath` records `level_fail`, resets the streak, plays the fail feedback and restarts the same level 240 ms later with no ad, no prompt and no cost (`GameScene.ts:1664-1699`). The nearest analogue is the Gravity Run Revive. The design forbids ads after a death: "Ads in session 1, after a death, at level start, mid-attempt" are never (`docs/design/MONETIZATION.md:323-345`, B.1; D-24 `DECISIONS.md:374-375`). The only planned fail-relief monetization is a rewarded (or earned-token) bot-route ghost after 6 fails (D-07, `MONETIZATION.md` B.2).
- [V] **No energy, lives, hearts or timers-to-wait.** Grep for energy/lives/hearts/stamina in `src/` finds only unrelated comments. Explicitly rejected: "subscriptions, gacha, energy, paid currency" (`docs/roadmap/MASTER-ROADMAP.md:254`); "Energy, lives, timers, waiting" never monetized (`MONETIZATION.md` B.1). Hints: each level has a free text hint line; hints, route ghosts and progress are never sold (D-07, D-24). Hint tokens (earned: +1 per world, +1 per ten 3-star clears, cap 5) and a route-ghost relief ladder are planned (P3/P7), not built.
- [V] **Interstitial rules at HEAD** (`src/config/monetization.config.ts:69-73`, pure gate `src/services/interstitial.ts:27-35`, glue `src/services/Ads.ts:419-460`):
  - Minimum gap between interstitials: `MIN_GAP_MS` = 180,000 ms (3 min), persisted across launches (the last-shown time is saved; `Ads.ts:52-68`).
  - Session grace: none until `GRACE_LEVELS` = 3 campaign completions in the session AND `GRACE_MS` = 120,000 ms since session start.
  - Suppressed for `no_ads` owners, and after a "flow" win (boss, 3 stars, or win streak at FLOW or higher).
  - Shown only from `advanceAfterWin`, before `scene.restart`, awaited, only if already preloaded; skipped if not ready; skipped (and counted) after a 2x ad; any rewarded view resets the interstitial clock (D-24 plumbing, `GameScene.ts:1185-1213`, `Ads.ts:166`).
  - There is NO per-session or per-day cap and NO lifetime level-12 grace in code yet; those are the P7 tuning targets: no interstitial before lifetime level 12; at least 180 s AND 3 completions since the last full-screen ad; at most 4/session and 10/day; 2x offer at most once per 3 wins and 4 per day; never after a death or failure streak, never at level start (`docs/roadmap/DECISIONS.md:359-375`, `MONETIZATION.md` B.2). Placement moves to "after NEXT" once P3 adds the result screen.
  - Daily and Gravity Run never show interstitials (the Daily returns to menu; Endless has none) - [V] no caller outside `advanceAfterWin`.
- [D] Planned P7 offers and prices (HEURISTIC, owner call): Remove Ads $1.99 to $2.99, Starter $3.99 shown after the World 1 boss, cosmetic-only "twin" SKUs so no-ads owners never pay twice, Supporter Pack $9.99, seasonal packs, Founder's with a static end date; "No-Ads+ rewards without watching" is USER-GATED default off (D-37) because it is an indirect money-to-currency path (`MONETIZATION.md:535-575`). Expected max spend per payer is about $15.97 today (audit) or about $33 in year one under the plan. KPI targets: rewarded opt-in at least 20%, interstitial at most 1.5 per DAU, payer conversion at least 1.5% (`MASTER-ROADMAP.md:250-253`).
- [D] Audience and ads: target audience 13+, content rating "Everyone", no Families policy, `maxAdContentRating = ParentalGuidance`, no child-directed tags (D-25 + A-07; `src/config/monetization.config.ts:57-63`).

### Inferences
- "Remove Ads", cosmetic bundles, rewarded double-reward and revive-style offers (the report's Royal Match / Candy Crush / Pixel Flow lessons) are already implemented in code. The open work is owner dashboard setup, honest labelling/caps (P3/P7) and economy depth (D-23), not building the placements.
- A campaign "watch ad to retry" would contradict the repo's written policy and its own failure-streak protections; it is not "missing", it is rejected.

### Gaps
- Whether Play Console products, RevenueCat entitlements/offering and AdMob units exist is outside the repo (STATUS marks them UNKNOWN/OPEN, `docs/STATUS.md:57-58`).
- No revenue or ad-fill data exists (app unreleased); all revenue/eCPM numbers in design docs are labelled HEURISTIC.

---

## 5. What do analytics and crash reporting cover? Is there a pre-consent queue?

### Takeaway
36 Firebase event builders exist, covering level funnel, retention hooks, shop/IAP lifecycle and ads. Consent-first boot is built (UMP, then Firebase consent mode, then Crashlytics, then ads). There is NO pre-consent analytics queue yet, the reserved custom `session_start` is still sent, there is no `screen_view`, no attempt index and no `level_end`, no user properties and no Remote Config; the fixes are P00-T23 (not done).

### Cited Findings
- [V] Event builders, `src/services/analyticsEvents.ts` (36 `export const`): `level_start`, `level_complete`, `level_fail`, `retry`, `world_start`, `daily_complete`, `session_start`, `daily_start`, `world_complete`, `achievement_unlocked`, `onboarding_complete`, `win_streak`, `streak_broken`, `login_bonus`, `streak_frozen`, `shop_open`, `store_tab`, `bundle_cross_sell`, `store_nudge_shown`, `store_nudge_tapped`, `cosmetic_equip`, `purchase_initiated`, `purchase_completed`, `purchase_failed`, `purchase_pending`, `first_purchase`, `restore`, `rewarded_shown`, `rewarded_earned`, `rewarded_offered`, `interstitial_shown`, `interstitial_suppressed`, `fragment_earned`, `hint_used`, `reward_double_stardust`, `collection_complete` (lines 22-107). `sanitizeParams` only truncates strings to 100 chars (lines 12-19); no name/param lint yet.
- [V] Known defects at HEAD: `session_start` is a Firebase-reserved name and is still defined and fired (`analyticsEvents.ts:39`, `src/scenes/BootScene.ts:35`); no `screen_view` (auto screen reporting disabled in the manifest, `AndroidManifest.xml:49`); `level_start`/`hint_used` fire per attempt; Daily fails log `level` 0 (`GameScene.ts:1669`); no `level_end{attempt, success, cause, duration_ms}`; no Gravity Run events; no currency earn/spend events; no ad-load-failure event; no user properties; no tutorial step events.
- [V] **Pre-consent queue: absent.** `Analytics.track` sends straight to Firebase on native (`src/services/Analytics.ts:41-50`), there is no `analyticsQueue.ts` (`ls src/services` has none), and `applyConsent` carries a comment "P00-T23: flush the pre-consent analytics queue here" (`Analytics.ts:70`). STATUS B-06 repeats: "Still open: the pre-consent analytics queue and `session_start` (P00-T23)" (`docs/STATUS.md:85`).
- [V] **Consent-first boot (T18, A-25):** `bootServices` order = `Consent.resolve()` (UMP), `Analytics.applyConsent` (four Firebase Consent Mode types from the IAB TCF purpose consents; defaults denied in the manifest), `Crash.enable()`, then `Ads.init` only when `canRequestAds` (`src/services/bootServices.ts:1-60`; `docs/roadmap/DECISIONS.md:444`). Settings has "Privacy choices", a privacy-policy link and "Reset analytics data" (`src/services/Analytics.ts:73-79`). Device rows C1-C5 are pending.
- [V] **Crashlytics:** `Crash.ts` installs `window.onerror` and `unhandledrejection` bridges, records message-only exceptions (no stack, no custom keys) and has enable/disable switches (`src/services/Crash.ts:68-113`). Collection is enabled in every consent outcome today; whether that is lawful is an owner legal check (`CRASH_REQUIRES_ANALYTICS_CONSENT = false`, `src/config/consent.config.ts:20`; `docs/STATUS.md:61`). Frame guard, error overlay, stack traces and custom keys are P00-T21 (not done); an uncaught frame error still freezes the game (B-10).
- [P] Analytics plan of record `docs/analytics/ANALYTICS-PLAN.md`: `level_start` / `level_end` with attempt, cause and sim-time duration (A-10 pulls this into P0 step 5), `level_id` plus `level`, 10 user properties, Remote Config seam with clamped `rcConfig.ts`, 14-month retention and BigQuery link, DebugView checklist; its event catalogue targets 57 events inside a cap of at most 70 custom events (`ANALYTICS-PLAN.md:15-26,41-52`).
- [D] D1/D7/D30 can be read from Firebase automatic `first_open`/engagement; classic-retention definition and the dashboard are specified in `docs/roadmap/SUCCESS-METRICS.md:276` (E-01).

### Inferences
- Report advice "finish the analytics queue (T23) and error boundaries (T21)" is accurate and matches the open P0 list. Its "track level start/complete, ad watched, IAP purchase, daily reward claimed" list is already covered by existing events (`level_start`, `level_complete`, `rewarded_*`, `purchase_*`, `login_bonus`, `daily_complete`).
- Retention targets cannot be measured credibly until T23 and the P6 taxonomy land.

### Gaps
- DebugView, Crashlytics stack traces and Firebase consent behaviour on device are unverified (owner rows).

---

## 6. Platform, offline play, release state, owner gates, CI

### Takeaway
Android (Capacitor 8.5.2 WebView) is the product; web is the dev/test target; iOS is deferred. The game plays fully offline on Android (all assets bundled, no network call at boot). Release state: unreleased; one test AAB (versionCode 1) was uploaded by the owner; M0 (internal track) is not reached; CI is green at HEAD.

### Cited Findings
- [V] Stack (facts block, `docs/STATUS.md:15-33`): Phaser 3.90.0, Capacitor core/android 8.5.2, AdMob 8.2.1, RevenueCat 13.7.0, Firebase analytics/crashlytics 8.5.2; Android min/compile/target SDK 24 / 36 / 36; Node 22 CI; `package.json` version 1.0.0, `androidBuild` 1, derived versionName/versionCode 1.0.0 / 1000001.
- [V] **Offline.** The WebView loads the bundled `dist/` (`capacitor.config.ts`: `webDir: 'dist'`, no `server.url`); fonts are self-hosted woff2 (`src/styles/fonts.css`, `assets/fonts/`); there is no `fetch`, `XMLHttpRequest` or `WebSocket` in `src/` (grep, non-test); the only external URL in code is the privacy-policy link (`src/config/platform.config.ts:64`); `public/` holds only `webview-update.html`; no service worker or PWA manifest. Network-dependent pieces degrade safely: offers are hidden when no ad is loaded, purchases resolve "unavailable"/"No connection", and an offline boot just skips the ad init that session (`docs/design/MONETIZATION.md:216-225`). The listing says "Play offline." (`docs/store/listing.md:50`); the launch plan asks to reword it as "Play offline. No Wi-Fi needed to play." because ads and IAP need a network (`docs/launch/STORE-LAUNCH-PLAN.md:209`). The web build on Vercel has no offline caching.
- [V] Platform contract done in code (T09-T13): manifest `appCategory="game"`, portrait lock, `launchMode="singleTop"`, `VIBRATE`, data-extraction rules, `minWebViewVersion 87` (`android/app/src/main/AndroidManifest.xml:12-14,57-58,83`; `capacitor.config.ts:17-25`); Back router and `PauseScene`; background pauses the level and suspends audio; renderer-crash recovery; Preferences save mirror with migrations (`docs/STATUS.md:69`). Device checks pending.
- [V] **Git/CI.** 85 commits since the audit baseline `d3c6aab`. Tags stop at `v1.0.0-rc.1`; no `rc.2` (M0 not reached). `gh run list`: latest CI runs on `master` and `p0-foundation` for HEAD succeeded (5m42s / 5m40s, 2026-10-14); one earlier run deliberately failed to prove the smoke job catches a `console.error` (then reverted). CI jobs: `web` (audit, tsc, vitest + facts check, version check, build), `android-debug` (assembleDebug + version cross-check), `smoke` (Playwright Chromium boot smoke, sharded) (`.github/workflows/ci.yml:20,67,117`). Tests: 74 files / 1515 tests (`docs/STATUS.md:21`; not re-run by me).
- [V] **Boot smoke harness (T24)** boots every scene in Chromium and fails on any `console.error`, page error, failed same-origin request or unhandled rejection; named checks include first-run, screens, list taps/scroll, overlay taps, ad-offers-by-mode, ad-inflight-guard, settings-privacy-web, splash-boot (`scripts/harness/boot-smoke.mjs:1-12`, `scripts/harness/checks/`). It does NOT play levels with scripted input; wins are triggered through DEV hooks (`first-run.mjs:30-36`). There is no tilt anywhere in it.
- [D] **Owner gates** (`docs/STATUS.md:48-64`; opened 2026-10-07 unless noted):
  - Play Console app exists and AAB versionCode 1 uploaded: DONE (owner-reported). Next upload must be at least 1000001.
  - Google Play and Apple developer accounts exist: DONE (owner-reported; Apple only for the iOS track, D-29).
  - Android developer verification status: UNKNOWN, URGENT before next upload.
  - Upload keystore backup (one copy on disk): OPEN, URGENT (R-21).
  - Public payments address / EU DSA trader status: UNKNOWN.
  - Account type and creation date (whether the 12 testers x 14 days closed test applies): UNKNOWN.
  - AdMob and RevenueCat dashboards (4 products Non-consumable, entitlements, offering, `goog_` key): UNKNOWN. Real AdMob + RevenueCat ids in `monetization.config.ts`: OPEN.
  - Naming decision (D-19): PENDING (USER-GATED; gates production not the closed test, A-14).
  - `FORCE_SCALE` on-device A/B: PENDING before M0.
  - Crashlytics-without-consent legal check: PENDING before M0 upload.
  - Stale git stash drop: PENDING. Age Signals plugin by 2026-12-15 (CA AB 1043 on 2027-01-01): SCHEDULED.
  - Data Safety form + privacy policy sign-off: PENDING before M2.
- [D] **Open bugs** (`docs/STATUS.md:77-92`): B-01 IAP (code fixed T16; open until owner key + device rows); B-02 interstitial over gameplay / rewarded hang (fixed in code T19; device rows pending); B-03 frame-rate-dependent physics (Steps 6-7); B-04 Capacitor advisory (FIXED T07); B-05 test ids shipped (guard fixed T20; real ids owner); B-06 consent/analytics (consent fixed T18; queue + `session_start` T23; Data Safety Step 5; Crashlytics legal check); B-07 misleading "leaderboard" copy (T25); B-08 lifecycle/Back/portrait/haptics (T09-T11 done, device checks pending); B-09 wall-clock level clock (Step 6); B-10 uncaught frame error freezes game (T21); B-11 web grants paid items free (FIXED T16/T17); B-12 44 px touch targets render about 40.6 CSS px on 360x800 because of FIT scaling (needs owner decision, P5); B-13 US-state privacy opt-out not mapped to Firebase.
- [D] Milestones (`docs/STATUS.md:41-46`): M0 Truthful Build (P0 + P1; tag `v1.0.0-rc.2`) NOT reached; M1 Closed Beta; M2 Launch Candidate; M3 Live 1.x - all not started.

### Inferences
- A report sentence like "Android Gravity Flow supports offline play" is verified for gameplay; the store-copy nuance is that ads, IAP and (later) boards need connectivity.
- "Data Safety" is the Google Play form and sits in the owner's Step 5 / M2 gates; nothing Apple-specific is scheduled before the Android launch is stable (D-29).

### Gaps
- Dashboards, Play Console state, developer verification and keystore backups cannot be verified from the repo.

---

## 7. Roadmap: phases P0 to P12, execution order, P0 task status, P1 definition, decisions, KPI targets

### Takeaway
The plan of record (2026-10-07) orders work: trust and correctness (P0, P1) before content tooling (P2), the core loop (P3), campaign redesign (P4), UX (P5), then retention (P6), monetization design (P7), Gravity Run 2.0 (P8), social (P9), live ops (P10), brand/ASO (P11), launch (P12). P0 is 21 of 26 tasks done; P1 (fixed-step physics) is entirely ahead.

### Cited Findings
- [D] **Phases** (`docs/roadmap/MASTER-ROADMAP.md:77-336`):
  - **P0 Foundation and launch-blocker correctness:** purchases, ads, consent, platform contract, saves, error boundary, analytics hygiene, honest store copy, versioning (tasks P00-T01 to T26).
  - **P1 Core physics determinism:** own fixed-step loop, one sim clock, kinematics as functions of sim time, per-step checks, same gameplay at 30/60/90/120/144 Hz, replay determinism (D-01 to D-03).
  - **P2 Level engine and QA:** level data model v2 with stable ids, `src/sim/` extraction, headless bot A0-A6, validators, quality report in CI (D-05, D-06).
  - **P3 Core "one more try" loop:** armed clock on first touch, NEXT/RETRY, no auto-advance, instant retry, relief ladder and hints, interstitial after NEXT (D-02, D-07, D-08).
  - **P4 Campaign redesign:** teach/develop/twist/combine/master per world, bots gate CI, bosses as climaxes, finale rebuilt; Worlds 1-3 first (P4-alpha), then waves.
  - **P5 UX/UI, visual and motion:** remove bloom (render is dim), HudScene, quality tiers, tokens v2, components, accessibility; P5-A render fix is pulled early.
  - **P6 Retention and meta:** Daily v2, login pause, missions, achievements v2, local notifications, Remote Config, analytics taxonomy v2, In-App Review, post-game modes.
  - **P7 Monetization design:** single earn-only currency, shop v2, offers, ad caps via Remote Config.
  - **P8 Gravity Run 2.0 and competitive:** chunk pipeline (at least 40 authored), biomes, escalation, pause, PB ghost, local PGS plugin and boards.
  - **P9 Social and viral:** share cards, challenge links, review.
  - **P10 Live-ops seams:** `event_calendar` Remote Config schema, weekly modifiers, seasonal palettes, earned cosmetic drops.
  - **P11 Brand, ASO and store conversion:** naming (USER-GATED), BRAND config, 9:16 screenshots, video, localization, website with `app-ads.txt`.
  - **P12 Launch and post-launch:** production staged rollout 20-50-100%, vitals, weekly review, iOS port track.
- [D] **Execution order** (`docs/roadmap/EXECUTION-ORDER.md:67-98`): Steps 0-5 = P0; 6-7 = P1 (FixedStepper, forces, sim clock, kinematics, input latch, `FORCE_SCALE`; multi-rate harness 30/60/90/120/144 Hz with jitter, bit-identical state, replay determinism, wall-clock lint); **M0**; 8 data model v2; 9 `src/sim` + levelsim A0-A3 + validators; 10 core loop; 11 bot A4-A6 + par; 12 P5-A render; 13 P4-alpha Worlds 1-3; **M1**; 14 brand/store creative (after the owner's naming choice); 15 P4 waves 4-15; 16 P5 system; 17 P6; 18 P7; **M2**; 19 production rollout; 20 P8; 21 P9; 22 P10; 23 iOS. Waits: tuning waits for Step 7, renaming waits for D-19, economy redesign waits for Steps 16-17, Phaser 4 is post-launch.
- [V]/[D] **P0 task status** (git subjects mention `P00-T01` to `T20`, `T17b`, `T24`; `docs/STATUS.md:5,69-72`):

| Task | Title (`docs/roadmap/phases/P00-foundation.md:336-496`) | State |
|---|---|---|
| T01-T06 | STATUS + facts generator; archive docs + RUNBOOK; CLAUDE.md state-free; repo hygiene; versioning (D-20); CI v2 | DONE |
| T07 | Capacitor 8.5.2 family + pins | DONE |
| T08 | AdMob 8.2.1 soak commit | DONE (landed 2026-10-14; device rows A1-A6, C1-C5 to re-run) |
| T09-T13 | Manifest/theme/WebView floor; Back router + PauseScene; background/foreground; renderer-crash recovery; Preferences mirror + backup rules | DONE in code, device checks pending |
| T14-T17 (+T17b) | Services move; entitlement model; IAP rewrite; purchase UI honesty | DONE in code (rows P1-P20 pending) |
| T18 | Consent-first boot + privacy entry points | DONE in code (rows C1-C5 pending) |
| T19 | Ad plumbing (D-24): preload, event-driven rewarded, awaited interstitial | DONE in code (rows A1-A5 pending) |
| T20 | Release configuration guard (test ids vs prod ids, placeholders, `release:check`) | DONE |
| T24 | Boot smoke harness (run first so T21/T22 checks can use it) | DONE (merged; CI job `smoke`) |
| **T21** | Frame guard + error overlay + Crashlytics stack traces | **NOT DONE** |
| **T22** | **Store validation + backups + cleanup** (corrupt or wrong-shaped saves restore from `:bak`; migration 3) | **NOT DONE** |
| **T23** | Analytics hygiene (delete `session_start`, pre-consent queue, `screen_view`, name lint, `level_start`/`level_end`) | **NOT DONE** |
| **T25** | **Honest store copy + Data Safety + privacy-policy drafts** | **NOT DONE** |
| **T26** | **Device checklist + phase close** | **NOT DONE** |

- [D] **P1 definition** (`docs/roadmap/phases/P01-physics.md`): Steps 6-7, 14 tasks P01-T01 to T14 (baseline snapshot, sim constants + `FixedStepper`, pure forces, kinematics, rules/precedence, input latch + state hash, entities as kinematic renderers, GameScene and EndlessScene adoption, global `autoUpdate:false` + lint, DEV hooks, multi-rate harness in CI, replay determinism, after-snapshots and close). `FORCE_SCALE` is a single uniform multiplier on attractor/zone/magnet forces, provisionally **2.08** (the dev display is 120 Hz so the game was authored at about 2.08x nominal), with an owner A/B of 1.0 / 1.5 / 2.08 / 2.2 as a gate before M0 (D-01, A-19, `DECISIONS.md:54-98,438`). Success metrics: bit-identical ball state across 30-144 Hz with jitter, steps per frame exactly 1 at 60 Hz, sim time within one step of wall time, replay hash equal in browser and Node. Order of the fixed step: latch input; kinematics; gates; forces; `world.step`; portals; gem/orbs; win/hazard/timeout/OOB with win winning ties (A-02).
- [D] **Decisions D-01 to D-37 (titles, status)** (`docs/roadmap/DECISIONS.md:12-50`): D-01 Fixed-step physics contract (ACCEPTED); D-02 Simulation starts on first touch; D-03 Per-step checks, win beats hazard; D-04 Zone strength rebalanced (PROPOSED, bot-verified in P4); D-05 Level data model v2 with stable ids; D-06 Shared pure sim + headless QA bot; D-07 Fail-relief ladder + open frontier; D-08 Result screen NEXT/RETRY, no auto-advance; D-09 Entitlement-as-truth purchases, store prices; D-10 Consent-first boot, privacy entry points; D-11 Android platform contract; D-12 Durable saves; D-13 Rendering (no bloom, HUD scene, quality tiers); D-14 Analytics taxonomy v2 + Remote Config; D-15 Local notifications, opt-in, at most 1/day; D-16 Social: share card + in-app review first; D-17 Leaderboards on PGS v2 via local plugin; D-18 Login chest pauses instead of resetting; **D-19 Rename only after naming study + owner choice (USER-GATED)**; D-20 Versioning; D-21 Daily: unlimited attempts, one payout/day, share card; D-22 Gravity Run 2.0 content model; D-23 Single earn-only soft currency (PROPOSED); **D-24 Interstitial and rewarded policy**; **D-25 Target audience 13+ (owner, 2026-10-07)**; D-26 Inverse-square formula unchanged (standing rule); D-27 Quality before count (owner); D-28 Phaser 3.90 for 1.0; D-29 iOS after Android (DEFERRED); D-30 Battle pass, event currency, Firestore boards, friend ghosts (DEFERRED); D-31 Gravity Run unlocks after World 1; D-32 Custom seeds never post scores; D-33 Shipped Endless chunks are frozen; D-34 Stars are per-run; D-35 Services move to `src/services/`; D-36 Tracked Node Playwright scripts replace Python; D-37 "No-Ads+ with rewards without watching" (USER-GATED, default off).
- [D] **Amendments A-01 to A-25** (`DECISIONS.md:418-444`): A-01 arming stops zero-input wins only, Gravity Run arms at scene start; A-02 precedence win > timeout > hazard > out-of-bounds; A-03 ids are permanent name-based slugs; A-04 validator ratchet baseline; A-05 any assist withholds only the par star; A-06 extra products and cosmetic "twin" SKUs, silent restore on fresh Android install; A-07 AdMob rating value is `MaxAdContentRating.ParentalGuidance`; A-08 `@capacitor/preferences` and Endless pause into P0; A-09 `mergeSave()` in P6, PGS wiring in P8; A-10 `level_start`/`level_end` land in P0 step 5; A-11 notification pre-prompt after the 2nd Daily win or first world completion; A-12 Daily share card in P6, In-App Review at M2 (at most once per 60 days, 3 lifetime); A-13 PGS plugin is Java, `weekKey` to Sunday 07:00 UTC in P6; A-14 knockout covers US/EU/UK/IL and the closed test may start under the working title (rename gates production); A-15 milestone tags rc.2/rc.3/rc.4/v1.0.0; A-16 Daily has 3 tiers per date; A-17 Run jitter adds hazard timing; **A-18 retention targets re-baselined to D1 >= 30%, D7 >= 8%, D30 >= 3%** (stretch >= 30 / 10 / 4 in `docs/roadmap/SUCCESS-METRICS.md:183`); A-19 `FORCE_SCALE` 2.08 vs 2.2 gate before M0; A-20 Node Playwright replaces Python; A-21 D-19 covers only the product name, anti-gravity field stays USER-GATED; A-22 rewarded offer sits below NEXT/RETRY; A-23 noisy-expert gate bands per role, frontier opens next world at 80%; A-24 Starter card hidden only when `no_ads` comes from another product; A-25 consent mapping follows TCF purposes, `canRequestAds` never grants Firebase consent.
- [D] **KPI targets** (`MASTER-ROADMAP.md` per phase; `SUCCESS-METRICS.md`): D1 / D7 / D30 >= 30% / 8% / 3% (floor), stretch >= 30 / 10 / 4; Daily participation >= 25% of DAU; notification opt-in >= 35% and disable rate < 3%/week; rewarded opt-in >= 20% of offers, interstitial <= 1.5 per DAU, payer conversion >= 1.5%; Gravity Run runs/DAU >= 1.5 and weekly participation >= 15% of WAU; shares/DAU >= 3%; store conversion >= 30% (organic visitor to install); P0 crash-free sessions >= 99.5% on internal; production crash < 1.09%, ANR < 0.47%. The repo's own benchmark (GameAnalytics 2026 via retention brief) is median D1 about 20-22%, D7 < 4%, D30 about 0.7%; top quartile > 30% / 6-7% / about 1.7%; "D7 >= 10% and D30 >= 4% exceed the published top quartile, so they are stretch targets" (`SUCCESS-METRICS.md:323`).
- [D] Decision on naming (D-19): trademark GRAVITY FLOW Reg. 8,281,133 (Rocketgenius Inc., IC 9 and 42, registered 2026-06-02); two Google Play games carry the name; shortlist Homing Star, Orbitide, Wayward Star; rename before public launch (`docs/launch/NAMING-STUDY.md:1-60`, `RESEARCH-SUMMARY.md:124-126`). Nothing in the repo, package or display name changes until the owner picks (CLAUDE.md; `DECISIONS.md:323-326`). Package id `com.truestorylabs.gravityflow` is permanent.

### Inferences
- "T26 = deterministic physics" and "T25 = final QA harness" in the report do not match any task: deterministic physics is P01 (Steps 6-7); the QA harness work is T24 (done), P01-T12 multi-rate harness, and P2 levelsim.
- P0 will not close until T21, T22, T23, T25 and T26 land; M0 additionally needs P1, the owner device session and the FORCE_SCALE A/B.

### Gaps
- Calendar dates beyond "today" are not committed (no schedule for M0/M1/M2 beyond sequencing and the closed-test 14-day clock if it applies).

---

## 8. What do the existing research briefs and design docs already conclude?

### Takeaway
The repo already contains a seven-brief research pass (all 2026-10-07), a decision register and per-domain designs that cover nearly every theme in the market report: daily/weekly loops, ads and IAP policy, retention benchmarks, live ops, ASO, localization, naming risk. Use "already planned in X" rather than presenting these as new.

### Cited Findings (each 1-3 lines)
- [D] `docs/research/RESEARCH-SUMMARY.md` (decision log; DECISIONS wins on conflict): physics (own fixed step, FORCE_SCALE, remove bloom), Android platform, monetization, game design/level QA, retention/analytics/live ops, UX, store/compliance, naming; 29 listed contradictions and their resolutions; open device/owner questions (section 10).
- [D] `docs/research/monetization.md`: ground truth that the old IAP could not work (wrong plugin name `PurchasesPlugin`, empty key), AdMob plugin semantics (rewarded promise hangs on early close; interstitial resolves before dismissal), consent order, ad policy (no interstitial at level start or mid-play; rewarded needs opt-in and honest labelling), economy (unbuyable Fragments carry the cost of a second currency), rewarded in "stuck" contexts engages 38% vs 24% between levels (Unity, IND), price ethics.
- [D] `docs/research/retention-analytics-liveops.md`: ordered actions: analytics hygiene and consent first; Remote Config fetched during the splash; opt-in local notifications after a value moment (at most 1/day); Daily share grid + In-App Review; PGS v2 with `weekKey` aligned to PGS reset; event calendar as data; defer battle pass, event currency, Firestore boards, friend ghosts. Benchmarks: median D1 about 20-22%, D7 < 4%.
- [D] `docs/research/play-launch-compliance-aso.md`: ordered Play launch checklist; 12 testers x 14 days for personal accounts created after 2023-11-13; developer verification (apps unregistered by 2026-09-30 face removal); payments address becomes public; incomplete Data Safety draft; Texas SB 2420 in force and CA AB 1043 from 2027-01-01 (Age Signals); app-ads.txt needs a domain root; trademark correction (Rocketgenius Reg. 8281133 plus Big Duck Games' FLOW family); ALL-CAPS title and the "leaderboard" claim breach metadata policy.
- [D] `docs/research/game-design.md`: root causes (zones 6.0e-4 beat the attractor's max 4.6e-4; physics speed depends on display rate); teach/develop/twist/master level design; difficulty = successes / attempts, star 3 earned by 25-40% of clearers; fail-relief ladder 3/6/10 fails; bosses; bot QA; endless chunks with mirroring; Daily/Weekly design (unlimited attempts, one payout).
- [D] `docs/research/physics-rendering.md`, `android-capacitor.md`, `ux-visual-motion.md`: fixed-step proof and bloom measurement; Back/lifecycle/edge-to-edge/PGS plugin feasibility; contrast, touch targets, reduced-motion rules.
- [D] `docs/design/MONETIZATION.md`: Part A (P0 plumbing, done in code) and Part B (P7 design): never-monetize list (levels, stars, hints, streak freezes, boards, energy/lives, currency for money, loot boxes, ads after a death), placement table, economy v2, offers/prices, shop UX (try-on, honest labels), KPIs, no battle pass or subscription now.
- [D] `docs/design/RETENTION.md`: one loop with three cadences (daily habit, weekly goal, mastery collection); Daily v2, streaks/freeze, login calendar that pauses, Weekly Orbit, 3 missions/day, mastery collections and boss seals, achievements v2 (26), comeback gift, notifications (at most 1/day, 4/week, quiet hours), anti-spam guarantees.
- [D] `docs/design/LIVE-OPS.md`: seams not a platform: `event_calendar` Remote Config JSON, weekly modifier catalogue (8) with a built-in offline rotation, 4 seasons/year via `worldThemes`, earned cosmetics and a vault, event currency deferred, one 2-hour sitting a month for a solo developer.
- [D] `docs/design/GRAVITY-RUN.md`: Run 2.0 = authored chunks x mirror x bot jitter (20 to at least 40), biomes, rest chunks, escalation by composition, PGS boards, PB ghost; unlocks after World 1 (D-31). `docs/design/SOCIAL-VIRAL.md`: spoiler-free Daily share card, In-App Review, weekly-seed App Links on a user site/custom domain; referral rewards and friend ghosts deferred.
- [D] `docs/design/GAMEPLAY-DESIGN.md`: core loop, campaign world bible and sawtooth difficulty; the "bring the star home" story spine and the false-ending problem at L80. `docs/design/UX-UI-MOTION.md`: tokens v2, 48 px targets, HudScene, motion vocabulary, accessibility (toggle-hold).
- [D] `docs/launch/STORE-LAUNCH-PLAN.md`: ordered owner/Claude checklist, store copy fixes (title case, no "leaderboard"), keyword plan (gravity puzzle, physics puzzle, one-touch, space puzzle, brain teaser, offline puzzle game, endless mode, daily challenge, star map), localization order es-419, pt-BR, then de-DE, fr-FR, ja-JP, ko-KR, id, tr-TR, hi-IN (game text stays English), 9:16 captioned screenshots after the render fix, paid UA at scale deferred (`STORE-LAUNCH-PLAN.md:199-285`, `P11-brand-aso.md:35,128-132`).
- [D] `docs/launch/NAMING-STUDY.md`: GRAVITY FLOW is registered by Rocketgenius (IC 9/42), has zero store distinctiveness, rename before public launch; shortlist Homing Star, Orbitide, Wayward Star; owner decision.
- [D] `docs/analytics/ANALYTICS-PLAN.md`: taxonomy v2 (`level_end` with attempt, cause, sim-time duration; stable `level_id`), 10 user properties, Remote Config, A/B policy, Crashlytics keys, BigQuery, DebugView checklist.
- [D] `docs/audit/2026-10-07/STATE-AUDIT.md`: "polished indie, low end"; ranked blockers (IAP non-functional, interstitial over gameplay, frame-rate-dependent physics, Capacitor advisory, consent, misleading leaderboard claim); 150 levels flat at about 2/10; recommended next step "First 20 Players" (make it trustworthy on a real phone, start the closed test).
- [D] `docs/roadmap/FEATURE-MATRIX.md`, `RISK-REGISTER.md`, `SUCCESS-METRICS.md`: scored backlog, 44+ risks, metric definitions (not summarised in depth here).

### Inferences
- Nearly every competitor lesson in the market report maps to an existing design section; the report adds no Gravity-Flow-specific idea that is absent from `docs/design/*` except a "new level pack every 1-2 weeks" cadence (the repo caps live-ops at a monthly solo-dev cadence, `LIVE-OPS.md` section 10).

### Gaps
- I read headers, intros and key sections of the long design docs, not every line of the 700 KB of planning docs; deep sub-sections (e.g. RETENTION sections 5-14, MONETIZATION B.6-B.12) were sampled.

---

## 9. Claim-by-claim audit of `docs/research/deep-research-report.md` statements about Gravity Flow

### Takeaway
Of about 45 Gravity Flow statements, roughly a third are accurate in intent, a third are partly right but mis-specified (task numbers, targets, "new" features that exist), and about a quarter are wrong or outdated (tilt/swipe mechanic, "Apple's Data Safety", energy, star packs, ad-to-retry, T25/T26/T22 meanings, 30Hz/60Hz-only). Competitor-only statements (the 12-game table, UA industry claims) are out of scope here.

### Cited Findings
Labels: **Verified**, **Partly supported**, **Unverified**, **Incorrect/outdated**, **N/A** (not about Gravity Flow). Line numbers are the report's. "Evidence" cites sections above or files.

| # | Report line | Claim about Gravity Flow | Label | Evidence and correction |
|---|---|---|---|---|
| 1 | 3 | The report "guide[s] the Gravity Flow project" | N/A | Scope statement |
| 2 | 10 | "Prioritize robust tech and release QA first (as being done)" | Verified | P0 foundation is in progress (T01-T20, T24 done); `docs/STATUS.md:5,69-72` |
| 3 | 10 | "Next: build out core gameplay loops and retention systems (daily tasks, analytics) before heavy new features" | Partly supported | Order is P1 physics, P2 level QA, P3 core loop, P4 campaign, then P6 retention after M1 (`EXECUTION-ORDER.md:67-98`); daily/login/analytics already exist; retention is not the very next step |
| 4 | 10 | "Introduce ads/IAP only after core loop is fun and stable" | Incorrect/outdated | Ads and IAP plumbing is already in the build (T14-T20; D-24 plumbing is P0); only monetization design (P7) is sequenced later; real ids gated by owner |
| 5 | 10 | "Prepare to iterate on levels using competitor insights (avoid speed-sensitive physics issues, test on multiple frame rates)" | Verified | B-03 open; D-01; harness 30/60/90/120/144 Hz planned (P01) |
| 6 | 10 | "Key tasks include finalizing analytics/consent" | Partly supported | Consent done in code (T18, device rows pending); analytics hygiene T23 open |
| 7 | 10 | Key task: "designing a daily challenge mode" | Incorrect/outdated | Daily Challenge exists (`DailyStore.ts:81-90`, `dailyLevels.ts:9`); Daily v2 rework is P6 |
| 8 | 10 | Key task: low-friction IAP flow "Remove Ads and cosmetic boosts" | Partly supported | Remove Ads + 3 cosmetic bundles built (T14-T17); "boosts" do not exist and are never sold (no pay-to-win) |
| 9 | 37 | "Gravity Flow's tilt-gravity mechanic" requires a tutorial then escalating challenge | Incorrect/outdated | Mechanic is hold-and-drag attractor, no tilt (section 1). Tutorial exists (L1 CoachMark); escalation is weak today (flat about 2/10, P4 to fix) |
| 10 | 39 | Should add progression rewards (new levels/themes unlocked by completing puzzles) | Verified (already implemented) | 15 worlds with sequential unlock, themed palettes, Star Map, cosmetics (`ProgressStore.ts:76-79`, `worldThemes.ts`); weakness: Stardust sinks dry up by about L25-30 and no world ceremony yet |
| 11 | 41 | Recommended approach: rewarded video sparingly, e.g. double-reward offers or second chances | Verified (already implemented) | Four rewarded placements: campaign 2x, Endless 2x and revive, Free Fragments (section 4) |
| 12 | 41 | "Always provide a paid option to remove ads" | Verified (in code) | `remove_ads` product, `no_ads` entitlement; not live until owner dashboards |
| 13 | 41 | "T19/T20 set placeholders for ad IDs and IAP keys - fill with real values before release, but only after UI flows are fully tested" | Partly supported | T20 = release config guard with empty `ADMOB_PROD` / `REVENUECAT_API_KEY_PROD` (`monetization.config.ts:29-41`); T19 = ad plumbing (preload, events), not placeholders; both DONE, not "upcoming"; real ids are an owner gate before the M0 release AAB (`STATUS.md:58`), and Google test ids are used for device/UI testing in non-release builds, so "after UI flows tested" is not the stated rule |
| 14 | 43 | Plan at least a "Daily Reward (login bonus)" system | Incorrect/outdated | Built: 7-day ladder, once per day (`DailyStore.ts:151-163`, `retention.config.ts:82-90`) |
| 15 | 43 | Periodic challenges and a new level pack every 1-2 weeks | Partly supported | Daily + Weekly challenges exist. Level packs: not built; "Expert packs"/new worlds are "must not be done yet"; live-ops cadence is monthly solo-dev (`MASTER-ROADMAP.md:183`, `LIVE-OPS.md` section 10) |
| 16 | 43 | "Analytics should track D1, D7 retention" | Verified (planned) | SUCCESS-METRICS E-01; Firebase automatic events; targets A-18 |
| 17 | 45 | Ad creatives should showcase "Gravity Flow's core mechanics and humor" | Unverified | Core mechanic: yes (hold to pull). Humor: not part of the brand or store plan (premium cosmic, "elegant, subtle" juice per CLAUDE.md); only incidental light copy. Paid UA at scale is "must not do yet" (P11) |
| 18 | 45 | Prepare Spanish/Portuguese localizations | Verified (planned) | es-419 and pt-BR are first in the localization order; in-game text stays English for 1.0 (`STORE-LAUNCH-PLAN.md:279-285`) |
| 19 | 47 | Store page hook should be "swipe gravity to guide the star" | Incorrect/outdated | Actual hook: "Hold to pull a lost star home" (`docs/store/listing.md`, `aso.md`); input is hold/drag, never swipe |
| 20 | 47 | Store page should mention offline support | Verified | `listing.md:50` "Play offline."; fully offline on Android; launch plan refines wording (`STORE-LAUNCH-PLAN.md:209`) |
| 21 | 47 | Keywords like "Puzzle", "Brain", "Relaxing" | Partly supported | `aso.md` lists relaxing puzzle game, brain teaser; core plan is gravity/physics/one-touch/space puzzle (`STORE-LAUNCH-PLAN.md:214-219`); report's later "match puzzle, tilt" keywords (row 41) are wrong |
| 22 | 47 | "consider Apple's 'Data Safety' requirements" | Incorrect/outdated | Data safety is Google Play's form (owner gate, M2: `STATUS.md:64`); Apple uses App Privacy labels; iOS is deferred (D-29) |
| 23 | 47 | Review family-targeting policies: content is "Everyone", "likely 13+ audience to allow personalized ads" | Partly supported | Decided, not "likely": D-25 target audience 13+ (owner, 2026-10-07), content rating Everyone, no Families policy, `maxAdContentRating` ParentalGuidance. Personalization is governed by UMP/TCF consent (A-25), not by age alone |
| 24 | 74-89 | Funnel: "First Level Tutorial" then "Core Levels: Guide Star to Goal" | Partly supported | L1 CoachMark tutorial is real; "guide" is indirect (player moves gravity, not the star) |
| 25 | 79-80 | On fail: "Offer: Retry or Watch Ad" | Incorrect/outdated | Campaign death restarts instantly in 240 ms with no ad (`GameScene.ts:1664-1699`); ads after a death are policy-forbidden; Gravity Run offers Revive only |
| 26 | 81-82 | On success: "Earn Score/Badge", then "Unlock New Chapters/Areas" | Verified | Stars, achievements, Stardust; sequential unlock of worlds |
| 27 | 84 | "Store Offer: Remove Ads / Buy Skins" | Verified | Shop (`CosmeticsScene.ts`) and Settings; skins are Stardust/Fragment/bundle items |
| 28 | 85-86 | "Daily Challenge / Level Pack" with "Rewards: Coins/Cosmetics" | Partly supported | Daily exists and pays Stardust; level packs do not exist |
| 29 | 87 | Analytics events for level completion and ads watched | Verified | `level_complete`, `rewarded_shown`, `rewarded_earned` exist |
| 30 | 91 | Offer an optional reward ad to respawn and IAPs like "star packs" or skins | Incorrect/outdated | Respawn-by-ad exists only in Gravity Run; "star packs" (currency/score packs) contradict D-23 and D-07 (money never buys currency, stars, hints or progress); skins/bundles exist |
| 31 | 95 | "Gravity Flow's hybrid model (we plan to include both) aligns with this trend" | Verified | Ads + IAP both in code |
| 32 | 99 | Industry D1 about 25-35%, D7 about 5-15%; Gravity Flow must optimize first session | Partly supported | First-session optimisation is on the plan (splash fast path P5, frictionless L1). The benchmark conflicts with the repo's cited GameAnalytics 2026 medians (D1 about 20-22%, D7 < 4%, D30 about 0.7%; `SUCCESS-METRICS.md:323`) |
| 33 | 101 | "Gravity Flow should ... give a small free star or energy daily, then offer more via ads or IAP" | Incorrect/outdated | Energy is explicitly rejected (`MASTER-ROADMAP.md:254`). A small free daily reward exists (login chest; free Fragments via rewarded ad). Selling more currency is rejected (D-23) |
| 34 | 109 | P0: fixed timestep, "gravity-tilting puzzle", smooth one-finger control, passes smoke tests; success metric deterministic physics, "no force scaling issues"; depends on "T24 Boot Smoke Harness completed" | Partly supported | Fixed timestep and determinism: Verified plan (D-01, P1). "Tilting": wrong. One-finger: true. T24: DONE and in CI. "Force scaling" is the `FORCE_SCALE` A/B gate |
| 35 | 110 | P0 Retention: daily login reward and weekly challenge mode; "small coins on login"; new puzzle "packs" regularly; D1 >= 30%, D7 >= 10% "(industry averages)" | Partly supported | Login bonus and Weekly Challenge already exist; packs not planned at that cadence. Targets: D1 >= 30% matches A-18; D7 >= 10% is the stretch value (A-18 floor is 8%); they are not "industry averages" (they are top-quartile or above, `SUCCESS-METRICS.md:323`) |
| 36 | 111 | P0 Monetization: rewarded "watch ad to retry" after fail; "Remove Ads" IAP; one or two cosmetic/currency bundles; placeholder plan for AdMob/RevenueCat IDs; A/B test ad frequency; ad load success > 90%; depends on AdMob/RevenueCat integration (user tasks) | Partly supported | Remove Ads and 3 cosmetic bundles built; placeholders + owner gate real; A/B via Remote Config is P7 (plugin not installed); "retry by ad" and "currency bundles" are rejected by design; "ad load success > 90%" is not a repo KPI and has no event today |
| 37 | 112 | P1 Onboarding: "very brief tutorial emphasizing tilt gestures", "one-tap ethos", game must not crash or hang; tutorial completion > 90%, level-3 play-through > 80% | Partly supported | Wrong gesture. Crash/hang goal is real (B-10, T21 open). No tutorial telemetry exists; targets are not in the repo |
| 38 | 113 | P1 Analytics: finish the analytics queue (T23) and error boundaries (T21); track level start/complete, ad watched, IAP purchase, daily reward claimed; capture >= 95% of sessions; Crashlytics alerts | Partly supported | T21 and T23 correctly identified and both open. Listed events already exist (`login_bonus`, `daily_complete`, `purchase_completed`, `rewarded_earned`). "95% of sessions" is not a repo target (crash-free >= 99.5% on internal) |
| 39 | 114 | P2 Level design: early levels easy then curve up; test physics on 30Hz/60Hz; "After T26 (deterministic physics)"; depends on "T25 final QA harness" | Incorrect/outdated | T26 = device checklist and phase close; T25 = honest store copy + Data Safety/privacy drafts (`P00-foundation.md:486-496`). Determinism is P01 Steps 6-7; harness is multi-rate 30/60/90/120/144 Hz + jitter (not just 30/60); bot QA is P2 |
| 40 | 115 | P2 UI polish: particle effects, smooth animations, balance audio/music (see critique of bloom) | Partly supported | Particle/juice already exist; bloom removal is D-13/P5-A (Step 12); audio is Web Audio synth (SFX + pad), a real soundtrack is only an audit idea |
| 41 | 116 | P3 ASO: subtitle/icon change (trademark note suggests rename), keywords "match puzzle, tilt", install-rate > 5%, depends on name finalization | Partly supported | Rename gate is correct (D-19). Keywords are wrong ("match puzzle", "tilt"). Repo target is store listing conversion >= 30% organic (`MASTER-ROADMAP.md:318`), not 5% |
| 42 | 122 | "Finalize the Fixed Timestep (Step 6) so the same inputs yield identical outcomes ... avoids stronger jumps on fast devices" | Verified (jumps wording off) | Step 6 = FixedStepper (`EXECUTION-ORDER.md:77`); effect is stronger pull at high refresh, not jumps; replay tests planned (P01-T13) |
| 43 | 123 | "Boot-smoke harness (T24) ... on each commit: load the game, auto-tilt through a few levels, exit gracefully" | Partly supported | Harness exists, runs in CI on every push (`ci.yml:117`); it boots scenes and checks console errors, no tilt and no level play-through |
| 44 | 124 | "simulate different tilt speeds and ensure all levels are solvable in under ~60s"; "test save/restore: quitting mid-level and resuming works flawlessly (per T22)" | Incorrect/outdated | No tilt; bots A0-A6 verify solvability by agents (no 60 s rule; bots solve in 1-8 s). T22 is store validation/backups; there is no mid-level save or resume (levels restart; pause overlay only holds in-session state) |
| 45 | 125 | Run focus groups; show ads after 2-3 fails rather than immediately | Partly supported | Policy is stricter: no interstitial after a death or failure streak (D-24); validation is the M1 closed test with telemetry |
| 46 | 129 | Screenshots "showing the tilted star in action"; trailer with "gameplay and story elements" | Partly supported | Wrong mechanic wording; P11 trailer is 15-30 s muted-first led by "Hold to pull the star"; story is a light "bring the lost star home" spine |
| 47 | 134 | "The groundwork being laid (release guards, analytics, error handling) is solid" | Partly supported | Release guard: done. Analytics hygiene (T23) and error handling (T21) are not yet done |

### Inferences
- Accurate: the P0-before-features ordering, T24 smoke harness, T21/T23 identification, fixed timestep, naming gate, 13+ audience (though decided), hybrid ads+IAP, localization, offline.
- Wrong or stale: tilt/swipe mechanic (rows 9, 19, 34, 37, 43, 44, 46), task meanings T22/T25/T26 (rows 39, 44), Apple Data Safety (22), energy (33), star packs (30), ad-to-retry in campaign (25, 30, 36), "Daily/Weekly/login are to be designed" (7, 14, 35), "ads/IAP later" (4), 30/60 Hz only (39), benchmark labels (32, 35).
- A report writer should correct these rather than propagate them: the likely largest credibility risk is the "tilt-gravity" description repeated six times.

### Gaps
- Competitor statistics (downloads, ratings, revenue, UA channel claims) were out of scope and not checked here.

---

## 10. Already implemented versus genuinely new (for judging competitor lessons)

### Takeaway
Most "standard puzzle-game retention and monetization" lessons are already built or already scheduled with a design of record. Genuinely not present anywhere (code, plan or decision) are few.

### Cited Findings
| Lesson (typical competitor pattern) | State in Gravity Flow | Where |
|---|---|---|
| Daily login reward | Implemented (resets on a miss; pause planned P6) | `DailyStore.ts:151`, D-18 |
| Daily challenge with streak and freeze | Implemented; Daily v2 planned (P6) | `daily.ts`, D-21 |
| Weekly challenge / seasonal leaderboard | Implemented as Gravity Run Weekly (local best); PGS boards P8 | `RunSelectScene.ts`, D-17 |
| Streak and momentum mechanics | Implemented (win streak tiers, daily streak, earned freeze) | `streak.ts`, `retention.config.ts` |
| Achievements | 14 built; v2 (26, PGS-mappable) planned | `achievements.ts`, RETENTION section 8 |
| Rewarded double-reward, revive, free-currency ads | Implemented (4 placements) | section 4 |
| Interstitial with cooldown and protection | Implemented (180 s, grace, flow-protect); full caps + "after NEXT" planned | `monetization.config.ts:69`, D-24 |
| Remove Ads IAP, cosmetic bundles | Implemented in code; owner dashboard/ids pending | section 4 |
| Cosmetic shop, rarity, collections | Implemented (28 items); economy v2 planned | `cosmetics.ts` |
| Offline play | Implemented (Android) | section 6 |
| First-run tutorial / easy early levels | Implemented (L1 coach mark, hints); telemetry planned | `GameScene.ts:875` |
| Level/world progression and map | Implemented (Star Map, 15 worlds) | `worlds.ts` |
| Fail relief / hints / skip | NOT built; designed (relief ladder, hint tokens, route ghost) | D-07, P3/P7 |
| Win screen with NEXT/RETRY | NOT built (auto-advance); planned | D-08, P3 |
| Local notifications / win-back | NOT built; designed | D-15, RETENTION section 12 |
| Remote Config, A/B testing | NOT built; designed | D-14, ANALYTICS-PLAN section 10-11 |
| Cloud save, PGS achievements/boards | NOT built; designed | D-12, D-17, A-09 |
| Share card, in-app review, deep links | NOT built (clipboard only); designed | D-16, SOCIAL-VIRAL |
| Live events, seasons, modifiers | NOT built; designed as data seams | D-30, LIVE-OPS |
| Missions/quests | NOT built; designed (3/day) | RETENTION section 6 |
| Meta-decor / story progression (Royal Match, Gossip Harbor style) | NOT present; closest are Star Map + cosmetics + planned world mastery trails and boss seals | RETENTION section 7 |
| Energy / lives / paid currency / star packs | REJECTED by decision | MASTER-ROADMAP P7 must-not, D-23 |
| Campaign "watch ad to retry" | NOT built and contradicts policy | D-24, MONETIZATION B.1 |
| New level pack every 1-2 weeks | NOT planned at that cadence (quality before count; monthly live-ops) | D-27, LIVE-OPS section 10 |
| Playable ads / paid UA at scale | DEFERRED until metrics justify | P11 must-not, SUCCESS-METRICS section on UA gates |
| Localized in-game text | NOT planned for 1.0 (store listing only) | STORE-LAUNCH-PLAN section 8 |
| iOS | DEFERRED until Android is stable | D-29 |
| Frame-rate-independent physics | NOT built; top P0/P1 item | B-03, D-01 |

### Inferences
- The competitor-lesson list for Gravity Flow should be framed as "what to prioritise and how to tune", not "what to build": the genuinely absent systems are all already designed in `docs/design/` and sequenced behind M0/M1.

### Gaps
- Nothing here measures how well the built systems perform with real players; no player has used the game outside the developer.
