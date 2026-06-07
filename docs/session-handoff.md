# Session Handoff — Gravity Flow

**30-second resume card. Full detail: [`docs/project-status.md`](./project-status.md).**

---

## Current status
- **Game:** GRAVITY FLOW by **True Story Labs** — mobile cosmic physics puzzler (Phaser 3 + TS + Vite).
- **Content:** **71 levels / 8 worlds.** **Phase 1 (early-game WOW redesign) done:** Worlds 1-3 trimmed
  10→7 and rebuilt for *delight/surprise/memorability* — **toys before tests**, front-loaded wonder,
  multi-goal **"constellation"** toys, spectacle signatures, and **distinct boss archetypes**
  (W1 COLLAPSE = descent set-piece · W2 MAELSTROM = **chase** · W3 MACHINE = mechanic-turned). Worlds 4-8
  still 10 each, all overhauled earlier (signatures THE FORGE/BINARY STAR/HALL OF MIRRORS/LOCKWORKS/
  CONFLUENCE; bosses INFERNO/SINGULARITY/BREACH/VAULT/HOMECOMING) — **pending Phase-2 trim toward ~56**.
  World ranges: **1-7 · 8-14 · 15-21** · 22-31 · 32-41 · 42-51 · 52-61 · 62-71. Direction +
  level-by-level verdicts in `~/.claude/plans/warm-orbiting-map.md`.
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
- **Quality:** `tsc` clean · 57 tests pass · build clean · all 71 levels load no console errors
  (`scripts/verify_p1.py`: 1-21 completable, constellation gate works, chase home drifts, camera reveal runs).
- **Git/GitHub:** branch `master`. **Local is ahead of `origin` by ~6 commits (v0.10.0)** — push pending
  (run `git push origin master`, then `vercel --prod --yes`). origin = https://github.com/taysh123/Gravity-Game.git.

## Last completed sprint
**Phase 1 — early-game WOW redesign (v0.10.0).** First slice of the campaign redesign (trim-to-~56 +
front-load wonder). Built the **engine premium layer** (camera reveal, moving/expressive home goal,
multi-goal constellation orbs, comet trail, instant retry — `commit bc70758`), then rebuilt **Worlds 1-3**
(7 each): W1 toys (First-Pull arc, Comet, Constellation) + GAUNTLET reveal + COLLAPSE descent boss
(`73625ab`); W2 Updraft-surf/Drifthome/Whirlpool + EYE + MAELSTROM chase boss (`0566076`); W3 Gearslip/
Orrery + GEARWORKS + MACHINE mechanic-turned boss + the trim/renumber to 71 + ProgressStore v7 (`bc35b56`).
New level files: `level91` (Constellation), `level92` (Orrery). Retired 11 filler/duplicate early levels.
**Next: Phase 2** — trim + re-archetype Worlds 4-8 toward ~56 total. *(Prior roadmap below.)*

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
**Push + deploy v0.9.0, then device-playtest all 80 levels.** First: `git push origin master` then
`vercel --prod --yes` (both blocked from auto-run; run yourself). Then playtest the redesigned worlds —
especially the new aha levels (W4 safe-window/decoy · W5 slingshot/repel-place · W6 velocity-carry/
think-backwards · W7 lock-and-key/plan-gem · W8 fuse/improvise), the signatures, and the boss clocks
(THE INFERNO/THE SINGULARITY/THE BREACH/THE VAULT/HOMECOMING — tune `timeLimitMs`/`parTimeMs`/saw speeds
from notes). Then **Sprint 2 — Native + Monetization** begins:
1. **Sprint 2 — Native + Monetization (→ Play RC):** Capacitor + Android build pipeline, AdMob (rewarded +
   interstitial) + IAP (Remove-Ads, cosmetics) behind the `Ads`/`IAP` seams, analytics, crash reporting,
   Play listing. (Decisions locked: Capacitor → Play first; F2P hybrid, no P2W. Needs from you: Play
   Console $25, AdMob app/ad-unit IDs.)
2. **Sprint 3 — Polish + store assets:** real soundtrack tracks (swap behind `startWorldTheme`), vector
   icons (replace 🔒 emoji), app icon/screenshots/trailer → RC.
Full audit + roadmap: `~/.claude/plans/warm-orbiting-map.md`.

## Important notes
- ⚠️ **Level balance for the redesigned worlds (31–80) is unverified on a device** — automated tests
  confirm every route is *physically solvable* and clean, but can't reproduce finger input or judge
  *fun/fairness*. Playtest the new aha levels + boss clocks before Sprint 2; tune constants in the level
  files (no code changes needed). Per-world verifiers: `scripts/verify_w4.py`…`verify_w8.py`.
- **GitHub:** `origin` = https://github.com/taysh123/Gravity-Game.git. **`master` is ahead by 5 unpushed
  commits** (v0.9.0) — push/deploy are blocked from auto-run, so run them yourself.
- Architecture rule: **one entity + one optional `LevelConfig` field per mechanic; no managers.**
- Verify in-browser (`npm run dev` + Playwright `--disable-gpu --use-gl=swiftshader`) before "done".

## Resume instructions
> Read `docs/project-status.md`, then continue from its **Next Recommended Sprint** section.
