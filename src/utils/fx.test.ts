import { describe, it, expect, vi } from 'vitest';

// The real `phaser` package runs device-detection code at import time that
// reads `window` unconditionally (node_modules/phaser/src/device/OS.js). That
// crashes under Vitest's `environment: 'node'` (no DOM), which every other
// test file in this repo relies on. Stub just the two numeric renderer-type
// constants this module touches (`Phaser.WEBGL` / `Phaser.CANVAS`) so fx.ts
// stays exactly as written (a real `phaser` import, used the same way scenes
// use it) while this test stays hermetic — no DOM, no new test dependency.
vi.mock('phaser', () => ({ default: { WEBGL: 2, CANVAS: 1 } }));

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
