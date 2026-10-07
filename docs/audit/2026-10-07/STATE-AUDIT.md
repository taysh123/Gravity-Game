# GRAVITY FLOW — Full State Recovery & Product Strategy Audit

> **Archived baseline (2026-10-07).** The machine-readable level inventory from this audit is committed at `docs/audit/2026-10-07/inventory/`. Paths below like `<audit-scratch>/…` point at the session scratch area and are *not* in the repo. Forward planning lives in `docs/roadmap/`.

**Date:** 2026-10-07 · **Repo:** https://github.com/taysh123/Gravity-Game · **Audited commit:** `master @ d3c6aab` (2026-07-02)
**Method:** read-only audit. Nothing in the repo was modified. 9 parallel specialist audits (content inventory, two level-design reviews, monetization, retention/journey, UX/UI, technical/QA, store/docs, market/policy research), with every high-impact claim spot-verified against code by the lead. Machine-readable content inventory: see §C.0.
**Evidence labels:** **[V]** verified against code/git/build/measurement · **[I]** inferred from code or heuristics · **[D]** needs a physical device / external account to confirm.

---

## A. Executive Summary

**What it is.** GRAVITY FLOW (studio: True Story Labs) is a one-touch cosmic physics puzzler: the player never moves the ball — press-and-hold creates an inverse-square gravity attractor, drag moves it, release drops it. Phaser 3.90 + TypeScript + Matter.js + Vite, wrapped for Android with Capacitor 8. Content: **150 levels / 15 worlds / 7 mechanics**, 3-star mastery, a Star Map, a Daily Challenge, Gravity Run (Endless + Weekly), 14 achievements, 28 cosmetics, dual currency, AdMob + RevenueCat + Firebase.

**Where it really stands.** Nothing was committed during the 3-month pause. The codebase is clean, well-structured and green (`tsc` clean, **221/221 tests**, reproducible build). A signed AAB built from HEAD exists (2026-08-01). The game is **not on Google Play** as far as the repo shows. The docs think the project is "~99% repo-side ready". **It is not.** The audit found:

1. **The monetization stack would earn $0 on a device and has hard bugs.** RevenueCat is registered under the wrong native plugin name (`'PurchasesPlugin'` vs native `"Purchases"`) and the API key is empty, so every purchase/restore fails. AdMob uses Google test IDs. Interstitials load *after* the next level starts, so they cover live gameplay and can cause timeout deaths. Rewarded promises never settle if the ad is closed early (player stuck on the win overlay). Restore never re-grants paid bundle cosmetics. **[V]**
2. **The core physics is frame-rate dependent.** Forces are applied per render frame while Matter steps on a fixed 60 Hz accumulator, so the pull is **~2× stronger at 120 Hz and ~½ at 30 fps** (measured 0.41 / 0.85 / 1.87 / 2.29 velocity at 30 / 60 / 120 / 144 Hz). Every par time and timer was tuned at 60 Hz. **[V]** (device refresh behavior [D])
3. **Platform/compliance gaps that Play/AdMob care about:** no Android Back handling (Back exits the app mid-level), no portrait lock, no pause on background, level clock keeps running during Settings/background/ads, analytics fires before consent, no GDPR privacy-options entry point, no in-app privacy link, an under-declared Data Safety draft, an undecided target audience, `@capacitor/android 8.4.0` with a **critical security advisory** (fixed in 8.4.3), and a **store listing that claims a shared weekly leaderboard that is local-only**. **[V]**
4. **The campaign is broad but shallow.** A headless replay of W1–8 (Phaser's own Matter, scripted bot players) shows:
   - **Many levels play themselves or fall to one nudge**: L11 and L12 win with zero input, L11 for 3★; L80 "HOMECOMING" is won 82% of the time by a single 0.4 s nudge.
   - **Wall-hug lanes bypass most hazard and platform levels.** Saws stop at x=60/300, and the platform bars have no side walls.
   - **Par is meaningless.** Bots clear in 1–8 s against pars of 12–20 s, so the 3rd star is nearly free.
   - **Effective difficulty is flat at ~2/10** across W1–8.

   Worlds 9–15 are sparser still:
   - 7+ levels are near-byte copies of earlier ones.
   - Three bosses share one template.
   - **The finale L150 is a remake of the L80 boss**, down to the identical hint string. L80 is literally titled "HOMECOMING" and plays as a false ending at the halfway point.

   The good news: almost all of this is **fixable with data-only edits plus one tracked level-QA bot**. **[V/sim]**
5. **The "one more try" loop has no front door.** The win overlay auto-advances after 2.8 s with no Retry/Next buttons; the restart icon is disabled after a win; boss title cards and hints replay on *every* retry; the "SO CLOSE" near-miss text is on screen for ~240 ms; the clock runs during the title card. **[V]**
6. **Gameplay renders dark.** Phaser 3.90's bloom is `mix(original, blur×0.65, 0.5)`, a net darkening filter, so every gameplay frame and store screenshot shows at ~55–70% brightness and the HUD falls below WCAG contrast. **[V]**
7. **Retention is built but silent.** Daily, streaks, login chest and weekly exist, but there are **zero re-engagement channels** (no notifications, no working share on Android, no online anything). The Stardust economy dies by ~L25–30 (440✦ total sink), so the 2× rewarded offer shown on every win becomes noise. **[V]**
8. **The docs are stale in three layers.** They claim the AAB is stale (false), Wave 4 is unmerged (false), the title-overflow bug is open (fixed), and there are 103 or 210 tests (actually 221). They also reference a Gravity Run strategy file that no longer exists. **[V]**
9. **Brand risk:** "Gravity Flow" is a registered trademark of Rocketgenius Inc. (a WordPress workflow plugin). Different goods, but it needs a clearance check before launch spend. **[I — not legal advice]**

**Honest tier verdict:** *polished indie, low end*. The menus and Star Map are polished indie; gameplay as rendered sits between prototype and polished indie; the store presence currently reads as a prototype.

**Recommended next big thing (§R):** **"First 20 Players"** — make the existing game *trustworthy on a real phone* (monetization plumbing, frame-rate-independent physics, lifecycle/back/consent, the Retry/Next loop, the brightness fix, learnable telemetry) and **start the mandatory 12-tester × 14-day closed test immediately**. Every other bet (content, live-ops, social, pricing) is a guess until real players touch it, and the closed-test clock is calendar-bound.

---

## B. Exact Current State

### B.1 Repository & release facts [V]
| Item | Value |
|---|---|
| Branch / HEAD | `master` @ `d3c6aab` — 2026-07-02 18:15 +0300, "media(play): re-capture boss-finale shot…" |
| Sync | in sync with `origin/master` (fetch dry-run empty); **no commits during the pause** |
| Tags | `v0.2.0, v0.3.0, v0.4.0, v0.4.1, v0.5.0, v0.6.0, v0.6.1, v0.7.0, v0.15.0, v1.0.0-rc.1` (rc.1 = `dcf8886`, 2026-06-14). No v0.8–v0.14 tags despite CHANGELOG/doc references. |
| Commits since rc.1 | **51** (Waves 1–4 + title-fit fix; 52 src files, +2,771/−130) → the code is no longer "rc.1" |
| GitHub Releases | **none** (tags only) |
| GitHub Pages | **live**: source `master:/docs`, https://taysh123.github.io/Gravity-Game/ (privacy policy), HTTPS enforced |
| CI | `.github/workflows/ci.yml` web job (tsc/test/build) green on last push; Node 20 (EOL), `npm install` not `npm ci`; Android job commented out |
| Web deploy | https://gravity-flow-six.vercel.app serves HEAD's bundle (`index-DtFHx5Zl.js`) — note: the web IAP stub grants purchases free |
| Working tree | `M android/gradle.properties` (JDK path → `C:/Program Files/Eclipse Adoptium/jdk-21.0.12.8-hotspot`; committed value = Android Studio JBR, which is now JDK 25 and breaks Gradle 8.14); `D .ai/skills|superpowers|ui-ux-pro-max-skill` (tracked symlinks to `C:/AI-SKILLS/*`, which no longer exists) |
| Stash | `stash@{0}` "abandoned sprint4 wip" (2026-05-31) — obsolete |
| Git history | first commit `43cbc71` included `node_modules` (removed 36 s later); pack 71.5 MiB, 46 MB `phaser.json` blob in history |

### B.2 Versions & platform [V]
| Item | Value |
|---|---|
| `package.json` version | `1.0.0-rc.1` |
| Android | `applicationId com.truestorylabs.gravityflow` · `versionCode 1` · `versionName 1.0.0` (hard-coded, `android/app/build.gradle:21-22`) · compile/target SDK **36**, min **24** |
| Toolchain | Gradle 8.14.3 · AGP 8.13.0 · Java 21 · node 24.18 / npm 11.16 |
| Engine | Phaser **3.90.0** installed (package.json says `^3.80.1`; project-status says 3.80; CLAUDE.md says 3.90) |
| Native deps (from the AAB's dependency metadata) | play-services-ads **24.9.0** · UMP **4.0.0** · Play Billing **8.3.0** · RevenueCat purchases 10.8.0 / hybrid-common 18.10.0 (+ an unneeded Amazon store SDK) · firebase-analytics 23.0.0 · crashlytics 20.0.3 |
| Signed AAB | `android/app/build/outputs/bundle/release/app-release.aab` — **2026-08-01 22:45**, 12.0 MB; its web payload is **byte-identical to a fresh HEAD build** (only Capacitor `cordova*.js` stubs differ) → **contains HEAD**. Signed by the upload key (CN=Tay Shofer, O=True Story Labs, valid to 2051; keystore at `<local keystore path, outside the repo>` — **only one copy seen: back it up**). Ships **test AdMob app id**, empty RC key, versionCode 1. |
| 16 KB page size | compliant (only native lib `libdatastore_shared_counter.so`, PT_LOAD align 0x4000 on all ABIs) |
| R8/minify | off (`android/app/build.gradle:42`) |
| Debug build | `./gradlew assembleDebug` → BUILD SUCCESSFUL (2m27s) — only with the uncommitted JDK-21 path |

### B.3 Product inventory [V]
| Area | Current reality |
|---|---|
| Levels | **150** campaign levels in `LEVELS[]` (`src/config/levels/index.ts`) from **163** files; **13 retired** files on disk (`level6, 22, 31, 35, 37, 39, 40, 45, 48, 55, 56, 63, 64`). File number ≠ level number (campaign index ≈ file − 13 in the back half). |
| Worlds | **15** (`src/config/worlds.ts`), 10 levels each, boss at every 10th level; 16 additional titled "signature" levels |
| Mechanics | 7: attractor · gravity zones · magnets (attract/repel) · portals · moving platforms · hazards (static / sweep / rotating arm / pulsing beam) · one-way gates. Plus gem (2nd ★), par (3rd ★), hard timers (12 levels), orbs/collect-all (2 levels), moving goal (1 level), camera intro zoom (20 levels). Supported but unused: `startVelocity`, obstacle `angle` (and its render is buggy). |
| Modes | Campaign · **Daily** (8 handcrafted levels × modifier {none, none, timed, gemRush}) · **Gravity Run Endless** (random seed) · **Weekly** (fixed weekly seed, **local-only best**) |
| Meta | 3★ + sequential 1★ unlock · Star Map (`WorldMapScene`) · themed level select · win streak FLOW/BLAZE/NOVA · daily streak + earned freeze · 7-day login chest · 14 achievements · 4 star milestones · 6 cosmetic collections · PB ghost trail · near-miss lines |
| Economy | Stardust ✦ (soft; sink = 6 items / 440✦ total) · Cosmic Fragments ◆ (labelled "premium" but **not purchasable**; sink = 14 items / 700◆) · 5 IAP-only cosmetics |
| Monetization | AdMob rewarded (campaign 2×, endless revive, endless 2×, daily free ◆) + gated interstitial; UMP consent (lazy); RevenueCat Remove Ads $1.99 + Starter $2.99 / Premium Collection $4.99 / Founder's $7.99 (prices hard-coded USD strings) |
| Telemetry | Firebase Analytics (~35 custom events) + Crashlytics; **no** user properties, Remote Config, A/B testing, or consent gating |
| Social | local "leaderboards"; share = Web Share API → clipboard fallback (Gravity Run result only); no Play Games Services, no cloud save, no notifications |
| Scenes | 13: Boot, CompanySplash, IntroSplash, MainMenu, WorldMap, LevelSelect, Game, Settings (overlay), Cosmetics, Achievements, RunSelect, Endless, End |
| Code size | ~16.1k lines TS; `GameScene.ts` 1,708 lines / 52 methods (`showWinOverlay` 325 lines) |

### B.4 Quality gates (run 2026-10-07) [V]
- `npx tsc --noEmit` → exit 0.
- `npx vitest run` → **28 files / 221 tests passed** (docs say 103 or 210/27).
- `npx vite build` into scratch → **identical** hashes to `dist/` (reproducible).
- `npm audit --omit=dev` → **1 critical**: `@capacitor/android` GHSA-rvm3-566m-v7fv (fixed 8.4.3; latest 8.5.2). Dev-only: 12 more (tar, tinypool, xmldom…).
- Restart-leak probe: 200 × `scene.restart` → textures/bodies/listeners flat; heap +2.6 MB (~13 KB/restart, minor).
- E2E: `scripts/smoke_levels.py` exists locally but is **gitignored** and Python Playwright is no longer installed → cannot run today.

### B.5 Launch status
- **Repo-verifiable:** privacy policy hosted ✅; signing pipeline ✅; AAB from HEAD ✅; store assets present (8 screenshots 1080×2160, icon 512, feature 1024×500) ✅ but not conversion-ready; Data Safety / target audience / Advertising-ID forms **not correctly drafted**; real AdMob/RC ids **absent**.
- **NOT verifiable from the repo (please confirm):** whether a Play Console app exists; whether the Aug-1 AAB was uploaded (if yes, next upload needs versionCode ≥ 2); developer account **type and creation date** (personal accounts created after 2023-11-13 need **12 testers opted in for 14 continuous days** before production); whether AdMob/RevenueCat accounts/products exist; whether any device playtest happened during the pause.

### B.6 Known blockers (ranked; details in §H, §F, §I)
1. IAP non-functional (plugin name + empty key) — P0
2. Interstitial-over-gameplay + rewarded hang — P0
3. Frame-rate-dependent physics — P0
4. `@capacitor/android` critical advisory — P0 (security)
5. Consent/privacy-options/Data Safety/target audience — P0 for EEA + Play review
6. Misleading leaderboard claim in the listing — P0 (metadata policy)
7. Android Back / pause / timer-while-away / portrait — P1 (reviews)
8. Closed-test 12×14 requirement not yet started — calendar-critical
9. Real AdMob/RC ids + `app-ads.txt` on a developer website — external

### B.7 Stale / contradictory items (full matrix in §J)
AAB "stale" (false) · Wave 4 "pending merge on `feat/wave4-launch-media`" (no such branch; merged) · title-overflow "open" (fixed `32eeb6b`/`970744f`) · tests 103/210 (221) · Phaser 3.80 (3.90) · "Pages unconfirmed" (live) · CLAUDE.md scene flow "levels 1–6" and "level1…level22.ts" · "Sprint E in progress" · "Next mechanic: Magnets" · "HEAD `a354492`" · readiness "~72% / ~99%" (unfounded) · `~/.claude/plans/pure-foraging-fiddle.md` (deleted) · memory dir empty.

---

## C. Level / World Audit

### C.0 Machine-readable inventory (generated this session)
Scratch folder (temporary — copy into the repo, e.g. `docs/audit/2026-10-07/`, if you want to keep it):
`%LOCALAPPDATA%\Temp\claude\C--Dev-Projects-Personal-Gravity-Game\b7d4905e-e692-491f-86d0-737e3a7792c8\scratchpad\content-inventory\`
- `levels.json` / `levels.csv` — 150 rows: world, position, source file + line numbers, mechanics & counts, Matter body estimate, ball/goal/gem geometry, straight & routed distance, gem detour, timers, hazard clearances, idle-sim (no-input) result, difficulty proxy D (1★) and D3 (3★), layout fingerprint.
- `retired.json`, `daily.json`, `endless_chunks.json`, `duplicates.json`, `flags.json`, `timeline.json`, `world_summary.json`, `digest.txt`, plus the analyzer `analyze.mjs` (re-runnable: `node analyze.mjs "<repo>" "<out>"`).
- Design-review scratch: `…\scratchpad\design-w9-15\` (kill-zone/lane math, density, diffs) and **`…\scratchpad\design-w1-8\sim.cjs`**.
  - `sim.cjs` is a headless replay engine on Phaser's bundled Matter with scripted bot players.
  - **It is the seed of a real level-QA tool; promote it into the repo.**

Difficulty proxy D = weighted sum of routed length, tortuosity, goal radius, hazards near the route, mechanic count, portal/gate use, platform blocking, timer tightness, moving goal (formula in `levels.json` notes). It under-weights orbital and timing skill — **a prompt for playtesting, not a verdict.**

### C.1 Per-world summary
| W | Name | Levels | Mechanic focus (first appearance) | Boss (L#) | D min/med/max (static proxy) | Effective diff. (sim, W1–8) · avg elements (W8–15) | Timed | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | FOUNDATIONS | 1–10 | attractor, walls L4, orbs L3, **first hazard in the boss L10** | THE COLLAPSE (L10) | 0.6/2.1/4.6 | eff. 2.4 | 0 | frictionless L1; first aha L6 (hint spoils it); boss = mirror of L8 + 2 untaught spikes |
| 2 | CURRENTS | 11–20 | zones (up L11, diag L12, side L13, down L17); **sweep hazard + moving goal debut in boss L20** | THE MAELSTROM | 1.3/2.6/4.4 | eff. 2.0 | 0 | L11–12 self-solve; zones out-muscle the attractor; boss beaten by left-wall hug |
| 3 | CLOCKWORK | 21–30 | platforms L21; beam L28; rotating arm L29 (signature) | THE MACHINE ★ | 2.1/3.0/6.5 | eff. 1.9 | 0 | **hollow**: bars have no side walls → L22–25 fully bypassable; best moments borrowed from hazards |
| 4 | PERIL | 31–40 | hazards ×10; **timer L34 (only timed level in "hazards+timed" world)** | THE INFERNO | 2.9/3.8/7.1 | eff. 2.4 | 1 | stakes arrive *after* 5 hazard levels elsewhere; INFERNO beaten 80% by right-wall hug; L34 uses 3 s of 8 s |
| 5 | WELLS | 41–50 | magnets attract L41, repel L42, custom L50 | THE SINGULARITY ★ | 2.1/3.0/4.3 | eff. 2.9 | 0 | **best arc in W1–8**; only distinct boss archetype |
| 6 | RIFTS | 51–60 | portals L51, multi-pair L58 | THE BREACH (**self-solves**: decoy exit lands in the real mouth) | 2.0/2.8/4.2 | eff. 1.9 | 0 | L53–56 "pull up and win"; "sealed" spaces open; HALL OF MIRRORS ★ |
| 7 | GATES | 61–70 | gates side L61, down L62, up L63 | THE VAULT (can't lock you out) | 1.4/3.0/5.3 | eff. **1.4** | 0 | **easiest world**: walls stop short of the floor → commitment is fake; twist L62 before teach L63 |
| 8 | CONVERGENCE | 71–80 | all mechanics; 5 in one level at L80 | **HOMECOMING** (L80) — false ending; one nudge wins 82% | 3.5/4.1/5.8 | eff. 2.1 · 4.1 elements | 1 | most elements per level, but synthesis levels self-run or carry decorative mechanics; 3 portal exits on saw/beam lines |
| 9 | GAUNTLET | 81–90 | — | THE CRUCIBLE (template A; full bypass) | 2.8/3.9/5.2 | 2.3 | 0 | "W3+W4 again, easier" |
| 10 | BINARY | 91–100 | — | **THE PULSAR** (standout) | 2.6/3.0/4.2 | 1.9 | 0 | 4 copies of W5 |
| 11 | LABYRINTH | 101–110 | — | THE WARDEN (template B) | 2.3/2.9/5.0 | 2.7 | 0 | **regression**: no maze, 3 literal copies, broken signature |
| 12 | TEMPEST | 111–120 | phased beams L120 | THE EYE OF THE STORM (template A) | 3.0/4.7/6.8 | 1.9 | **7** | best back-half world; clocks too loose |
| 13 | ASCENSION | 121–130 | — | THE SUMMIT (template A, 3rd use) | 2.9/4.1/5.9 | 3.6 | 1 | "long journeys" impossible on a fixed screen |
| 14 | SINGULARITY | 131–140 | — | THE SINGULARITY (**same name as L50 boss**) | 2.7/4.4/5.3 | 2.5 | 1 | "tight margins" = only goal radius |
| 15 | HOMECOMING | 141–150 | — | THE LONG WAY HOME (= **L80 remake**) | 2.6/4.0/5.7 | 3.1 | 1 | copy-paste finale |

Totals [V]: 150 levels, all with par + gem + hint; 15 bosses + 16 signatures; 12 timed; goal radius 22–52; max Matter bodies 12 (L69) — **perf ceiling (<20) never violated**.

### C.2 Worlds 1–8: qualitative review + headless replay [sim]
**How this was tested.** A headless replay drove Phaser's bundled Matter with the game's constants and per-frame order. It used scripted players: no input, a single 0.4 s nudge, a waypoint follower, and a wall-hugger. Each level got 30–200 runs with random start delays and beam phases. Scripts: `scratchpad\design-w1-8\sim.cjs` plus batch runners. It ran at 60 Hz. At 120 Hz the pull roughly doubles (§H), making everything easier still.

**Four engine facts drive most findings:**
1. **Zones out-muscle the attractor.**
   - The attractor peaks at ≈0.164 px/frame² (at ≤75 px). A zone of strength 1.0 gives 0.213 and one of 0.8 gives 0.170 (`physics.config.ts:5-7,70`).
   - So a current of 0.8 or more cannot be fought, only crossed. The L13 hint "counter the crosswind" is physically impossible.
   - Lifts launch the ball 350–400 px, so "relay" designs overshoot their target or solve themselves (L15, L18, L45).
2. **Physics runs from `create()`, with no wait for the first touch.**
   - A ball that spawns inside a zone plays the level by itself. **L11 wins with zero input in 1.4 s, gem included, so 3★ (40/40 runs). L12 wins in 1.8 s.**
   - L12 even completes under the world title card.
3. **Hazards are checked before the win in the same frame** (`GameScene.ts:922-923`).
   - Beams and drifting goals use raw scene time, so their phase is random on every attempt and beam timing can't be learned across retries.
   - Saws and arms are deterministic from level start.
4. **The arena walls sit outside 0..360** (`GameScene.ts:334-337`). The ball centre can therefore reach x=16..344, while most saws stop at x=60/300 and most bars are 150 wide with no side walls.
   - That leaves 4–30 px **wall-hug lanes** that bypass most hazard and platform levels. Holding the ball against the physical wall makes them easy.
   - **This is the single biggest content hole.** It also pushes the player's finger to the screen edge, next to Android's back-gesture zone.

**Curve.**
- Effective difficulty, given the shortcuts: W1 2.4 · W2 2.0 · W3 1.9 · W4 2.4 · W5 2.9 · W6 1.9 · **W7 1.4** · W8 2.1.
- Bosses score 5/3/5/3/5/1/2/2.
- Nominal intent is 2–3 points higher. The campaign is flat at about 2/10, which matters more than any single spike.

**Par is meaningless.**
- Replay wins land at 1–8 s against pars of 12–20 s (L67: 1.0 s vs 17 s).
- Combined with on-route gems (L1, L2, L10, L11, L39, L49, L54, L59), **3★ is close to automatic.**
- The few "brutal" gems: L58 (an ~18 px window beside a spike) and L44 (approaching from below kills).

**Self-playing or one-nudge levels.** All won 40 out of 40 runs except where noted:
- L11 and L12: zero input
- L14, L27, L55, L65, L72, L73: one nudge
- L67: 1.0 s
- L56: 0.6 s
- **L80 HOMECOMING: one 0.4 s nudge wins 82% of runs; its 19 s timer is irrelevant**
- L79 THE CONFLUENCE plays itself 88% of the time

**Bypassed by wall-hug or an open seam:**
- W3 bars L22–25: no route is ever closed
- L32
- L36
- **L40 INFERNO** (80%)
- L20 MAELSTROM (left-wall hug, 40/40)
- L39 FORGE (right-wall hug, 33/40, gem included)
- W7 L62, L64, L66, L68: walls end short of the floor
- "Sealed" spaces L48, L53, L56: open at the top
- **L60 THE BREACH self-solves**: the decoy's exit (300,584) lands inside the real mouth
- **L70 THE VAULT can't lock you out**: its inner gate is a free-standing bar, and the layout duplicates L67

**Unfair deaths (portal exits on hazard lines):**
- L52: 37% of untimed entries die
- L71
- **L74: 47%** — the exit lands inside both the goal and a beam, and the hazard check runs before the win
- L77: 37%
- L79: 12%
- L80: 18%
- L58: the exit lands inside a ledge, or 21 px from a spike
- L10: a spike sits at the natural overshoot point

**Sameness.**
- **72 of 80 levels are climbs**, and **37 go exactly bottom-centre → top-centre (x=180)**. 45 goals sit at y ≤ 130.
- Near-duplicates: L1/L2 · L3/L26 · L8/L10/L69 · L14/L15/L16/L45 · L24/L25 · L55/L72 · L65/L73 · L67/L70/L77/L80.

**Per world** (identity score out of 10):

| World | Identity | Summary |
|---|---|---|
| W1 | 6 | Good toys → decisions → aha (L6). L7 is trivial; L8/L10 share one serpentine. |
| W2 | 5 | Zones are too strong to "counter"; L14–16 and L45 repeat "left lift, goal up-right". |
| W3 | **3** | Six low-content levels in a row (L22–27). Its best moments are hazards borrowed from W4. |
| W4 | 5 | Hazards had already appeared at L10/20/28/29/30. Timers appear once. |
| W5 | **7** | Best arc. Attract and repel alternate, and L47 combines them. |
| W6 | 6 | L53–56 are all "pull up and win". |
| W7 | **4** | Easiest world. Commitment is fake. |
| W8 | 4 | "Synthesis" levels run themselves or carry decorative mechanics. |

**The first 10 minutes.**
- "Hold to pull" is frictionless.
- The first aha comes at L6 (~3–4 min), but its hint gives the answer away (so do L9, L38, L56, L58, L66 and L70).
- **The first possible fail is the L10 boss**: untaught spikes on a 25 s descent that restarts from the top. That is the most likely W1 churn point.
- **Right after it, agency collapses**: L11–12 play themselves and L14–18 are "nudge into a lift". **Minutes 6–10 are the biggest "this plays itself" churn risk**, followed by W3's hollow timing run.
- The first interstitial most likely fires after L12, straight after a self-playing level.

**Top 5 (W1–8), with polish fixes:**
1. **L59 HALL OF MIRRORS.** Move the gem off the exit spot.
2. **L17 THE WHIRLPOOL.** The only currents level where the unbeatable force *is* the puzzle.
3. **L30 THE MACHINE.** Desynced 1000/1100/1200 ms rhythms. Fix: saws 40↔320, goal y ≥ 120.
4. **L39 THE FORGE.** The only descent with real timing. Fix: saws 40↔320.
5. **L50 THE SINGULARITY.** The only distinct boss archetype. Fix: a spike at (180,230) so the rim slingshot becomes necessary.

Honourable mentions: L6, L35, L3.

**Weakest 10 (worst first), with data fixes:**
1. **L60 BREACH.** Decoy exit → (40,700). Widen the divider to 360. Guard the real rift with an arm.
2. **L70 VAULT.** Make the inner gate full height (`level86.ts:17`). Add a rift that lands on the wrong side of the outer gate, so a real lock-out exists.
3. **L80 HOMECOMING.** Lift height 170→100. First mouth → (110,490). Timer about 12 s. Saw 120↔320. Rename it (e.g. "ALMOST HOME").
4. **L11/L12 (self-play).** Move the goals off the spawn column. Code fix: hold physics until the first touch.
5. **W3 bars (L22–25).** Fixed wall stubs at each bar's y. Swap the same-phase and opposite-phase roles.
6. **Exits onto hazards (L74, L52, L71, L77).**
   - L74: beam → (300,250), goal → (300,140).
   - Exit mouths: L52 → (280,310), L71 → (300,340), L77 → (180,300).
7. **W7 walls short of the floor.** Extend to the floor:
   - L64 pit walls `y:665,height:230`
   - L62 `y:648,height:264`
   - L68 `y:628,height:305`
   - L66 gate `y:620,height:320`
8. **Self-running lift chains (L72, L55, L65, L73, L27).** Move the mouth or goal off the lift line, or cut the duplicates.
9. **"Sealed" spaces (L56, L53, L48).** Close the tops: L56 `y:158,height:316`, L53 `y:113,height:226`, L48 `y:240,height:480`.
10. **Wall-hug lanes (L40, L20, L36, L39).** Saw sweeps 40↔320. **Caution:** a full-width 0.8 downdraft makes L20 impossible, so keep it ≤ 0.75.

**Systemic fixes, which repair dozens of levels at once:**
- **(a)** Saw sweeps 40↔320 campaign-wide.
- **(b)** Side-wall stubs for platform bars.
- **(c)** Walls that reach the floor/ceiling wherever a seal or gate is meant to commit the player.
- **(d)** No portal exit within a hazard band (add this as a validator rule).
- **(e)** **Par re-tuned from bot clear times**, e.g. 1.3–1.6× a competent bot's median.
- **(f)** **Physics held until the first touch.** This also fixes the clock running under the title card.
- **(g)** Hints rewritten as questions, not answers.
- **(h)** A deterministic beam phase from level start.

### C.3 Worlds 9–15 — qualitative review [V geometry / I play]
- **The curve plateaus and the finale world is the second-easiest after L80.** Per-world qualitative difficulty (1–10): W9 2.5 · W10 2.8 · **W11 1.8** · W12 3.4 · W13 3.5 · W14 3.4 · **W15 2.0**. Bosses are often *not* the hardest level in their world (W9: L87 > L90; W13: L124/127/128 > L130; W14: L139 > L140).
- **Copies (≤20 px tolerance) [V]:** L97 = L45 (`level110.ts` ≈ `level26.ts`, verified diff: ball +10 px, goal r 34→30, par 14→15 s), L103 = L53 (same hint), L106 = L67 (same hint), L102 ≈ L63, L43 = L91 = L142, L101 = L143, L84 = L116, L122 = L136, L5 = L131. **L150 = L80 at 30 px tolerance with the identical hint** ("Lift, breach, commit, slip the saw — bring the star home", `level163.ts:32` = `level90.ts:32`), and a *looser* clock (24 s vs 19 s).
- **Boss templates:** Template A (central 200-px wall + rotating arm ~(180,300) + floor saw + gem (300,560)) = L90, L120, L130. Template B (rift → gate → well + saw chain) = L80, L110, L150. Only **L100 THE PULSAR** is a fresh archetype.
- **~27% of L81–150 (19/70) have a lane that skips the featured hazard**; e.g. L90 THE CRUCIBLE beatable with no timing (arm kills x82–278, floor saw x50–310).
- **Broken signature intents:** L109 HALL OF ECHOES and L129 THE ASCENT auto-chain two rifts in two frames (exit lands ~50 px from the next mouth; `level122.ts:14-15`, `level142.ts:14-15`) — the puzzle doesn't exist / ~25–30% blind death in L129. L134 "pocket" open above y=292; L103 "sealed chamber" has a 55 px gap; L105's decoy rift lands in the same open half.
- **Cheap-death trap: wells placed next to saw lanes** (the well drags a released ball back into the blade): L110 (2 px above kill band), L128 (4 px), **L138 (well core inside band)**, L150 (12 px), **Daily D8 (core inside band)**.
- **HUD-occlusion risk [D]:** all 7 back-half boss goals sit at (180, 90–100) — under the top-center par/countdown chip on phones with a ~47 px top inset; taps there are swallowed by `isOverUi` (`GameScene.ts:796`). 16 levels affected.
- **The back half ignores what the engine already supports**: angled walls, `startVelocity` launches, moving goals (only L20), collect-all constellations (only L3, L26), side gates (W7 only), diagonal zones (L12 only), custom well strength (L50 only), multi-beam choreography, opposing arms. Instead ~7 primitives repeat (full-width wall + portal; saw at y≈200–240 guarding a top goal; left-column updraft; well under goal; central-wall arm; floor saw; gem at (300,560) used 12×).
- **Standouts (81–150):** L100 THE PULSAR · L119 THE TEMPEST · L118 (`level131`, R130 arm, safe hub) · L127 (`level140`, crosswind into vertical saw) · L139 THE EVENT HORIZON. Honourable: L94, L115.
- **Weakest 10 with data-only fixes:**
  1. **L150 THE LONG WAY HOME** → true 3-act finale: drifting goal `to:{x:300,y:90},durationMs:2400`; move/delete the well (it sits 60 px *below* the goal and holds the ball short); add a moving platform `{x:110,y:560,w:120,to:{x:250,y:560},1200ms}` and a beam `{y:380,w:360,pulseMs:1500}`; saw y 200→230; limit 24→20 s; new hint; **rename L80** (e.g. "ALMOST HOME").
  2. L109 HALL OF ECHOES → move mouth 2a to `{x:60,y:380}`, add a mid-floor saw.
  3. L129 THE ASCENT → 2a `{x:60,y:380}`, 2b `{x:180,y:240}`.
  4. L134 → seal the pocket `{x:240,y:150,w:16,h:300}`.
  5. L105 → real decoy (divider + down-gate).
  6. L90 THE CRUCIBLE → arm radius 60→120, floor saw x50↔310.
  7. L131 → force the slot with two shelves at y=260.
  8. L99 THE BINARY STAR → restore L49's stakes (core spikes, drifting goal) + rename.
  9. L138/L110/L128/D8 → move wells out of saw bands.
  10. L112 → the empty timed level: add offset spikes, `par 5 s / limit 8 s`.
  Then replace the literal copies (L97, L102, L103, L106, L136, L142, L143) with new layouts using the unused variants.

### C.4 Cross-campaign flags (from the inventory) [V geometry, I play]
- **Static impossibilities:** none. No ball spawns in a wall, every goal/gem reachable, no spawn-in-danger.
- **Mechanic bypasses (teaching levels that don't require their mechanic):** L62 `level51.ts` (down-gate pocket has a 95 px floor gap), L64 `level83.ts` ("pit walled on every side" has a 50 px floor gap), L53 `level42.ts` + clone L103 `level116.ts` ("sealed chamber" 55 px top gap), L56 `level80.ts` ("sealed nook" 85 px gap), L134 `level147.ts`. Gates optional at L122, L136 (route never touches the 160 px gate), and L80/L149/**L150** (+31–33 px detour).
- **Self-solving levels:** zone force (6e-4) exceeds the attractor's clamped peak (4.6e-4) and physics runs from `create()`: **L11 `level7.ts` wins with zero input in ~1.4 s, collecting the gem, under par → likely 3★ with no touch**; L12 `level11.ts` wins in ~1.8 s.
- **Gems on the shortest route:** 33 levels (template rule says "ALWAYS genuinely off-route", `_template.ts`), incl. bosses L50, L90, L120, L130 (gem at (300,560) commented "off-route" but on the right-lane route and inside the floor saw sweep).
- **Teaching order:** every hazard motion debuts *inside* a boss/signature (static L10 boss, sweep L20 boss, arm L29 signature) rather than being taught first.
- **Timers:** tightest L34 (8 s limit / 6 s par); W12 limits 15–24 s for ~3–6 s routes → decorative. No timer < 3× idealized minimum.
- **Duplicate titles:** THE GAUNTLET (L8/L89), THE BINARY STAR (L49/L99), **THE SINGULARITY (L50/L140, both bosses)**; titles equal to world names: GAUNTLET, TEMPEST, SINGULARITY, HOMECOMING. 6 duplicate-hint pairs.
- **Portal exits landing in geometry** (56 px offset overlaps a wall from many approach angles): L53/L103, L54, and partially L56, 58, 59, 60, 71, 78, 80, 109, 129, 134 — possible depenetration "pop" [D].
- **Latent bug:** `Obstacle.ts:16-26` rotates the physics body but draws the rect unrotated (no level uses `angle` yet — fix before using angled walls).
- **Validator gaps:** `levels.test.ts` checks bounds, radius, spawn-in-static-obstacle, static-hazard spawn, limit > par, world ranges. It does **not** check route existence, bypasses, moving-hazard clearance, portal exits, timer tightness, duplicates, gem/hint presence, or **`DAILY_LEVELS` at all**. `chunks.test.ts` checks wall lanes only (not saw/beam lanes).

### C.5 Endless / Daily / Weekly content [V]
- **Gravity Run:** 20 chunks × 560 px (tiers 0/1/2/3 = 4/5/6/5); only walls, zones, wells, saws, beams (no portals/gates/platforms/arms — `pivot` hazards are silently unsupported, `EndlessScene.ts:322-326`). Generator (`utils/endless.ts:37-75`): tier unlock every 3 chunks, forced breather after tier ≥2, no repeat in 4, no same tag back-to-back — **0 rule violations over 500 seeds × 400 chunks**. Speed 76 → 250 px/s cap at ~47 s; full pool live by ~38 s → **nothing escalates after ~50 s**; a run sees essentially the whole pool → novelty gone in ~2–3 runs. `twinSaws` has no lane; `sawMaze` 36 px bands at cap speed. Score = `floor(distance/10) + 25×stars`.
- **Weekly** = seed `gw<floor(localDays/7)>` (resets Thursday local midnight; timezones split); the only difference from Endless is the seed. **Leaderboard is localStorage on one device** (`Leaderboard.ts`), yet the hub says "Same run for everyone" (`RunSelectScene.ts:53`).
- **Daily:** always one of **8** `DAILY_LEVELS` × 4 modifiers (FNV hash of the date); repeats ~every 8 days (≈50% chance of a repeat within 4 days); never picks campaign/boss/trivial levels; D range 2.3–4.2 (medium). "Distinct from the campaign" (`dailyLevels.ts:6`) is half-true: D6 = L65, D7 = retired `level39`, D8 ≈ L108/L138, D2 ≈ L16. Available on day 0 with **untaught mechanics** (magnets D3, portals D4, gates D6); the L1 CoachMark can fire on the daily (`currentLevel` defaults to 1) and permanently set `seenTutorial`.
- **Retired pack (13 files):** all valid; D 1.8–5.9; one is identical to Daily D7. Too thin to sell alone; useful as raw material for the back-half rework or a post-game "Expert" set.

### C.6 Content gaps & opportunities (effort for this architecture)
| Idea | Fits pull-only? | Effort |
|---|---|---|
| Use existing-but-unused variants (angled walls after the render fix, `startVelocity`, moving goals, constellations, side/down gates, diagonal zones, custom wells, beam choreography, twin arms) | yes | 0 engine; ~0.5 day/level |
| Moving wells / moving portals (reuse hazard `to`/`durationMs`) | strong — a *real* "orbital" W10 | 0.5 day each |
| Polarity-flip wells (`flipMs`) | strong | 0.5 day |
| Switches / pressure plates → doors/beams | enables a real Labyrinth | ~2 days |
| Breakable walls (speed threshold) · bumpers · drag/sticky fields · vortex zones | yes | 0.5–1 day each |
| **Anti-gravity field** (inverts your pull inside it) | best twist on the core verb | ~1 day |
| **Limited presses / attractor fuel** (`maxPresses`, budget ms) | a "one-press" puzzle mode | 0.5–1 day + ~10 levels |
| Darkness / visibility radius | new world identity | ~1 day |
| **Mirror/Remix mode** (x-flip, −20% goal, par+3 s timer) unlocked after L150 | doubles content | 1–2 days + playtest |
| **Boss Rush** (15 bosses, cumulative time) | post-game | 1–2 days |
| Ghost race vs PB (GhostStore paths are uniform-time already) | mastery | ~1 day local |
| Gravity Run to flagship: +40 chunks, x-mirroring, ±15% jitter, phases/biomes every ~1,500 px, portals/gates/arms support, telemetry | yes | 5–8 days |
| Seasonal event packs (world palette + 10 data-only levels + themed chunk subset) | live-ops | 2–4 days/event |
| Candidate worlds: SWITCHBACK, SHATTER, VORTEX, ECLIPSE, ZERO-PRESS | each = one new mechanic | 3–5 days each |

---

## D. Gameplay Audit ("one more try")

| Question | Answer |
|---|---|
| Immediately understandable? | **Yes.** L1 is unloseable (goal within reach, coach-mark ghost dot, sonar ping shows reach). Weakness: the hint is faint Arial at the bottom, and ~12 s of splashes precede it on first launch. |
| Satisfying? | **Mostly.** Press feedback is excellent (tone + hum + 12 ms haptic + sonar ping + nebula pulse in one frame; escalating tendrils/lensing ring). Undermined by (a) the bloom darkening every frame, (b) haptics that may do nothing on Android (no `VIBRATE` permission; `navigator.vibrate`, `GameScene.ts:187-190`) [D], (c) frame-rate-dependent pull that changes feel per device. |
| Failure readable? | **Partly.** Hazard death = red flash + 16-particle puff + tone + haptic, restart at 240 ms. But a timeout death shows no cause; "SO CLOSE" is visible ~240 ms; death resets the win streak silently. |
| Success satisfying? | **Yes, visually.** Tiered celebration ladder (1★→2★→3★→boss), star tones synced to star pops, "STAR FREED" for bosses. **But** the player has no agency afterwards (auto-advance 2.8 s, no buttons). |
| Mastery emerges? | **Designed but hollow.** 3★ = gem + par. **But par is meaningless** (bots clear in 1–8 s vs pars of 12–20 s), 33 gems sit on the route, and wall-hug lanes skip the hazards. So 3★ is close to automatic. The PB ghost and the near-miss line "Xs from ★★★ — retry?" exist, yet nothing on screen retries; replaying costs ~4 taps across 3 scene transitions. |
| Difficulty rises naturally? | **No.** Effective difficulty is flat at ~2/10 across W1–8 (sim; W7 is the easiest world at 1.4). W9–15 plateau or regress. Hazards first appear inside the L10 boss with no teaching, then minutes 6–10 (L11–18) largely play themselves. |
| Surprise? | Front half: bosses with distinct archetypes. Back half: templates and copies; no new verbs; finale = repeat. |
| Emotionally memorable? | The premise ("bring the lost star home") is good and set up well, then **spent at L80 ("HOMECOMING", "Almost home")**, and not paid off at L150 or in `EndScene` ("You did it!" + Play Again → L1). The star has no face/reactions. |
| Too slow anywhere? | Splashes (~5.4–5.8 s every cold start, two taps to skip), 700 ms per scene hop (fade out + in), title cards replaying on every retry. |
| Too frustrating anywhere? | Clock runs during Settings / title card / background / interstitials; interstitials over live levels; blind portal-exit deaths (L108, L110, L117, L125, L128, L129, L150); well-next-to-saw traps; strict sequential unlock with **no skip or rescue** across 150 levels never device-playtested. |
| Retries frictionless? | Auto-retry yes (240 ms). Manual restart icon sits top-right (hardest thumb reach). Each retry replays hint + title card + camera intro zoom (21 levels) and re-fires `level_start` + `hint_used`. |
| Rewards meaningful? | Early yes (cosmetic unlocks in the first 10 min). After ~L25–30 Stardust has nothing to buy (440✦ sink vs ~3,000✦ earned), so per-win rewards, the 2× ad and the store nudge become noise. Fragments only come from one-off grants, the login chest and one 5◆ ad per day. |
| Reason to replay completed levels? | 3★ chase, but the front door is missing and the payoff is only Stardust/achievements. No world/boss cosmetics, no time-attack medals, no leaderboard. |
| Identity vs. competitors? | **Distinctive verb** (indirect gravity control) in a premium-cosmic wrapper. The mechanic itself is not novel (Orbit, Gravity Force, Glide) — differentiation must come from feel, content craft and juice. |

**The 8 biggest gameplay/design opportunities (in order):**
1. **Physics determinism + a level-QA bot.**
   - Apply attractor/zone/magnet forces in Matter `beforeupdate` in both scenes. Hold physics until the first touch. Make the beam phase deterministic.
   - Then promote the audit's headless replay sim (`scratchpad\design-w1-8\sim.cjs`) into a tracked `scripts/levelsim`. Use it to flag self-solves, wall-hug lanes and portal-exit hazards, and to auto-tune par.
   - Everything else is tuned on sand until this lands.
2. **A real mastery loop**: NEXT (primary) + RETRY ★ (secondary) + "tap to continue" on the win overlay; title card/hint only on first entry; clock starts on first touch; visible "SO CLOSE"; RETRY on the near-miss line.
3. **Fail relief**: after N deaths on a level offer "Show route" (ghost of a dev solution — GhostStore format already exists) or a skip token (rewarded/earned), with a ★ cap. Protects against unverified walls.
4. **Campaign depth pass** (data-only first, first hour first):
   - Apply the systemic fixes from C.2: close wall-hug lanes, add side walls to the bars, seal what claims to be sealed, keep exits off hazard bands, re-tune par from bot times, rewrite hints as questions.
   - Kill the back-half copies, rebuild L150 as a 3-act finale, rename L80, and differentiate the template bosses.
   - Add 2–3 cheap new mechanic variants (moving wells, an anti-gravity field, limited presses) to give W3/W7/W10/W11/W14 a real identity.
5. **Emotional payoff**: star micro-emotion (anticipation while pulled, relief at the goal), world-complete ceremony on the Star Map (path lights up + reward), an EndScene epilogue ("the star is home" + stats + credits) and **post-game unlocks** (Mirror mode, Boss Rush).
6. **Gravity Run → flagship**: chunk count ×3 via authoring + mirroring + jitter, phase escalation after 50 s, missing mechanics, pause button, best-height marker, telemetry, then online boards.
7. **Daily that people talk about**: one global daily for everyone (larger pool or generated), one payout per day, shareable result card (stars/time/attempts grid) with a link.
8. **Audio identity**: a real ambient soundtrack (or Zen mode) to back the "relaxing" promise; UI tap sounds; timer ticks.

---

## E. UX / UI Audit

**Tier verdict: (b) polished indie — low end.** Strong design-token discipline (`theme.config.ts`, glass components, Orbitron + Exo 2), but the *rendered* gameplay is dim, the HUD/overlay grammar is inconsistent, and the store creative is raw captures.

### E.1 Highest-impact findings
| # | Finding | Sev | Evidence | Fix |
|---|---|---|---|---|
| 1 | **Gameplay rendered at ~55–70% brightness.** Phaser 3.90 Bloom = `mix(orig, blur×strength, 0.5)` (`LinearBlend.frag`) with `BLOOM_STRENGTH 0.65` → net darkening; thin strokes lose most; vignette dims 10–25% more; HUD shares the camera (HUD text 3.77:1 < 4.5:1; brightest pixel in gameplay frames 169–179 vs 240–253 in menus). | P0 | `fx.config.ts:10-13`, `GameScene.ts:294-307` | Raise strength to ~1.6–2.0 or drop camera bloom for per-object glow; render HUD/overlays on a second FX-free camera. Effort S. |
| 2 | **Menu logo is an opaque navy 896×896 square** (no alpha; corner px (1,7,36)) with a grey 4-point sparkle in its bottom-right that reads like an AI-image watermark. Visible on store screenshot #5. | P0 | `assets/images/gravity-flow-logo.png`, `MainMenuScene.ts:98` | Re-export with transparency, remove the sparkle, integrate glow. |
| 3 | **Hints: Arial, 17 px, no wordWrap** — 56/164 hints > 42 chars spill off both edges (visible in store shot #3); replay on every death. Breaks the "never Arial" rule. | P0 | `GameScene.ts:822-836` (font at :831) | `wordWrap ~330`, `THEME.FONT_BODY`, glass chip, safe-area offset, first attempt only. |
| 4 | **Win overlay has no primary action**: no NEXT/RETRY, input blocked, auto-advance 2.8 s; the only button is a rewarded-ad CTA ("▶ On a streak — 2× ✦") that never says "ad"; "PERFECT!" overlaps the panel top edge. | P0 | `GameScene.ts:1144, 1170-1497` | NEXT (filled) + RETRY (glass) + "Watch ad · 2× ✦" (tertiary) + tap-anywhere; a single vertical-stack helper instead of 7 hand-offset optional slots. |
| 5 | **No Android Back handling** (`@capacitor/app` not installed; `MainActivity` is an empty `BridgeActivity`) → Back exits mid-level; predictive back on targetSdk 36. | P0 | `package.json:17-26` | Back = close overlay → up one scene → confirm-exit on menu. |
| 6 | Boss/signature title card has no scrim, collides with hazards, replays every retry, and the par/countdown clock runs underneath it. | P1 | `GameScene.ts:213, 282, 753-785` | First entry only; start the clock on first touch; translucent band. |
| 7 | Level select: grid fills the top 40%, bottom 55% empty; no current-level highlight, no boss marker, color-only locks (2.85:1), empty-star pips 1.73:1; one capture is a corrupted double exposure (`world-01-foundations.png`). | P1 | `LevelSelectScene.ts:15-20, 108, 154-204` | Bigger 3-col cells, pulse next level, boss crown, lock glyph. |
| 8 | Settings: panel alpha 0.82 lets the menu bleed through; **Remove Ads is the most prominent element**; no version/privacy/credits/privacy-choices/replay-tutorial rows. | P1 | `theme.config.ts:28`, `SettingsScene.ts:43,144-168` | Modal alpha 0.94; glass secondary IAP row; add Privacy + Privacy choices + Version. |
| 9 | Cosmetics: tabs are ~18 px tall bare-text hit areas; static flat swatches (not the real glowing ball); can't-afford = camera shake only; bundles are text-only with overlapping cards; USD strings. | P1 | `CosmeticsScene.ts:92-135, 184-364` | 44 px tab pills, live previews, shortfall toast, bundle art, one hero bundle, store-sourced prices. |
| 10 | Gravity Run: **no pause/home button in a run**; empty frame; Run Over has three equal-weight outline pills and **tapping anywhere off a button exits to the menu** (a near-miss tap loses the run); REVIVE doesn't say "ad". | P1 | `EndlessScene.ts:133-140, 392, 435, 452-460` | Reuse the GameScene nav; RETRY filled primary; explicit Menu button; "Watch ad · Revive". |
| 11 | EndScene is an anticlimax: "You did it!", Play Again → L1, Visit Store; no epilogue, stats, credits, or next goal. | P1 | `EndScene.ts:33-91` | Epilogue + totals + credits + post-game unlocks; Play Again → Star Map. |
| 12 | GRAVITY RUN (the "flagship") is a tertiary text link on the menu with no press state (comment: "Proper menu layout lands in G4"). 4 unlabeled top icons; 3 gold attention-getters compete with PLAY on first launch. | P1 | `MainMenuScene.ts:37-79, 171-184, 264-316` | Real secondary button; micro-labels; one attention cue at a time. |
| 13 | Splash tax: ~1.9 s + ~3.6 s on **every** cold start, two separate taps to skip, "tap to skip" at 3.19:1. | P2 | `splash.config.ts:20,35-51` | Full intro first launch only; ≤1.2 s thereafter. |
| 14 | Reduced-motion holes: camera shakes/zoom punches ungated (`GameScene.ts:1127-1130, 1634`; `EndlessScene.ts:356`; `CosmeticsScene.ts:217/291/364`), menu bob/breathe, countdown pulse. `THEME.HIT_PADDING` is dead code. | P2 | as cited | Gate all; remove dead token. |

### E.2 Cross-cutting
- **Typography:** right pairing, but **18 distinct sizes** and 11 usages below 12 px (10 px toast headers, rarity chips); mixed-case Orbitron (weak lowercase). → 6-step scale (12/14/16/20/24/32), hard 12 px floor, Orbitron caps-only.
- **Spacing:** no 4/8 rhythm (gaps 4, 6, 9, 10, 12, 14, 18); two back-button formulas/labels; unbalanced vertical layouts.
- **Color/contrast:** tokens pass (TEXT_MUTED on glass 5.33:1) — the *rendered* result fails (HUD 3.77, empty stars 1.73, locked 2.85, skip 3.19, slate button vs bg 1.47).
- **Colorblind safety is genuinely good**: hazards shape-coded (spikes/stripes), magnets +/− glyphs + ring direction, portals cyan/amber, zones chevrons. Risk: red-orange ball skins vs hazard red.
- **Iconography:** 10 consistent vector icons, but many structural icons are font glyphs (✦ ◆ ▶ ★ ▾ ← ▲); palette icon reads as a bowling ball; motion icon reads as audio; the gem reads as a flat sticker.
- **Motion:** good press timings (110–160 ms), 320–640 ms entrances; 700 ms per scene hop; store tab switch replays a full scene fade.
- **Audio-visual sync:** a real strength (press, win star tones, death all frame-synced). Gaps: no UI tap sound, no timer tick, portal haptic-only, purchase reuses the level-complete chord.
- **Mobile ergonomics:** primary CTA at ~64% height (good); in-game Restart top-right (bad); edge-to-edge/safe-area on Android 15/16 and FIT letterbox side bars on 2:1 phones need device checks [D]; text is soft on high-DPI (390×844 canvas stretched ~2.5–3×).

### E.3 Strongest / weakest / simplify / reuse
- **Strongest:** Star Map; per-world cosmic tinting; the living attractor (charge tendrils, lensing, sonar ping); shape-coded mechanics; glass HUD toolbar; celebration ladder with synced tones; the green CONTINUE CTA; `textFit`.
- **Weakest:** dim gameplay; boxed/watermarked logo; hint overflow; empty level-select grid; text-only bundles; the gem asset; empty Endless frames; EndScene; store screenshots.
- **Complexity not paying off:** bloom + vignette + per-object glow + FPS watchdog (net darkening; watchdog not persisted so weak devices stutter each restart); the win overlay's 7 hand-offset optional slots; four separate drag-scroll implementations without inertia (WorldMap, LevelSelect, Cosmetics, Achievements) → one `ScrollView`.
- **Reuse instead of rebuild:** `Button`/`drawGlass` for win & Run-Over actions; `IconButton` + `icons.ts` for the chest; `createNav` for an Endless pause; `CoachMark` for Endless onboarding; one `showToast()`; `textFit` + wordWrap for hints; `Ball`/trail entities for live shop previews.

---

## F. Monetization Audit

**Bottom line:** the design is ethical and well-reasoned (opt-in rewarded, cosmetic-only IAP, revives off the ranked board, no loot boxes/energy), **but on a device today it would make $0 and contains policy-risky and trust-breaking bugs.**

### F.1 Surface-by-surface
| Surface | Implemented? | IDs | Prod-ready? | Key risk | Evidence |
|---|---|---|---|---|---|
| Rewarded — campaign 2× Stardust | yes (web-verified only) | **test** `…/5224354917` | No | Hangs on early close (advance timer already cancelled); no preload; value dies after the Stardust catalog; shown on every win | `GameScene.ts:1380-1408`, `Ads.ts:93-109` |
| Rewarded — Endless revive | yes | test | mostly | same hang; good design (1/run, off weekly board) | `EndlessScene.ts:422-485` |
| Rewarded — Endless 2× | yes | test | No | button disabled only after await → double-grant | `EndlessScene.ts:487-494` |
| Rewarded — Free Fragments 5◆/day | yes | test | partly | hidden on the 4th shop tab; silent failure; UTC reset | `CosmeticsScene.ts:24, 230-264` |
| Interstitial | yes | **test** `…/1033173712` | **No** | loaded on demand *after* `scene.restart` → appears 1–3 s into the next level, timers running → timeout deaths, lost par, broken streak; AdMob/Play "unexpected interstitial / start of level" policy risk | `GameScene.ts:1163-1166`, `Ads.ts:133-139` |
| UMP consent | partial | needs AdMob message | **No (EEA)** | lazy (first ad attempt, can pop mid-level); `canRequestAds` ignored; **no privacy-options entry point** | `Ads.ts:57-81`, `admob.ts:21-29` |
| AdMob app id | manifest | **test** `~3347511713` | No | swap with units | `AndroidManifest.xml:17-19`, `monetization.config.ts:9-11` |
| Remove Ads $1.99 | UI+logic yes; **native broken** | `remove_ads` / `premium` | **No** | wrong plugin name + empty key → every tap fails with a shake; `availablePackages[0]` fallback can charge the wrong product | `revenueCat.ts:19`, `monetization.config.ts:26`, `IAP.ts:107-110` |
| Starter $2.99 / Premium Collection $4.99 / Founder's $7.99 | same | `starter_pack` / `premium_collection_pack` / `founders_pack` | **No** | cosmetics granted locally only, **never restored**; premium wiped on next launch unless `premium` is attached to these SKUs (docs don't say so); `hasEntitlement(result) || true` always true; Founder's re-sells Remove Ads to owners | `IAP.ts:86, 140-182` |
| Restore | premium only | — | **No** | no bundle re-grant; no feedback | `IAP.ts:165-180` |
| Pending / cancelled / failed | all → `false` → camera shake | — | No | pending treated as failure; no `addCustomerInfoUpdateListener` | `IAP.ts:120-123, 159-161` |
| Prices | hard-coded USD strings | — | No | wrong currency outside US; no price tests | `monetization.config.ts:40,56-58,67` |
| Login bonus | yes | — | mostly | claimable twice per local day (local vs UTC key mismatch) | `DailyStore.ts:146-159` vs `RewardStore.ts:5-7` |
| Offline | local economy works | — | partly | ad offers still shown and fail silently (`isRewardedReady()` always true, no callers) | `Ads.ts:84-86` |
| Web build | stubs grant purchases free | — | n/a | the public Vercel build hands out paid items | `IAP.ts:96-100,133-138` |

### F.2 Economy (actual numbers) [V]
- **Sources:** campaign win 5 + 3/★ (8–14✦, every win incl. replays); daily 15 + 3/★ + streak bonus 10/25/50/100 at 3/7/14/30; win streak +10/20/35/60 at 3/5/8/12; Endless `min(60, score/40)`; 14 achievements = 655✦ + 71◆ once; star milestones 30/60/100/150★ = 90◆; collections 20◆ each (only 2 free-completable → 40◆); login 145✦ + 6◆ per 7 days; free ◆ ad 5◆/day.
- **Sinks:** Stardust **6 items = 440✦ total**; Fragments 14 items = 700◆; 5 IAP-only items.

| Goal | Non-payer, no ads | With the daily ◆ ad |
|---|---|---|
| Whole Stardust catalog (440✦) | **~L25–30 (day 1–2)** | ~L18 |
| First Epic (25◆) | ~L15–25 | day 1–2 |
| Mythic (100◆) | ~L60 | ~week 1–2 |
| All 14 Fragment items (700◆) | ~80+ weeks | ~12 weeks |
| Stardust unspendable by end of campaign | **~2,500✦** | more |

**Verdict:** Stardust is a tutorial currency that dies on day 2 → the main rewarded placement, store nudge, daily/login ✦ all lose meaning. Fragments are the real currency but only one ad/day accelerates them. "Premium currency" isn't purchasable → two soft currencies without depth. Max spend per payer ≈ **$15.97** → no whale outlet. Remove Ads converts poorly *because* interstitials are (correctly) rare. Interstitial gating targets the struggling player (3★/boss/streak wins are protected; hard wins get the ad).

### F.3 Never monetize / do monetize
- **Never:** level unlocks, stars, attractor strength, streak freezes, the weekly board, energy/lives, loot boxes, ads in session 1, ads after a death or mid-attempt, fake countdowns, pay-to-skip.
- **Do:** cosmetics, convenience (No-Ads+, ad-free rewards), patronage/support, optional hints with a ★ cap, and later new content packs.

### F.4 Ranked improvements
| # | Change | Impact | Effort |
|---|---|---|---|
| 1 | IAP plumbing: plugin name `'Purchases'`; real key; `premium` attached to remove_ads/starter/founders; all products in the current Offering; re-grant bundles from `customerInfo` (all purchased product ids) on init/restore; remove `[0]` fallback and `|| true`; customer-info listener for pending; store `priceString` everywhere | $0 → working | S |
| 2 | Interstitials: preload at level start; show **inside `advanceAfterWin` before** the restart and await dismissal; reset cooldown after rewarded; lifetime grace until ~L10; suppress after hard wins (≥3 deaths) | policy + retention | S–M |
| 3 | Rewarded: preload; real readiness check hides offers; settle on Dismissed/FailedToShow + timeout; busy flags; "Ad unavailable" toast | fixes hang/dead taps | S |
| 4 | UMP at menu start; respect `canRequestAds`; Settings "Privacy choices" → `showPrivacyOptionsForm()` | EEA compliance | S |
| 5 | Stardust sink: "Stardust Forge" (150✦ → 5◆, daily cap) + rotating Featured slot selling Epics for 400–800✦ | revives 2×/nudge | M |
| 6 | **No-Ads+** premium (~$2.99–3.99 heuristic): no interstitials + rewarded rewards without watching + exclusive skin; cosmetic-only SKUs for existing owners | conversion | M |
| 7 | Rewarded "Show route" after 3 deaths (★ cap) | frustration + inventory | M |
| 8 | Free ◆ surfaced on menu; "Double today's chest" (1/day) | inventory | S |
| 9 | Supporter tiers ($0.99/$4.99/$9.99 + halo + credits); time-boxed Founder's | whale outlet | S |
| 10 | Remote tuning (Firebase Remote Config / RC Offering metadata) + price A/B via Offerings | learn after launch | M |
| 11 | Seasonal cosmetic collections ($2.99–4.99) tied to events | recurring revenue | M–L |
| 12 | Expert level pack (grow retired 13 → 25–30) | low | M–L |

**Not justified now:** battle pass (no content pipeline, no DAU data — revisit a *free* "Star Path" first; paid lane only at D30 ≥ ~8–10% and DAU ≥ ~5–10k, heuristic); subscriptions (offline single-player, no recurring content — would read as predatory).
**Expectations (heuristics, not facts):** casual-puzzle payer conversion ~1–3%; ARPDAU ~$0.02–0.08 for this model; rewarded eCPM ~$10–30 US / $3–8 blended. Revenue will be limited far more by installs than by SKU design.

---

## G. Retention / Virality Audit

### G.1 Journey timing [V code / I estimates]
| Window | Reality |
|---|---|
| **First 30 s** | ~1.5–3 s cold start → company splash 1.85 s → intro 3.95 s (needs a 2nd tap to skip) → menu (9 interactive elements, 3 gold attention cues) → warp 0.43 s → L1 with coach mark. **~10–13 s to first touch unskipped.** L1 clears at ~16–18 s. |
| **First 2 min** | W1 L1–L7; FLOW streak by L3; a 2× ad offer on *every* win before ✦ is ever explained; no interstitial (grace). The 2.8 s auto-advance makes the game feel like it plays itself. |
| **First session (10–15 min)** | 15–25 levels if no walls. First death + streak break at the L10 boss (first hazard). W2 at L11 — which self-solves. |
| **First 24 h** | Return only if self-motivated — no notification, nothing in the OS. Chest + daily + CONTINUE if they come back. |
| **D7** | Login day 7, daily streak 7 (+freeze), weekly reset — **all invisible unless the menu is opened**. |
| **D30 / end of campaign** | A cliff: no events, no online play, no post-game unlocks; CONTINUE points at L150 forever. |

### G.2 System-by-system
| System | State | Biggest weakness |
|---|---|---|
| Daily Challenge | 8 levels × 4 modifiers; streak + freeze | thin pool; day-0 access to untaught mechanics; **infinite replay payout**; no "tomorrow" tease; `recentDaily` results never read |
| Login chest | 7-day ladder | unlabeled ✦ icon; no calendar/day number; silent reset |
| Weekly | fixed seed, local best | "same run for everyone" with no board; buried 2 screens deep; no participation reward |
| Gravity Run | solid generator, 20 chunks | no missions/unlocks/variants/telemetry; scrim-tap ejects to menu |
| Leaderboard | **localStorage only** (`Leaderboard.ts:57-133`) | no online component |
| Play Games Services | **none** | no sign-in, achievements mirror, cloud save |
| Achievements | 14, all passive | none for Endless/Weekly/bosses/cosmetics/streak; no progress bars |
| Cosmetics collection | 28 items, 6 collections | 4/6 collections need IAP; 0 cosmetics tied to world/boss completion |
| Win streak | FLOW/BLAZE/NOVA | breaks on any death (noise after W3); replays of trivial levels farm it; never shown outside the overlay |
| Near-miss | death + win lines | death text invisible; win "retry?" not actionable |
| Share | `Share.ts:13-35` | `navigator.share` unsupported in Android WebView [I] → silent clipboard copy; no store link/seed; only on Run Over |
| Ghost | static PB polyline | not a racing ghost; campaign only; off under reduced motion |
| Notifications / win-back | **none** | **the biggest gap** |

### G.3 Analytics (what you can and can't learn) [V]
- **Can:** D1/D7/D30 via Firebase's automatic `first_open`/engagement; per-level unique start/complete funnels (after registering `level` as a custom dimension); rewarded offered→shown→earned per surface; interstitial cadence; IAP funnel shape (shop_open → tab → cross-sell → initiated → completed/failed → first_purchase).
- **Broken/missing:** custom **`session_start` is a reserved Firebase name** → dropped (`analyticsEvents.ts:39`); `level_start` + `hint_used` fire per *attempt*; `level_complete` includes replays (no first-clear flag); daily fails logged as level 0; **no attempt index, no `level_quit`, no time-in-level, no tutorial steps, no screen_view, no Gravity Run events at all, no currency earn/spend, no share events, no ad load-failure events, no purchase value/currency, no user properties** (max_level, total_stars, is_premium, daily_streak…), **no Remote Config / A/B**. Analytics + Crashlytics start before consent (`BootScene.ts:19`, `Crash.ts:29`); Crashlytics has no custom keys and no stack traces for bridged errors.

### G.4 Ranked churn points
1. No re-engagement pull at D1/D3/D7.
2. Difficulty wall with no relief valve (sequential 1★ unlock, no skip/hint) — risk spots: L10, L11 (new mechanic), L34 (8 s limit), W12/W13 timed cluster (L112–133).
3. Splash tax on every launch.
4. First-win overload + unexplained currency.
5. Mastery-loop friction (no Retry).
6. Dead Stardust sink by ~L25–30.
7. L80 false ending; duplicate names dilute the journey.
8. Daily fatigue (8-level pool).
9. Unfair-feeling fails (clock through Settings/ads; Back exits app).
10. End-of-campaign cliff.

### G.5 Missing high-leverage systems — ranked (1–5; effort 1 = cheapest here)
| # | System | Impact | Effort | Ret. | Mon. | Viral | Backend? | Why *for this game* |
|---|---|---|---|---|---|---|---|---|
| 1 | Win-overlay Retry/Next + stop auto-advance | 5 | 1 | 4 | 2 | 1 | no | unlocks the already-built 3★/par/ghost loop |
| 2 | **Local notifications** (daily ready, streak at risk, chest, weekly reset, 3-day win-back) | 5 | 2 | 5 | 2 | 1 | no (`@capacitor/local-notifications`) | every return system exists but nothing pulls players back |
| 3 | Skip-after-N-fails / rewarded "show route" | 5 | 2 | 5 | 4 | 1 | no | 150 unverified levels behind strict sequential unlock |
| 4 | Daily missions (3/day, ◆ rewards) | 4 | 2 | 5 | 3 | 1 | no | reuses StatsStore + RewardStore; makes ◆ earnable by playing |
| 5 | Remote Config + A/B | 4 | 2 | 3 | 3 | 1 | Firebase (free, project exists) | everything is compile-time today |
| 6 | Native share + store link + **seed deep link** ("beat my 1240 on this run") | 4 | 3 | 3 | 1 | 5 | light (`@capacitor/share`, App Links, landing page on Pages) | `generateRun(seed)` is deterministic already |
| 7 | **Play Games Services leaderboards** (weekly/endless/daily) + achievements + **cloud save** | 4 | 3 | 4 | 2 | 3 | PGS (free) | `Leaderboard` interface is swap-shaped; fixes the listing claim; Level Up prerequisites |
| 8 | Visible streak/calendar layer (+ streak repair via ad) | 3 | 1 | 4 | 3 | 1 | no | data exists, nothing shown |
| 9 | World/boss ceremony + world cosmetics + Star Map path animation | 3 | 2 | 4 | 2 | 2 | no | 15 "STAR FREED" moments lead nowhere |
| 10 | Rotating weekly modifiers (mirror, low drag, magnet storm) | 3 | 2 | 4 | 1 | 2 | optional RC | reuses `DailyModifier` + Endless `mode` |
| 11 | Animated PB ghost racing → dev "world-record" ghost | 3 | 2 | 3 | 2 | 2 | no (friends need Firestore) | ghost samples are uniform-time |
| 12 | Seasonal/limited events + exclusive cosmetics | 4 | 3 | 4 | 4 | 2 | client date windows; RC for live-ops | seeds/modes/rewards plumbing exists |
| 13 | Boss Rush / World Time Attack | 3 | 2 | 3 | 1–2 | 2 | no (boards via PGS) | natural endgame |
| 14 | Comeback gift (≥3-day absence) | 3 | 1 | 4 | 2 | 1 | no | `lastLoginDate` already tracked |
| 15 | Daily ladder / time board | 3 | 2 (after #7) | 4 | 1 | 3 | PGS | `submitDaily` stores results nobody reads |
| — | Endless variants, event currency, referral, community goals, tournaments | ≤3 | 3–5 | — | — | — | various | defer until DAU exists |

---

## H. Technical / QA Audit

### H.1 Verified facts (commands run)
Web build reproducible (identical hashes) · AAB web payload = HEAD · AAB manifest versionCode 1 / test AdMob id / no `screenOrientation` / `allowBackup=1` · native deps (GMA 24.9.0, UMP 4.0.0, billing 8.3.0, RC 10.8.0) · 16 KB compliant · `assembleDebug` OK with local JDK path · Vercel serves HEAD · frame-rate probe (velocity scales linearly with render rate) · 200-restart leak probe flat.

### H.2 P0 (blocks a production release)
1. **Frame-rate-dependent physics** — forces applied per render frame (`GameScene.ts:915-917`, `EndlessScene.ts:227-229`) vs Matter's fixed 60 Hz accumulator with forces cleared after each step (`phaser/src/physics/matter-js/World.js:1174-1250`). Fix: apply forces in `this.matter.world.on('beforeupdate', …)` in both scenes; extract one pure `attractorForce()` (the formula is duplicated in two scenes).
2. **IAP non-functional** — `registerPlugin('PurchasesPlugin')` (`src/utils/native/revenueCat.ts:19`) vs native `@CapacitorPlugin(name = "Purchases")` (`node_modules/@revenuecat/purchases-capacitor/android/.../PurchasesPlugin.kt:80`); RevenueCat's own JS uses `'Purchases'`. Plus `apiKey: ''` (`monetization.config.ts:26`).
3. **Interstitial over live gameplay** and **rewarded hang** (see §F).
4. **Test AdMob IDs** in manifest + config.
5. **`@capacitor/android` 8.4.0 critical advisory** GHSA-rvm3-566m-v7fv (fixed 8.4.3) baked into the AAB → bump to 8.5.x, sync, rebuild.

### H.3 P1
- **Level clock = wall clock** (`levelStartMs = game.loop.time`, `GameScene.ts:213`; used at :616/:653/:1027): Settings pause, backgrounding, interstitials all drain timers/par and inflate best times. Settings resumes without compensation (`SettingsScene.ts:187`).
- **No pause/audio-suspend on background**: `main.ts:92-100` only resumes audio; Capacitor's `Bridge.onPause` doesn't pause the WebView → synth pad likely keeps playing [D].
- **Paid content not restorable**; premium overwritten by entitlement on each launch (`IAP.ts:86`).
- **Consent & privacy**: lazy UMP, analytics before consent, no privacy-options entry, no in-app privacy link.
- **Uncaught exception = permanent freeze**: Phaser's RAF step runs the callback before re-requesting the frame; `Crash.ts:41-46` logs a message only (no stack), no recovery UI.
- **No portrait lock** (`AndroidManifest.xml:21-27`), no `appCategory="game"` (Android 16 ignores orientation locks on ≥600dp unless declared a game) [D].
- **No Back handler / no Endless pause** (phone call = death).
- **No `VIBRATE` permission** while haptics use `navigator.vibrate` → haptics may be dead on Android [D].
- **Release process**: versionCode hard-coded 1; package 1.0.0-rc.1 vs versionName 1.0.0; no bump automation.
- **Misleading leaderboard copy** in the listing (policy risk).

### H.4 P2
- Store-shape validation: a valid-but-wrong JSON value (e.g. `"null"`) in Progress/Reward/Ghost stores → TypeError → freeze (`ProgressStore.ts:30,47,85`); corrupt JSON silently resets and the next persist overwrites the original (no backup key).
- No in-flight/scene-alive guards on ad taps (double grant; `doRevive` on a destroyed world).
- No `pointerupoutside` (desktop web: attractor sticks).
- FPS watchdog not persisted (re-adds bloom every restart → 3–6 s stutter per attempt on weak GPUs); it removes only bloom (ball glow + vignette stay).
- **ES2020 bundle vs Capacitor default `minWebViewVersion` 60** → WebView 60–86 shows a blank screen; set 87+.
- R8 off; Amazon store SDK bundled; dynamic `play-services-ads 24.9.+`.
- Soft text on high-DPI (390×844 canvas scaled up).
- Old `progress:v1..v8` keys never cleaned; the Capacitor origin must never change or all saves are lost.
- `.ai` broken symlinks; machine-specific JDK path in a tracked file; obsolete stash; `node_modules` in git history.

### H.5 Architecture & scaling
- 16.1k lines, small and modular overall; config-driven; pure logic TDD'd. **Weak points:** `GameScene` is a god-class (1,708 lines, `triggerWin` touches ~12 stores/rewards/analytics/ads); the "no managers" rule pushed orchestration into the scene while 15 module-level `*Store` singletons are managers in all but name; physics/input/audio code copy-pasted between `GameScene` and `EndlessScene`; ~10–20 Graphics objects cleared and redrawn every frame; native init failures cached for the whole session (no retry).
- **Lifecycle is sound** (no listener/texture/body leaks across restarts).
- **Scaling:** adding levels is cheap; a new mechanic touches two scenes; there is no backend, cloud save or remote config, so balance and live-ops require app releases.
- **Persistence:** 21 localStorage keys; all `JSON.parse` wrapped; key-bump versioning; no cloud save/export; Android Auto Backup of WebView storage uncertain [D].

### H.6 Low-end Android risks
Frame-rate-dependent pull (halved at 30 fps) · three full-target post-FX passes · ~1.7 MB JS parse at cold start · blank screen on WebView < 87 · per-frame Graphics re-tessellation · oscillators possibly running in background (battery) · particles within budget (≤24 burst) · heap ~30 MB.

### H.7 Tests & tooling reality
221 tests cover pure helpers (scoring, daily/streak, endless generator, interstitial gate, analytics shapes, textFit, etc.) + structural level/chunk lints. **Not covered:** scenes, entities, store persistence/corruption, native Ads/IAP branches, input/lifecycle, physics feel, **solvability** (no solver or input-replay regression). 60+ ad-hoc Python/Playwright scripts are gitignored and not in CI.

### H.8 Dependencies
`npm outdated`: Capacitor 8.4.0 → 8.5.2; admob 8.0.0 → 8.2.1; capacitor-firebase 8.3.0 → 8.5.2; purchases-capacitor 13.1.5 → 13.7.0; phaser 3.90.0 → 4.2.1 (Phaser 4 is out; 3.90 is the last 3.x); vite 5 → 8; vitest 1.6 → 5; TypeScript 5.9 → 7. CI Node 20 is EOL.

---

## I. Store / Release / ASO Audit

### I.1 Google Play policy & platform changes to verify (as of 2026-10-07; sources in the research notes)
| Item | Requirement | Date | Gravity Flow |
|---|---|---|---|
| Target API | new apps/updates must target **API 36** | 2026-08-31 (extension to 11-01 on request) | ✅ targetSdk 36 — but Android 16 behaviors apply (below) |
| Android 16 behaviors | forced edge-to-edge; predictive back (KEYCODE_BACK no longer dispatched); orientation/resizability locks ignored on ≥600dp unless `android:appCategory="game"` | now | ❌ no back handler, no `appCategory`, no portrait lock → fix + test [D] |
| Play Billing Library | PBL ≤7 can't publish | 2026-08-31 | ✅ billing 8.3.0 in the AAB |
| 16 KB page size | native libs 16 KB-aligned | official page: 2027-02-01 (date has moved) | ✅ verified aligned |
| **New personal account testing** | **≥12 testers opted in for 14 continuous days**, then production-access review (~7 days) | accounts created after 2023-11-13 | ⚠️ not started; budget 3–4 weeks; recruit ~20 testers |
| Developer verification | Play apps auto-registered; sideloaded keys need registration | global 2027 | low impact if Play-only |
| Full-screen ad policy | no unexpected interstitials, none at the start of a level or during gameplay | in force | ❌ current interstitial timing |
| Data Safety (AdMob, page updated 2026-10-02) | GMA collects **and shares** IP, ad ID, app-set ID, app interactions, diagnostics (ads, analytics, fraud prevention) | now | ❌ draft under-declares |
| UMP / TCF v2.3 / US states | privacy-options entry point required when status is REQUIRED; US-states message; TCF v2.3 strings | now | ❌ no entry point; UMP 4.0.0 ✅ |
| AdMob app readiness | app live on a store + **app-ads.txt** verified on a developer website | at launch | ❌ no developer website yet |
| Families / target audience | under-13 in audience → Families policy (certified SDKs, no personalized ads…) | ongoing | ⚠️ undecided — **recommend declaring 13+** |
| US state age laws / Play Age Signals | act on age/consent signals (TX, UT, LA) | live | ⚠️ get advice |
| Android vitals | crash 1.09% / ANR 0.47% thresholds | ongoing | ⚠️ WebView renderer crashes count |
| Service fees | US/UK/EEA new structure from 2026-06-30 (~15% effective on first $1M) | live | minor |

### I.2 Listing & ASO [V measurements]
- **Lengths:** title 29/30 (`GRAVITY FLOW — Physics Puzzle`), short 79/80, full 2,338/4,000 (hard-wrapped into 38 lines — Play keeps line breaks → unwrap before pasting).
- **False/misleading claims:** "everyone races… for the leaderboard" (local-only) — **fix before submission**; "a new mechanic in every world" (W9–15 reuse the 7); "one straightforward Best Value bundle" (there are 3).
- **Keyword plan not executed:** "puzzle" ×1, "physics" ×1, "game" ×0; "brain teaser/logic/orbit/slingshot" ×0.
- **Suggested:** title `Gravity Flow: Physics Puzzle` (title case per Play guidance); short "Hold to pull the star home: 150 one-touch physics puzzles, bosses & endless mode" (80); lead the full description with structured facts (150 levels · 15 worlds · 7 mechanics · offline · cosmetic-only store) — Play's "Ask Play"/AI surfaces read these.
- **Screenshots (8 × 1080×2160, valid):** first-two rule fails (#1 = end-game Star Map, #2 = dim gameplay without a visible finger/verb); #3 shows the hint overflow; #4 is 70% dimmed with contradictory state; #5 shows the boxed logo; **#6 shows USD prices**; no captions anywhere (Play has no caption editor — bake them in); pillarbox bars; no promo video. Re-shoot *after* the brightness/logo/hint fixes: (1) bright mid-pull with finger + curved trail "Hold to pull. Release to fly." (2) boss with hazards "15 worlds · 7 mechanics" (3) Star Map from the top (4) 3★ win (5) Gravity Run (6) skins grid (no prices) (7) Daily (8) magnets/portals; add a 9:16 set and a 15–30 s portrait gameplay video.
- **Feature graphic:** "GRAVITY" clipped at the right edge; straight trail reads "thrown", not "pulled".
- **Icon:** 512 RGBA OK; at 48 px reads as an iridescent donut; three different brand marks (icon / in-app logo / feature graphic) → unify.
- **iOS media:** two "store" images are off-size (iPhone `03-boss-finale` 1290×2530; iPad `05-boss-finale` 2048×2472) and all are browser previews.

### I.3 Data Safety / privacy gaps
| # | Gap | Severity |
|---|---|---|
| 1 | No privacy-policy link inside the app | High |
| 2 | No way to reopen/withdraw GDPR consent (privacy-options entry point) | High (EEA) |
| 3 | Consent asked late; Analytics starts at launch with ad ID (`AD_ID` permission present; no Consent Mode v2 defaults) | High (EEA) |
| 4 | Draft omits approximate location (IP), app interactions, diagnostics, device IDs (Analytics app-instance + ad ID; Crashlytics), purchase history (Analytics `in_app_purchase` + Wave-3 purchase events; RevenueCat app user id), fraud-prevention/advertising purposes, "shared" flags | High |
| 5 | Advertising-ID declaration form never mentioned in the docs | High (blocking form) |
| 6 | Target audience age groups never decided; `AdMob.initialize()` called with no child-directed/max-ad-rating options (`Ads.ts:75`) | High (decision) |
| 7 | "Users can request deletion" with no mechanism (either add `resetAnalyticsData` in Settings or answer accurately) | Medium |
| 8 | Analytics/Crashlytics not optional → declare as required | Medium |
| 9 | US-state "sale/share" handling for personalized ads | Medium (legal) |
| 10 | Policy effective date (10 Jun) predates Waves 2–3; doesn't cover purchase-event analytics / Privacy Sandbox APIs | Low–Med |
| 11 | `allowBackup="true"` contradicts "uninstalling removes this information" | Low |

### I.4 Release & versioning
- Cut **`v1.0.0-rc.2`** at HEAD (51 commits past rc.1); add the missing CHANGELOG entry for Waves 1–4 + the title-fit fix; create GitHub Releases going forward (don't attach the AAB to a public release).
- versionCode: derive from a script/CI; if the Aug-1 AAB (versionCode 1) was ever uploaded, the next must be ≥2.
- Document Play App Signing enrollment and **back up the upload keystore** (single copy observed).
- Fix the runbook (alias example says `upload`; real alias `gravityflow-upload`) and remove the committed JDK path.

### I.5 Name / brand
"Gravity Flow" is a registered trademark of Rocketgenius Inc. (gravityflow.io, WordPress workflow add-on) and dominates web search for the name. Different goods, but software classes can overlap → **clearance check before any launch spend; decide now whether to keep, qualify (e.g. "Gravity Flow: Star Puzzle") or rename** [heuristic, not legal advice].

### I.6 iOS / App Store readiness (~0–10%)
No `ios/` platform, no `@capacitor/ios`. Needs macOS + Xcode + Apple Developer ($99/yr); App Store Connect record + support URL + privacy labels + age rating; **ATT** prompt + `NSUserTrackingUsageDescription`; AdMob `GADApplicationIdentifier` + **SKAdNetwork IDs**; `PrivacyInfo.xcprivacy`; Firebase plist; RevenueCat iOS key + App Store products; 1024 icon **without alpha**; real-device screenshots at current 6.9"/13" sizes; **haptics via `@capacitor/haptics`** (WKWebView has no `navigator.vibrate`); audio unlock/safe-area/share-sheet checks. Remove the README "iOS" badge until started.

---

## J. Documentation / State Audit

### J.1 Contradiction matrix (truth = code/git on 2026-10-07)
| Claim | Docs say | Truth | Stale where |
|---|---|---|---|
| Test count | 103 (`README.md:17,80`; `session-handoff.md:19,41,90`) / 210 & 27 files (`project-status.md:37,159,207`; `LAUNCH-READINESS.md:15,66,129,241`) | **221 / 28 files** | all |
| AAB | "rebuilt 06-16, ready" (`session-handoff.md`, `release-prep.md`) vs "STALE since 06-16" (`project-status.md:44-45,189-194,224-227,446,458`; `LAUNCH-READINESS.md:20,31,69-71,114,144,192,280`) | **2026-08-01, contains HEAD**, test ids, versionCode 1 | all |
| Wave 4 | "on `feat/wave4-launch-media`, pending merge" (`project-status.md:28-30,41-43,120`; `LAUNCH-READINESS.md:13`) | merged on master; branch doesn't exist | project-status, LAUNCH |
| Title-overflow bug | "filed, not fixed" (project-status, LAUNCH-READINESS ×10 places) | fixed (`32eeb6b`, `970744f`, `773e6b2`); a **new** overflow exists (hints) | both |
| Phaser | 3.80 (`project-status.md:74`) | 3.90.0 | project-status; pin `^3.90` |
| Scenes / files | CLAUDE.md "GameScene (levels 1–6)", "PLAY / LEVELS", "level1…level22.ts", 8 scenes, "future: portals, magnets" | 13 scenes, 163 files → 150 levels, all 7 mechanics shipped | CLAUDE.md, project-status |
| Content-complete version | "v0.14.0" (`project-status.md:181`) | rc.1 / milestone v0.15.0; no v0.8–v0.14 tags | project-status |
| Sprint E | "(latest, in progress)", "28 tests" (`project-status.md:283-298`) | history | project-status |
| Future roadmap | "Magnets… Next mechanic", "Capacitor or PWA" (`project-status.md:470-479`) | all built | project-status |
| HEAD | "`a354492`" (`project-status.md:185`) | `d3c6aab` | project-status |
| Pages | "confirm/enable" (handoff, LAUNCH, release-prep, project-status) | live | all |
| `.nojekyll` | "optional, add it" vs "present" | present | project-status, release-prep |
| Readiness % | "Play ~72% / repo ~99% / iOS ~10%" | unmeasured; repo-side P0s exist | LAUNCH, project-status |
| Achievements | 15 (`monetization-review.md:17,75`) | 14 | monetization-review |
| Screenshot set / boss shot | assets README (06-14 order, "THE SINGULARITY"), aso.md ("THE BREACH") | `03-boss-finale` = L150 | assets README, aso.md |
| Launcher icon | "still default robot" (`store/assets/README.md:38-40`) | branded | assets README |
| "No repo work remains… don't add features" | `session-handoff.md:22,32` | 51 commits added after; P0s found | handoff |
| RC == code | `CHANGELOG.md:9`, `RELEASE-v1.0.0.md:7` | 51 commits ahead | both |
| gh CLI | "not installed" (`RELEASE-v1.0.0.md:28`) | gh 2.96.0 | RELEASE |
| Gravity Run strategy | `~/.claude/plans/pure-foraging-fiddle.md` (`project-status.md:376`; handoff:60) | **file gone** | both |
| Shared weekly leaderboard | listing, release notes, README | local-only | store copy |
| iOS | README badge "iOS" | no iOS platform | README |
| Captions "in Play console editor" | media/assets READMEs | no such editor; PNGs have no captions | both |
| "Reproducible" tooling | many docs | `.gitignore:15` ignores `scripts/*.py` → smoke_levels, capture_store_shots, gen_brand_assets, gen_launcher_icons untracked | all |
| Gradle JDK | "Android Studio JBR" | JBR is now JDK 25 (breaks); local uses Temurin 21 (uncommitted) | release docs |
| Company splash | CLAUDE.md "text wordmark" | renders the TSL logo PNG (734 KB) | CLAUDE.md |
| Interstitials "never interrupt an active attempt" | `project-status.md:112-113` | they do (next level) | project-status |
| Memory | — | memory dir exists but is empty | — |

**Public exposure:** the repo is public and Pages serves all of `docs/` (with `.nojekyll`, `.md` files are raw). Exposed: monetization strategy & pricing, "Make it Addictive"/"spend nudge" wording (reputational for a kid-appealing game), local keystore path, Firebase project id. No secrets found (`keystore.properties`/`google-services.json` gitignored).

### J.2 Proposed single-source-of-truth structure (proposal — not executed)
| File | Owns | Action |
|---|---|---|
| `README.md` | public face; stats from generated badges | keep, fix |
| `CLAUDE.md` | architecture + conventions **only, no state** | trim; fix scene flow/folder tree |
| `CHANGELOG.md` | Keep-a-Changelog, one entry per tag, `[Unreleased]` | add Waves 1–4 / rc.2 |
| **`docs/STATUS.md`** (new, ≤150 lines) | **the only state doc**: generated *Facts* block · *Gates* (owner/date) · *Next 5 actions* · *Open bugs* · *Decisions log* | replaces project-status "CURRENT", session-handoff, LAUNCH-READINESS snapshot |
| `docs/release/RUNBOOK.md` | build/sign/JDK/versioning/tag/release | merges release-android + release-prep + RELEASE-v1.0.0 |
| `docs/release/PLAY-CHECKLIST.md` | every Play Console form with the exact answer (Data Safety, Ad ID, target audience, rating, ads, app access, 12×14) | new |
| `docs/store/` | `listing.md` (copy), `data-safety.md` (per SDK × data type), `aso.md`, `release-notes.md`, `assets/README.md` | split/fix |
| `docs/design/` | gameplay systems, design decisions, growth architecture | moved from project-status |
| `docs/qa/device-playtest-checklist.md` | in-game level numbers (not file numbers) + Wave 1–3 feel pass + ad/IAP/consent smoke + haptics | fix |
| `docs/audit/2026-10-07/` | this report + inventory JSON/CSV | new (optional) |
| `docs/archive/` | completed sprints, 56-level snapshot, monetization-review, excitement audit, all completed plans (with "Done — merged `<hash>`" banners) | move |
| delete after merge | `session-handoff.md`, `LAUNCH-READINESS.md`, `release-prep.md`, `RELEASE-v1.0.0.md` | — |

**Drift prevention:** a tracked `scripts/facts.mjs` computes level/world/achievement/cosmetic/chunk counts, test totals (`vitest --reporter=json`), package/versionCode/versionName, last tag + commits since, HEAD, AAB mtime/versionCode, and rewrites `<!-- facts:start/end -->` blocks in STATUS.md + README badges; CI runs `facts.mjs --check`. Add a `store-copy.test.ts` (lengths + numbers match facts), a CI grep banning "pending merge"/"in progress"/hard-coded HEAD hashes in STATUS.md, un-ignore the scripts the docs call reproducible, and make "finish a branch" update STATUS Gates + stamp the plan banner. Consider moving internal strategy docs to a private repo (or deploy Pages from a `site/` folder via Actions with only policy/support/delete-data pages).

---

## K. Major Risks
| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Launch with broken IAP/ads → $0 revenue + 1★ "purchase doesn't work" reviews | certain if unfixed | high | Phase 0 #1–3 + on-device license-tester checklist |
| 2 | Frame-rate-dependent pull → levels feel different per phone; some unwinnable on 30 fps; par stars trivial at 120 Hz | high on modern Androids [D] | high | fixed-step force application + re-tune |
| 3 | Play review / AdMob policy (interstitial at level start, misleading leaderboard, Data Safety, consent, families) | medium–high | high (rejection/limited ads) | Phase 0 compliance pack |
| 4 | Difficulty wall in unverified levels behind strict sequential unlock | medium | high (D1/D7) | fail relief + telemetry + closed test |
| 5 | Back-half content quality exposed to engaged players and reviewers | medium (only engaged players reach it) | medium | Phase 1 content pass |
| 6 | Zero re-engagement → low D1/D7 regardless of quality | high | high | notifications + visible streaks |
| 7 | Trademark conflict on "Gravity Flow" | low–medium | high (forced rename after spend) | clearance now |
| 8 | Calendar risk: 12×14 closed test + production review ≈ 3–4 weeks | certain | medium | start the closed test immediately with test ad ids |
| 9 | Single copy of the upload keystore | low | catastrophic for updates (mitigated if Play App Signing is used) | back up; enroll Play App Signing |
| 10 | Save loss (localStorage only; uninstall/device change) | medium | medium | PGS Saved Games/cloud save |
| 11 | Low-end WebView performance / blank screen on old WebView | medium | medium | quality tiers, persisted watchdog, minWebViewVersion 87 |
| 12 | Solo-dev scope creep (the waves pattern: polishing systems without players) | high | high | ship to closed test first; let data choose |
| 13 | **"It plays itself" first impression.** Minutes 6–10 self-solve, 3★ is free, and the difficulty is flat, so the game reads as shallow to testers and reviewers. | high | high | first-hour depth pass + physics hold-until-touch before the closed test |

---

## L. Biggest Opportunities

### L.1 Product opportunities (ranked)
1. **Mastery loop activation** (Retry/Next, fail relief, ghost racing, post-game Mirror/Boss Rush) — the systems are 80% built.
2. **Shareable global Daily** (one puzzle for everyone, result card, deep link) — habit + light virality on top of existing daily/streak/freeze scaffolding.
3. **Gravity Run as the real flagship** (×3 chunks, escalation phases, missing mechanics, PGS boards, seed challenges) — the only infinite-content surface.
4. **Back-half rework with 2–3 new cheap mechanic variants** — turns "more of the same" into a second act.
5. **Re-engagement layer** (local notifications, calendar, comeback gift) — cheapest D1/D7 lever available.
6. **Economy repair + No-Ads+** — revives rewarded inventory and gives payers a reason.
7. **Store creative rebuild** — the current assets undersell the game.

### L.2 Trends Gravity Flow can realistically ride
| Trend | Why it fits | Complexity | Risk | Upside | When |
|---|---|---|---|---|---|
| Wordle-style shared daily + share card | daily infra exists; physics outcomes are visual | low–med | low | habit + virality | pre-launch if ≤2 days, else v1.1 |
| Short-form video (TikTok/Shorts/Reels) of satisfying slingshots/near-misses | satisfying physics is scroll-stopping; algorithm ignores followers | low (manual) / med (in-app clip export) | time sink | high variance | start 4–6 weeks pre-launch |
| Playable ads cut from the real build (web tech advantage, <5 MB) | Phaser = playable-ready | low–med | low | high *if* doing paid UA | post-launch cheap-geo tests |
| Lightweight live-ops via Remote Config JSON (weekly mutators, seasonal palettes) | levels are data | low–med | content treadmill | medium | post-launch |
| Solver/AI-assisted level tooling (headless Matter: verify solvability, auto-tune par, generate dailies/chunks) | Matter runs in Node; the inventory analyzer is a start | med | low | content velocity + fairness | pre or post |
| Editorial / Indie Games Festival / Indie Corner | polished visuals; *Orbit* (gravity puzzle) won the 2016 festival | low | low | med–high | pitch at launch |
| Play Games "Level Up" program (fee cut, featuring) | needs PGS v2, cloud save, ≥10 achievements | med–high for WebView (Vulkan/60 fps out of control) | partial eligibility | medium | v1.1–1.2 |
| UGC level editor / share codes | `LevelConfig` JSON | high | moderation | community + content | v1.2+ |
| Season/Star Pass | common in puzzle | high | low value at low DAU | uncertain | post-launch, only at scale |
| Hybrid monetization (difficulty-driven hints) | breakout puzzlers monetize difficulty | low–med | brand-promise tension | med–high | design pre-launch, tune post |

### L.3 Positioning
- **Genre / subgenre:** Puzzle → *one-touch gravity physics puzzle* (Cut the Rope / Where's My Water lineage × Orbit-style gravity simulation). **Not** hybrid-casual sort/block.
- **USP:** *"You don't move the star — you are gravity."* Indirect, analog, skill-based control; 7 mechanics; 150 handcrafted levels with a boss per world; an endless climb; an honest cosmetic-only store.
- **Target player:** adults 18–44 who like premium-feeling puzzlers (Monument Valley, Alto, Mini Metro fans), 3–8 minute commute sessions. **Secondary:** score chasers (Gravity Run). Declare target audience **13+**.
- **Player fantasy:** wielding gravity itself to guide a lost star home through a living cosmos.
- **Emotional promise:** *calm control that becomes flow* — mastery is the hook, zen is the mood. (Needs a real soundtrack/Zen mode to fully back "relaxing".)
- **Ideal session:** 3–8 minutes (5–15 levels or 2–4 runs).
- **Why choose it:** tactile, analog control instead of tap-to-match; premium look without energy systems or pay-to-win.
- **Why share:** near-miss slingshots, boss clears, a daily result card, "beat my run on this seed".
- **Why spend:** support an honest indie, express identity (skins/trails/arrivals), remove ads.
- **Why return tomorrow (after fixes):** the shared daily + streak, weekly board, chest calendar, new event packs.
- **Positioning statement:** *For puzzle players who want skill without stress, Gravity Flow is a one-touch physics puzzler where you become gravity — hold to pull a lost star home through 150 handcrafted cosmic levels. Unlike match-and-sort puzzlers, every solve is an analog, physical feat, with no energy timers and no pay-to-win.*
- **Store hooks:** "Hold to pull. Release to fly." · "Bring the lost star home." · "150 levels · 15 worlds · 15 bosses" · "No energy. No pay-to-win."
- **Ad-creative hooks:** near-miss slingshot around a magnet into the goal · fail-bait (star clips a saw at 99% — "can you do better?") · finger + pull line teaching the verb in 2 s · boss reveal montage · ghost race vs your previous best · muted-first captions ("Don't touch the star.").
- **Trailer (30 s portrait):** 0–3 s hold-pull-whip-goal burst with a visible finger → 3–12 s a mechanic every 2 s → 12–20 s boss + Star Map → 20–26 s Gravity Run → 26–30 s wordmark + "Bring the lost star home."
- **Screenshot concept:** verb → variety → tension → spectacle → mastery → daily → run → honest store; gameplay-pull first.

---

## M. What is already excellent
- **Engineering discipline:** config-driven constants, small pure modules, 221 tests on logic, strict TS, reproducible builds, guarded native seams that fail safe, a clean scene lifecycle (no leaks over 200 restarts), signing pipeline, 16 KB-compliant bundle, PBL 8.
- **The core verb and its feedback:** sonar-ping reach visualization, escalating charge tendrils/lensing, frame-synced audio-haptic-visual press feedback, the tiered celebration ladder with star tones.
- **Level ideas and archetypes worth building on**:
  - THE WHIRLPOOL, THE MACHINE, THE FORGE, THE SINGULARITY, HALL OF MIRRORS, THE PULSAR, THE TEMPEST, THE EVENT HORIZON.
  - World 5's attract/repel arc.
  - The 7 mechanics are good primitives. The problem is tuning and geometry, not the ideas.
- **Star Map** presentation and per-world cosmic identity.
- **Accessibility intent:** reduced-motion path throughout, colorblind-safe shape coding, safe-area handling.
- **Ethical monetization design** (no P2W, opt-in rewarded, revives off boards, earned-only streak protection, honest bundle framing).
- **Gravity Run generator** correctness (0 rule violations over 200k chunk placements) and deterministic seeding (ready for seed sharing).
- **Documentation volume and process** (plans per wave, review loops) — the habit is excellent even if the content drifted.

## N. What is mediocre
Campaign challenge depth (flat ~2/10, free 3★) · Daily Challenge (8-level pool) · Gravity Run depth (20 chunks, plateau after 50 s) · achievements (14 passive) · shop presentation (static swatches, text bundles) · level select · EndScene · audio (synth pad only) · store assets · Worlds 9–15 (sparser, copy-heavy) · analytics depth · onboarding beyond L1 (hazards debut in a boss; daily open on day 0).

## O. What is actively hurting the product
1. Broken IAP plumbing + test ad IDs (revenue = 0; review risk).
2. Interstitials over live levels (deaths, policy).
3. Frame-rate-dependent physics (inconsistent feel, invalid tuning).
4. Dim gameplay render (every screenshot and session).
5. No Retry/Next + auto-advance + replaying title cards/hints (kills "one more try").
6. Level clock running through Settings/background/ads (unfair fails).
7. Back button exits mid-level; no Endless pause.
8. Misleading "shared leaderboard" claim.
9. Analytics before consent; no privacy-options entry.
10. Dead Stardust economy → the 2× ad on every win is noise.
11. Self-playing / one-nudge levels and wall-hug bypasses, especially minutes 6–10 (L11–18). Par that never matters. The L80 false ending, the L150 remake, and literal copies.
12. Splash tax on every cold start.

---

## P. Top 10 Priorities
| # | Priority | Why | Effort |
|---|---|---|---|
| 1 | **Make monetization real and safe** — RC plugin name/key/entitlements/restore/prices; interstitial before restart + awaited; rewarded settle/preload/guards | revenue, policy, trust | S–M |
| 2 | **Frame-rate-independent physics** (`beforeupdate`) + re-validate pars/timers at 60/120/30 Hz | every level's tuning | S + tuning |
| 3 | **Platform correctness** — Back handler, portrait + `appCategory="game"`, pause/audio-suspend on hide, timer pause compensation, Capacitor 8.5.x security bump, error boundary, store-shape validation, `minWebViewVersion` 87, `VIBRATE` | reviews, vitals | S–M |
| 4 | **Compliance pack** — UMP at launch + analytics gating, privacy-options + privacy link in Settings, Data Safety rewrite, Ad-ID form, target audience 13+, honest listing copy | Play/AdMob approval | S |
| 5 | **Start the closed test now** (12–20 testers × 14 days, test ad IDs OK) + create AdMob/RC accounts + developer website with `app-ads.txt` + name clearance | calendar-critical | external |
| 6 | **"One more try" loop** — NEXT/RETRY/tap-to-continue, first-entry title/hint, clock on first touch, visible SO CLOSE, fail relief after N deaths | the core hook | S–M |
| 7 | **Brightness + first-impression fixes** — bloom/UI camera, logo asset, hint chip, splash fast path → then re-shoot store assets + promo video | conversion | S–M |
| 8 | **Learnable telemetry** — rename `session_start`, attempt index, fail detail, `level_quit`, run events, currency events, user properties, Remote Config | every later decision | S |
| 9 | **Level-QA bot + campaign depth pass.** Track the replay sim. Systemic data fixes: wall-hug lanes, sealed spaces, portal exits, par from bot times, hints. Do the first hour (L1–30) first, then L80/L150, copies and unique titles. | the challenge is the product | M–L |
| 10 | **Re-engagement** — local notifications, visible streak/calendar, daily rework (one payout/day, gated after W1, larger/shared pool) | D1/D7 | M |

---

## Q. Recommended Roadmap

> Sizes: S ≤2 days · M 3–5 days · L 1–2 weeks · XL >2 weeks (solo dev). Phases overlap where noted.

### PHASE 0 — Stabilize / recover current state (≈1–2 weeks; start the closed test inside it)
- **Objective:** a build that is correct, compliant and honest on a real Android phone.
- **Player outcome:** consistent physics, no lost purchases, no mid-level ads, Back works, nothing drains while paused.
- **Business outcome:** IAP/ads can earn; Play/AdMob review passes; the 14-day closed-test clock starts.
- **Features:** docs reconciliation into `docs/STATUS.md` + facts script; repo hygiene (JDK path out of `gradle.properties`, `.ai` symlinks, drop stash); Capacitor/plugins bump (security); fixed-step forces; lifecycle (Back, pause/audio on hide, timer compensation, portrait/appCategory, error boundary, store validation, minWebViewVersion); ads/IAP plumbing; consent/privacy pack; telemetry fixes + user properties; honest listing copy; versionCode automation + `v1.0.0-rc.2`; keystore backup + Play App Signing; **closed test with 12–20 testers**; external accounts (AdMob, RevenueCat, Play billing products, developer website + app-ads.txt); trademark check.
- **Dependencies:** your Play Console/AdMob/RC accounts; a mid-range and a 120 Hz Android device.
- **Complexity:** M overall (many S items). **Risk:** low technical, medium calendar.
- **Upside:** turns a non-shippable RC into a shippable one.
- **Metrics:** 0 open P0s · crash-free sessions ≥99.5% · ANR <0.47% · tester count ≥12 for 14 days · consent rate · purchase test matrix all green.

### PHASE 1 — Fix the biggest gameplay/product weaknesses (≈2–3 weeks; overlaps the closed test)
- **Objective:** make the mastery loop and the campaign's second act worthy of the first.
- **Player outcome:** one-tap retry for ★★★, no repeated cutscenes, help when stuck, a finale that lands.
- **Business outcome:** better D1/D7 and reviews; the closed-test feedback is about content, not bugs.
- **Features:**
  - Level-QA bot (`scripts/levelsim`, tracked; in CI) with validator rules for self-solves, lanes, exits-in-hazard and timer/par sanity.
  - Systemic data fixes from C.2.
  - Par re-tuned from bot times.
  - Win overlay NEXT/RETRY/tap-to-continue; first-entry title/hint; clock on first touch; visible SO CLOSE.
  - Fail relief: show route or a skip token after N deaths, with a ★ cap.
  - Back-half content pass (replace 7 copies; fix 9 bypasses + well-saw traps + blind portal exits; rebuild L150 as a 3-act finale; rename L80; differentiate template bosses; unique titles; fix L11/L12; real off-route gems); fix `Obstacle` angle render then use angled walls/moving goals/launches; EndScene epilogue + stats + credits; post-game Mirror mode or Boss Rush; daily gated after W1.
- **Dependencies:** Phase 0 physics fix (re-tune after it); telemetry to locate walls.
- **Complexity:** M–L. **Risk:** medium (tuning). **Upside:** high.
- **Metrics:** per-level fail rate & attempts-per-clear · funnel drop-off by level · 3★ rate · retries per session · % reaching W5/W10/W15 · review sentiment.

### PHASE 2 — Visual polish & presentation (≈1–2 weeks; can start in parallel with Phase 1)
- **Objective:** the game looks as premium in motion and in the store as its design system intends.
- **Player outcome:** bright, legible gameplay; coherent buttons/overlays; satisfying shop and world-complete moments.
- **Business outcome:** higher store conversion and session length.
- **Features:** bloom fix + FX-free UI camera; logo re-export; type scale + 12 px floor; spacing rhythm; level select redesign; Endless pause + Run Over hierarchy; shop live previews + bundle art + store prices; world-complete ceremony on the Star Map; star micro-emotion; ambient soundtrack or Zen mode + UI sounds; reduced-motion gaps; store re-shoot (captions, gameplay-first, 9:16), promo video, feature graphic fix, unified icon/logo.
- **Dependencies:** Phase 0 hint/logo fixes before shooting.
- **Complexity:** M. **Risk:** low. **Upside:** high for conversion.
- **Metrics:** store listing conversion (experiments after launch) · session length · shop open → purchase · contrast audit pass.

### PHASE 3 — Retention & replayability (launch → +4 weeks)
- **Objective:** give players reasons to return daily and weekly.
- **Player outcome:** reminders that respect them, visible streaks, fresh daily content, a deep endless mode.
- **Business outcome:** D1/D7/D30 lift; more sessions/day → more ad inventory.
- **Features:** local notifications (daily/streak/chest/weekly/win-back); streak + login calendar UI; comeback gift; daily missions; Daily rework (one payout/day, larger or generated pool, shared puzzle, result card); Gravity Run expansion (+40 chunks, mirroring, jitter, phases, missing mechanics, telemetry, achievements); PGS leaderboards + achievements + **cloud save**; animated PB ghost racing.
- **Dependencies:** telemetry, Remote Config; PGS Capacitor bridge (plugin ecosystem is thin for Capacitor 8 — may need a small custom plugin).
- **Complexity:** L. **Risk:** medium (PGS plugin). **Upside:** high.
- **Metrics:** D1/D7/D30 (targets for an indie: ~30–35% / ≥10% / 3–5%, heuristic) · sessions/DAU · daily participation · streak survival · notification opt-in & open rate · Gravity Run runs/DAU.

### PHASE 4 — Monetization (launch → +6 weeks, data-driven)
- **Objective:** monetize the engaged without hurting retention.
- **Player outcome:** fair offers at the right moments; no ad ambushes.
- **Business outcome:** ARPDAU and payer conversion growth with retention guardrails.
- **Features:** Stardust Forge + Featured rotation; No-Ads+; Starter spotlight once after the L10 boss; soft Remove-Ads offer after the 3rd lifetime interstitial; rewarded "show route"; double-chest ad; Supporter tiers; time-boxed Founder's; price A/B via RevenueCat Offerings; interstitial policy tuning via Remote Config.
- **Dependencies:** Phase 0 plumbing; Phase 3 telemetry/Remote Config.
- **Complexity:** M. **Risk:** medium (brand promise). **Upside:** medium–high relative to today.
- **Metrics:** ARPDAU · payer conversion · rewarded opt-in per surface · ad impressions/DAU · Remove-Ads attach rate · D7 delta between cohorts.

### PHASE 5 — Social / viral loops (+4–8 weeks)
- **Objective:** turn satisfying moments into installs.
- **Player outcome:** challenge friends on the same seed, share daily results, race ghosts.
- **Business outcome:** organic installs (K-factor), cheaper growth.
- **Features:** native share (`@capacitor/share`) with image cards; seed deep links via App Links + a landing page on Pages; daily emoji-grid share; friend challenges ("beat my run"); in-app review prompt after 3★/streak wins; later friend ghosts (Firestore).
- **Dependencies:** PGS boards (Phase 3); developer website.
- **Complexity:** M. **Risk:** low–medium. **Upside:** medium (high variance).
- **Metrics:** shares/DAU · share → install conversion · K-factor · rating volume/score.

### PHASE 6 — Live operations / seasonal content (+2–3 months, only with DAU)
- **Objective:** a sustainable content cadence without app releases.
- **Player outcome:** limited-time events, mutator weeks, seasonal looks.
- **Business outcome:** reactivation spikes; event cosmetic revenue.
- **Features:** Remote-Config-driven weekly modifiers; seasonal event packs (palette + 10 data-only levels + chunk subset + limited cosmetics); a free "Star Path" progression; solver-assisted content tooling (headless Matter: solvability + par auto-tune).
- **Dependencies:** Remote Config; content tooling; DAU.
- **Complexity:** M per event + L for tooling. **Risk:** content treadmill. **Upside:** medium–high at scale.
- **Metrics:** event participation · reactivated users · event revenue · D30.

### PHASE 7 — Growth / ASO / marketing (starts pre-launch, continuous)
- **Objective:** be found and convert.
- **Player outcome:** n/a (acquisition).
- **Business outcome:** organic installs, editorial features, efficient tests.
- **Features:** name clearance; listing rewrite + keyword clusters; custom store listings (per search cluster/country); store listing experiments (icon, screenshots, short description); localization (ES, PT-BR, DE, FR, JA, KO, TR, ID, RU — text is minimal); short-video content engine (in-app clip capture later); Indie Games Festival / Indie Corner pitch; developer website; playable-ad tests in cheap geos.
- **Dependencies:** Phase 2 creative.
- **Complexity:** M (ongoing). **Risk:** low. **Upside:** high (installs are the binding constraint).
- **Metrics:** store conversion rate · organic installs/day · keyword ranks · CPI in test geos · featuring.

### PHASE 8 — Scale / long-term product (3–6+ months)
- **Objective:** expand platforms and the content engine.
- **Features:** iOS port (macOS, ATT, SKAdNetwork, `@capacitor/haptics`); Play Games Level Up eligibility (PGS v2, cloud save, ≥10 achievements); new mechanic worlds (SWITCHBACK, SHATTER, VORTEX, ECLIPSE, ZERO-PRESS); level editor / share codes (UGC); architecture refactor (extract shared physics/input module, break up `GameScene`); evaluate Phaser 4.
- **Complexity:** XL. **Risk:** medium–high. **Upside:** high if Phases 3–7 show product-market fit.
- **Metrics:** iOS share of revenue · content velocity (levels/week) · UGC levels played · crash-free on iOS.

---

## R. Recommended "Next Big Thing": **"First 20 Players"**

**Definition:** a 2–3 week initiative to make Gravity Flow *trustworthy on a real phone* and get it into the hands of 12–20 real players on Google Play's closed track, with telemetry that can answer "where do they stop and why".

**Scope (only this):**
1. Device-truth fixes: fixed-step physics; Back/pause/timer/audio lifecycle; portrait + `appCategory`; Capacitor security bump; error boundary.
2. Money plumbing that won't embarrass you: RevenueCat name/key/restore/entitlements, interstitial timing, rewarded settle (test ad IDs in the closed track are fine).
3. Compliance: consent at launch, privacy options + link, Data Safety/Ad-ID/target audience answers, honest listing.
4. The one-more-try front door:
   - NEXT/RETRY/tap-to-continue, first-entry title/hint, clock and physics start on first touch, visible SO CLOSE, fail relief after N deaths.
   - **A first-hour depth pass (L1–30)** driven by the tracked replay bot: no self-solving levels, wall-hug lanes closed, par that means something. Testers judge the game in its first hour.
5. The brightness fix (+ logo + hint chip) so testers and screenshots see the real game.
6. Learnable telemetry: attempts, fail detail, quits, Gravity Run events, user properties, Remote Config.
7. Start the 12×14 closed test on day ~5 and keep shipping fixes to it.

**Why it beats the alternatives:**
- **vs. "more content / back-half rework first":** most players will never reach W9 in the first weeks; real funnel data will show *which* worlds to fix first, and the closed test can run while you rework W9–15.
- **vs. "deeper Gravity Run / social / events":** each needs DAU to matter and depends on the same plumbing (consent, telemetry, PGS, remote config). With zero players, they'd be built blind.
- **vs. "monetization tuning":** it currently earns $0 because of plumbing, not design. Tuning is meaningless until purchases work and traffic exists.
- **vs. "presentation overhaul":** the highest-value presentation fixes (bloom, logo, hint) are S-sized and included. A full overhaul before real feedback repeats the post-RC "waves" pattern of polishing systems no player has touched.
- **The calendar forces it:** the 14-day continuous closed test plus ~7-day production review is the longest unavoidable dependency on the path to launch. Every day it hasn't started is a day added to launch.
- **It de-risks everything else:** the frame-rate bug alone means every par/timer in 150 levels was tuned for one refresh rate. No content or balance work is valid until physics is deterministic.

**Follow-on big bet (after launch data):** **"One Sky" — a shared Daily + Weekly competition layer.** One global daily puzzle and the weekly Gravity Run seed, with Play Games leaderboards, a share card with a seed deep link, ghost racing, and notifications. This is the most Gravity-Flow-specific growth loop: deterministic seeds, ghosts and daily/streak systems already exist, and satisfying physics outcomes are inherently shareable.

---

## S. Exact Next-Session Starting Point

**Before coding — decisions only you can make (answer these first):**
1. Play Console: does the app exist? Was the Aug-1 AAB uploaded anywhere? Is the developer account **personal or organization**, and when was it created (12×14 rule)?
2. Do AdMob and RevenueCat accounts/products exist yet?
3. Target audience: confirm **13+** (recommended) vs including under-13 (Families policy).
4. Name: keep "Gravity Flow", qualify it, or rename (trademark check)?
5. Fail relief: OK with a rewarded/earned "show route"/skip after N deaths (★-capped)? It's the one monetization-adjacent design change.
6. Should this audit + the inventory JSON be committed to `docs/audit/2026-10-07/`?

**Then, in order:**
1. **Docs reconciliation** (no code): create `docs/STATUS.md` from §B (facts) + §P (gates) + §S; fix the stale claims in §J; archive stale docs; add `scripts/facts.mjs`. Commit on a branch.
2. **Repo hygiene:** move `org.gradle.java.home` out of the tracked `gradle.properties` (to `~/.gradle/gradle.properties` or JAVA_HOME); `git rm --cached .ai/*` + ignore; drop `stash@{0}`; back up the keystore.
3. **Write the Phase 0 plan** with the `writing-plans` method → `docs/superpowers/plans/2026-10-xx-phase0-first-20-players.md`, one task per P0/P1 item in §H/§F/§I.
4. **Execute with TDD where logic is pure** (timer/pause compensation, interstitial placement decision, IAP grant/restore mapping, store-shape validation, force application helper), and device verification for the rest. Suggested first three tasks:
   - (a) `revenueCat.ts:19` → `'Purchases'` + restore/entitlement/bundle re-grant logic (unit-testable mapping);
   - (b) move attractor/zone/magnet forces to `matter.world.on('beforeupdate')` in both scenes via one pure `attractorForce()`; re-measure at 30/60/120 Hz with the CDP probe;
   - (c) interstitial before `scene.restart` + rewarded settle on dismiss/fail + timeout;
   - (d) promote `scratchpad\design-w1-8\sim.cjs` (+ the content-inventory analyzer) into tracked `scripts/levelsim/`, run it in CI, and use it for the L1–30 depth pass and par re-tune.
5. **Start the closed test** as soon as (a)–(c) + Back/pause + consent are in a build.

**Files to open first:** `src/utils/native/revenueCat.ts`, `src/utils/IAP.ts`, `src/utils/Ads.ts`, `src/scenes/GameScene.ts` (`create` :193, `update` :884, `triggerWin` :1023, `advanceAfterWin` :1149, `showWinOverlay` :1170, `triggerDeath` :1609), `src/scenes/EndlessScene.ts`, `src/scenes/SettingsScene.ts`, `src/config/monetization.config.ts`, `src/config/fx.config.ts`, `android/app/src/main/AndroidManifest.xml`, `android/app/build.gradle`, `capacitor.config.ts`, `docs/store/listing.md`.

---

## T. Files / Docs That Should Become the Source of Truth
| Concern | Source of truth |
|---|---|
| Current state, gates, next actions, open bugs, decisions | **`docs/STATUS.md`** (new; generated facts block) |
| Architecture & conventions | `CLAUDE.md` (no state) |
| Release mechanics | `docs/release/RUNBOOK.md` + `docs/release/PLAY-CHECKLIST.md` |
| Store copy & disclosures | `docs/store/listing.md`, `docs/store/data-safety.md`, `docs/store/aso.md`, `docs/store/release-notes.md` |
| Version history | `CHANGELOG.md` + git tags + GitHub Releases |
| Plans | `docs/superpowers/plans/*` (with Done/merged banners) |
| Content truth | `src/config/levels/index.ts` (LEVELS), `src/config/worlds.ts`, `src/config/endless/chunks.ts`, `src/config/dailyLevels.ts` — plus the generated inventory (`docs/audit/…/levels.json`) refreshed by script |
| Tunables | `src/config/physics.config.ts`, `fx.config.ts`, `retention.config.ts`, `monetization.config.ts`, `cosmetics.config.ts` (→ later mirrored in Remote Config) |
| QA | `docs/qa/device-playtest-checklist.md` (in-game level numbers) |
| This audit | `docs/audit/2026-10-07/gravity-flow-state-audit.md` (if you approve committing it) |

*End of report.*
