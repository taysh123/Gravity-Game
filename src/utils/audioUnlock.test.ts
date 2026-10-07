import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { shouldResumeOnGesture } from './audioUnlock';

// P00-T11 review: after a background return the AudioContext can only be (re)started from a real DOM gesture on the
// Android WebView. The persistent capture-phase listener in main.ts asks this pure rule whether to call ctx.resume().

describe('shouldResumeOnGesture', () => {
  it('suspended and wanted: resume', () => {
    expect(shouldResumeOnGesture('suspended', true)).toBe(true);
  });

  it('suspended but not wanted (backgrounded / under the pause overlay / Sound and Music off): stay silent', () => {
    expect(shouldResumeOnGesture('suspended', false)).toBe(false);
  });

  it('already running: nothing to do, whether or not audio is wanted', () => {
    expect(shouldResumeOnGesture('running', true)).toBe(false);
    expect(shouldResumeOnGesture('running', false)).toBe(false);
  });

  it('closed: resume() would reject, so never try', () => {
    expect(shouldResumeOnGesture('closed', true)).toBe(false);
    expect(shouldResumeOnGesture('closed', false)).toBe(false);
  });
});

// Source-level guard: ONE persistent mechanism, not a spent one-shot plus a second competing handler.
describe('main.ts audio unlock wiring', () => {
  const main = readFileSync(fileURLToPath(new URL('../main.ts', import.meta.url)), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('is not one-shot', () => {
    expect(main).not.toMatch(/once:\s*true\s*,\s*capture|capture:\s*true\s*,\s*once:\s*true/);
    expect(main.match(/addEventListener\('(pointerdown|touchend)'/g)).toHaveLength(2);
  });

  it('listens in the capture phase on pointerdown and touchend and routes to AudioSynth.resumeFromGesture', () => {
    expect(main).toMatch(/addEventListener\('pointerdown',\s*unlockAudio,\s*\{\s*capture:\s*true\s*\}\)/);
    expect(main).toMatch(/addEventListener\('touchend',\s*unlockAudio,\s*\{\s*capture:\s*true\s*\}\)/);
    expect(main).toMatch(/sharedAudio\(\)\.resumeFromGesture\(\)/);
  });
});
