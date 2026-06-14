# Device 1★ Fairness Playtest — Checklist

> The structural validator (`src/config/levels/levels.test.ts`) and the boot smoke
> (`scripts/smoke_levels.py`, all 150 levels, zero console errors) prove every level
> *loads and is structurally sound*. They **cannot** prove a level is *solvable or fair*
> with real finger input — that is what this checklist is for. Run it on a real phone
> (the touch + gravity feel differ from desktop mouse).

## How to run
1. `npm run dev` (or the internal Android build) on the target device.
2. For each level, attempt a **1★ clear** (just reach the goal — ignore gem/par).
3. Note any level where 1★ feels *unreachable, unfair, or unreadable* (not merely hard).

## What to judge (per level)
- **1★ reachable?** The world's taught skill should get you home. If not → flag.
- **Telegraphing:** is the trick/route readable on first sight, or does it feel arbitrary?
- **Hazards avoidable:** every saw/beam/arm must have a real safe window. No unavoidable death.
- **Timed levels:** is `timeLimitMs` enough for a *non-expert* 1★ run? (par is the expert target.)
- **Gem off-route:** the gem should be a real detour/risk, never on the only path.

## Priority suspects (design-flagged — verify first)
- **New tension world — W12 Tempest (111-120):** timed + multi-hazard; confirm the timed
  combines (`level129/130/131`) and BOSS `level133` (rotating arm + saw + beam, 24s) are clearable.
- **W14 Singularity (131-140):** tight goals (r22-24) + the central-well signature `level152`
  (don't-fall-in) and BOSS `level153` — confirm escape from the well is a *skill, not a stalemate*.
- **W9 BOSS THE CRUCIBLE (`level103`)** + **W10 BOSS THE PULSAR (`level113`)**: rotating-arm bosses —
  confirm the side lanes / outer orbit give a real path.
- **W13/W15 long journeys (`level141/142/161/162`)** + **FINALE `level163`** (timed, every mechanic):
  confirm the full chained route is completable in the time limit by a skilled-but-human run.
- **Magnet feel** (W10, plus any `magnets` level): with `MAGNET_STRENGTH 2.2 / MIN_DIST 95 / MAX_DIST 190`,
  the player's attractor should out-pull a well at close range. Confirm on-device.

## Tuning levers (no engine change) if a level fails
- Goal: enlarge `radius`. Time: raise `timeLimitMs`. Hazard: slow `durationMs` / widen the gap.
- Zone: lower `strength`. Magnet: it's global in `physics.config` (`MAGNET_*`) — tune cautiously.
- After any change: `npm test` (validator stays green) + re-smoke if structure changed.

## Gravity Run (endless mode) — feel pass (the only non-automatable check)
Menu → **GRAVITY RUN** → try both **Endless** and **Weekly Challenge**. Automation has verified seeds,
variety, fairness invariants, and overlays; only a human can judge *feel*:
- **"One more try":** does **RETRY** + the fresh random Endless run pull you back in?
- **Ramp:** with the v3 tuning (`ENDLESS_SCROLL_BASE 76 / ACCEL 4.0 / MAX 250`, 3.5s onboarding) the run now
  climbs ~76→234 px/s over ~45s — does it feel *fast & exciting but fair*, or does it spike? Tune the
  `ENDLESS_*` constants in `physics.config`.
- **Star Map journey:** menu → WORLDS → does the Star Map + warp-into-a-world feel like a rewarding journey?
  Each world's themed panel should feel like its own destination. Adjust `WorldMapScene` spacing / warp in
  `transitions.warpToScene` if a transition feels off.
- **Chunk fairness/readability at speed:** any chunk that cheap-kills or reads poorly fast? (Each is validated
  to have a safe lane, but feel is the judge.) Adjust the offending chunk in `config/endless/chunks.ts`.
- **Variety:** do runs feel distinct now (recency window + 20 chunks)? Add chunks if any sameness remains.
- **Onboarding:** does the first-run coach hint + start grace make the opening clear and non-punishing?
- After any change: `npm test` (endless + chunk validators stay green) + re-smoke.

## Sign-off
- [ ] All 150 levels 1★-cleared on device.
- [ ] No unavoidable-hazard / unreadable-trick levels remain.
- [ ] Magnet escape + gravity feel confirmed on a phone.
- [ ] Gravity Run: both modes feel good (ramp fair, runs fresh, "one more try" lands); ramp/chunks tuned if needed.
- [ ] Tuning changes (if any) committed; validators + smoke green.
