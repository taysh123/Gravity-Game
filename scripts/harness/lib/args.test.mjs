import { describe, expect, it } from 'vitest';
import { parseArgs, USAGE } from './args.mjs';

describe('parseArgs', () => {
  it('defaults to the preview mode (the production build served by vite preview), building first', () => {
    expect(parseArgs([])).toEqual({ mode: 'preview', only: [], list: false, build: true, headed: false, help: false });
  });

  it('reads --mode=dev and --mode dev', () => {
    expect(parseArgs(['--mode=dev']).mode).toBe('dev');
    expect(parseArgs(['--mode', 'dev']).mode).toBe('dev');
    expect(parseArgs(['--mode=preview']).mode).toBe('preview');
  });

  it('rejects an unknown mode with a message that names the valid ones', () => {
    expect(() => parseArgs(['--mode=prod'])).toThrow(/--mode must be "preview" or "dev"/);
    expect(() => parseArgs(['--mode'])).toThrow(/--mode needs a value/);
  });

  it('collects --only as a comma list, repeatable, without blanks or duplicates', () => {
    expect(parseArgs(['--only=scene-boot,hit-areas']).only).toEqual(['scene-boot', 'hit-areas']);
    expect(parseArgs(['--only=a', '--only', 'b,a,']).only).toEqual(['a', 'b']);
  });

  it('reads the boolean flags', () => {
    expect(parseArgs(['--no-build']).build).toBe(false);
    expect(parseArgs(['--list']).list).toBe(true);
    expect(parseArgs(['--headed']).headed).toBe(true);
    expect(parseArgs(['--help']).help).toBe(true);
    expect(parseArgs(['-h']).help).toBe(true);
  });

  it('rejects anything it does not know instead of silently ignoring a typo', () => {
    expect(() => parseArgs(['--moed=dev'])).toThrow(/Unknown argument "--moed=dev"/);
    expect(() => parseArgs(['scene-boot'])).toThrow(/Unknown argument "scene-boot"/);
  });

  it('documents every option in the usage text', () => {
    for (const flag of ['--mode', '--only', '--list', '--no-build', '--headed', '--help']) {
      expect(USAGE).toContain(flag);
    }
  });
});
