// Custom fixed-step accumulator cadence test (no Matter needed).
// Usage: node accumulator-sim.cjs
// Shows why the accumulator should start half a step "full" (phase bias) and why
// a per-frame step cap is needed. Deterministic pseudo-jitter (LCG) so runs repeat.
const STEP = 1000 / 60;
let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

function cadence(hz, jitterMs, bias, frames = 6000) {
  seed = 12345;
  let acc = bias * STEP, odd = 0, total = 0;
  const hist = {};
  let prevT = 0;
  for (let f = 0; f < frames; f++) {
    // vsync-aligned timestamps with per-frame noise (noise does NOT accumulate)
    const t = (f + 1) * (1000 / hz) + (rnd() * 2 - 1) * jitterMs;
    const dt = t - prevT; prevT = t;
    acc += Math.min(dt, 100); // clamp long frames (tab return / GC) -> time dilation, not spiral
    let n = 0;
    while (acc >= STEP && n < 4) { acc -= STEP; n++; }
    if (n === 4 && acc >= STEP) acc = acc % STEP; // drop backlog beyond the cap
    hist[n] = (hist[n] || 0) + 1;
    total += n;
    if (hz === 60 && n !== 1) odd++;
  }
  return { hist, simVsWall: (total * STEP) / ((frames * 1000) / hz), odd };
}

for (const hz of [30, 60, 90, 120, 144]) {
  for (const bias of [0, 0.5]) {
    const r = cadence(hz, 1.0, bias);
    console.log(`${hz}Hz jitter±1ms bias=${bias}: steps/frame histogram ${JSON.stringify(r.hist)} sim/wall=${r.simVsWall.toFixed(4)}${hz === 60 ? ` non-1-step frames=${r.odd}` : ''}`);
  }
}
