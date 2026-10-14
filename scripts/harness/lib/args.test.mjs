import { describe, expect, it } from 'vitest';
import { parseArgs, USAGE } from './args.mjs';

describe('parseArgs', () => {
  it('defaults to the preview mode (the production build served by vite preview), building first', () => {
    expect(parseArgs([])).toEqual({ mode: 'preview', only: [], list: false, build: true, headed: false, verbose: false, jobs: 1, exclusive: false, artifacts: null, help: false });
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
    expect(parseArgs(['--verbose']).verbose).toBe(true);
    expect(parseArgs(['--help']).help).toBe(true);
    expect(parseArgs(['-h']).help).toBe(true);
  });

  it('reads --jobs as a count of parallel jobs, one at a time by default', () => {
    expect(parseArgs([]).jobs).toBe(1);
    expect(parseArgs(['--jobs=3']).jobs).toBe(3);
    expect(parseArgs(['--jobs', '1']).jobs).toBe(1);
  });

  it('reads --exclusive: only the checks that need the chosen mode', () => {
    expect(parseArgs(['--exclusive']).exclusive).toBe(true);
  });

  it('reads --artifacts as a directory for failure screenshots', () => {
    expect(parseArgs(['--artifacts=smoke-artifacts']).artifacts).toBe('smoke-artifacts');
    expect(parseArgs(['--artifacts', 'out/x']).artifacts).toBe('out/x');
    expect(() => parseArgs(['--artifacts'])).toThrow(/--artifacts needs a value/);
  });

  it('rejects a --jobs that is not a whole number from 1 to 8', () => {
    for (const bad of ['0', '9', '-1', '1.5', 'many', '']) {
      expect(() => parseArgs([`--jobs=${bad}`])).toThrow(/--jobs must be a whole number from 1 to 8/);
    }
  });

  it('rejects anything it does not know instead of silently ignoring a typo', () => {
    expect(() => parseArgs(['--moed=dev'])).toThrow(/Unknown argument "--moed=dev"/);
    expect(() => parseArgs(['scene-boot'])).toThrow(/Unknown argument "scene-boot"/);
  });

  it('documents every option in the usage text', () => {
    for (const flag of ['--mode', '--only', '--list', '--no-build', '--headed', '--verbose', '--jobs', '--exclusive', '--artifacts', '--help']) {
      expect(USAGE).toContain(flag);
    }
  });
});
