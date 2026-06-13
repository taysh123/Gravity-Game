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

## Sign-off
- [ ] All 150 levels 1★-cleared on device.
- [ ] No unavoidable-hazard / unreadable-trick levels remain.
- [ ] Magnet escape + gravity feel confirmed on a phone.
- [ ] Tuning changes (if any) committed; validator + smoke green.
