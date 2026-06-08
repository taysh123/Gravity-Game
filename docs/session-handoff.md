# Session Handoff — Gravity Flow

**30-second resume card. Full detail: [`docs/project-status.md`](./project-status.md).**

---

## Current status
- **Game:** GRAVITY FLOW by **True Story Labs** — mobile cosmic physics puzzler (Phaser 3 + TS + Vite).
- **Content:** **56 levels / 8 worlds (8×7).** **Phases 1–3 redesign DONE.** Phases 1–2 trimmed the
  campaign to its strongest levels and rebuilt it for *delight/surprise/memorability*; **Phase 3 (Challenge
  & Excitement Pass)** then fixed the playtest verdict "too empty/safe/passive" — distributed **threat**
  (new **rotating-arm** + **pulsing-laser** hazard archetypes, plus reused saws/spikes), **risk/reward**
  (gems moved onto risky/skill lines), and **live mastery feedback** (par chip + PB **ghost trail**), all
  keeping the 1★ route fair. Hallmarks: **toys before tests**, front-loaded wonder, multi-goal
  **"constellation"** toys, spectacle signatures (now with *moving* set-pieces), cut filler combine-stacks,
  and — the headline — **a fully rotated set of distinct boss archetypes** (no two alike):
  **W1 COLLAPSE = descent set-piece · W2 MAELSTROM = chase · W3 MACHINE = mechanic-turned ·
  W4 INFERNO = endurance (no clock) · W5 SINGULARITY = orbit · W6 BREACH = puzzle-boss · W7 VAULT =
  lock-and-key · W8 HOMECOMING = finale**. Only HOMECOMING keeps a hard clock. Signatures: THE GAUNTLET /
  THE EYE / THE GEARWORKS / THE FORGE / THE BINARY STAR / HALL OF MIRRORS / THE LOCKWORKS / THE CONFLUENCE.
  World ranges: **1-7 · 8-14 · 15-21 · 22-28 · 29-35 · 36-42 · 43-49 · 50-56**. Direction +
  level-by-level verdicts in `~/.claude/plans/warm-orbiting-map.md`. Retired levels stay on disk
  (un-imported) as future **"Expert" pack** content.
- **Engine premium layer (v0.10.0):** per-level **camera intro-zoom reveal** (`LevelConfig.camera`),
  **moving + expressive "home" goal** (`goal.to/durationMs`; brightens as the ball nears → chase bosses +
  felt journey), **multi-goal constellation orbs** (`collectibles`/`collectAllToWin`, connect on win),
  glowing **comet trail**, **instant retry**. One optional `LevelConfig` field each; reduced-motion honored.
- **Systems live:** attractor pull, gravity zones, **magnets**, **portals**, **one-way gates**, moving
  platforms, hazards, collectible gems, 3-star scoring, timed levels, achievements + stats, scrollable
  world-select; **Retention engine (v0.5.0):** **Stardust** currency, **Daily Challenge 2.0** (curated
  pool + rotating modifier + streak rewards), **cosmetics shop** (ball themes, earn with Stardust),
  leaderboard-ready daily records, **Ads/IAP provider seams** (web stubs); **signature/boss level identity**
  (gold/red HUD titles). Premium glass UI; mobile fixed.
- **Excitement (v0.7.0):** **per-world visual identity** (8 distinct palettes/atmospheres + world title
  cards), **per-world in-game music** + boss audio + boss-clear sting, **star-by-star win celebration**
  (PERFECT! + rising tones), boss **STAR FREED** payoff + red arena wash + camera punches, **signature/boss
  title cards**, and the hook **"Bring the lost star home."**
- **Native + Monetization (v0.13.0, Sprint 2 — code-complete, web-verified):** **Capacitor** Android wrap
  (`capacitor.config.ts`, `base:'./'`); **AdMob** (rewarded + capped interstitials) behind `utils/Ads.ts`,
  **RevenueCat** Remove-Ads/premium behind `utils/IAP.ts` (sync `isPremium()` via cached entitlement),
  **Firebase Analytics** funnel + **Crashlytics** behind new `utils/Analytics.ts`/`Crash.ts` — all native
  plugins reached **by name via `registerPlugin`** (`utils/native/*`) + dynamic-import **guarded by
  `isNativePlatform()`**, so the **web build never bundles them** and stays the dev/test target. AdMob **test
  ids** default in `config/monetization.config.ts`. CI (`.github/workflows/ci.yml`), Android **runbook**
  (`docs/release-android.md`), Play **listing** + **ASO** drafts (`docs/store/`). *The native build / signing
  / store upload + the accounts/ids are user gates (see below).*
- **Economy + Store (v0.14.0, Sprint 2.5 — web-verified):** generalized cosmetics into **28 items** across
  **skins / trails / arrival effects** (5 rarities, 6 collections); **dual currency** — Stardust +
  **Cosmic Fragments** (`FragmentStore`); a tabbed **premium store** (`CosmeticsScene` redesign: rarity
  badges, locked previews, owned/equipped, scroll); **bundles + Remove-Ads + Restore** (`IAP.buyBundle`);
  **rewarded loops** (2x-Stardust on win, daily free-Fragments via `RewardStore`); **retention** —
  achievements/collections/star-milestones now grant currency (`utils/Rewards`) + a "N/28 unlocked"
  progress. Skins read style/accent + trails/arrivals customize the ball trail + win burst. Full audit +
  5 completion reviews in `docs/store/monetization-review.md`.
- **Quality:** `tsc` clean · 79 tests pass · build clean (firebase/admob/RC **not** in the web bundle) · all
  56 levels load + store/economy flows web-verified, no console errors (`scripts/verify_p3.py` + ad-hoc).
- **Git/GitHub:** branch `master`. **Local is ahead of `origin` (v0.14.0, Phase 3 + Sprints 2 & 2.5)** — push
  pending (`git push origin master`, then `vercel --prod --yes`). origin = https://github.com/taysh123/Gravity-Game.git.

## Last completed sprint
**Sprint 2.5 — Monetization Expansion + Premium Store (v0.14.0, web-verified).** The Sprint-2 infrastructure
had no content/loops; this fills them. **M1** generalized cosmetic model + `CosmeticStore` v2 (multi-category,
v1→v2 migration) + `FragmentStore` + audit (`c476760`); **M2** premium skin rendering (void/animated/dualtone/
ringed) (`069cf1c`); **M3** trail system (fire/ice/lightning/galaxy/void) (`59394ba`); **M4** goal arrival
effects (burst/implode/nova/bolt/bloom) (`7a01da2`); **M5** tabbed store redesign (`2b07d61`); **M6** bundles +
Remove-Ads + Restore (`0d027b9`); **M7** rewarded loops — 2x Stardust + free Fragments (`b960b85`); **M8**
retention rewards (achievements/collections/milestones) (`7f6efb7`); **M9** v0.14.0 docs + reviews. All
web-verifiable; the real product/ad ids + purchases remain the user's native gates. **Deferred (next sprint):
in-level Hint + extra-daily-attempt rewarded loops; animated store previews + a Featured surface.**

## Prior sprint
**Sprint 2 — Native + Monetization (v0.13.0, code-complete; web-verified).** Wrapped the game with Capacitor
for Android and wired monetization + telemetry **behind guarded seams** so the web build is unaffected:
**M1** Capacitor scaffold (`9ba9fdf`); **M2** Analytics + Crashlytics seams + funnel instrumentation, native
plugins reached by-name so the firebase SDK is never bundled (`1c5073d`); **M3** AdMob rewarded/interstitial
(`b1ab565`); **M4** RevenueCat Remove-Ads with a cached sync entitlement (`234d470`); **M5** CI + Android
runbook + Play listing + ASO (`26afabf`); **M6** v0.13.0 docs. **Disk on the build machine was full**, so the
native plugin packages (AdMob, RevenueCat) are in `package.json` but **not installed/locked here** — the
user's `npm install` reconciles the lockfile (CI uses `npm install`, not `npm ci`, until then).
**USER GATES before a Play release** (none of which can run here): create **Play Console** ($25), **AdMob**
(app + 2 ad-unit ids), **RevenueCat** (key + product/entitlement), **Firebase** (`google-services.json`)
accounts; install the **Android toolchain**; `npm install` → `npx cap add/sync android`; set real ids in
`config/monetization.config.ts`; create a **keystore** + signed **AAB**; **device-test** (incl. the Phase-3
1★ fairness playtest); upload to **internal testing**. Full steps: `docs/release-android.md`.

## Prior sprint
**Phase 3 — Challenge & Excitement Pass (v0.12.0).** Playtest verdict was "improved but too empty/safe/
passive." A 56-level audit confirmed it: moving hazards in only 8/56 levels, ~35/56 with no threat near the
route, only ~27% creating real tension. Fix (no difficulty inflation, verb kept pure): **M1** two new "alive"
hazard archetypes on the existing Hazard entity — **rotating arm** (`pivot`) + **pulsing laser** (`pulseMs/
phaseMs`, telegraphed), pure math TDD'd in `utils/hazardMotion` (`14810e9`); **M2** mastery feedback — live
par chip + PB **ghost trail** (new `GhostStore`, `utils/ghost` TDD'd) (`c327810`); **M3** W1-3 — debut the
archetypes in the timing world (GEARWORKS spinning gear, patience laser) + risky gems, W1/W2 stay an
unloseable on-ramp (`4097aa1`); **M4** W4-5 — Peril variety (rotating/laser) + Wells hybrid threat
(capture-cost spikes) (`a6378b7`); **M5** W6-7 — the biggest lift: real route-hazards + signature motion
(HALL OF MIRRORS arm, LOCKWORKS laser) on the emptiest worlds (`1cdda95`); **M6** W8 finale — fuse dangers
into synthesis, stakes on both improv routes, CONFLUENCE spinning flourish (`429319f`). New verifier
`scripts/verify_p3.py` proves the archetypes behave in-engine. Threat is now distributed, every world feels
alive, 1★ kept fair (pending device confirmation).
**Phase 3 — Challenge & Excitement Pass (v0.12.0).** Playtest verdict was "improved but too empty/safe/
passive." A 56-level audit confirmed it: moving hazards in only 8/56 levels, ~35/56 with no threat near the
route, only ~27% creating real tension. Fix (no difficulty inflation, verb kept pure): **M1** two new "alive"
hazard archetypes on the existing Hazard entity — **rotating arm** (`pivot`) + **pulsing laser** (`pulseMs/
phaseMs`, telegraphed), pure math TDD'd in `utils/hazardMotion` (`14810e9`); **M2** mastery feedback — live
par chip + PB **ghost trail** (new `GhostStore`, `utils/ghost` TDD'd) (`c327810`); **M3** W1-3 — debut the
archetypes in the timing world (GEARWORKS spinning gear, patience laser) + risky gems, W1/W2 stay an
unloseable on-ramp (`4097aa1`); **M4** W4-5 — Peril variety (rotating/laser) + Wells hybrid threat
(capture-cost spikes) (`a6378b7`); **M5** W6-7 — the biggest lift: real route-hazards + signature motion
(HALL OF MIRRORS arm, LOCKWORKS laser) on the emptiest worlds (`1cdda95`); **M6** W8 finale — fuse dangers
into synthesis, stakes on both improv routes, CONFLUENCE spinning flourish (`429319f`). New verifier
`scripts/verify_p3.py` proves the archetypes behave in-engine. Threat is now distributed, every world feels
alive, 1★ kept fair (pending device confirmation). **Next: device-playtest, then Sprint 2 — Native +
Monetization.**

## Prior sprint
**Phase 2 — back-half redesign (v0.11.0).** Trimmed **Worlds 4-8 from 10→7 each** (campaign 71→**56**, 8×7)
and applied the W1-3 WOW treatment: cut 15 filler combine-stacks / duplicate teaches (un-imported, kept on
disk for Expert packs), gave each world a **toy opener**, and **rotated every boss archetype** so none feel
alike. Milestones: M1 restructure to 56 (index/worlds/ProgressStore **v7→v8**/world.test anchors, `6daac14`);
M2 W4 toy Sparkweave + INFERNO→**endurance** (`1e6e8b2`); M3 W5 toy Swingby + SINGULARITY→**orbit**
(`a0b0421`); M4 W6 toy Blink + BREACH→**puzzle-boss** (`b248c04`); M5 W7 toy One-Way Door + VAULT→
**lock-and-key** (`c29c4eb`). New verifier `scripts/verify_p2.py`. **Phase 1** (early-game WOW redesign,
v0.10.0) shipped before this: engine premium layer + Worlds 1-3 rebuilt (constellation/orrery toys, COLLAPSE/
MAELSTROM/MACHINE bosses). **Next: device-playtest all 56, then Sprint 2 — Native + Monetization.**

**Worlds 4–8 redesign roadmap — COMPLETE (v0.9.0).** Applied the W1–3 treatment to all remaining worlds,
each grown 8→10 with a distinct mental skill, ≥3 aha, archetype variety, a signature + a boss — **no new
mechanics**. Per world: kept the 6 strongest, retired 2 redundants, added 4 new (2 aha + signature + boss).
The game is now **80 levels, 10×8**, consistently "different, not just harder."
- **W4 Peril** (v0.8.0): safe-window + decoy aha, THE FORGE, THE INFERNO (`level71-74`).
- **W5 Wells** (trajectory/orbital): slingshot-around + repel-place aha, THE BINARY STAR, THE SINGULARITY (`level75-78`).
- **W6 Rifts** (spatial): velocity-carry + think-backwards aha, HALL OF MIRRORS, THE BREACH (`level79-82`).
- **W7 Gates** (commitment): lock-and-key + plan-the-gem aha, THE LOCKWORKS, THE VAULT (`level83-86`).
- **W8 Convergence** (synthesis): fuse + improvise aha, THE CONFLUENCE, finale boss HOMECOMING (`level87-90`).
Rewired `levels/index.ts` + `worlds.ts` ranges each milestone; `ProgressStore` key v5→v6 (clean reset);
`world.test.ts` rewritten to derive from `WORLDS` (range-shift-proof). Verified per world: tsc clean,
57 tests, build clean, Playwright (`scripts/verify_w4..w8.py`) = every level loads no console errors + all
16 new levels' routes physically solvable. **Not yet device-playtested** (the real judge of fun/fairness).

**Excitement Sprint (v0.7.0).** Turned the polished prototype toward a *memorable* game (no new mechanics):
EM1 per-world identity (`config/worldThemes.ts` → themed `CosmicBackground` + world title cards;
`worldOf()` pure helper +4 tests); EM2 game feel (star-by-star reveal + PERFECT, boss STAR FREED banner,
camera zoom-punches, scaled haptics); EM3 audio (`AudioSynth.startWorldTheme` per-world beds with
same-world continuity, boss minor bed, boss-clear arpeggio); EM4 signature/boss "events" (entry title
cards + boss red arena wash); EM5 hook ("Bring the lost star home" tagline + world subtitles). Verified:
56 tests, tsc/build green, all 70 load no console errors, worlds visibly distinct, celebration + boss
event captured. Audit: `docs/superpowers/plans/2026-06-07-excitement-audit.md`. *(Prior: v0.6.x Gameplay
Overhaul + L9/L1 fixes.)*

## Next sprint
**Push v0.13.0, then YOUR native gates + the device playtest.** First: `git push origin master` then
`vercel --prod --yes` (both blocked from auto-run; run yourself). Sprint 2 (Native + Monetization) is
**code-complete and web-verified**; the remaining work needs your accounts + Android toolchain (this build
machine has neither, and disk was full):
1. **Take it native (you):** follow `docs/release-android.md` — `npm install` (reconciles the lockfile +
   installs the AdMob/RevenueCat/Firebase plugins) → create the Play/AdMob/RevenueCat/Firebase accounts →
   `npx cap add/sync android` → set real ids in `config/monetization.config.ts` + `google-services.json` →
   keystore + signed **AAB** → **internal-testing** upload. Store text + ASO are drafted in `docs/store/`.
2. **Device playtest (highest gameplay priority, parallel):** automated tests prove every level loads + the
   win fires, but **cannot confirm the 1★ route stays fair around the Phase-3 hazards** (rotating arms,
   laser beams, route saws, capture-cost spikes). Play each touched level, confirm 1★ is reachable, and tune
   `parTimeMs`/saw-`durationMs`/`pulseMs`/positions in the level files from notes (no code changes). Also
   confirm rewarded/interstitial/Remove-Ads/restore + analytics(DebugView)/Crashlytics on device.
3. **Sprint 3 — Polish + store assets:** real soundtrack tracks (swap behind `startWorldTheme`), vector
   icons (replace 🔒 emoji), produce the actual app icon/feature-graphic/screenshots from the ASO plan → RC.
Full audit + roadmap: `~/.claude/plans/warm-orbiting-map.md`.

## Important notes
- ⚠️ **Level balance for the trimmed 56-level campaign is unverified on a device** — automated tests
  (`scripts/verify_p2.py`) confirm every level loads clean and is *physically solvable*, but can't
  reproduce finger input or judge *fun/fairness*. Playtest the toy openers + re-archetyped bosses before
  Sprint 2; tune constants in the level files (no code changes needed).
- **GitHub:** `origin` = https://github.com/taysh123/Gravity-Game.git. **`master` is ahead by 7 unpushed
  commits** (v0.12.0, Phase 3; Phase 2 already pushed) — push/deploy are blocked from auto-run, run yourself.
- Architecture rule: **one entity + one optional `LevelConfig` field per mechanic; no managers.**
- Verify in-browser (`npm run dev` + Playwright `--disable-gpu --use-gl=swiftshader`) before "done".

## Resume instructions
> Read `docs/project-status.md`, then continue from its **Next Recommended Sprint** section.
