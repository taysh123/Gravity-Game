import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

// P00-T11: Haptics.pulse is the single place that touches navigator.vibrate (GameScene.haptics routes through it).
// It must honour the PHYSICS kill switch and the player's Haptics setting, and never throw when the Vibration API is
// missing (iOS Safari, desktop Firefox, the Node test runner) or refuses (no user activation).
const mocks = vi.hoisted(() => ({
  settings: { haptics: true },
  physics: { HAPTICS_ENABLED: true },
}));
vi.mock('../utils/SettingsStore', () => ({ SettingsStore: { get: () => ({ ...mocks.settings }) } }));
vi.mock('../config/physics.config', () => ({ PHYSICS: mocks.physics }));

import { Haptics } from './haptics';

describe('Haptics.pulse', () => {
  let vibrate: Mock<[number | number[]], boolean>;

  beforeEach(() => {
    mocks.settings.haptics = true;
    mocks.physics.HAPTICS_ENABLED = true;
    vibrate = vi.fn<[number | number[]], boolean>(() => true);
    vi.stubGlobal('navigator', { vibrate });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('vibrates with a single duration', () => {
    Haptics.pulse(12);
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith(12);
  });

  it('vibrates with a pattern', () => {
    Haptics.pulse([20, 40, 20]);
    expect(vibrate).toHaveBeenCalledWith([20, 40, 20]);
  });

  it('does nothing when the Haptics setting is off', () => {
    mocks.settings.haptics = false;
    Haptics.pulse(12);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('does nothing when the global kill switch (PHYSICS.HAPTICS_ENABLED) is off', () => {
    mocks.physics.HAPTICS_ENABLED = false;
    Haptics.pulse(12);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('re-reads the setting on every call (toggling in Settings takes effect immediately)', () => {
    Haptics.pulse(1);
    mocks.settings.haptics = false;
    Haptics.pulse(2);
    mocks.settings.haptics = true;
    Haptics.pulse(3);
    expect(vibrate.mock.calls.map((c) => c[0])).toEqual([1, 3]);
  });

  it('is a silent no-op when navigator.vibrate does not exist', () => {
    vi.stubGlobal('navigator', {});
    expect(() => Haptics.pulse(12)).not.toThrow();
  });

  it('is a silent no-op when navigator itself does not exist', () => {
    vi.stubGlobal('navigator', undefined);
    expect(() => Haptics.pulse([10, 20])).not.toThrow();
  });

  it('swallows a vibrate() that throws', () => {
    vibrate.mockImplementation(() => {
      throw new Error('NotAllowedError');
    });
    expect(() => Haptics.pulse(12)).not.toThrow();
  });

  it('reports availability from navigator.vibrate', () => {
    expect(Haptics.available()).toBe(true);
    vi.stubGlobal('navigator', {});
    expect(Haptics.available()).toBe(false);
    vi.stubGlobal('navigator', undefined);
    expect(Haptics.available()).toBe(false);
  });
});

describe('no other file calls navigator.vibrate directly', () => {
  it('only src/platform/haptics.ts does', async () => {
    const { readdirSync, readFileSync, statSync } = await import('node:fs');
    const { join, relative } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const srcRoot = fileURLToPath(new URL('../', import.meta.url));
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name)) files.push(full);
      }
    };
    walk(srcRoot);
    const code = (f: string): string => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const offenders = files
      .filter((f) => /\bvibrate\b/.test(code(f)))
      .map((f) => relative(srcRoot, f).replace(/\\/g, '/'));
    expect(offenders).toEqual(['platform/haptics.ts']);
  });
});
