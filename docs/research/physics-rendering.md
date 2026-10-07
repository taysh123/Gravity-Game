# Gravity Flow: physics timestep and rendering decision log

Date: 2026-10-07. Stack: Phaser 3.90.0 with its bundled Matter 0.20.0, running in a Capacitor 8 Android WebView.

**Evidence labels**
- **[SRC]**: verified by reading the Phaser 3.90 source in `node_modules/phaser/src`.
- **[SIM]**: reproduced in Node with Phaser's own bundled Matter lib. The scripts are in `research/scripts/*.cjs`; run them as `node <script> "<repo root>"`.
- **[DOC]**: official documentation.
- **[COM]**: forums and issue trackers.
- **[OPN]**: my opinion.

---

## Q1. Applying continuous forces so they don't depend on frame rate

**Sources**
- [SRC] `World.js` `update()` at L1174-1266. It runs a fixed-step accumulator, `while (timeBuffer >= delta*1.5) Engine.update(engine, runner.delta)`, and never calls `getDelta`.
- [SRC] `World.js` `setEventsProxy` at L628-636 forwards Matter's `beforeUpdate`/`afterUpdate` as `'beforeupdate'`/`'afterupdate'`.
- [SRC] `MatterPhysics.js` L434 binds `world.update` to `SceneEvents.UPDATE`.
- [SRC] `Systems.step` at L356-366 emits UPDATE *before* `scene.update()`.
- [SRC] `Engine.update` emits beforeUpdate (L112), then integrates, resolves, clears forces (L214), then emits afterUpdate (L216).
- [SRC] `Runner.create` defaults at L36-51.
- [DOC] Matter 0.20 Body docs: *"Force is zeroed after every `Engine.update`, so constant forces should be applied for every update they are needed."* https://brm.io/matter-js/docs/classes/Body.html
- [DOC] Matter 0.20 Runner docs: beforeUpdate fires *"before each and every engine update in this browser frame (if any)."* https://brm.io/matter-js/docs/classes/Runner.html
- [DOC] Matter 0.20 release notes: fixed deterministic timestep by default, with 0..N updates per frame. https://unpkg.com/phaser@4.2.1/changelog/v3/3.85/MatterJS.md
- [COM] samme on the Phaser forum, 2025-04-01: "In Phaser v3.88 and after, Matter Physics uses a fixed-step update loop." https://phaser.discourse.group/t/matter-physics-in-phaser-v3-60-to-v3-80/13398
- [COM] Phaser 3.88 fix #6977. https://unpkg.com/phaser@4.2.1/changelog/v3/3.88/CHANGELOG-v3.88.md
- [COM] Gaffer, "Fix Your Timestep". https://gafferongames.com/post/fix_your_timestep/

**Key findings**
- **[SRC] Why the current pattern breaks.** Each frame runs `world.update`, which does 0..N steps, and *then* `GameScene.update()` calls `applyForce`.
  - The force set in frame N is used by the first step of frame N+1.
  - At 30 Hz the second step in that frame gets no force, so the pull is about ½.
  - At 120 Hz half the frames have no step, so two frames' forces stack into one step (about 2×).
- **[SIM] The model matches the measurements.** `timestep-sim.cjs` reproduces the measured slowdowns and speedups:

  | | 30 Hz | 60 Hz | 90 Hz | 120 Hz | 144 Hz |
  |---|---|---|---|---|---|
  | Force once per render frame (current), simulated | 0.48× | 1.00× | 1.50× | 2.08× | 2.50× |
  | Measured in the field | 0.48× | 1× | 1.58× | 2.2× | 2.69× |

  Applying the force in `beforeUpdate` gives identical results per step at every rate.
- **[SRC] `'beforeupdate'` is the right hook.** It fires inside the accumulator loop, once per `Engine.update`, before integration. `'afterupdate'` fires after collision resolution and after the force buffer is cleared.
- **[SRC] Runner options that actually work in 3.90.**
  - `fps` or `delta`
  - `frameDeltaSmoothing` (default true)
  - `frameDeltaSnapping` (default true)
  - `frameDeltaHistorySize` (default 100)
  - `maxUpdates`: null by default, which works out to `ceil(maxFrameTime/delta)` = **2 steps/frame**
  - `maxFrameTime` (default 33.3 ms)

  `getDelta` and `isFixed` do nothing in 3.90.
- **[SRC][SIM] Smoothing lags behind refresh changes.** Smoothing takes the mean of the *chronological* middle 80% of the last 100 frame deltas. The sorted copy is computed but never used. Results:
  - After a 120→60 Hz switch, 1500 ms of wall time produces only 1083 ms of simulation (−28%).
  - The world and its runner are rebuilt on every `scene.restart` (`MatterPhysics.start`/`shutdown`), so each attempt has a warm-up. At 30 Hz only 25 of 30 steps run in the first 0.5 s.
- **[SRC] The 1.5-step margin adds latency.** It keeps about one step queued, which is about +16.7 ms of latency.
- **[SRC][SIM] `fps.limit` causes judder on high-refresh panels.** `stepLimitFPS` throws away the leftover time (`this.delta = 0`):
  - `limit:60` on a 120.1 Hz panel gives **40 fps**.
  - On a 144 Hz panel it gives **48 fps**, with 3-frame gaps.
  - It doesn't reduce how often rAF wakes the CPU.
  - `fps.target` only changes how deltas are clamped.

**Implications for Gravity Flow**
- Every level pulls about 2.2× harder on 120 Hz phones and about ½ as hard at 30 fps.
- The shared-seed **Weekly leaderboard is unfair** across devices.
- At 144 Hz the ball's top speed is about 22 px/step, which is roughly the 16 px ball radius + 6 px half-bar. It could tunnel through 12 px bars.
- **Do this first:** find out what refresh rate the 150 levels were tuned on (check `game.loop.actualFps` on the dev machine).
  - If they were tuned at 120 or 144 Hz, a correct fix makes every level about 2.2–2.7× weaker.
  - In that case, scale `ATTRACTOR_STRENGTH`, `MAGNET_STRENGTH` and the zone forces by the measured ratio.
  - `GRAVITY_ZONE_STRENGTH` is documented as "per-frame"; it now means per-step.

**Recommendation [OPN]**
- **Target:** turn off Phaser's auto-update and run your own fixed-step loop.
  - Keep a 60 Hz step, which preserves the tuning.
  - Start the accumulator half a step full.
  - Allow at most 4 steps per frame.
  - Clamp each frame's time to 100 ms.
  - Interpolate rendering between steps.
- **Hotfix this week, if needed:** move the `apply*Force()` calls into `this.matter.world.on('beforeupdate', …)`. It's verified correct and about 10 lines.

```ts
// main.ts
matter: { gravity: { x: 0, y: 0 }, autoUpdate: false }
// physics.config.ts
SIM_STEP_MS: 1000 / 60, SIM_MAX_STEPS: 4, SIM_MAX_FRAME_MS: 100,

// utils/FixedStepper.ts — shared by GameScene + EndlessScene (the 2nd caller)
export class FixedStepper {
  simMs = 0;
  private acc = PHYSICS.SIM_STEP_MS / 2;            // phase bias
  advance(frameMs: number, step: () => boolean): number { // returns render alpha
    const S = PHYSICS.SIM_STEP_MS;
    this.acc += Math.min(Math.max(frameMs, 0), PHYSICS.SIM_MAX_FRAME_MS);
    for (let n = 0; this.acc >= S; n++) {
      if (n === PHYSICS.SIM_MAX_STEPS) { this.acc = S / 2; break; } // drop backlog → slow-mo, never spiral
      this.acc -= S;
      if (!step()) { this.acc = S / 2; break; }     // false = win/death ended the run
      this.simMs += S;
    }
    return this.acc / S;
  }
}
// GameScene.update()
const alpha = (this.matter.world.enabled && !this.isWon && !this.isDying)
  ? this.stepper.advance(this.game.loop.rawDelta, () => this.fixedStep()) : 0;
this.renderFrame(alpha); // pulses, pull line, ball at lerp(prev,pos,alpha)
```

**Risks and tradeoffs**
- Below 15 fps the game runs in slow motion. That's intended.
- Interpolation adds up to one step of visual latency.
- `autoUpdate:false` applies to every scene, so EndlessScene must use the stepper too.
- `triggerDeath` uses `world.pause()`, so the loop must respect `world.enabled`.

**Validation**
- In Playwright, call `game.loop.sleep()`, then drive `game.loop.step(t)` with synthetic timestamps at 30, 60, 90, 120 and 144 Hz, with ±1 ms jitter.
  - The ball state after exactly N steps must be bit-identical at every rate.
  - Simulated time must stay within one step of wall time over 10 s.
  - At 60 Hz every frame must run exactly one step.
- [SIM] `accumulator-sim.cjs` shows the half-step bias matters: with ±1 ms timestamp jitter at 60 Hz, frames that ran 0 or 2 steps drop from 3100 to 0.
- On device, add a debug overlay showing the rAF-interval histogram and steps per frame.

---

## Q2. Where per-step gameplay checks should run

**Key findings**
- **[SRC] Checks currently run once per render frame,** on the final position only.
  - At 30 fps, every other step's position is never tested.
  - At 120 Hz, half the checks repeat the previous one.
  - So whether a *grazing* contact counts depends on frame rate. A goal chord shorter than the gap between samples can be missed at 30 fps and caught at 60.
- **[OPN, worked out from config] Tunneling is not a risk if checks run every step.**
  - The ball's mass is about 0.80, its peak attractor acceleration is 0.16 px/step², and `frictionAir` is 0.02. That gives a top speed of about **8 px/step (~480 px/s)**, or about 12 px/step with a magnet stacked on top.
  - The thinnest hazard is 12 px, the smallest goal radius is 22, and portals are 26. So the detection windows are 44, 44 and 84 px, much wider than the 8–12 px the ball moves per step.
- **Gates must update before each step's collision detection,** because they toggle whether the ball collides with them.

**Recommendation [OPN]**
- Evaluate every gameplay predicate inside `fixedStep()` in a fixed order. Keep render-only work per frame.

```ts
private fixedStep(): boolean {
  const t = this.stepper.simMs, S = PHYSICS.SIM_STEP_MS;
  const input = this.latchInput(t);   // attractor {on,x,y} sampled once per step (+ logged)
  this.kinematics.apply(t + S);       // platforms/hazards/goal/beams = f(simMs) (Q3)
  this.updateGates();                 // from current velocity, BEFORE collision detection
  this.applyForces(input);            // attractor + zones + magnets
  this.ball.storePrev();
  this.matter.world.step(S);
  this.checkPortals(t); this.checkGem(); this.checkOrbs();
  return !(this.checkHazards() || this.checkWin() || this.checkTimeout(t + S) || this.checkDeath());
}
```

- **Tie-break rules:** whichever event happens first in time wins. When a hazard and the goal trigger in the same step, keep the current hazard-first rule, so the 150 levels' validated behavior doesn't change.
- **Queue side effects.** Haptics, audio and analytics should be queued and flushed after the loop, so the step stays pure and can run headless.
- **Optional:** a swept-capsule test (segment from the previous position to the current one) for hazards and goals, so grazes are judged continuously.

**Risks:** the triggers must stop the remaining steps, which the boolean return handles.

**Validation**
- Unit-test the predicates with TDD.
- Build a "graze corpus": scripted tangent paths at offsets r−1 through r−10 px must give the same outcome at every Hz.

---

## Q3. Driving timers and scheduled motion from simulation time

**Sources (all [SRC])**
- `Clock.js` L142, L358-382: `now` is the loop's wall time; events advance only when the scene is stepped.
- `SceneManager.update` L566: paused scenes are not stepped.
- `TweenManager.js` L178-200 and L643-670: tweens run on `Date.now()`, with `maxLag` 500 ms, `lagSkip` 33 ms, and a 240 Hz cap.
- `TimeStep.js` L444-514: losing focus clamps the delta; `resume()` calls `resetDelta()`, so `game.loop.time` jumps by the hidden duration.
- `Game.js` L590-633.
- `Body.setPosition` L547-567.
- `Resolver.js` L262-266: a static body's velocity, `position − positionPrev`, is used in the velocity solve.
- `InputManager`/`TouchManager` L258-281: touch events are dispatched directly from the DOM handler.

**Key findings**
- **Level timing runs on wall clocks.** The countdown, the par timer and the win time all use wall time:
  - `time` (the rAF timestamp), `game.loop.time`, and `this.time.now`.
  - `winTimeMs` even mixes two of these bases.
  - Settings overlays, backgrounding and ads all eat into the player's time.
- **Beams (`Hazard.pulse(time)`) and drifting goals** are functions of the absolute rAF timestamp, so their phase is random on every attempt.
- **Tweens are out of step with physics.**
  - They don't advance while the scene is paused. On resume they jump by the whole gap if it was under 500 ms, otherwise by only 33 ms.
  - They also tick on frames where physics doesn't step, and at 30 fps they jump two steps' worth at once.
- **[SIM] `platform-push.cjs`: how a moving static platform pushes the ball.**
  - With `setPosition(updateVelocity=false)`, the current behavior, the ball is shoved but gets **no velocity** (vx 0.00).
  - With `true` it bounces off at vx 2.60 px/step.
  - But it gets 5.19 px/step when the platform moves only every second step, as a 30 fps tween does. So platform motion must be advanced every step.

**Recommendation [OPN]**
- **One gameplay clock.** `simMs`, the sum of executed steps, is the only clock gameplay uses.
- **Pure motion functions instead of tweens:**
  - `pingPong(simMs, dur)` with Sine-in-out (`0.5−0.5cos(πt)`; check against Phaser's ease)
  - `orbit(simMs)`
  - `beamActive(simMs + phaseMs)`
- **When to apply them:** before `world.step`, using `Body.setPosition(body, p, PLATFORM_IMPART_VELOCITY)`.
  - Default it to `false` for parity with the current behavior.
  - Try `true` per level behind a flag, since it changes the feel.
- **Rendering:** draw kinematic objects at `f(simMs + alpha·S)`.
- **Tweens:** use them only for UI and juice.
- **Timers and stars:** compute the timeout, par chip, stars and best time from `simMs`.
- **Pausing:**
  - Auto-pause into the pause overlay on `game.events` `'hidden'`/`'blur'` and on the ad SDK's show/dismiss callbacks.
  - Paused scenes don't step, so `simMs` freezes automatically.
- **Input:** latch it once per step, because Phaser dispatches input from DOM handlers between steps.

**Risks**
- Personal-best ghosts are timestamped in wall time; convert them or reset them.
- Old best times included paused time. They can only be worse than what's achievable now, so they're safe to keep.

**Validation**
- Open Settings for 10 s mid-level: the timer must change by at most one step.
- Hide the app for 30 s: no time loss.
- Restart a beam level 20 times: the beam state at a given `simMs` must be identical every time.
- The platform position at step k must be identical at every Hz.

---

## Q4. Determinism, replays and a headless QA bot

**Sources**
- [DOC] Matter 0.20 release notes: "fixed deterministic timestep".
- [COM] matter-js #1167 (2022): `applyForce` trajectories vary when forces aren't step-aligned; closed with the "docs" label. https://github.com/liabru/matter-js/issues/1167
- [DOC] ECMA-262 §21.3.2: transcendental Math functions are implementation-approximated. https://tc39.es/ecma262/#sec-function-properties-of-the-math-object
- [COM] V8's fdlibm port. https://chromium.googlesource.com/chromium/src/+/refs/tags/93.0.4577.129/third_party/fdlibm/ieee754.h
- [COM] phaser-on-nodejs, which runs full Phaser with jsdom. https://www.jsdelivr.com/package/npm/@geckos.io/phaser-on-nodejs

**Key findings**
- **[SIM] Same inputs give the same result.** 300 fixed steps with identical inputs produced **bit-identical** results across runs.
- **[SRC][SIM] It runs in plain Node.** Phaser's `physics/matter-js/lib` is self-contained CommonJS (only the plugins require Phaser), so it loads in Node with no jsdom.
- **[SRC] What Matter's determinism depends on.** Matter is deterministic given the same body creation order (`Detector` sorts by `bounds.min.x` with a stable sort), a fixed `delta`, and the same `timeScale`. Its seeded `Common.random` isn't used during a step.
- **What currently breaks determinism in Gravity Flow:**
  - forces and DOM input that aren't aligned to steps
  - motion driven by wall time
  - `Date.now` tweens
  - checks done per render frame
- **What could break it in future:**
  - a variable `delta`
  - reordering body creation
  - JavaScript-engine differences: V8 (Android/Node) vs JavaScriptCore (iOS). This is [OPN]: fine for Android plus a Node QA bot, but not a cross-platform guarantee.
- Endless/Weekly is already seeded.

**Recommendation [OPN]**
- **Extract a sim module.** Move the simulation into `src/sim/LevelSim.ts`, free of the DOM and Phaser:
  - It builds bodies from `LevelConfig` with identical `Bodies` options (circles default to 25 sides).
  - It exposes `step(input)` and returns events.
  - `GameScene` renders it.
- **Record per-step input** as run-length-encoded `{on, x, y}`. That gives exact replays and a regression solution file for each of the 150 levels. Keep the position-sampled ghosts for display.
- **Add a QA bot** in Node/Vitest at roughly 10–50k steps/s.
  - It searches over attractor waypoints every 250 ms to prove each level is solvable and that par is achievable.
  - CI fails if a stored solution stops winning, or stops beating par, after a tuning change.

**Validation:** record a run in the browser at 60 and 120 Hz, replay it in Node, and require the same final state hash, outcome and `simMs`.

---

## Q5. High refresh rates on Android

**Sources**
- [DOC] MDN: rAF frequency "will generally match the display refresh rate"; it's paused in background tabs and hidden iframes. https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- [DOC] Android Frame Rate guide (updated 2026-10-01): the platform decides the refresh rate, `setFrameRate()` isn't guaranteed, and battery saver may restrict the refresh rate. https://developer.android.com/media/optimize/performance/frame-rate
- [DOC] Android high refresh rate blog (2020). https://android-developers.googleblog.com/2020/04/high-refresh-rate-rendering-on-android.html
- [DOC] Chrome Energy Saver lowers the display refresh rate (2022; platform not stated). https://developer.chrome.com/blog/memory-and-energy-saver-mode
- [COM] A Capacitor + Phaser game on Samsung ran at 120 fps and heated the device; overriding with WindowManager failed (Samsung "recommended priority"). https://forum.ionicframework.com/t/setting-refresh-rate/247570
- [COM] The Cromite fork has a "Throttle frame rate to 60hz" flag. That's fork-specific, so don't generalize from it. https://github.com/uazo/cromite/issues/2572

**Key findings**
- WebView rAF follows the window's refresh rate, which Android chooses. OEM adaptive or touch-boost modes can switch between 60 and 120 Hz mid-session; that's [OPN] and needs checking on devices.
- Battery saver caps the rate.
- In the background rAF stops and `visibilitychange` fires.
- I found **no authoritative Google statement on System WebView's high-refresh defaults**, so this has to be measured.

**Implications**
- Expect 60, 90, 120 and 144 Hz, plus switches between them. The runner's smoothing lags for more than 1.5 s after a switch (Q1).
- 120 Hz doubles GPU cost and battery use.

**Recommendation [OPN]**
- Make the simulation independent of refresh rate (Q1) and keep rendering cheap (Q6).
- Optionally add a "60 fps battery" setting: a tiny Capacitor plugin that sets the window's preferred display mode or refresh rate. Treat it as best effort, since OEMs may override it.
- Never use `fps.limit`.

**Validation:** use the debug overlay (rAF histogram, steps/frame, `actualFps`) on:
- a Pixel at 90/120 Hz
- a Samsung A-series at 120 Hz, in both Adaptive and Standard modes
- battery saver on and off
- a 60 Hz low-end phone

Also test a hold/release rhythm to catch refresh switches triggered by touch.

---

## Q6. Bloom: how it works, why it darkens, and a cheaper neon look

**Sources (all [SRC])**
- `BloomFXPipeline.onDraw`: copy, then `steps`×(horizontal and vertical blur), then `blendFrames(orig, blur, …, strength)`.
- `UtilityPipeline.blendFrames` defaults to `LinearBlend.frag`, which computes `mix(frame1, frame2*uStrength, 0.5)`.
- `AddBlend` (`frame1 + frame2*uStrength`) exists but bloom doesn't use it.
- `FXBloom.frag`: the center tap's weight is `0.204164·blurStrength`.
- PostFX render targets are full `renderer.width×height` (`WebGLPipeline` L489-525) and are drawn full-viewport (`bindAndDraw`).
- Glow quality is compiled into the shader as `SIZE = 1/quality/distance`.
- [DOC] Phaser FX docs: preFX works only on texture-based objects; postFX works on all objects and cameras. https://docs.phaser.io/phaser/concepts/fx

**Key findings**
- **[SRC][SIM] It's a crossfade, not additive bloom, and it has no brightness threshold.**
  - Output = 0.5·original + 0.5·strength·blur.
  - Each blur pass multiplies brightness by 0.9796 at `blurStrength` 0.9. Over 8 passes that's 0.848.
  - `bloom-response.cjs` with the current FX settings:

  | Content | Result (1.0 = unchanged) |
  |---|---|
  | Flat areas | 0.776 (−22%) |
  | 16 px shapes | 0.72 |
  | 3 px neon line | 0.55 |
  | 1–2 px lines | **0.52 (−48%)** |
  | Halo at +4 px | only 1–6% |

  - Getting back to the original brightness needs `strength` around 1.18 for flat areas, but 6–15 for thin strokes.
- **[OPN, worked out] Cost per frame at 390×844:**
  - **Camera bloom:** about 11 full-frame passes, about 14.5M texel fetches.
  - **Vignette:** another camera render-target copy.
  - **Ball postFX glow: the most expensive effect.** It uses a full-frame render target and 8×12 = **96 taps per pixel**, about 32M fetches for one 16 px ball.
  - All of this doubles at 120 Hz.
- **The HUD is on the main camera,** so bloom dims HUD text (hurting the 4.5:1 contrast target), and shake and zoom-punch move it.

**Recommendation [OPN]**
1. **Remove the camera bloom and the ball's postFX glow.** Use additive glow sprites instead (the `'glow'` texture with `BlendModes.ADD`, as `Hazard` already does): one batched quad per glowing object.
2. **Neon look:** a crisp core stroke plus 1–2 wider low-alpha strokes. Bake static layers (walls, rails, obstacles) once per level into a `RenderTexture`, so they cost one quad per frame.
3. **Vignette:** replace it with a pre-rendered gradient image, so the camera has **no postFX at all**.
4. **Celebration "bloom boost":** replace it with an additive full-screen flash image plus alpha/scale tweens on the glow sprites.
5. **HUD:** move it to a parallel `HudScene` (`scene.launch`), so it's immune to camera FX, shake and zoom. A fallback is Layers plus a second camera using `ignore(layer)`.
6. **Don't write a custom v3 pipeline,** because Phaser 4 removes the pipeline system.

**Budget, for a low-end device at 390×844**
- 0 full-screen post passes
- ≤1.5 MP of overdraw per frame
- ≤40 draw calls
- ≤40 additive glow quads
- <50 particles
- Cache `Hazard.draw`'s static geometry instead of rebuilding it every frame.
- Frame time: ≤8 ms on mid-tier at 120 Hz, ≤14 ms on low-tier at 60 Hz.

**Risks**
- It's a visible look change, so it needs art sign-off.
- The FPS watchdog only guards bloom and would need rethinking.

**Validation**
- `readPixels` luminance check: the core of a 2 px line must stay at least as bright as the original, and the +4 px halo must be at least 15%.
- On a low-end reference device, compare GPU frame time in remote DevTools before and after.
- Run a 60 s scripted boss level and record `actualFps` at 60 and 120 Hz.
- Run a 10-minute thermal and battery soak.

---

## Q7. Phaser 3.90 vs Phaser 4 (Oct 2026)

**Sources**
- [DOC] Stable release is v4.2.1 "Giedi" (2026-07-09). https://phaser.io/download/stable
- [DOC] v4.0.0 shipped 2026-04-10. https://gamedev.net/news/2759-phaser-4-released/
- [DOC] The latest Phaser 3 is v3.90.0 (2025-05-23). https://phaser.io/download/phaser3
- [DOC] Migration guide: FX and masks become Filters, the v3 pipeline system is removed, `roundPixels` now defaults to false, and Canvas is deprecated. Physics isn't covered. https://unpkg.com/phaser@4.2.1/changelog/v4/4.0/MIGRATION-GUIDE.md
- [DOC] "Phaser 3 vs Phaser 4" (2026-05-13). https://phaser.io/news/2026/05/phaser-3-vs-phaser-4
- I found no published end-of-life notice for Phaser 3.

**Recommendation [OPN]**
- **Don't migrate before the Play launch.**
- **Do the stepper and sim refactor now.** It's pure Matter plus your own loop, so it carries over to v4 unchanged.
- **Prefer visuals that don't depend on the renderer** (baked additive glow sprites). That makes a later v4 port mostly API renames.
- **Evaluate v4 after launch,** in a branch gated by the headless QA bot (Q4).

---

*Limits of this research*
- The session's web-search budget ran out near the end. The preFX vs postFX cost is backed by source and docs only, not a published benchmark.
- System WebView's high-refresh defaults need on-device measurement.
