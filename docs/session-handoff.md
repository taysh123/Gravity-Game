# Session Handoff — Gravity Flow

**30-second resume card. Full detail: [`docs/project-status.md`](./project-status.md).**

---

## Current status
- **Game:** GRAVITY FLOW by **True Story Labs** — mobile cosmic physics puzzler (Phaser 3 + TS + Vite).
- **Content:** **56 levels / 8 worlds (8×7).** **Phase 1 + Phase 2 redesign DONE** — the whole campaign
  trimmed to its strongest levels and rebuilt for *delight/surprise/memorability*: **toys before tests**,
  front-loaded wonder, multi-goal **"constellation"** toys, spectacle signatures, cut filler combine-stacks,
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
- **Quality:** `tsc` clean · 57 tests pass · build clean · all 56 levels load no console errors
  (`scripts/verify_p2.py`: 1-56 load + completable, only HOMECOMING carries a clock among the bosses).
- **Git/GitHub:** branch `master`. **Local is ahead of `origin` by ~6 commits (v0.11.0, Phase 2)** — push
  pending (run `git push origin master`, then `vercel --prod --yes`). origin = https://github.com/taysh123/Gravity-Game.git.

## Last completed sprint
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
**Push + deploy v0.11.0, then device-playtest all 56 levels.** First: `git push origin master` then
`vercel --prod --yes` (both blocked from auto-run; run yourself). Then playtest the trimmed campaign —
especially the new **toy openers** (Sparkweave/Swingby/Blink/One-Way Door — do they delight in the first
seconds of each world?) and the **re-archetyped bosses** (INFERNO endurance, SINGULARITY orbit, BREACH
puzzle, VAULT lock-and-key — do they feel distinct, fair, and replayable for 3★?). Tune
`parTimeMs`/geometry/well-strength/saw-speeds from notes (no code changes needed). Then **Sprint 2 —
Native + Monetization** begins:
1. **Sprint 2 — Native + Monetization (→ Play RC):** Capacitor + Android build pipeline, AdMob (rewarded +
   interstitial) + IAP (Remove-Ads, cosmetics) behind the `Ads`/`IAP` seams, analytics, crash reporting,
   Play listing. (Decisions locked: Capacitor → Play first; F2P hybrid, no P2W. Needs from you: Play
   Console $25, AdMob app/ad-unit IDs.)
2. **Sprint 3 — Polish + store assets:** real soundtrack tracks (swap behind `startWorldTheme`), vector
   icons (replace 🔒 emoji), app icon/screenshots/trailer → RC.
Full audit + roadmap: `~/.claude/plans/warm-orbiting-map.md`.

## Important notes
- ⚠️ **Level balance for the trimmed 56-level campaign is unverified on a device** — automated tests
  (`scripts/verify_p2.py`) confirm every level loads clean and is *physically solvable*, but can't
  reproduce finger input or judge *fun/fairness*. Playtest the toy openers + re-archetyped bosses before
  Sprint 2; tune constants in the level files (no code changes needed).
- **GitHub:** `origin` = https://github.com/taysh123/Gravity-Game.git. **`master` is ahead by ~6 unpushed
  commits** (v0.11.0, Phase 2) — push/deploy are blocked from auto-run, so run them yourself.
- Architecture rule: **one entity + one optional `LevelConfig` field per mechanic; no managers.**
- Verify in-browser (`npm run dev` + Playwright `--disable-gpu --use-gl=swiftshader`) before "done".

## Resume instructions
> Read `docs/project-status.md`, then continue from its **Next Recommended Sprint** section.
