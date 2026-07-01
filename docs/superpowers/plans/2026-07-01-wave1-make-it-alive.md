# Wave 1 — "Make it Alive" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Physics/level-feel/visual-polish is **playtested in-browser, not unit-tested** (CLAUDE.md Skill Usage Rules);
> only the extracted **pure logic** modules are TDD'd. Every visual/motion task must pass the **ui-ux-pro-max
> design lens** (below) before it is called done.

**Goal:** Make Gravity Flow's moment-to-moment gameplay feel premium, reactive, and alive — a living per-world
background, an attractor that reads as a real gravitational force, an elevated ball/goal, tiered win
celebrations, and a screen-space bloom/vignette pipeline — all inside the existing architecture and perf ceiling.

**Architecture:** Additive only. Each feature extracts its *pure decision logic* into a small TDD'd
`src/utils/*.ts` module and its *tuning constants* into a new `src/config/fx.config.ts` (mirroring
`splash.config.ts`), then wires the visual layer into the existing `CosmicBackground` / `Attractor` / `Goal` /
`Ball` entities and `GameScene`. All screen-space post-FX uses **Phaser's native WebGL FX pipeline**
(`camera.postFX.addBloom` / `addVignette`) — zero new dependencies — gated behind a capability + reduced-motion
+ FPS-watchdog check with a graceful Canvas/low-end fallback. No new managers. The attractor force formula is
untouched.

**Tech Stack:** Phaser 3.80 (WebGL via `Phaser.AUTO`) · TypeScript strict · Vite 5 · Vitest. No new runtime deps.

---

## Global Constraints

Every task's requirements implicitly include this section. Values copied verbatim from the engagement brief +
CLAUDE.md.

- **NEVER change the attractor force formula.** Inverse-square (`force = dir · STRENGTH / dist²`) is deliberate.
  Wave 1 is visual/feel only — it must not touch `applyAttractorForce`'s math.
- **All constants live in config files** (`physics.config.ts`, `theme.config.ts`, `splash.config.ts`, and the new
  `fx.config.ts`). Never type a raw number in entity/scene code.
- **Performance ceiling is sacred:** **< 20 physics bodies** and **< 50 active particles** simultaneously; hold
  **60fps on a mid-range Android**. Prefer shaders / TileSprites / pooled vector tweens over particle spam. Comets
  are pooled vector Graphics, **not** particles. Bloom uses low `steps`.
- **WebGL-gated + graceful fallback:** post-FX only runs when `renderer.type === Phaser.WEBGL`. On Canvas, reduced-
  motion, or a sustained-low-FPS device, the game renders identically minus the bloom (no crash, no empty frame).
- **Honor `reducedMotionActive()`** (`src/utils/a11y.ts`) for **every** motion added — it already unifies the OS
  `prefers-reduced-motion` and the in-app toggle.
- **Quality gates hold at every commit:** `npx tsc --noEmit` clean · `npm test` green (**103 tests today — add,
  never regress**) · `npm run build` clean · game boots in Playwright (`--disable-gpu --use-gl=swiftshader`) with
  **zero console errors**.
- **Stay lean.** Procedural vector aesthetic + one logo PNG + self-hosted fonts; AAB ~11.4MB. **No new asset or
  dependency** is added in Wave 1 (see Tooling Decision).
- **Web-safe:** do not import any native plugin outside the existing `isNativePlatform()`-guarded seams.

---

## Animation / "Living" Tooling Decision (required trade-off note)

The user asked about **Spline**. Honest recommendation, with build-size costs:

| Tool | Runtime cost (gz) | Fit for Gravity Flow | Verdict for Wave 1 |
|---|---|---|---|
| **Phaser-native procedural** (WebGL post-FX pipelines, additive glows, TileSprite parallax, pooled tweens) | **0 new deps** | Perfect — cohesive with the all-procedural look, already how the game is built, respects the perf ceiling | ✅ **Use for 100% of Wave 1** |
| **Rive** (`@rive-app/canvas`) | ~120–160 KB (wasm+js); `.riv` files a few KB | Good for *interactive, state-machine* vector — a living menu hero or a reactive 3★/boss set-piece | ⏸️ **Deferred, user-gated.** Only if procedural can't hit the feel after playtest |
| **Lottie** (`lottie-web`) | ~60–70 KB; JSON can balloon with complexity | OK for a *one-shot* celebration/onboarding flourish if Rive is overkill | ⏸️ **Deferred, user-gated.** Lower priority than Rive |
| **Spline** (`@splinetool/runtime` + Three.js) | **~600 KB+** (Three) + runtime | Exports **3D** (Three.js) — does **not** composite cleanly into the 2D Phaser/Matter canvas, bloats the lean build, clashes with the cohesive procedural look | ❌ **Rejected for the gameplay canvas.** Sole acceptable use (only if you later want it): an optional, lazy-loaded decorative 3D layer *behind* the Phaser canvas on menu/splash — off the critical path, weighed against build size. **Not in Wave 1.** |

**Recommendation:** Build all of Wave 1 with Phaser-native procedural FX (zero bytes added). This alone will make
the game read premium. **After** the Wave 1 playtest, if the 3★/boss climax still feels flat, the single
highest-value dependency to consider is a **tiny Rive hero** for that one moment — see **Task 5, Decision D1**,
which is flagged for your explicit approval and will not be added unilaterally.

---

## Rendering & Performance Feasibility (findings that shaped this plan)

- **Renderer:** `main.ts` uses `type: Phaser.AUTO` → **WebGL** on essentially all launch-target devices. Phaser
  3.80's post-FX pipeline (`camera.postFX.addBloom`, `.addVignette`; object `preFX.addGlow`) is therefore
  available **with no new dependency**. It is WebGL-only, so every call is guarded (`renderer.type === Phaser.WEBGL`).
- **Biggest perf risk = full-screen bloom** (a framebuffer pass) on mid-range Android. Mitigations baked into
  Task 1: low `BLOOM_STEPS` (4), modest base strength, and an **FPS watchdog** (`shouldDowngradeFx`) that disables
  bloom if `game.loop.actualFps` stays below threshold for ~3s. Reduced-motion and Canvas skip it entirely.
- **Adaptive per-world audio already exists** (`AudioSynth.startWorldTheme(worldId, isBoss)`,
  `playGoalCapture`, `playStarTone`, `playBossClear`) — Wave 1 celebration **coordinates** with these hooks; it
  does not add audio.
- **Celebration tiering is currently inline** in `GameScene.triggerWin` (boss vs 3★ vs default, three haptic
  patterns, a `celebrationFlash` only on 3★/boss). Task 5 extracts it to a pure, tested `celebration.ts` and adds
  the missing **2★ "great"** beat so the ladder reads 1★→2★→3★→boss.
- **Doc note (non-blocking):** CLAUDE.md says "Phaser 3.90"; `package.json` pins `^3.80.1` and status docs say
  3.80. The post-FX API is identical across 3.60–3.90, so this does not affect the plan. Executor should confirm
  the exact `addBloom` signature against the installed version before wiring (defensive only).

---

## Design Lens (ui-ux-pro-max — applied to every visual/motion task)

Each task below ends by passing this checklist (from the ui-ux-pro-max skill, adapted to a Phaser canvas game):

- **Motion conveys meaning** — every new animation expresses a cause→effect (press→pulse, hold→charge,
  win→celebrate), never decoration-only.
- **Timing tokens** — micro-interactions **150–300ms**, complex transitions **≤400ms**; **exit ~60–70% of enter**;
  **ease-out entering / ease-in exiting**; reuse `THEME.EASE*` tokens for one global rhythm (`motion-consistency`).
- **Interruptible & non-blocking** — a new press/tap cancels or supersedes an in-progress flourish; input is never
  locked by an animation.
- **Reduced-motion** — `reducedMotionActive()` gives a calm, still, or minimal-alpha variant for **every** effect.
- **Performance** — transform/alpha only; **<16ms/frame**; pooled objects, no per-frame allocation, no layout thrash.
- **Contrast & safe-area** — HUD/overlay text stays **≥4.5:1** (large glyphs ≥3:1) over the now-brighter background;
  bloom must not wash out the countdown/par chip or push contrast below AA; respect safe-area insets.
- **Touch** — any interactive element added stays **≥44×44px** with press feedback within ~100ms (mostly N/A in
  Wave 1, which is feedback-not-controls, but enforced if a button is touched).
- **Haptics** — confirmations only, scaled by tier; never overused.

---

## File Structure

**Create:**
- `src/config/fx.config.ts` — all Wave 1 tuning constants (bloom, vignette, comets, nebula pulse, attractor charge,
  goal shimmer, per-tier celebration specs). Mirrors `splash.config.ts`.
- `src/utils/fx.ts` — pure FX gating: `fxCapable`, `shouldDowngradeFx`. TDD.
- `src/utils/fx.test.ts` — tests for the above.
- `src/utils/attractorCharge.ts` — pure: `chargeLevel(holdMs, fullMs)` (smoothstep). TDD.
- `src/utils/attractorCharge.test.ts`
- `src/utils/comets.ts` — pure comet scheduler: `dueForComet`, `cometProgress`, `pickCometPath(rng,…)`. TDD.
- `src/utils/comets.test.ts`
- `src/utils/celebration.ts` — pure: `celebrationTier(stars,isBoss)`, `celebrationSpec(tier)`. TDD.
- `src/utils/celebration.test.ts`

**Modify:**
- `src/entities/CosmicBackground.ts` — add reactive nebula `pulse()`, a pooled comet layer, depth parallax.
- `src/entities/Attractor.ts` — escalating energy tendrils + lensing ring driven by charge level (`setCharge`).
- `src/entities/Goal.ts` — elevate near-field magnetism shimmer (reuse existing `near` term).
- `src/entities/Ball.ts` — optional WebGL `preFX.addGlow` on the ball body (gated), trail polish.
- `src/scenes/GameScene.ts` — wire post-FX pipeline + watchdog; track attractor hold time; pulse background on
  press; drive `triggerWin` from `celebrationSpec`; feed goal shimmer.
- `src/utils/matter.ts` — **no change expected** (no new physics).

**Reuse (do not duplicate):** `mulberry32` (in `src/utils/endless.ts`) as the injectable RNG for comets;
`reducedMotionActive()` (`a11y.ts`); `THEME.EASE*` tokens; existing `celebrationFlash`/`winFlash`/`emitGoalBurst`.

---

### Task 1: FX Foundation — post-FX pipeline + capability/FPS gating

**Files:**
- Create: `src/config/fx.config.ts`, `src/utils/fx.ts`, `src/utils/fx.test.ts`
- Modify: `src/scenes/GameScene.ts` (`create()` end, `update()` head, add `fxSamples` field + `applyScenePostFX`)

**Interfaces:**
- Produces: `FX` const object; `fxCapable(rendererType: number): boolean`;
  `shouldDowngradeFx(samples: number[], threshold?: number, minSamples?: number): boolean`.
- Consumes: `Phaser.WEBGL`, `this.cameras.main.postFX`, `this.game.renderer.type`, `this.game.loop.actualFps`.

- [ ] **Step 1: Write the failing tests** — `src/utils/fx.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import Phaser from 'phaser';
import { fxCapable, shouldDowngradeFx } from './fx';

describe('fxCapable', () => {
  it('is true only under WebGL', () => {
    expect(fxCapable(Phaser.WEBGL)).toBe(true);
    expect(fxCapable(Phaser.CANVAS)).toBe(false);
  });
});

describe('shouldDowngradeFx', () => {
  it('does not downgrade before enough samples exist', () => {
    expect(shouldDowngradeFx([30, 30, 30], 50, 180)).toBe(false);
  });
  it('downgrades when a full window averages below the threshold', () => {
    const slow = new Array(180).fill(40);
    expect(shouldDowngradeFx(slow, 50, 180)).toBe(true);
  });
  it('keeps FX when a full window averages at/above the threshold', () => {
    const ok = new Array(180).fill(58);
    expect(shouldDowngradeFx(ok, 50, 180)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npx vitest run src/utils/fx.test.ts`
Expected: FAIL — "Cannot find module './fx'".

- [ ] **Step 3: Create the config** — `src/config/fx.config.ts`

```ts
// Wave 1 "Make it Alive" tuning surface. Mirrors splash.config.ts — never type
// these numbers inline in an entity or scene. Colors reuse PHYSICS.COLOR_* so the
// living FX share the one palette.
import { PHYSICS } from './physics.config';

export const FX = {
  // ── Screen-space post-FX (WebGL only; skipped on Canvas / reduced-motion / low FPS) ──
  BLOOM_COLOR: 0xffffff,
  BLOOM_OFFSET: 0.8,       // sample offset — soft, wide glow
  BLOOM_BLUR_STRENGTH: 0.9,
  BLOOM_STRENGTH: 0.65,    // ambient base bloom (premium sheen, not a wash-out)
  BLOOM_STEPS: 4,          // KEEP LOW — each step is a GPU pass; 4 is the mid-range budget
  VIGNETTE_RADIUS: 0.82,
  VIGNETTE_STRENGTH: 0.32, // gentle edge darkening focuses the eye on play
  FPS_DOWNGRADE_THRESHOLD: 50, // sustained fps below this disables bloom
  FPS_DOWNGRADE_WINDOW: 180,   // ~3s at 60fps
} as const;

export type FxConst = typeof FX;
export { PHYSICS as _PHYSICS_REF }; // (kept for symmetry; remove if unused by build)
```

> Note: drop the `_PHYSICS_REF` re-export if `tsc`'s `noUnusedLocals` flags it — it is a placeholder to signal the
> palette source; later tasks add real `PHYSICS`-derived colors here (comets, tendrils).

- [ ] **Step 4: Implement** — `src/utils/fx.ts`

```ts
// Pure FX gating. No Phaser side effects — just decisions the scene acts on.
import Phaser from 'phaser';

// Post-FX (bloom/vignette) requires the WebGL renderer.
export function fxCapable(rendererType: number): boolean {
  return rendererType === Phaser.WEBGL;
}

// True once a full window of fps samples averages below the threshold — the
// scene then tears down bloom so a weak GPU still holds framerate.
export function shouldDowngradeFx(
  samples: number[],
  threshold = 50,
  minSamples = 180,
): boolean {
  if (samples.length < minSamples) return false;
  const window = samples.slice(-minSamples);
  const avg = window.reduce((a, b) => a + b, 0) / window.length;
  return avg < threshold;
}
```

- [ ] **Step 5: Run the tests, verify they pass**

Run: `npx vitest run src/utils/fx.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Wire the pipeline into `GameScene`** (guarded, reduced-motion aware, with the watchdog)

Add a field near the other private fields: `private fxSamples: number[] = [];` and
`private bloomFx?: Phaser.FX.Bloom;`. At the **end of `create()`** call `this.applyScenePostFX();`. Add:

```ts
// Screen-space premium pass: subtle global bloom + vignette. WebGL-only; skipped
// under reduced-motion; auto-removed by the FPS watchdog on weak GPUs. Never a
// gameplay dependency — the scene renders identically without it.
private applyScenePostFX(): void {
  this.fxSamples = [];
  const cam = this.cameras.main;
  const capable = fxCapable(this.game.renderer.type) && !!cam.postFX;
  if (!capable) return;
  // Vignette is cheap — keep it even under reduced-motion for focus/depth.
  cam.postFX.addVignette(0.5, 0.5, FX.VIGNETTE_RADIUS, FX.VIGNETTE_STRENGTH);
  if (reducedMotionActive()) return; // motion-sensitive users: no bloom bloom-in
  this.bloomFx = cam.postFX.addBloom(
    FX.BLOOM_COLOR, FX.BLOOM_OFFSET, FX.BLOOM_OFFSET,
    FX.BLOOM_BLUR_STRENGTH, FX.BLOOM_STRENGTH, FX.BLOOM_STEPS,
  );
}

// Called each frame from update() — samples fps and tears down bloom if the
// device can't sustain it. Only samples while bloom is live.
private watchdogFx(): void {
  if (!this.bloomFx) return;
  this.fxSamples.push(this.game.loop.actualFps);
  if (shouldDowngradeFx(this.fxSamples, FX.FPS_DOWNGRADE_THRESHOLD, FX.FPS_DOWNGRADE_WINDOW)) {
    this.cameras.main.postFX.remove(this.bloomFx);
    this.bloomFx = undefined;
  }
}
```

Add imports at the top of `GameScene.ts`: `import { FX } from '../config/fx.config';` and
`import { fxCapable, shouldDowngradeFx } from '../utils/fx';` (`reducedMotionActive` is already imported).
In `update()`, after `this.cosmic.update();`, add `this.watchdogFx();`.

- [ ] **Step 7: Verify build + boot**

Run: `npx tsc --noEmit` → clean.
Run: `npm run build` → clean (confirms `fx.config` bundles; native plugins still absent).
Boot `npm run dev` + Playwright (`--disable-gpu --use-gl=swiftshader`): load `/`, play into a level, confirm
**zero console errors** and the field reads subtly brighter/deeper. Under swiftshader (software WebGL) confirm no
crash. Toggle Reduce-Motion ON in settings → reload a level → confirm bloom is absent, vignette present, no errors.

- [ ] **Step 8: Design-lens pass + commit**

Verify: countdown chip, par chip, HUD level label, and win overlay text remain **≥4.5:1** over the brighter
background (bloom must not wash them out — if it does, lower `BLOOM_STRENGTH`). Confirm interruptible/no input
lock (bloom is passive). Then:

```bash
git add src/config/fx.config.ts src/utils/fx.ts src/utils/fx.test.ts src/scenes/GameScene.ts
git commit -m "feat(fx): WebGL bloom+vignette pipeline with reduced-motion + FPS-watchdog fallback"
```

---

### Task 2: Living Background — comets, depth parallax, reactive nebula pulse

**Files:**
- Create: `src/utils/comets.ts`, `src/utils/comets.test.ts`
- Modify: `src/config/fx.config.ts` (add comet + nebula-pulse block), `src/entities/CosmicBackground.ts`,
  `src/scenes/GameScene.ts` (pulse the background on attractor press)

**Interfaces:**
- Produces: `interface CometPath { x0:number; y0:number; x1:number; y1:number; lifeMs:number }`;
  `dueForComet(lastSpawnMs:number, nowMs:number, gapMs:number): boolean`;
  `cometProgress(bornMs:number, nowMs:number, lifeMs:number): number` (clamped 0..1);
  `pickCometPath(rng:()=>number, width:number, height:number, minLifeMs:number, maxLifeMs:number): CometPath`;
  `CosmicBackground.pulse(strength01:number): void`.
- Consumes: `mulberry32` from `src/utils/endless.ts` (injectable RNG — deterministic + testable).

- [ ] **Step 1: Write the failing tests** — `src/utils/comets.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { dueForComet, cometProgress, pickCometPath } from './comets';
import { mulberry32 } from './endless';

describe('dueForComet', () => {
  it('is false before the gap elapses', () => {
    expect(dueForComet(1000, 1000 + 3000, 4200)).toBe(false);
  });
  it('is true once the gap elapses', () => {
    expect(dueForComet(1000, 1000 + 4200, 4200)).toBe(true);
  });
});

describe('cometProgress', () => {
  it('clamps to 0..1 across its life', () => {
    expect(cometProgress(0, -10, 1000)).toBe(0);
    expect(cometProgress(0, 500, 1000)).toBeCloseTo(0.5, 5);
    expect(cometProgress(0, 5000, 1000)).toBe(1);
  });
});

describe('pickCometPath', () => {
  it('is deterministic for a given seed and stays on-screen at the start', () => {
    const a = pickCometPath(mulberry32(7), 390, 844, 900, 1600);
    const b = pickCometPath(mulberry32(7), 390, 844, 900, 1600);
    expect(a).toEqual(b);
    expect(a.lifeMs).toBeGreaterThanOrEqual(900);
    expect(a.lifeMs).toBeLessThanOrEqual(1600);
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npx vitest run src/utils/comets.test.ts`
Expected: FAIL — "Cannot find module './comets'".

- [ ] **Step 3: Implement** — `src/utils/comets.ts`

```ts
// Pure scheduler + path math for drifting comets / shooting stars. The entity owns
// the pooled Graphics; this module owns the "when" and "where" so it is testable
// and deterministic (RNG injected). Comets are cheap vector strokes — NOT particles.
export interface CometPath {
  x0: number; y0: number; x1: number; y1: number; lifeMs: number;
}

export function dueForComet(lastSpawnMs: number, nowMs: number, gapMs: number): boolean {
  return nowMs - lastSpawnMs >= gapMs;
}

export function cometProgress(bornMs: number, nowMs: number, lifeMs: number): number {
  if (lifeMs <= 0) return 1;
  const t = (nowMs - bornMs) / lifeMs;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

// A diagonal streak entering from the top/side and exiting the opposite edge.
export function pickCometPath(
  rng: () => number, width: number, height: number, minLifeMs: number, maxLifeMs: number,
): CometPath {
  const fromLeft = rng() < 0.5;
  const x0 = fromLeft ? -40 : width + 40;
  const y0 = rng() * height * 0.5;                 // upper half
  const x1 = fromLeft ? width + 40 : -40;
  const y1 = y0 + height * (0.4 + rng() * 0.4);    // always drifts downward
  const lifeMs = minLifeMs + rng() * (maxLifeMs - minLifeMs);
  return { x0, y0, x1, y1, lifeMs };
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run src/utils/comets.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Add the config block** — append to `src/config/fx.config.ts` `FX` object

```ts
  // ── Living background ──
  COMET_MIN_GAP_MS: 4200,   // quiet cadence — an occasional event, never busy
  COMET_MAX_GAP_MS: 9000,
  COMET_MIN_LIFE_MS: 900,
  COMET_MAX_LIFE_MS: 1600,
  COMET_MAX_ACTIVE: 2,      // hard cap (cheap + calm)
  COMET_HEAD_R: 2.4,
  COMET_TAIL_LEN: 60,
  COMET_ALPHA: 0.5,
  COMET_TINT: PHYSICS.COLOR_BALL,   // pale star-white; per-world tint applied in entity
  NEBULA_PULSE_GAIN: 0.5,   // extra nebula alpha multiplier at a full press-pulse
  NEBULA_PULSE_MS: 520,     // decay time of one pulse (ease-out)
```

- [ ] **Step 6: Evolve `CosmicBackground.ts`** (comet pool + reactive pulse + deeper parallax)

Add fields: a pooled comet layer (one `Graphics` at depth `-88`, `setBlendMode(ADD)`), `cometLastMs`,
`activeComets: Array<{ path: CometPath; bornMs: number }>`, `pulseT` (0..1 decaying), and an injected
`rng = mulberry32(seedFromScene)` (use a fixed seed constant — RNG must not use `Math.random` per harness rules;
a constant seed is fine, comets vary by elapsed time). Then:

- In `update()`: advance `elapsed`; if `activeComets.length < FX.COMET_MAX_ACTIVE` and
  `dueForComet(cometLastMs, elapsedMs, gap)` → push `pickCometPath(...)`, reset `cometLastMs`, re-roll `gap`
  in `[COMET_MIN_GAP_MS, COMET_MAX_GAP_MS]`. Redraw each active comet from its `cometProgress`; cull at `>=1`.
  Deepen parallax: keep far layer at `0.4×` and near at `1.0×` drift (already so) — add a **third** subtle
  motion by nudging `nebula` position by a tiny parallax factor of `pulseT`.
- Add `pulse(strength01: number): void { this.pulseT = Math.max(this.pulseT, clamp01(strength01)); }` and in
  `update()` decay `pulseT` toward 0 over `NEBULA_PULSE_MS`; fold `pulseT * FX.NEBULA_PULSE_GAIN` into the
  nebula alpha expression already in `update()`.
- Tint comets by `theme?.starTint ?? FX.COMET_TINT`.
- **Reduced-motion:** if `reducedMotionActive()`, do **not** spawn comets and treat `pulse()` as a no-op (keep
  the existing calm drift). Import `reducedMotionActive` from `../utils/a11y`.
- `destroy()` must also destroy the comet Graphics.

Reference draw for one comet (inside the redraw loop):

```ts
const p = cometProgress(c.bornMs, this.elapsedMs, c.path.lifeMs);
const hx = c.path.x0 + (c.path.x1 - c.path.x0) * p;
const hy = c.path.y0 + (c.path.y1 - c.path.y0) * p;
const a = Math.sin(p * Math.PI) * FX.COMET_ALPHA;          // fade in then out
const dx = c.path.x1 - c.path.x0, dy = c.path.y1 - c.path.y0;
const len = Math.hypot(dx, dy) || 1;
this.cometG.lineStyle(2, this.cometTint, a);
this.cometG.lineBetween(hx, hy, hx - (dx/len)*FX.COMET_TAIL_LEN, hy - (dy/len)*FX.COMET_TAIL_LEN);
this.cometG.fillStyle(this.cometTint, a);
this.cometG.fillCircle(hx, hy, FX.COMET_HEAD_R);
```

- [ ] **Step 7: Pulse the background on attractor press** — `GameScene.setupInput()`

In the `pointerdown` handler (after `this.attractor = new Attractor(...)`), add `this.cosmic.pulse(1);`. This is
the cause→effect the design lens wants: pressing to grab gravity visibly stirs the nebula.

- [ ] **Step 8: Verify + design-lens + commit**

Run: `npx tsc --noEmit`, `npx vitest run`, `npm run build` → all clean/green.
Playwright: play a level, hold ~10s, confirm ≤2 comets ever on screen, a comet reads as an occasional streak
(not a stream), and the nebula visibly swells on each press then settles. Confirm **no** added particles/bodies
(perf ceiling). Toggle Reduce-Motion → confirm comets stop and press-pulse is inert. Per-world: enter World 2
(cyan) vs World 4 (red) and confirm each reads as a distinct living place.

```bash
git add src/utils/comets.ts src/utils/comets.test.ts src/config/fx.config.ts src/entities/CosmicBackground.ts src/scenes/GameScene.ts
git commit -m "feat(bg): living cosmos — pooled comets, deeper parallax, press-reactive nebula (reduced-motion safe)"
```

---

### Task 3: Living Attractor — energy tendrils + lensing ring escalating with hold

**Files:**
- Create: `src/utils/attractorCharge.ts`, `src/utils/attractorCharge.test.ts`
- Modify: `src/config/fx.config.ts` (charge block), `src/entities/Attractor.ts`, `src/scenes/GameScene.ts`
  (track hold time; feed charge to the attractor each frame)

**Interfaces:**
- Produces: `chargeLevel(holdMs: number, fullMs: number): number` (smoothstep, clamped 0..1);
  `Attractor.setCharge(level01: number): void`.
- Consumes: `FX.CHARGE_FULL_MS`, `FX.TENDRIL_COUNT`, `FX.TENDRIL_ALPHA`, `FX.LENS_RING_ALPHA`.

- [ ] **Step 1: Write the failing tests** — `src/utils/attractorCharge.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { chargeLevel } from './attractorCharge';

describe('chargeLevel', () => {
  it('is 0 at press and 1 at/after full charge', () => {
    expect(chargeLevel(0, 900)).toBe(0);
    expect(chargeLevel(900, 900)).toBe(1);
    expect(chargeLevel(5000, 900)).toBe(1);
  });
  it('is monotonic and eased (smoothstep passes through 0.5 at the midpoint)', () => {
    expect(chargeLevel(450, 900)).toBeCloseTo(0.5, 5);
    expect(chargeLevel(225, 900)).toBeLessThan(chargeLevel(450, 900));
  });
  it('treats a non-positive window as instantly full', () => {
    expect(chargeLevel(0, 0)).toBe(1);
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npx vitest run src/utils/attractorCharge.test.ts`
Expected: FAIL — "Cannot find module './attractorCharge'".

- [ ] **Step 3: Implement** — `src/utils/attractorCharge.ts`

```ts
// Hold duration → 0..1 "charge", eased with smoothstep. Drives ONLY the attractor's
// visual escalation (tendril count/alpha + lensing ring). It never touches the
// inverse-square force — the physics is unchanged.
export function chargeLevel(holdMs: number, fullMs: number): number {
  if (fullMs <= 0) return 1;
  const t = holdMs <= 0 ? 0 : holdMs >= fullMs ? 1 : holdMs / fullMs;
  return t * t * (3 - 2 * t); // smoothstep
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run src/utils/attractorCharge.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Add the config block** — append to `FX`

```ts
  // ── Living attractor (visual only — force formula untouched) ──
  CHARGE_FULL_MS: 900,      // hold this long → full visual charge
  TENDRIL_COUNT: 5,         // radial energy arcs at full charge
  TENDRIL_LEN: 22,          // px reach of a tendril beyond the core ring
  TENDRIL_ALPHA: 0.55,
  LENS_RING_ALPHA: 0.3,     // gravitational-lensing shimmer ring alpha at full charge
  LENS_RING_R: 46,
```

- [ ] **Step 6: Evolve `Attractor.ts`** — add `charge` state + escalating draw

Add `private charge = 0;` and:

```ts
setCharge(level01: number): void {
  this.charge = level01 < 0 ? 0 : level01 > 1 ? 1 : level01;
}
```

In `draw()`, after the existing core rings, add charge-driven layers (all additive-friendly vector, reusing
`PHYSICS.COLOR_ATTRACTOR_PULSE`):

```ts
const c = this.charge;
if (c > 0.01) {
  // Lensing shimmer — a faint ring that tightens + brightens with charge.
  this.graphics.lineStyle(1.5, PHYSICS.COLOR_ATTRACTOR_PULSE, FX.LENS_RING_ALPHA * c);
  this.graphics.strokeCircle(this.x, this.y, FX.LENS_RING_R - c * 8 + beat * 2);
  // Energy tendrils — short arcs spun around the core, count/alpha rise with charge.
  const live = Math.max(1, Math.round(FX.TENDRIL_COUNT * c));
  for (let i = 0; i < live; i++) {
    const ang = this.phase * 0.6 + (i / FX.TENDRIL_COUNT) * Math.PI * 2;
    const r0 = RING_RADIUS + 6, r1 = r0 + FX.TENDRIL_LEN * c;
    this.graphics.lineStyle(2, PHYSICS.COLOR_ATTRACTOR_PULSE, FX.TENDRIL_ALPHA * c);
    this.graphics.lineBetween(
      this.x + Math.cos(ang) * r0, this.y + Math.sin(ang) * r0,
      this.x + Math.cos(ang) * r1, this.y + Math.sin(ang) * r1,
    );
  }
}
```

Import `FX` in `Attractor.ts`. **Reduced-motion:** the tendril *spin* uses `this.phase` which is already driven
by `pulse()`; when reduced-motion is active the scene calls `pulse` with a static phase — acceptable. Guard the
tendril rendering so that under `reducedMotionActive()` the tendrils are drawn **static** (no spin) at a fixed
`0.6` charge cap for a calm, still glow (import `reducedMotionActive`, clamp `c = Math.min(c, 0.6)` and use a
fixed angle base instead of `this.phase`).

- [ ] **Step 7: Track hold time + feed charge** — `GameScene`

Add `private attractorDownMs = 0;`. In `setupInput()` `pointerdown`, set `this.attractorDownMs = this.game.loop.time;`.
In `update()`, where `this.attractor?.pulse(time / 150)` runs, add:

```ts
if (this.attractor) {
  this.attractor.setCharge(chargeLevel(this.game.loop.time - this.attractorDownMs, FX.CHARGE_FULL_MS));
}
```

Import `chargeLevel` from `../utils/attractorCharge`. (Pointerup already destroys the attractor, so charge
naturally resets on the next press.)

- [ ] **Step 8: Verify + design-lens + commit**

Run: `npx tsc --noEmit`, `npx vitest run`, `npm run build` → clean/green.
Playwright/manual: press and **hold** — confirm tendrils grow in count + reach and the lensing ring tightens over
~0.9s, reading as an escalating gravitational force (cause→effect: longer hold = more power). Confirm the ball's
motion is **unchanged** vs pre-Wave-1 (compare a known level's feel; the force math must be identical). Toggle
Reduce-Motion → tendrils are a calm static glow, no spin. Contrast: tendrils must not obscure the ball/goal.

```bash
git add src/utils/attractorCharge.ts src/utils/attractorCharge.test.ts src/config/fx.config.ts src/entities/Attractor.ts src/scenes/GameScene.ts
git commit -m "feat(attractor): escalating energy tendrils + lensing ring on hold (visual only; formula untouched)"
```

---

### Task 4: Ball & Goal — elevated comet trail glow + magnetic near-goal

**Files:**
- Modify: `src/config/fx.config.ts` (goal shimmer + ball glow block), `src/entities/Ball.ts`, `src/entities/Goal.ts`
- (No new pure module — this is visual polish on top of existing tested behavior. `Goal.near` already exists.)

**Interfaces:**
- Consumes: `Goal.pulse(phase, nearT)` (existing), `FX.GOAL_SHIMMER_GAIN`, `FX.BALL_GLOW_STRENGTH`.
- Produces: no new public API (internal draw changes only).

- [ ] **Step 1: Add the config block** — append to `FX`

```ts
  // ── Ball & goal polish ──
  BALL_GLOW_STRENGTH: 4,    // WebGL preFX glow outer strength on the ball body
  GOAL_SHIMMER_GAIN: 0.4,   // extra halo brightness as the ball closes in
  GOAL_SHIMMER_RINGS: 2,    // concentric "pull" rings that appear near the goal
```

- [ ] **Step 2: Ball body glow (WebGL-gated preFX)** — `Ball.ts` constructor

After `this.graphics = scene.add.graphics();`, add a gated glow so the star reads as a light source (not a flat
disc), respecting the perf/fallback rules:

```ts
// Premium light-source glow — WebGL only, off under reduced-motion. preFX is far
// cheaper than a particle halo and stays within the perf ceiling.
if (scene.game.renderer.type === Phaser.WEBGL && this.graphics.preFX && !reducedMotionActive()) {
  this.graphics.preFX.addGlow(this.glow, FX.BALL_GLOW_STRENGTH, 0, false, 0.1, 12);
}
```

Import `FX`. (`reducedMotionActive` and `Phaser` are already imported in `Ball.ts`.)

- [ ] **Step 3: Magnetic near-goal shimmer** — `Goal.ts` `draw()`

The goal already brightens via `near` (`n`). Elevate it into a "magnetic" read: when `n` is high, draw
`FX.GOAL_SHIMMER_RINGS` faint expanding rings pulling inward and lift the core glow by `n * FX.GOAL_SHIMMER_GAIN`.
Add inside `draw()` after the existing halo, gated on `n > 0.15`:

```ts
if (n > 0.15) {
  for (let i = 0; i < FX.GOAL_SHIMMER_RINGS; i++) {
    const rr = this.radius + 18 + i * 10 - n * 12;      // rings tighten as the ball nears
    this.graphics.lineStyle(1.5, PHYSICS.COLOR_GOAL, (n - 0.15) * 0.4);
    this.graphics.strokeCircle(this.x, this.y, rr);
  }
}
```

Bump the core fill alpha term from `0.15 + n * 0.2` to `0.15 + n * (0.2 + FX.GOAL_SHIMMER_GAIN)` so "home" glows
warmer as the payoff nears. Import `FX` in `Goal.ts`. Reduced-motion is fine here — these are proximity-driven,
not looping, and read as calm at rest.

- [ ] **Step 4: Verify + design-lens + commit**

Run: `npx tsc --noEmit`, `npx vitest run` (existing 103 + Wave 1 additions all green), `npm run build` → clean.
Playwright/manual: the ball reads as a glowing light source; steering it toward the goal, the goal visibly
"reaches" for it (shimmer rings tighten, core warms) — the magnetic near-goal moment. Confirm Canvas fallback
(swiftshader forced to Canvas, or a Canvas-only check): no glow, no error. Reduce-Motion: no ball glow, goal
shimmer still calm. Perf: no particles added; still <50.

```bash
git add src/config/fx.config.ts src/entities/Ball.ts src/entities/Goal.ts
git commit -m "feat(ball,goal): light-source ball glow (WebGL) + magnetic near-goal shimmer"
```

---

### Task 5: Celebration Escalation — tiered, coordinated win set-pieces

**Files:**
- Create: `src/utils/celebration.ts`, `src/utils/celebration.test.ts`
- Modify: `src/config/fx.config.ts` (per-tier specs), `src/scenes/GameScene.ts` (`triggerWin` consumes the spec;
  add a bloom-boost during the moment)

**Interfaces:**
- Produces: `type CelebrationTier = 'normal' | 'great' | 'perfect' | 'boss'`;
  `celebrationTier(stars: number, isBoss: boolean): CelebrationTier`;
  `interface CelebrationSpec { tier; shakeMs; shakeIntensity; screenFlash: boolean; bloomBoost: number;
  cameraPunch: number; hapticKey: 'HAPTIC_WIN_PATTERN'|'HAPTIC_PERFECT_PATTERN'|'HAPTIC_BOSS_PATTERN' }`;
  `celebrationSpec(tier: CelebrationTier): CelebrationSpec`.
- Consumes: existing `PHYSICS.HAPTIC_*` patterns (by key), `PHYSICS.SHAKE_WIN_*`, `celebrationFlash`, `winFlash`,
  `emitGoalBurst`, `this.bloomFx` from Task 1.

- [ ] **Step 1: Write the failing tests** — `src/utils/celebration.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { celebrationTier, celebrationSpec } from './celebration';

describe('celebrationTier', () => {
  it('maps stars to tiers and boss overrides all', () => {
    expect(celebrationTier(1, false)).toBe('normal');
    expect(celebrationTier(2, false)).toBe('great');
    expect(celebrationTier(3, false)).toBe('perfect');
    expect(celebrationTier(3, true)).toBe('boss');
    expect(celebrationTier(1, true)).toBe('boss');
  });
});

describe('celebrationSpec', () => {
  it('escalates intensity monotonically normal→great→perfect→boss', () => {
    const n = celebrationSpec('normal'), g = celebrationSpec('great');
    const p = celebrationSpec('perfect'), b = celebrationSpec('boss');
    expect(g.shakeMs).toBeGreaterThan(n.shakeMs);
    expect(p.shakeMs).toBeGreaterThan(g.shakeMs);
    expect(b.shakeMs).toBeGreaterThanOrEqual(p.shakeMs);
    expect(n.screenFlash).toBe(false);
    expect(p.screenFlash).toBe(true);
    expect(b.screenFlash).toBe(true);
  });
  it('assigns the right haptic pattern per tier', () => {
    expect(celebrationSpec('normal').hapticKey).toBe('HAPTIC_WIN_PATTERN');
    expect(celebrationSpec('perfect').hapticKey).toBe('HAPTIC_PERFECT_PATTERN');
    expect(celebrationSpec('boss').hapticKey).toBe('HAPTIC_BOSS_PATTERN');
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npx vitest run src/utils/celebration.test.ts`
Expected: FAIL — "Cannot find module './celebration'".

- [ ] **Step 3: Add the spec config** — append to `FX`

```ts
  // ── Celebration tiers (1★ normal · 2★ great · 3★ perfect · boss) ──
  // Coordinated set-pieces: shake + optional screen bloom-flash + camera punch +
  // a transient global-bloom boost. Particle burst stays the equipped Arrival
  // cosmetic (capped <50). Haptic pattern chosen by tier.
  CELEB_NORMAL:  { shakeMs: 120, shakeIntensity: 0.004, screenFlash: false, bloomBoost: 0.4, cameraPunch: 1.03 },
  CELEB_GREAT:   { shakeMs: 150, shakeIntensity: 0.005, screenFlash: false, bloomBoost: 0.7, cameraPunch: 1.04 },
  CELEB_PERFECT: { shakeMs: 190, shakeIntensity: 0.007, screenFlash: true,  bloomBoost: 1.1, cameraPunch: 1.05 },
  CELEB_BOSS:    { shakeMs: 220, shakeIntensity: 0.009, screenFlash: true,  bloomBoost: 1.4, cameraPunch: 1.07 },
```

- [ ] **Step 4: Implement** — `src/utils/celebration.ts`

```ts
import { FX } from '../config/fx.config';

export type CelebrationTier = 'normal' | 'great' | 'perfect' | 'boss';

export interface CelebrationSpec {
  tier: CelebrationTier;
  shakeMs: number;
  shakeIntensity: number;
  screenFlash: boolean;   // whether to fire the screen-wide celebrationFlash bloom
  bloomBoost: number;     // transient add to the global post-FX bloom strength
  cameraPunch: number;    // zoom kick factor
  hapticKey: 'HAPTIC_WIN_PATTERN' | 'HAPTIC_PERFECT_PATTERN' | 'HAPTIC_BOSS_PATTERN';
}

export function celebrationTier(stars: number, isBoss: boolean): CelebrationTier {
  if (isBoss) return 'boss';
  if (stars >= 3) return 'perfect';
  if (stars >= 2) return 'great';
  return 'normal';
}

export function celebrationSpec(tier: CelebrationTier): CelebrationSpec {
  const c =
    tier === 'boss' ? FX.CELEB_BOSS :
    tier === 'perfect' ? FX.CELEB_PERFECT :
    tier === 'great' ? FX.CELEB_GREAT : FX.CELEB_NORMAL;
  const hapticKey =
    tier === 'boss' ? 'HAPTIC_BOSS_PATTERN' :
    tier === 'perfect' ? 'HAPTIC_PERFECT_PATTERN' : 'HAPTIC_WIN_PATTERN';
  return { tier, ...c, hapticKey };
}
```

- [ ] **Step 5: Run the tests, verify they pass**

Run: `npx vitest run src/utils/celebration.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Refactor `GameScene.triggerWin` to consume the spec**

Replace the inline tiering (the `winPattern` ternary, the `if (this.isBoss || stars>=3) celebrationFlash`, the
`punch`/`shake` literals) with:

```ts
const spec = celebrationSpec(celebrationTier(this.winResult.stars, this.isBoss));
this.haptics([...PHYSICS[spec.hapticKey]]);
// … existing attractor destroy / world pause / constellation / emitGoalBurst / winFlash …
if (spec.screenFlash) this.celebrationFlash(this.worldTheme?.accent ?? PHYSICS.COLOR_STAR);
// Transient global-bloom swell during the moment, then ease back (WebGL only).
if (this.bloomFx) {
  const base = FX.BLOOM_STRENGTH;
  this.bloomFx.strength = base + spec.bloomBoost;
  this.tweens.add({ targets: this.bloomFx, strength: base, duration: 700, ease: 'Quad.easeOut' });
}
this.tweens.add({ targets: this.cameras.main, zoom: spec.cameraPunch, duration: 130, yoyo: true, ease: 'Quad.easeOut' });
this.cameras.main.shake(spec.shakeMs, spec.shakeIntensity);
```

Import `celebrationTier, celebrationSpec` from `../utils/celebration`. Keep `emitGoalBurst`, `winFlash`,
`playGoalCapture`, `playStarTone`, the win overlay, the 2× offer, and all progression/analytics **exactly as-is** —
this task only centralizes and elevates the *feel* layer and adds the 2★ tier + bloom swell.
**Reduced-motion:** `celebrationFlash` already honors it (`CELEBRATION_FLASH_ALPHA_REDUCED`); the bloom swell only
runs when `this.bloomFx` exists, which Task 1 already suppresses under reduced-motion — so no extra guard needed.
The star-by-star overlay pop already checks `reduced`.

- [ ] **Step 7: Verify + design-lens + commit**

Run: `npx tsc --noEmit`, `npx vitest run` (all green incl. new), `npm run build` → clean.
Playwright/manual: win a level at **1★** (miss gem + over par), **2★** (gem, over par), **3★** (gem + under par),
and a **boss** — confirm four visibly distinct escalations (shake, flash, camera punch, bloom swell, haptic
pattern) that read as a rising ladder, coordinated with the existing star-pop + audio. Confirm the flow stays
**interruptible/non-blocking** (the 2× offer still tappable; auto-advance timing unchanged). Reduce-Motion: calm
variant, no bloom swell, still celebratory. Contrast of the overlay over the flash stays ≥4.5:1.

```bash
git add src/utils/celebration.ts src/utils/celebration.test.ts src/config/fx.config.ts src/scenes/GameScene.ts
git commit -m "feat(win): tiered celebration ladder (1★/2★/3★/boss) with coordinated bloom swell"
```

> **DECISION D1 (user-gated, do NOT act without approval):** After this task's playtest, judge whether the
> 3★/boss climax is spectacular enough with pure Phaser FX. If it still feels flat, the recommended (and only)
> dependency to consider is a **tiny Rive hero** (`@rive-app/canvas`, ~120–160 KB gz; `.riv` a few KB) played once
> over the win overlay for `perfect`/`boss` only, lazy-loaded and WebGL-safe. Surface this to the user with the
> measured build-size delta; **only add it on explicit approval.** Lottie is the lighter fallback if Rive is
> overkill. Spline remains rejected for this canvas.

---

### Task 6: Wave Verification, Perf & Finish

**Files:** none (verification + branch finish). No placeholders — concrete commands below.

- [ ] **Step 1: Full quality gate**

Run, all must pass:
```bash
npx tsc --noEmit
npx vitest run          # 103 baseline + fx(4) + comets(5) + attractorCharge(3) + celebration(3) new tests green
npm run build
```

- [ ] **Step 2: Playwright smoke — zero console errors across the surface**

Boot `npm run dev`; with Playwright (`--disable-gpu --use-gl=swiftshader`) walk: splash → menu → a World-1 level
(press/hold/win) → a boss level → Star Map. Assert **zero** console errors/warnings from new code. Capture 2–3
screenshots (living bg + charged attractor + 3★ celebration) for the review.

- [ ] **Step 3: Perf pass (perf ceiling is sacred)**

In the running game, confirm via the dev overlay / `game.loop.actualFps`: sustained **~60fps** during
hold+comet+bloom on a level, and during a boss 3★ celebration. Count simultaneous particles at the celebration
peak — must stay **<50** (Arrival burst is capped 44; comets are vector, not particles). Confirm **<20 physics
bodies** unchanged (Wave 1 added none). Force a low-FPS condition (or temporarily lower `FPS_DOWNGRADE_THRESHOLD`)
and confirm the watchdog removes bloom cleanly with no error, then restore the constant.

- [ ] **Step 4: Reduced-motion + Canvas fallback pass**

Toggle Reduce-Motion ON (Settings) and re-walk the surface: no comets, no press-pulse, static attractor glow, no
ball glow, calm celebration, no bloom swell — and **no errors**. Confirm the Canvas path (software / no-WebGL)
renders the game identically minus post-FX with no crash.

- [ ] **Step 5: ui-ux-pro-max checklist sign-off**

Confirm, in writing in the PR/commit body: motion tokens (150–400ms, exit<enter, ease in/out), motion-consistency
(THEME easing reused), interruptible/non-blocking, reduced-motion honored everywhere, ≥4.5:1 HUD/overlay contrast
over the brighter field, no new asset/dep added, perf ceiling held.

- [ ] **Step 6: Finish the branch**

Use the **superpowers:finishing-a-development-branch** skill to choose merge/PR/cleanup for
`feat/wave1-make-it-alive`. Update `docs/project-status.md` "Current State" with a one-paragraph Wave 1 entry
(living FX + tiered celebrations, WebGL-gated, reduced-motion safe, +15 tests) and bump the milestone note. Do
**not** tag a release (launch gating is unchanged; Wave 1 is feel polish on the RC).

---

## Self-Review (writing-plans checklist)

**Spec coverage** (engagement Wave 1 → task):
- Living background (reactive nebula pulse, comets/shooting stars, depth parallax, per-world place) → **Task 2** ✅
- Attractor as a living force (tendrils/lensing/reactive ring escalating with hold; force untouched) → **Task 3** ✅
- Ball & trail elevation + goal breathing + magnetic near-goal → **Task 4** ✅
- Celebration escalation (1★→2★→3★→boss coordinated set-pieces; Rive/Lottie hero consideration) → **Task 5 + D1** ✅
- Screen-space post-FX (global bloom/vignette; reduced-motion + low-end fallback) → **Task 1** ✅
- Spline/Rive/Lottie/Phaser trade-off note → **Tooling Decision** section + **D1** ✅
- Perf ceiling, reduced-motion, WebGL fallback, constants-in-config, formula-untouched → **Global Constraints** +
  enforced per task + **Task 6** ✅

**Placeholder scan:** No "TBD/handle edge cases/similar to Task N" — every code step has real code; every run step
has a real command + expected result.

**Type consistency:** `chargeLevel(holdMs, fullMs)`, `celebrationTier`/`celebrationSpec`/`CelebrationSpec`,
`dueForComet`/`cometProgress`/`pickCometPath`/`CometPath`, `fxCapable`/`shouldDowngradeFx`, `CosmicBackground.pulse`,
`Attractor.setCharge`, `FX.*` keys — used consistently across tasks and matched to the interfaces that produce them.

**Config discipline:** every tunable lands in `fx.config.ts`; no raw numbers introduced in entity/scene code.

---

## Execution Handoff

Work on branch `feat/wave1-make-it-alive` (create via superpowers:using-git-worktrees at execution time).
Recommended: **subagent-driven-development** — one subagent per task, two-stage review (implementer → independent
reviewer), tasks 1→5 are largely independent after Task 1 lands the config+pipeline, Task 6 is the integrating
verify. **Wait for user approval of this plan (and a decision on D1's default posture) before writing any code.**
