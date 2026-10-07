# P01 — Core Physics Determinism

Status: PLANNED · Milestone: M0 (Truthful Build, with P0) · Steps: 6–7 of [`../EXECUTION-ORDER.md`](../EXECUTION-ORDER.md) · Decisions: D-01, D-02 (sim capability; P3 owns the UX), D-03, D-26, D-28 · Needs: P0 step 2 (`PauseScene`, lifecycle pause hooks) and the P0 Playwright harness lib (P00-T24) · Architecture: [`../../architecture/TECHNICAL-ARCHITECTURE.md`](../../architecture/TECHNICAL-ARCHITECTURE.md) §4.1, §5.2, §8

> Evidence labels: **[V]** verified on 2026-10-07 by reading the cited file/line or running the cited command · **[I]** inferred · **[D]** needs a physical device.

---

## 1. Summary

| | |
|---|---|
| **Objective** | Make gameplay identical at 30/60/90/120/144 Hz and reproducible from an input log: our own fixed-step loop (D-01), a single sim clock, kinematic objects as functions of sim time, per-step checks with win precedence (D-03), a latched and logged input, and a simulation that is armed on first touch (D-02). |
| **Player outcome** | The pull feels the same on every phone. Timers are fair: pausing, backgrounding, Settings or an ad never costs time, a star or a life. The level waits for the first touch. Ending inside the goal while grazing a beam is a win, not a death. |
| **Business outcome** | Par, difficulty tuning, the Weekly board, the QA bot (P2) and replays become meaningful. The largest hidden correctness bug is removed before any content work. |

---

## 2. Scope

### 2.1 Systems affected
| System | Current state [V] | P1 change |
|---|---|---|
| Matter stepping | Phaser auto-update accumulator (`World.js:1174-1266`); forces applied after it, once per frame (`GameScene.ts:915-917`, `EndlessScene.ts:227-229`) | `autoUpdate: false` (scene configs, then `src/main.ts:30-36`); `FixedStepper` calls `this.matter.world.step(S)` (`World.js:1294-1297`) |
| Forces | inline in both scenes (`GameScene.ts:467-496, 931-948`, `EndlessScene.ts:263-298`) | pure `src/sim/forces.ts` × `FORCE_SCALE` (D-26 formula unchanged) |
| Checks | per frame, hazard before win (`GameScene.ts:919-924`) | per step inside `runFixedStep`; `resolveOutcome` gives win > hazard > timeout > oob |
| Clocks | `game.loop.time` / rAF `time` / `this.time.now` mixed (`GameScene.ts:213, 616, 653, 1027`); Endless `delta` and `this.time.now` (`EndlessScene.ts:106, 210-220, 481`) | `stepper.simMs` only |
| Kinematics | tweens (`Hazard.ts:58-96`, `MovingPlatform.ts:46-59`), absolute rAF phase for beams/goal (`Hazard.ts:110-113`, `GameScene.ts:426-434`) | `src/sim/kinematics.ts` poses at `simMs + S`; render at interpolated time |
| Input | Phaser pointer handlers move the attractor directly (`GameScene.ts:498-530`, `EndlessScene.ts:181-201`); no `pointerupoutside` | `InputLatch` sampled once per step, quantized, RLE-logged; `pointerupoutside` releases |
| Ghost | sampled on wall time, positions only (`GameScene.ts:659-668`, `GhostStore.ts`) | sampled on `simMs` from arm; points carry `t` (simMs) |
| Verification | none (no solver, no replay; audit H.7) | multi-rate browser harness, Node replays, trajectory snapshots, wall-clock lint |

### 2.2 Dependencies
- **Needs:** P0 step 2 — `PauseScene`, `requestPause`, the lifecycle module (so pause semantics are already "scene paused ⇒ no steps"); P00-T24 harness lib (`scripts/harness/lib/*`, Playwright 1.63.0).
- **Unblocks:** M0 (step 7 is an M0 gate), P2 step 9 (`HeadlessWorld` → `LevelSim`, bot agents), P3 armed-clock UX, P4 tuning, P8 fair Weekly.

### 2.3 Difficulty, risk, upside
| Engineering | Design | QA | Risk | Expected upside |
|---|---|---|---|---|
| **H** | L | M (automated harness) | Medium-high: touches every level's feel. Mitigated by the multi-rate harness, before/after trajectory snapshots, Node/browser cross-hashes, unchanged constants except `FORCE_SCALE`, and the `SIM_ARM_ON_FIRST_TOUCH` switch. | Removes a ~2× feel spread across devices; makes every later difficulty decision measurable. |

### 2.4 Success metrics
| Metric | Target | Measured by |
|---|---|---|
| Ball state after N steps across 30/60/90/120/144 Hz ±1 ms jitter | bit-identical (stateHash equal) for every scenario | `scripts/harness/rates.mjs` (CI `harness`) |
| Trajectory divergence across rates at t = 2 s | ≤ 1 px (follows from bit-identity: 0 px) | same |
| Sim vs wall time over 10 s | within one step at every rate | same + `FixedStepper.test.ts` |
| Steps per frame at 60 Hz ±1 ms | exactly 1 on every frame | same |
| Replay determinism | 100%: same input log → same outcome, `simMs` and final hash in browser (60/120/144 Hz) and Node | `scripts/harness/replay.mjs --verify`, `src/sim/replay.node.test.ts` |
| Wall-clock reads in gameplay code | 0 outside tagged lines | `src/sim/wallclock.test.ts` |
| Timer drift during 10 s in Settings / 30 s backgrounded | ≤ 1 step / 0 | harness pause probe + 👤 device row |

### 2.5 Must NOT be done yet
- No par, timer or difficulty re-tuning and no level edits (EXECUTION-ORDER "What must wait"); a level that fails a new safety test is listed, not edited.
- No zone-strength change (D-04 waits for the P2 fight test). `FORCE_SCALE` is the only constant introduced into the force path.
- No `LevelSim` replacing entities, no bot agents, no validators v2 (P2 step 9); P1's `HeadlessWorld` is the seed of `LevelSim`.
- No armed-preview UX (prompt, title card once per session, NEXT/RETRY) — P3 (D-02, D-08).
- No HudScene, no render changes beyond interpolation (P5-A, D-13).
- No change of `SIM_STEP_MS` (60 Hz preserves the authored tuning), no `fps.limit` ever (D-01.6), no swept collision, no speed clamp (a feel change; P2 bot reports tunnelling instead).

---

## 3. Architecture plan

### 3.1 FixedStepper (D-01.1, exactly as specified)
```ts
// src/sim/FixedStepper.ts
export class FixedStepper {
  private acc: number;
  private steps = 0;
  lastFrameSteps = 0;
  constructor(
    private readonly S = PHYSICS.SIM_STEP_MS,          // 1000/60
    private readonly maxSteps = PHYSICS.SIM_MAX_STEPS, // 4
    private readonly maxFrame = PHYSICS.SIM_MAX_FRAME_MS, // 100
  ) { this.acc = this.S / 2; }                         // phase bias
  get stepCount(): number { return this.steps; }
  get simMs(): number { return this.steps * this.S; }  // sum of executed steps, no float drift
  reset(): void { this.acc = this.S / 2; this.steps = 0; this.lastFrameSteps = 0; }
  advance(frameMs: number, step: () => boolean): number {
    const f = Number.isFinite(frameMs) ? frameMs : 0;
    this.acc += Math.min(Math.max(f, 0), this.maxFrame);
    let n = 0;
    while (this.acc >= this.S) {
      if (n === this.maxSteps) { this.acc = this.S / 2; break; } // drop backlog → slow-mo, never a spiral
      this.acc -= this.S;
      n++;
      const cont = step();          // the step reads simMs = its start time t
      this.steps++;                 // the terminal step counts too
      if (!cont) { this.acc = this.S / 2; break; }
    }
    this.lastFrameSteps = n;
    return this.acc / this.S;       // render alpha
  }
}
```
Two clarifications of the physics-brief snippet, both inside D-01: `simMs` is derived from an integer step counter (bit-stable across rates), and the step that ends the run is counted (so `winTimeMs = simMs` after the loop).

### 3.2 Constants (`src/config/physics.config.ts`)
| Key | Value | Note |
|---|---|---|
| `SIM_STEP_MS` | `1000 / 60` | D-01 |
| `SIM_MAX_STEPS` | `4` | D-01 |
| `SIM_MAX_FRAME_MS` | `100` | D-01 |
| `FORCE_SCALE` | `2.08` | D-01 calibration, PROPOSED until the owner A/B (1.0 / 1.5 / 2.08); debug builds may override with `VITE_FORCE_SCALE`, resolved and clamped to [0.5, 3.0] by `src/sim/forceScale.ts` in the scenes (the sim receives the scale as a parameter) |
| `PLATFORM_IMPART_VELOCITY` | `false` | parity with today; per-platform override `MovingPlatformConfig.impartVelocity?` |
| `SIM_ARM_ON_FIRST_TOUCH` | `true` | D-02; the rollback switch |
| `INPUT_QUANT_PX` | `0.25` | latch quantization (≤ 0.125 px change, keeps logs compact and exact) |
| `OOB_MARGIN` | `60` | moves the inline `margin = 60` from `GameScene.ts:1591` |

### 3.3 One step, one order (D-01.2)
`src/sim/stepPipeline.ts` owns the order; `GameScene` and `HeadlessWorld` both implement `SimWorldPort` (TECHNICAL-ARCHITECTURE §4.1):
```ts
export function runFixedStep(port: SimWorldPort, input: LatchedInput, t: number, S: number): StepOutcome {
  const tEnd = t + S;
  port.applyKinematics(tEnd);   // 2. platforms (Body.setPosition(body, p, impart)), hazards, beams, goal drift
  port.updateGates();           // 3. from current velocity, before collision detection
  port.applyForces(input);      // 4. attractor (if input.on) + zones + magnets, × FORCE_SCALE
  port.storePrev();             //    render interpolation source
  port.stepPhysics(S);          // 5. world.step(S)
  port.resolvePortals(tEnd);    // 6a. cooldown in sim ms
  port.collectPickups();        // 6b. gem, orbs → SimEvents
  return port.evaluate(tEnd);   // 6c. win / hazard / timeout / oob via resolveOutcome (D-03)
}
```
Input latching (step 1) happens in the caller: `const input = scripted ?? replay ?? latch.sample(); log.record(input);`. `RawMatter.Body.setPosition` in `src/utils/matter.ts:9` gains the optional `updateVelocity?: boolean` parameter (Matter's `Body.setPosition(body, position, updateVelocity)`, `Body.js:547-567`).

### 3.4 Rules and precedence (D-03)
`src/sim/rules.ts`:
- `hazardOverlap(pose, ball, r)` — the exact predicates of `Hazard.overlaps` (`Hazard.ts:99-107`), a beam bites only while `firing`.
- `inGoal(ball, goalPos, radius)` — strict `<` as `GameScene.ts:1016`.
- `winAllowed` — `gemRequired ⇒ gemCollected` and `collectAllToWin ⇒ all orbs` (`GameScene.ts:1017-1018`).
- `resolveOutcome(f)` — `inGoal && winAllowed` → `win`; else `hazardHit` → `hazard`; else `timedOut` (`timeLimitMs > 0 && tEnd >= timeLimitMs`) → `timeout`; else `outOfBounds` (`OOB_MARGIN`) → `oob`; else `continue`. **Assumption A1:** a goal entry in the same step as the countdown reaching 0 resolves as a win (consistent with D-03; D-03 itself only rules on win vs hazard).

### 3.5 Kinematics (D-01.4)
`src/sim/kinematics.ts`, all pure, all in sim ms from arm:
| Object | Pose function | Parity with today |
|---|---|---|
| Hazard sweep (`to` + `durationMs`) | `start + (to − start) · pingPongSine(t, dur)`; `pingPongSine` = triangle wave → `0.5·(1 − cos(π·u))` | Phaser `Sine.easeInOut` (`node_modules/phaser/src/math/easing/sine/InOut.js:29`) with `yoyo: true, repeat: -1` (`Hazard.ts:60-67`) |
| Rotating arm (`pivot` + `durationMs`) | `orbitPoint(pivot, r, base + 2π·((t mod dur)/dur))` | Linear tween (`Hazard.ts:83-95`) |
| Beam (`pulseMs`, `phaseMs`) | `beamState(t, pulseMs, phaseMs)` = existing `beamActive` (`hazardMotion.ts:10-14`) + charge tail (`Hazard.ts:134-139`) | same formula, origin now sim time 0 instead of the absolute rAF time |
| Moving platform | `pingPongSine` as the sweep, applied with `Body.setPosition(body, p, cfg.impartVelocity ?? PLATFORM_IMPART_VELOCITY)` every step | today it moves on tween ticks (every frame at 120 Hz, every other step at 30 Hz) |
| Goal drift (`goal.to` + `durationMs`) | `triangle(t, dur)` (linear yoyo) | `GameScene.ts:426-434`, origin now arm |
| Endless hazards | `pose(t − spawnSimMs)` | tween started at spawn (`EndlessScene.ts:322-326`) |

Entities lose their tweens and expose `applyPose(tMs)` (physics/overlap state) and `render(renderMs)` (graphics + glow). Visual-only motion (saw spin, glow pulse, chevrons) stays per frame.

### 3.6 Sim clock consumers (D-01.3)
| Consumer | Today | P1 |
|---|---|---|
| Countdown (`updateCountdown`, `GameScene.ts:614-626`) | `timeLimit − (time − levelStartMs)`, triggers death itself | display only: `timeLimitMs − simMs`; the timeout is decided in `evaluate()` |
| Par chip (`GameScene.ts:651-656`) | `time − levelStartMs` | `simMs` |
| Win time (`GameScene.ts:1027`) | `this.time.now − levelStartMs` (two bases) | `Math.round(stepper.simMs)` |
| Ghost (`GameScene.ts:659-668`) | every 60 ms wall | every `GHOST_SAMPLE_MS` of `simMs` from arm, point `{x, y, t}` |
| Portal cooldown (`GameScene.ts:972`) | rAF `time` | `tEnd − p.lastJumpMs < PORTAL_COOLDOWN_MS` |
| Endless scroll / ramp / invulnerability | frame `delta`, `this.time.now` | `scrollY −= speed(tEnd) · S/1000` per step, `speed` from `simMs`; `invulnUntilSimMs` |

`levelStartMs` is deleted. Pause needs no code: paused scenes are not updated, so `advance()` is not called (TECHNICAL-ARCHITECTURE §8 pause table).

### 3.7 Armed simulation (D-02 capability)
- `GameScene.create` sets `armed = !SIM_ARM_ON_FIRST_TOUCH`; kinematic objects are posed at `t = 0`; no step runs before arm, so `startVelocity` (set in `Ball.ts:51-54`) is preserved until the first step.
- The first accepted `pointerdown` (not over the HUD) arms the sim, then latches the press. The countdown shows the full limit and the par chip `0.0s` until then. The ghost and input recorders start at arm.
- `EndlessScene` arms on `create` (D-02 keeps its start grace separate); the pre-run countdown UX is not part of P1.
- P3 owns everything the player sees about the preview (hint copy, "hold to begin" affordance, title-card policy).

### 3.8 Input latch and log
- `InputLatch.press/move/release` are called from the Phaser handlers; `sample()` returns `{ on, x, y }` quantized to `INPUT_QUANT_PX`. **Edge-preserving:** if a press began and ended since the last sample, the next sample is `on` once at the press position.
- `GameScene` listens to `pointerupoutside` as a release (audit H.4 sticky attractor on desktop web).
- `EndlessScene` latches screen coordinates and converts to world coordinates with the **sim** scroll inside the step (`y + scrollY`), so input is independent of render interpolation.
- `InputLog` stores runs `[count, on, x, y]`; header `{ v: 1, scene, level | devConfig hash, mode, seed, forceScale, armStep: 0 }`. Endless records its seed (`EndlessScene.ts:128`).

### 3.9 Render interpolation (D-01.5)
`renderMs = simMs − (1 − alpha)·S`. The ball draws at `lerp(prev, cur, alpha)` (a portal jump sets `prev = cur` to avoid a streak); hazards, platforms and the goal draw at `pose(renderMs)`; the Endless camera at `lerp(prevScroll, scroll, alpha)`. The pull line, trail and goal brightness use the interpolated ball. After a win/death the last state is drawn (alpha 1). This keeps ball and moving objects on one render time (the physics brief's `f(simMs + alpha·S)` would draw kinematics one step ahead of the ball).

### 3.10 Side effects (D-01.2)
`src/sim/events.ts` — `SimEvent = { type: 'gem' } | { type: 'orb'; i: number } | { type: 'portal' } | { type: 'end'; outcome: Exclude<StepOutcome, 'continue'> }`. Ports push; the scene flushes after `advance()`: audio (`playGem`), `Haptics.pulse`, `StatsStore.recordPortalJump`, then `triggerWin()` or `triggerDeath(cause)`. `triggerDeath` keeps its `RESTART_DELAY_MS` UI timer.

### 3.11 Determinism verification
- **Browser, multi-rate:** DEV-only `window.__sim` (`src/scenes/devSimHooks.ts`, installed by both gameplay scenes when `import.meta.env.DEV`) exposes `stepCount()`, `simMs()`, `arm()`, `setInputScript(name, args)`, `replay(runs)`, `inputLog()`, `checkpoints()` (stateHash at steps 60/120/300/600), `frameSteps()`, `ballState()`, `outcome()`. `GameScene` also accepts `data.devConfig: LevelConfig` in DEV for synthetic scenarios. `scripts/harness/rates.mjs` calls `__game.loop.sleep()` (`TimeStep.js:773`) and drives `__game.loop.step(t)` (`TimeStep.js:711`) with `t_f = t0 + f·1000/hz + U(−1, 1)` from a seeded LCG; inputs come from step-indexed scripts in `src/sim/devScripts.ts`, so every rate feeds identical per-step input.
- **Node:** Phaser's bundled Matter lib loads under Node ESM (verified: `import Engine from './node_modules/phaser/src/physics/matter-js/lib/core/Engine.js'` + `Bodies` + `Composite` ran 300 steps under Node 24.18). `src/sim/HeadlessWorld.ts` builds bodies from a `LevelConfig` using `src/sim/bodyDefs.ts` (the option objects and creation order that the entities also import: walls top/bottom/left/right → ball → obstacles → gates → platforms, matching `GameScene.createWorldBounds` + `createFromConfig`, `GameScene.ts:321-412`) and implements `SimWorldPort`. Matter is injected as a parameter, so `src/sim` never imports Phaser.
- **Cross-runtime:** fixtures in `tests/fixtures/replays/*.json` (`{ v: 1, config, header, runs, steps, hash }`) are recorded in the browser and replayed in Node; equal hashes prove the two ports agree.
- **Safety net:** before any physics change, `scripts/harness/trajectory-snapshot.mjs` records the current game (pre-P1) and P1 re-records with `FORCE_SCALE` 1.0 and 2.08 for a reviewed comparison (§8.3).

---

## 4. Files / modules affected

### Create
| Path | Purpose | Task |
|---|---|---|
| `scripts/harness/scenarios.mjs` | scenario list: L1 + the first campaign level using each mechanic (zones, magnets, portals, gates, platforms, sweep, arm, beam, goal drift, timed), resolved from `LEVELS` via vite-node; synthetic graze + max-speed configs | T01 |
| `scripts/harness/trajectory-snapshot.mjs`, `scripts/harness/trajectory-compare.mjs` | before/after safety net | T01, T14 |
| `tests/fixtures/trajectories/pre-p1.json` | baseline of the current code at 60 and 120 Hz | T01 |
| `src/sim/FixedStepper.ts` + `FixedStepper.test.ts` | D-01 stepper | T02 |
| `src/sim/forceScale.ts` + `forceScale.test.ts` | env override resolution | T02 |
| `src/sim/forces.ts` + `forces.test.ts` | pure forces | T03 |
| `src/sim/kinematics.ts` + `kinematics.test.ts`, `src/sim/kinematics.levels.test.ts` | poses + spawn-safety across `LEVELS`/`DAILY_LEVELS` | T04 |
| `src/sim/rules.ts` + `rules.test.ts` | predicates + precedence | T05 |
| `src/sim/input.ts` + `input.test.ts`, `src/sim/stateHash.ts` + `stateHash.test.ts`, `src/sim/events.ts`, `src/sim/stepPipeline.ts` + `stepPipeline.test.ts` | latch/log, hash, events, step order | T06 |
| `src/sim/bodyDefs.ts` + `bodyDefs.test.ts` | shared body options + creation order | T07 |
| `src/scenes/GameSimPort.ts` | `SimWorldPort` over GameScene entities | T08 |
| `src/scenes/SimDebugOverlay.ts` | debug-build overlay: `actualFps`, rAF interval histogram, steps/frame, sim − wall drift (`VITE_SIM_DEBUG=1`) | T08 |
| `src/sim/wallclock.test.ts`, `src/sim/boundaries.test.ts` | lints | T10 |
| `src/sim/devScripts.ts`, `src/scenes/devSimHooks.ts` | step-indexed input scripts; DEV hooks | T11 |
| `scripts/harness/rates.mjs` | multi-rate harness | T12 |
| `src/sim/HeadlessWorld.ts` + `HeadlessWorld.test.ts`, `src/sim/replay.node.test.ts`, `src/sim/graze.node.test.ts`, `scripts/harness/replay.mjs`, `tests/fixtures/replays/*.json` | replay determinism | T13 |
| `tests/fixtures/trajectories/post-p1-fs100.json`, `post-p1-fs208.json`, `compare-p1.md` | after snapshots + review | T14 |
| `scripts/harness/ab-labels.mjs` | assigns blind A/B/C labels to the three `FORCE_SCALE` APKs and prints the key for STATUS | T14 |

### Modify
| Path | Change | Task |
|---|---|---|
| `src/config/physics.config.ts` | §3.2 keys | T02 |
| `src/types/index.ts` | `MovingPlatformConfig.impartVelocity?: boolean` (line 70-78 interface) | T04 |
| `src/utils/matter.ts` | `setPosition(body, position, updateVelocity?)` | T07 |
| `src/utils/ghost.ts`, `src/utils/GhostStore.ts` | `PathPoint.t?: number`; downsample keeps `t` | T08 |
| `src/entities/Hazard.ts` | remove `tween`/`startMoving`/`startOrbiting`; `applyPose(t)`, `render(renderMs)`; `overlaps` delegates to `rules.hazardOverlap` | T07 |
| `src/entities/MovingPlatform.ts` | remove tween; `applyPose(t)` with `setPosition(…, impart)`; `render(renderMs)` | T07 |
| `src/entities/Goal.ts` | `applyPose(t)` from `goalPose`; render position separate from capture position | T07 |
| `src/entities/Ball.ts` | `storePrev()`, `render(alpha)` (trail from interpolated points); body options from `bodyDefs` | T07 |
| `src/entities/Obstacle.ts`, `src/entities/Gate.ts`, `src/entities/GravityZone.ts`, `src/entities/Magnet.ts` | body options from `bodyDefs`; `GravityZone.contains` → pure `zoneContains`; expose `ZoneRect`/magnet params for `forces.ts` | T07 |
| `src/scenes/GameScene.ts` | scene physics config `autoUpdate: false`; stepper, latch, log, events; `fixedStep`; armed; `renderFrame(alpha)`; delete `levelStartMs`, `applyAttractorForce`, `applyZoneForces`, `applyMagnetForces`, per-frame checks; `pointerupoutside` | T08 |
| `src/scenes/EndlessScene.ts` | same adoption; sim scroll, spawn/cull in step, `invulnUntilSimMs`, `elapsed` removed | T09 |
| `src/main.ts` | `matter: { gravity: { x: 0, y: 0 }, autoUpdate: false, debug: false }` | T10 |
| `.github/workflows/ci.yml` | job `harness` (`npm run harness:rates`, `npm run harness:replay -- --verify`) | T12, T13 |
| `package.json` | scripts `harness:rates`, `harness:replay`, `harness:trajectories` | T12–T14 |
| `CLAUDE.md` | force-model section (per-step, `FORCE_SCALE`), "every frame" → "every step" in win/death text, `src/sim/` in the folder tree, timing rule ("gameplay reads only `simMs`") | T14 |
| `docs/STATUS.md`, `docs/qa/DEVICE-CHECKLIST-M0.md`, `docs/release/RUNBOOK.md` | refresh-rate rows, A/B APK protocol, harness gate | T14 |

---

## 5. Data-model changes
| Item | Before | After | Compatibility |
|---|---|---|---|
| `PathPoint` (`src/utils/ghost.ts`) | `{ x, y }` | `{ x, y, t?: number }` (`t` = simMs) | additive; stored ghosts without `t` render as today's static trail |
| `MovingPlatformConfig` (`src/types/index.ts`) | — | `impartVelocity?: boolean` | optional; no level sets it in P1 |
| Best time (`ProgressStore.bestTimeMs`) | wall time from scene create, incl. title card and pauses | sim time from first touch | old values can only be slower than achievable now (except records set on 144 Hz panels); kept as is |
| Weekly/Endless local scores | rate-dependent | rate-independent | kept (local only, D-17) |
| Input log (new, not persisted in saves) | — | `{ v: 1, header, runs: [count, on, x, y][] }` | fixture and dev-hook format; P3 route ghost and P2 bot reuse it |
| Replay fixture (new) | — | `tests/fixtures/replays/<name>.json` `{ v: 1, config, header, runs, steps, hash }` | regenerated only by `replay.mjs --record` when a physics constant changes |
| Trajectory fixture (new) | — | `{ v: 1, label, hz, scale, scenarios: [{ id, samples: [{ tMs, x, y }], outcome, outcomeMs }] }` | review artefact |

No localStorage key is renamed or bumped in P1.

## 6. UI changes
- Before the first touch the level is a still preview: hazards and platforms hold their t = 0 pose, the countdown shows the full limit, the par chip shows `0.0s`. No new prompt (P3).
- Countdown and par chip now advance in sim time (smooth to the 0.1 s display; frozen while paused).
- Debug builds with `VITE_SIM_DEBUG=1` show the sim debug overlay (top-left, under the HUD chip). Release builds never include it.
- No other visual change; all juice (pulses, shake, particles, title cards) stays per frame.

## 7. Gameplay changes
| Change | Player-visible effect |
|---|---|
| Forces applied every step with `FORCE_SCALE = 2.08` | the pull everywhere matches what the 150 levels were authored on (the dev display is 120 Hz, D-01 calibration). **60 Hz devices feel about 2× the pull they had before; 30 fps devices about 4×.** The owner A/B decides the final value (1.0 / 1.5 / 2.08) at M0. |
| Armed on first touch | zero-input self-wins become impossible (L11/L12 class); title-card time no longer counts toward par |
| Per-step checks | grazes are judged at every step, identically at every refresh rate |
| Win beats hazard in the same step (D-03) | L74-class "dead inside the goal" deaths become wins |
| Timeout tie → win (Assumption A1) | a goal entry on the last step counts |
| Deterministic beam/goal phase from arm | every attempt starts the same; beams with `phaseMs = 0` fire at t = 0 (spawn-safety test guards the ball spawn) |
| Platforms advance every step | at 30 fps a platform no longer pushes in 2-step jumps (physics brief Q3: 5.19 vs 2.60 px/step) |
| Pause / background / Settings / ads | no time lost, ever |

## 8. Test strategy

### 8.1 TDD (failing test first, Vitest)
| Test file | Cases |
|---|---|
| `src/sim/FixedStepper.test.ts` | first advance(16.667) → 1 step, alpha 0.5; 60 Hz ±1 ms LCG over 6000 frames → every frame exactly 1 step; 30 Hz → 2 steps/frame; 120/144 Hz totals = floor(sim/S); advance(1000) → 4 steps, alpha 0.5 (clamp + backlog drop); NaN/negative → 0 steps; `false` stops the loop, terminal step counted, acc reset; `simMs === stepCount × S` after 10⁶ steps; sim − wall ≤ S over 10 s at 30/60/90/120/144 Hz |
| `src/sim/forceScale.test.ts` | undefined/empty/NaN → default; clamping to [0.5, 3.0]; "1.5" → 1.5 |
| `src/sim/forces.test.ts` | **D-26 parity:** a reference copy of `GameScene.ts:931-948` and `:480-496` vs `attractorForce`/`magnetForce` at scale 1 — bit-equal over a 50×50 grid incl. inside `MIN_DIST` and beyond `MAX_DIST`; scale multiplies magnitude only; zone force only inside the AABB (`GravityZone.ts:34-41` semantics); repel sign; no allocation (`out` reused) |
| `src/sim/kinematics.test.ts` | `pingPongSine` = `0.5·(1 − cos(π·u))` with yoyo at 0, dur/2, dur, 1.5·dur, 2·dur; `triangle` = `GameScene.ts:428-429`; orbit full turn; `beamState` equals `beamActive` + the charge tail of `Hazard.ts:134-139` on a 1 ms grid; poses for static/sweep/arm/beam/platform/goal |
| `src/sim/kinematics.levels.test.ts` | for every level in `LEVELS` and `DAILY_LEVELS`: no hazard pose overlaps the ball spawn for t ∈ [0, 1000] ms at 1 step resolution; failures are listed in `KNOWN_SPAWN_OVERLAP` with a STATUS bug for P4 (no level edits in P1) |
| `src/sim/rules.test.ts` | circle/rect/beam overlap parity with `Hazard.overlaps` on a grid; strict goal radius; all 16 flag combinations of `resolveOutcome`; `winAllowed` with gemRush and collect-all; timeout tie (A1); OOB margin |
| `src/sim/input.test.ts` | quantization; edge-preserving tap (press+release inside one step → one `on`); move ignored while released; RLE round trip; `InputLog.replay(runs)(k)` equals the recorded sample for every k; JSON round trip exact |
| `src/sim/stateHash.test.ts` | same state → same hash; 1-ulp change → different hash; field order fixed |
| `src/sim/stepPipeline.test.ts` | a recording fake port proves the exact order and the `t + S` arguments; `continue` vs terminal outcomes |
| `src/sim/bodyDefs.test.ts` | options equal `PHYSICS` (radius, restitution, friction, frictionAir, wall restitution/thickness); documented creation order |
| `src/sim/HeadlessWorld.test.ts` | builds every `LevelConfig` field; ball at rest with no input stays at rest for 600 steps (gravity 0); a held attractor at 150 px reaches the expected speed band |
| `src/sim/graze.node.test.ts` | tangent passes at goal radius − 1 … − 10 px and hazard radius − 1 … − 10 px: outcome identical when the same steps are driven through `FixedStepper` frame groupings for 30/60/90/120/144 Hz |
| `src/sim/replay.node.test.ts` | every `tests/fixtures/replays/*.json` replays in Node to the recorded outcome, `simMs` and hash |
| `src/sim/wallclock.test.ts` | rules in §8.4 |
| `src/sim/boundaries.test.ts` | `src/sim/**` imports no `phaser`, `src/platform`, `src/services`, `src/scenes`, `src/entities` |

### 8.2 Browser harnesses (Node Playwright 1.63.0, Chromium `--disable-gpu --use-gl=swiftshader`, `vite` dev server)
| Harness | Procedure | Pass |
|---|---|---|
| `scripts/harness/rates.mjs` | per scenario × {30, 60, 90, 120, 144} Hz: start scene, `loop.sleep()`, `__sim.arm()`, `setInputScript`, drive `loop.step(t)` with ±1 ms jitter until step 600; also a 10 s run per rate for drift; a pause probe opens `SettingsScene` for 600 frames mid-run | checkpoint hashes equal across rates; 60 Hz histogram = {1: all frames}; \|simMs − wall\| ≤ S; `simMs` unchanged during the pause probe (≤ 1 step) |
| `scripts/harness/replay.mjs` | `--record`: run each corpus scenario at 120 Hz with a script, save log + hash to `tests/fixtures/replays/`; `--verify`: replay each fixture at 60 and 144 Hz in the browser | identical outcome, `simMs`, hash |
| `scripts/harness/trajectory-snapshot.mjs` | wall-time scripted pointer input injected through `scene.input.emit('pointerdown'\|'pointermove'\|'pointerup', …)` (the same handlers on old and new code); samples every 100 ms for 3 s | file written |

### 8.3 Before/after safety net
1. **T01, before any change:** record `pre-p1.json` on the unchanged code at 60 Hz and 120 Hz (no jitter). This also re-measures the old 120/60 pull ratio as evidence for `FORCE_SCALE`.
2. **T14, after adoption:** record with `VITE_FORCE_SCALE=1.0` and `2.08`; `trajectory-compare.mjs` pairs post@1.0 with pre@60 and post@2.08 with pre@120 and writes `compare-p1.md` with per-scenario max deviation, outcome match and time-to-outcome delta.
3. **Review rule (code review, not CI):** outcomes match for ≥ 90% of scenarios in each pairing, and every mismatch is attributed to a known cause in the report (removed one-step force latency, per-step checks, D-03 precedence, deterministic beam/goal phase, armed start). An unexplained mismatch blocks the merge.
4. **Max-speed probe:** the scenario "held attractor into the thinnest obstacle" reports peak px/step at scale 2.08 against the tunnelling threshold (ball radius 16 + half bar 6 = 22 px/step). Exceeding it is reported to P2's bot (no speed clamp in P1).

### 8.4 Wall-clock lint rules (`src/sim/wallclock.test.ts`)
1. `src/sim/**/*.ts` (non-test): no `Date.now`, `performance.now`, `new Date`, `Math.random`, `requestAnimationFrame`, `setTimeout`, `setInterval`, `loop.time`, `loop.delta`, `rawDelta`, `time.now`, `tweens`, or `from 'phaser'`.
2. `src/entities/{Hazard,MovingPlatform,Goal}.ts`: no `tweens.add` and no clock token from rule 1.
3. `src/scenes/{GameScene,EndlessScene,GameSimPort}.ts`: no `Date.now`, `performance.now`, `game.loop.time`, `this.time.now`, `loop.delta`, `Math.random` unless the line ends with `// wallclock-ok: <reason>` (allowed reasons today: visual attractor charge `GameScene.ts:515, 905`, Endless random seed `EndlessScene.ts:128`); `rawDelta` appears exactly once per scene, in the `stepper.advance(` call.
4. `src/main.ts`: the Matter config contains `autoUpdate: false`; the game config contains no `fps` key.

### 8.5 Device-only (👤, rows added to `docs/qa/DEVICE-CHECKLIST-M0.md`)
- Feel A/B: three debug APKs built with `VITE_FORCE_SCALE=1.0|1.5|2.08` and `VITE_SIM_DEBUG=1`, labelled A/B/C by `scripts/harness/ab-labels.mjs` (key kept in STATUS until the result is recorded). Protocol per APK: L1, the first zone level, the first magnet level, the first platform level, the W1 boss, 2 min of Gravity Run; note "floaty / right / snappy" and preferred label.
- Refresh behaviour with the overlay: a 120 Hz phone in Adaptive and Standard modes, battery saver on/off, a 60 Hz phone; hold/release rhythm to catch touch-boost switches; steps/frame histogram and drift must stay within the harness bounds.
- Settings open 10 s mid-level and Home for 30 s: the countdown changes by ≤ 1 step.

---

## 9. Migration strategy
- **Commit order keeps the game playable at every commit.** Phaser merges scene physics config over game config (`node_modules/phaser/src/physics/matter-js/MatterPhysics.js:447-458`), so T08 sets `physics: { matter: { autoUpdate: false } }` in `GameScene`'s scene config only, T09 does the same for `EndlessScene`, and T10 moves `autoUpdate: false` into `src/main.ts` once both scenes step themselves.
- **Saves:** no key migration. Ghosts gain `t` only when re-recorded; best times keep their values (§5).
- **Fixtures:** `pre-p1.json` is committed before the first physics change (T01) and never regenerated.
- **Docs:** D-01 calibration status changes only after the owner A/B (DECISIONS.md is edited by the owner decision, then code follows).

## 10. Rollback considerations
| Lever | Effect |
|---|---|
| `SIM_ARM_ON_FIRST_TOUCH = false` | immediate start as today; everything else stays deterministic |
| `FORCE_SCALE` constant (or `VITE_FORCE_SCALE` in debug builds) | any feel value without code changes |
| `PLATFORM_IMPART_VELOCITY` / per-platform `impartVelocity` | default `false` = today's push behaviour |
| Revert T08/T09/T10 | restores Phaser auto-update; must revert all three plus T07 together, because entities lose their tweens in T07 |
| Harness gate | CI job can be marked non-blocking for one release if a CI-only Chromium issue appears; the Node replays and the stepper tests stay blocking |

## 11. Performance considerations
- **Step cost:** at 30 fps every frame runs 2 steps; at 15 fps 4. Target p95 `runFixedStep` ≤ 0.5 ms on the Mid reference device [I]; measured with the debug overlay (timing lines tagged `// wallclock-ok: perf instrumentation` in `SimDebugOverlay.ts`, which is outside the lint scope).
- **High refresh:** at 120/144 Hz most frames run 0 or 1 step, so sim cost drops versus today; render cost is unchanged (P5-A handles it).
- **No per-step allocation** in `forces`, `kinematics`, `rules`, `InputLatch.sample` (out-params, reused objects); `InputLog` appends to typed arrays and only allocates when a run changes.
- **Kinematic objects** call `Body.setPosition` once per step each (bodies < 20 by CLAUDE.md budget).
- **Hazard redraw:** `render(renderMs)` keeps today's per-frame `Graphics` rebuild (caching is P5-A).
- **Harness CI time:** ≈ 11 scenarios × 5 rates × 600 steps + replays; target < 4 min for the `harness` job [I].

## 12. Platform considerations
- Android picks the refresh rate (60/90/120/144, battery saver caps it, OEM adaptive modes switch mid-session); the stepper makes the sim independent of all of it. Phaser's runner smoothing lag after a refresh switch (−28% sim time for 1.5 s, physics brief Q1) disappears because `rawDelta` is used directly.
- Backgrounding stops rAF; `TimeStep.resume()` resets the delta, and the 100 ms clamp bounds any long frame. P0's lifecycle opens the pause overlay, so no steps run on return.
- Below 15 fps the game runs in slow motion by design (never a death spiral).
- Determinism holds for V8 (Android WebView, Chrome, Node). JavaScriptCore (iOS, D-29) is not guaranteed; cross-platform replays are out of scope.
- **Assumption A2:** Matter results do not depend on global body ids (`Common._nextId` keeps growing across `scene.restart`). The harness runs scenarios after many restarts and Node starts fresh; a hash mismatch from ids would show up as browser-vs-Node or rate-vs-rate failures and is handled as a P1 defect (fix: deterministic body creation per scene).
- Never `fps.limit` (40/48 fps judder on 120/144 Hz panels).

## 13. Documentation changes
- `CLAUDE.md`: attractor force model (applied per step, `× FORCE_SCALE`), win/death checks per step with win precedence, the sim-time rule, `src/sim/` in the folder tree, harness commands in "Commands".
- `docs/architecture/TECHNICAL-ARCHITECTURE.md`: mark §4.1 and §8 "implemented" with the P1 closing commit.
- `docs/STATUS.md`: harness gate, A/B gate (owner), `KNOWN_SPAWN_OVERLAP` bugs if any, facts refresh.
- `docs/qa/DEVICE-CHECKLIST-M0.md` and `docs/release/RUNBOOK.md`: A/B APK build commands and protocol, refresh-rate rows.
- `docs/roadmap/DECISIONS.md` D-01 calibration line: updated by the owner decision after the A/B.
- This file's status line → `DONE` with the closing commit hash.

---

## 14. Validation criteria
| # | Criterion | Label | Command / method |
|---|---|---|---|
| V1 | Type check | VERIFIED-by-command | `npx tsc --noEmit` |
| V2 | Unit + Node sim tests (all §8.1 files) | VERIFIED-by-command | `npx vitest run` |
| V3 | Web build | VERIFIED-by-command | `npm run build` |
| V4 | Bit-identical state across 30/60/90/120/144 Hz ±1 ms | VERIFIED-by-command | `npm run harness:rates` |
| V5 | 60 Hz exactly one step per frame; sim within one step of wall over 10 s | VERIFIED-by-command | `npm run harness:rates` (+ `FixedStepper.test.ts`) |
| V6 | Browser replays at 60/144 Hz and Node replays reproduce fixtures | VERIFIED-by-command | `npm run harness:replay -- --verify`; `npx vitest run src/sim/replay.node.test.ts` |
| V7 | No wall-clock reads in gameplay code; `autoUpdate: false`; no `fps` limit | VERIFIED-by-command | `npx vitest run src/sim/wallclock.test.ts` |
| V8 | D-26 formula parity at scale 1 | VERIFIED-by-command | `npx vitest run src/sim/forces.test.ts` |
| V9 | Settings open 600 frames → `simMs` unchanged | VERIFIED-by-command | pause probe in `harness:rates` |
| V10 | Before/after comparison reviewed (≥ 90% outcome match, all mismatches explained) | INFERRED (human review of a generated report) | `npm run harness:trajectories` → `tests/fixtures/trajectories/compare-p1.md` |
| V11 | Boot smoke still green, Android debug build | VERIFIED-by-command | `node scripts/harness/boot-smoke.mjs`; `./gradlew assembleDebug` |
| V12 | `runFixedStep` p95 ≤ 0.5 ms on the Mid device | REQUIRES HUMAN DEVICE TEST | debug overlay readout |
| V13 | Same feel on 60 Hz and 120 Hz phones; histogram/drift bounds hold with adaptive refresh and battery saver | REQUIRES HUMAN DEVICE TEST | §8.5 rows |
| V14 | `FORCE_SCALE` chosen by owner A/B and recorded | REQUIRES HUMAN DEVICE TEST | §8.5 protocol → DECISIONS.md D-01 |
| V15 | No time lost after 30 s backgrounded / 10 s in Settings | REQUIRES HUMAN DEVICE TEST | §8.5 row |

## 15. Exact completion definition
- [ ] `src/sim/` contains `FixedStepper`, `forces`, `kinematics`, `rules`, `input`, `stateHash`, `events`, `stepPipeline`, `bodyDefs`, `forceScale`, `devScripts`, `HeadlessWorld`, all with tests; `boundaries.test.ts` green.
- [ ] Matter `autoUpdate: false` in `src/main.ts`; `GameScene` and `EndlessScene` step only through `FixedStepper` + `runFixedStep`; no force, check or gameplay timer runs per frame.
- [ ] No Phaser tween drives a gameplay object; hazards, platforms, beams, goal drift and Endless hazards are pure functions of sim time; `PLATFORM_IMPART_VELOCITY` defaults to `false`.
- [ ] Countdown, par chip, win time, best time, portal cooldown, ghost timestamps, Endless scroll/ramp/invulnerability read `simMs`; `levelStartMs` and `elapsed` are gone.
- [ ] Sim armed on first touch in GameScene (`SIM_ARM_ON_FIRST_TOUCH = true`), on create in EndlessScene.
- [ ] Win beats hazard in the same step; outcome precedence covered by tests.
- [ ] Input latched once per step, edge-preserving, quantized, logged; `pointerupoutside` handled.
- [ ] `FORCE_SCALE = 2.08` applied uniformly to attractor, zones and magnets; A/B APKs buildable from the RUNBOOK.
- [ ] Harness job (`rates` + `replay --verify`) green in CI; Node replays green; wall-clock lint green.
- [ ] `pre-p1.json`, post snapshots and `compare-p1.md` committed and reviewed.
- [ ] Docs in §13 updated; STATUS lists the owner A/B gate for M0.

---

## 16. Task breakdown

### Step 6 — FixedStepper, forces, sim clock, kinematics, per-step checks, input latch, `FORCE_SCALE`
**P01-T01 — Baseline trajectory snapshot (before any physics change)**
- Goal: an immutable record of today's behaviour at 60 and 120 Hz.
- Files: `scripts/harness/scenarios.mjs`, `scripts/harness/trajectory-snapshot.mjs`, `tests/fixtures/trajectories/pre-p1.json`, `package.json` (`harness:trajectories`).
- Tests: the script run itself; fixture schema check in `trajectory-compare.mjs --validate`.
- Done when: `pre-p1.json` is committed on its own, before T02, with all scenarios and the measured 120/60 pull ratio.

**P01-T02 — Sim constants + FixedStepper**
- Goal: D-01.1 stepper with its constants.
- Files: `src/config/physics.config.ts` (§3.2), `src/sim/FixedStepper.ts`, `src/sim/forceScale.ts`.
- Tests: `FixedStepper.test.ts`, `forceScale.test.ts` (written first, failing).
- Done when: every §8.1 stepper case passes.

**P01-T03 — Pure forces**
- Goal: one force implementation for both scenes, formula unchanged.
- Files: `src/sim/forces.ts`.
- Tests: `forces.test.ts` incl. the D-26 parity grid.
- Done when: parity is bit-equal at scale 1 and the scenes still compile against the old code (not yet wired).

**P01-T04 — Kinematics**
- Goal: every moving gameplay object as a function of sim time.
- Files: `src/sim/kinematics.ts`, `src/types/index.ts` (`impartVelocity?`).
- Tests: `kinematics.test.ts`, `kinematics.levels.test.ts`.
- Done when: parity tests pass; any spawn-overlap level is listed in `KNOWN_SPAWN_OVERLAP` with a STATUS bug.

**P01-T05 — Rules + precedence**
- Goal: per-step predicates and D-03 outcome resolution.
- Files: `src/sim/rules.ts`, `src/config/physics.config.ts` (`OOB_MARGIN`).
- Tests: `rules.test.ts`.
- Done when: overlap parity and all 16 precedence cases pass.

**P01-T06 — Input latch/log, state hash, events, step pipeline**
- Goal: the step contract and its recording primitives.
- Files: `src/sim/input.ts`, `src/sim/stateHash.ts`, `src/sim/events.ts`, `src/sim/stepPipeline.ts`.
- Tests: `input.test.ts`, `stateHash.test.ts`, `stepPipeline.test.ts`.
- Done when: the fake-port order test pins the D-01.2 order.

**P01-T07 — Entities become kinematic renderers**
- Goal: no tweens on gameplay objects; shared body options; interpolation support.
- Files: `src/sim/bodyDefs.ts`, `src/utils/matter.ts`, `src/entities/{Hazard,MovingPlatform,Goal,Ball,Obstacle,Gate,GravityZone,Magnet}.ts`.
- Tests: `bodyDefs.test.ts`; existing `hazardMotion.test.ts`, `portal.test.ts`, `gate.test.ts` stay green.
- Done when: `git grep -n "tweens.add" src/entities/Hazard.ts src/entities/MovingPlatform.ts src/entities/Goal.ts` returns nothing (lands together with T08 in one branch).

**P01-T08 — GameScene adoption**
- Goal: GameScene steps only through the stepper, armed, on sim time.
- Files: `src/scenes/GameScene.ts` (scene physics config, `create`, `setupInput`, `update` → `advance` + `flushEvents` + `renderFrame`, `fixedStep`, `triggerWin` time, countdown/par/ghost; delete `levelStartMs`, inline force methods, per-frame checks), `src/scenes/GameSimPort.ts`, `src/scenes/SimDebugOverlay.ts`, `src/utils/ghost.ts`, `src/utils/GhostStore.ts`.
- Tests: V1–V3; boot smoke; T01 scenarios run without errors.
- Done when: a full campaign level and a daily play correctly in the dev server, and pause/Settings freeze the countdown.

**P01-T09 — EndlessScene adoption**
- Goal: Gravity Run on the same stepper (fair Weekly).
- Files: `src/scenes/EndlessScene.ts` (scene physics config, sim scroll and ramp, in-step spawn/cull, `invulnUntilSimMs`, kinematic chunk hazards with `spawnSimMs`, camera interpolation, latch with sim-scroll conversion, seed in the log header).
- Tests: V1–V3; boot smoke (both modes).
- Done when: a Weekly run with a fixed script produces the same score at 60 and 120 Hz in the dev server.

**P01-T10 — Global `autoUpdate: false` + lints**
- Goal: make fixed stepping the default and lock it in.
- Files: `src/main.ts:30-36`, `src/sim/wallclock.test.ts`, `src/sim/boundaries.test.ts`, wall-clock tags on the allowed lines.
- Tests: V7.
- Done when: both lints are green and adding `Date.now()` to `src/sim/rules.ts` makes the suite fail (checked once locally).

### Step 7 — Multi-rate harness, replay determinism, wall-clock rule in CI
**P01-T11 — DEV sim hooks + input scripts**
- Goal: drive and observe the sim step by step from Playwright and Node.
- Files: `src/sim/devScripts.ts`, `src/scenes/devSimHooks.ts`, `GameScene.ts` (`data.devConfig` in DEV), `EndlessScene.ts` (hook install).
- Tests: `input.test.ts` covers script determinism; boot smoke asserts `window.__sim` exists in DEV and is absent from `dist/` (`git grep`-style check on the built bundle: no `__sim` string).
- Done when: `window.__sim.checkpoints()` returns hashes in a dev session.

**P01-T12 — Multi-rate harness in CI**
- Goal: D-01 acceptance automated.
- Files: `scripts/harness/rates.mjs`, `package.json` (`harness:rates`), `.github/workflows/ci.yml` (job `harness`).
- Tests: V4, V5, V9.
- Done when: the CI job is green and fails if `FixedStepper` loses its phase bias (checked once with a temporary change on a branch).

**P01-T13 — Replay determinism, browser and Node**
- Goal: same input log → same outcome, `simMs` and hash everywhere.
- Files: `src/sim/HeadlessWorld.ts`, `scripts/harness/replay.mjs`, `tests/fixtures/replays/*.json` (L1 + one per mechanic + graze set + one Weekly seed), `package.json` (`harness:replay`), `ci.yml`.
- Tests: `HeadlessWorld.test.ts`, `replay.node.test.ts`, `graze.node.test.ts`; V6.
- Done when: every fixture matches in Node and in the browser at 60 and 144 Hz.

**P01-T14 — After snapshots, A/B builds, docs, close**
- Goal: reviewed safety net, owner-ready A/B, updated docs.
- Files: `tests/fixtures/trajectories/post-p1-fs100.json`, `post-p1-fs208.json`, `compare-p1.md`, `scripts/harness/trajectory-compare.mjs`, `scripts/harness/ab-labels.mjs`, `CLAUDE.md`, `docs/STATUS.md`, `docs/qa/DEVICE-CHECKLIST-M0.md`, `docs/release/RUNBOOK.md`, this file.
- Tests: V10, V11; code review (`superpowers:requesting-code-review`).
- Done when: §15 is complete except V12–V15, which run in the M0 device session; the M0 tag `v1.0.0-rc.2` waits for them.
