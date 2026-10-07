// Headless reproduction of Phaser 3.90's Matter World.update accumulator using the
// exact Matter 0.20 lib bundled inside Phaser (node_modules/phaser/src/physics/matter-js/lib).
// Usage: node timestep-sim.cjs "<path to repo root>"
// Compares (A) current pattern: applyForce once per render frame in scene.update()
// (which runs AFTER world.update in Systems.step) vs (B) applyForce in 'beforeUpdate'.
const path = require('path');
const root = process.argv[2];
const lib = path.join(root, 'node_modules/phaser/src/physics/matter-js/lib');
const Engine = require(path.join(lib, 'core/Engine'));
const Events = require(path.join(lib, 'core/Events'));
const Runner = require(path.join(lib, 'core/Runner'));
const Bodies = require(path.join(lib, 'factory/Bodies'));
const Body = require(path.join(lib, 'body/Body'));
const Composite = require(path.join(lib, 'body/Composite'));
const Common = require(path.join(lib, 'core/Common'));

const STRENGTH = 2.6, MIN_DIST = 75, MAX_DIST = 310;
const ATTR = { x: 180, y: 200 };

function make() {
  const engine = Engine.create({ gravity: { x: 0, y: 0 } });
  const ball = Bodies.circle(180, 420, 16, { restitution: 0.65, friction: 0.01, frictionAir: 0.02 });
  Composite.add(engine.world, ball);
  return { engine, ball };
}
function pull(ball) {
  const dx = ATTR.x - ball.position.x, dy = ATTR.y - ball.position.y;
  const raw = Math.hypot(dx, dy);
  if (raw > MAX_DIST) return;
  const d = Math.max(raw, MIN_DIST);
  const mag = STRENGTH / (d * d);
  Body.applyForce(ball, ball.position, { x: (dx / raw) * mag, y: (dy / raw) * mag });
}

// Phaser World.update(time) is Runner.tick's accumulator minus events; Runner.tick is
// the same algorithm, so we drive it with synthetic rAF timestamps.
function run(hz, mode, seconds = 0.5) {
  const { engine, ball } = make();
  const runner = Runner.create({}); // Phaser defaults: delta 16.666, smoothing+snapping on, maxFrameTime 33.3
  let steps = 0;
  Events.on(engine, 'beforeUpdate', () => { steps++; if (mode === 'B') pull(ball); });
  const frame = 1000 / hz;
  let t = 1000;
  const frames = Math.round(seconds * hz);
  const pattern = [];
  for (let f = 0; f < frames; f++) {
    t += frame;
    const before = steps;
    Runner.tick(runner, engine, t);          // == SceneEvents.UPDATE -> world.update
    if (mode === 'A') pull(ball);            // == GameScene.update() (runs after world.update)
    if (f < 12) pattern.push(steps - before);
  }
  return { hz, mode, speed: +ball.speed.toFixed(3), steps, pattern: pattern.join('') };
}

console.log('--- A: force per render frame (current) vs B: force in beforeUpdate (fix) ---');
for (const hz of [30, 60, 90, 120, 144]) {
  const a = run(hz, 'A'), b = run(hz, 'B');
  console.log(`${hz}Hz  A speed=${a.speed}  B speed=${b.speed}  steps=${b.steps}  steps/frame(first 12)=${b.pattern}`);
}

// Refresh-rate switch: 120Hz -> 60Hz mid-run (adaptive refresh / battery saver).
// Count simulated ms vs wall ms in the 1.5s after the switch.
(function switchTest() {
  const { engine } = make();
  const runner = Runner.create({});
  let steps = 0;
  Events.on(engine, 'beforeUpdate', () => steps++);
  let t = 1000;
  for (let f = 0; f < 240; f++) { t += 1000 / 120; Runner.tick(runner, engine, t); }
  const s0 = steps; const t0 = t;
  const out = [];
  for (let f = 0; f < 90; f++) {
    t += 1000 / 60; Runner.tick(runner, engine, t);
    if ((f + 1) % 15 === 0) out.push(`${Math.round(t - t0)}ms wall -> ${Math.round((steps - s0) * 1000 / 60)}ms sim`);
  }
  console.log('--- 120Hz -> 60Hz switch with default frameDeltaSmoothing ---\n' + out.join('\n'));
})();

// Determinism: same per-step inputs, different render cadences -> identical state?
(function determinism() {
  function sim(hz, nSteps) {
    const { engine, ball } = make();
    const runner = Runner.create({});
    let steps = 0;
    Events.on(engine, 'beforeUpdate', () => { if (steps < nSteps) pull(ball); steps++; });
    let t = 1000;
    while (steps < nSteps) { t += 1000 / hz; Runner.tick(runner, engine, t); }
    // roll back any overshoot is not possible; compare at exactly nSteps by stepping manually instead
    return steps;
  }
  function manual(nSteps) {
    const { engine, ball } = make();
    for (let i = 0; i < nSteps; i++) { pull(ball); Engine.update(engine, 1000 / 60); }
    return `${ball.position.x.toFixed(12)},${ball.position.y.toFixed(12)}`;
  }
  const h1 = manual(300), h2 = manual(300);
  console.log(`--- determinism (300 fixed steps, same inputs, two runs) identical=${h1 === h2} pos=${h1}`);
  void sim;
})();

// Phaser TimeStep fps.limit=60 on a 120Hz panel: reproduce stepLimitFPS cadence.
(function fpsLimit() {
  for (const panel of [120, 119.9, 120.1, 144]) {
    const limitRate = 1000 / 60; let acc = 0; let fired = 0; const gaps = []; let last = 0;
    for (let f = 1; f <= 600; f++) {
      acc += 1000 / panel;                     // smoothed delta ~ constant
      if (acc >= limitRate) { fired++; gaps.push(f - last); last = f; acc = 0; } // remainder discarded
    }
    const hist = {}; gaps.forEach((g) => (hist[g] = (hist[g] || 0) + 1));
    console.log(`fps.limit=60 on ${panel}Hz panel -> ${(fired / (600 / panel)).toFixed(1)} steps/s, frame-gap histogram ${JSON.stringify(hist)}`);
  }
})();
void Common;
