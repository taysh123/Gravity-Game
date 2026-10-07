// Numerical model of Phaser 3.90 BloomFXPipeline + LinearBlend on a 1-D cross-section.
// Usage: node bloom-response.cjs
// FXBloom.frag: sum = c*0.204164*blurStrength + (±1.407333 o)*0.304005 + (±3.294215 o)*0.093913
// offset o = 2*offsetX texels (BloomFXPipeline: x = 2/width*offsetX in UV). steps => H then V pass each.
// LinearBlend.frag: out = mix(orig, blur*strength, 0.5) = 0.5*orig + 0.5*strength*blur.
function sample(a, x) { // linear filtering, clamp-to-edge
  const i = Math.floor(x), f = x - i;
  const g = (k) => a[Math.min(Math.max(k, 0), a.length - 1)];
  return g(i) * (1 - f) + g(i + 1) * f;
}
function pass(a, o, bs) {
  return a.map((_, i) => a[i] * 0.204164 * bs
    + (sample(a, i + 1.407333 * o) + sample(a, i - 1.407333 * o)) * 0.304005
    + (sample(a, i + 3.294215 * o) + sample(a, i - 3.294215 * o)) * 0.093913);
}
function response(widthPx, { offset = 0.8, blurStrength = 0.9, strength = 0.65, steps = 4 } = {}) {
  const N = 201, c = 100;
  let a = new Array(N).fill(0);
  for (let i = 0; i < N; i++) if (Math.abs(i - c) < widthPx / 2) a[i] = 1;
  if (widthPx >= N) a = a.fill(1);
  const orig = a.slice();
  const g = 0.204164 * blurStrength + 0.795836; // along-the-line gain of a pass (uniform direction)
  let b = a;
  for (let s = 0; s < steps; s++) { b = b.map((v) => v * g); b = pass(b, 2 * offset, blurStrength); }
  const out = orig.map((v, i) => 0.5 * v + 0.5 * strength * b[i]);
  const halo = out[Math.min(c + Math.ceil(widthPx / 2) + 4, N - 1)];
  return { core: out[c], halo, breakEvenStrength: (1 - 0.5) / (0.5 * b[c]) };
}
for (const w of [1, 2, 3, 6, 16, 1000]) {
  const r = response(w);
  console.log(`line ${w}px (value 1.0): core -> ${r.core.toFixed(3)}  halo@+4px -> ${r.halo.toFixed(3)}  strength needed for core parity ${r.breakEvenStrength.toFixed(2)}`);
}
console.log('defaults (offset1, blurStrength1, strength1):', JSON.stringify(response(1000, { offset: 1, blurStrength: 1, strength: 1 })));
