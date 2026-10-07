import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FactsError, deriveVersion as factsDeriveVersion } from '../facts/factsLib.mjs';
import {
  MAX_VERSION_CODE,
  MIN_UPLOAD_VERSION_CODE,
  VersionError,
  assertUploadable,
  bumpBuild,
  bumpBuildInPackageJson,
  deriveVersion,
  deriveVersionCode,
  parseVersion,
} from './versionCode.mjs';

describe('deriveVersionCode (D-20): MAJOR*1_000_000 + MINOR*10_000 + PATCH*100 + BUILD', () => {
  it('derives the first post-P0 upload: 1.0.0 build 1 is 1000001 (> the uploaded code 1)', () => {
    expect(deriveVersionCode('1.0.0', 1)).toBe(1000001);
    expect(deriveVersionCode('1.0.0', 1)).toBeGreaterThan(1);
  });

  it('derives 1.2.3 build 4 as 1020304', () => {
    expect(deriveVersionCode('1.2.3', 4)).toBe(1020304);
  });

  it('covers the lower and upper corners of the formula', () => {
    expect(deriveVersionCode('0.0.0', 0)).toBe(0);
    expect(deriveVersionCode('99.99.99', 99)).toBe(99_999_999);
  });

  it('is strictly monotonic across build, patch, minor and major bumps', () => {
    expect(deriveVersionCode('1.0.0', 2)).toBeGreaterThan(deriveVersionCode('1.0.0', 1));
    expect(deriveVersionCode('1.0.0', 99)).toBeLessThan(deriveVersionCode('1.0.1', 0));
    expect(deriveVersionCode('1.0.99', 99)).toBeLessThan(deriveVersionCode('1.1.0', 0));
    expect(deriveVersionCode('1.99.99', 99)).toBeLessThan(deriveVersionCode('2.0.0', 0));
  });

  it('never repeats or reorders a code over the whole MINOR x PATCH x BUILD range of a major', () => {
    let previous = -1;
    for (let minor = 0; minor <= 99; minor++) {
      for (let patch = 0; patch <= 99; patch++) {
        for (let build = 0; build <= 99; build++) {
          const code = deriveVersionCode(`7.${minor}.${patch}`, build);
          if (code <= previous) throw new Error(`7.${minor}.${patch}+${build} -> ${code} is not > ${previous}`);
          previous = code;
        }
      }
    }
    expect(previous).toBe(7_999_999);
  });
});

describe('deriveVersion', () => {
  it('returns versionName = the semver (no rc label) and the derived versionCode', () => {
    expect(deriveVersion('1.0.0', 1)).toEqual({ versionName: '1.0.0', versionCode: 1000001 });
    expect(deriveVersion('1.2.3', 4)).toEqual({ versionName: '1.2.3', versionCode: 1020304 });
  });
});

describe('range errors', () => {
  it('rejects MINOR, PATCH or BUILD above 99', () => {
    expect(() => deriveVersionCode('1.100.0', 1)).toThrow(VersionError);
    expect(() => deriveVersionCode('1.0.100', 1)).toThrow(VersionError);
    expect(() => deriveVersionCode('1.0.0', 100)).toThrow(VersionError);
  });

  it('names the offending part in the message', () => {
    expect(() => deriveVersionCode('1.100.0', 1)).toThrow(/minor/i);
    expect(() => deriveVersionCode('1.0.100', 1)).toThrow(/patch/i);
    expect(() => deriveVersionCode('1.0.0', 100)).toThrow(/androidBuild/);
  });

  it('rejects a BUILD that is negative, fractional, non-numeric or missing', () => {
    expect(() => deriveVersionCode('1.0.0', -1)).toThrow(VersionError);
    expect(() => deriveVersionCode('1.0.0', 1.5)).toThrow(VersionError);
    expect(() => deriveVersionCode('1.0.0', Number.NaN)).toThrow(VersionError);
    expect(() => deriveVersionCode('1.0.0', '1')).toThrow(VersionError);
    expect(() => deriveVersionCode('1.0.0', undefined)).toThrow(VersionError);
    expect(() => deriveVersionCode('1.0.0', null)).toThrow(VersionError);
  });

  it('rejects anything but a plain MAJOR.MINOR.PATCH (the rc label lives only in the git tag)', () => {
    for (const bad of ['1.0.0-rc.1', '1.0', '1', '1.0.0.0', 'v1.0.0', ' 1.0.0', '1.0.0 ', '1.0.0+1', '01.0.0', '1.00.0', '1.0.00', 'a.b.c', '']) {
      expect(() => deriveVersionCode(bad, 1), `"${bad}"`).toThrow(VersionError);
    }
    expect(() => deriveVersionCode(undefined, 1)).toThrow(VersionError);
    expect(() => deriveVersionCode(1, 1)).toThrow(VersionError);
  });
});

describe("Play's 2_100_000_000 versionCode cap", () => {
  it('exports the cap', () => {
    expect(MAX_VERSION_CODE).toBe(2_100_000_000);
  });

  it('accepts the largest code that fits (2100.0.0 build 0, and 2099.99.99 build 99)', () => {
    expect(deriveVersionCode('2100.0.0', 0)).toBe(2_100_000_000);
    expect(deriveVersionCode('2099.99.99', 99)).toBe(2_099_999_999);
  });

  it('rejects any computed code above the cap, including 2100.x.y which the old major > 2100 guard let through', () => {
    expect(() => deriveVersionCode('2100.0.0', 1)).toThrow(VersionError);
    expect(() => deriveVersionCode('2100.0.1', 0)).toThrow(VersionError);
    expect(() => deriveVersionCode('2100.1.0', 0)).toThrow(VersionError);
    expect(() => deriveVersionCode('2100.99.99', 99)).toThrow(VersionError);
    expect(() => deriveVersionCode('2101.0.0', 0)).toThrow(VersionError);
    expect(() => deriveVersionCode('99999999999999999999.0.0', 0)).toThrow(VersionError);
  });

  it('says the cap in the message', () => {
    expect(() => deriveVersionCode('2100.0.0', 1)).toThrow(/2100000000|2_100_000_000/);
  });
});

describe('parseVersion', () => {
  it('splits MAJOR.MINOR.PATCH into numbers', () => {
    expect(parseVersion('3.14.15')).toEqual({ major: 3, minor: 14, patch: 15 });
  });
});

describe('bumpBuild (monotonic)', () => {
  it('increments the build by one', () => {
    expect(bumpBuild(1)).toBe(2);
    expect(bumpBuild(98)).toBe(99);
    expect(deriveVersionCode('1.0.0', bumpBuild(1))).toBeGreaterThan(deriveVersionCode('1.0.0', 1));
  });

  it('refuses to wrap past 99 (a code is never reused; bump PATCH instead)', () => {
    expect(() => bumpBuild(99)).toThrow(VersionError);
    expect(() => bumpBuild(99)).toThrow(/patch/i);
  });

  it('rejects an invalid current build', () => {
    expect(() => bumpBuild(-1)).toThrow(VersionError);
    expect(() => bumpBuild(1.5)).toThrow(VersionError);
    expect(() => bumpBuild(undefined)).toThrow(VersionError);
  });
});

describe('bumpBuildInPackageJson', () => {
  const PKG = ['{', '  "name": "gravity-game",', '  "version": "1.0.0",', '  "androidBuild": 1,', '  "type": "module"', '}', ''].join('\n');

  it('rewrites only the androidBuild number and reports the old and new code', () => {
    const out = bumpBuildInPackageJson(PKG);
    expect(out.text).toBe(PKG.replace('"androidBuild": 1,', '"androidBuild": 2,'));
    expect(out).toMatchObject({ from: 1, to: 2, versionName: '1.0.0', versionCode: 1000002 });
  });

  it('keeps CRLF files CRLF', () => {
    const crlf = PKG.replace(/\n/g, '\r\n');
    expect(bumpBuildInPackageJson(crlf).text).toBe(crlf.replace('"androidBuild": 1,', '"androidBuild": 2,'));
  });

  it('refuses when androidBuild is absent, invalid, or already 99', () => {
    expect(() => bumpBuildInPackageJson(PKG.replace('  "androidBuild": 1,\n', ''))).toThrow(VersionError);
    expect(() => bumpBuildInPackageJson(PKG.replace('"androidBuild": 1', '"androidBuild": 99'))).toThrow(VersionError);
    expect(() => bumpBuildInPackageJson(PKG.replace('"version": "1.0.0"', '"version": "1.0.0-rc.1"'))).toThrow(VersionError);
  });

  it('refuses a package.json that is not valid JSON', () => {
    expect(() => bumpBuildInPackageJson('{ nope')).toThrow(VersionError);
  });
});

describe('assertUploadable (release floor)', () => {
  it('accepts the first post-P0 upload and anything above it up to the cap', () => {
    expect(MIN_UPLOAD_VERSION_CODE).toBe(1_000_001);
    expect(() => assertUploadable(1_000_001)).not.toThrow();
    expect(() => assertUploadable(2_100_000_000)).not.toThrow();
  });

  it('rejects the already-uploaded code 1, anything below the floor, and anything above the cap', () => {
    expect(() => assertUploadable(1)).toThrow(VersionError);
    expect(() => assertUploadable(1_000_000)).toThrow(VersionError);
    expect(() => assertUploadable(2_100_000_001)).toThrow(VersionError);
  });
});

describe('single implementation', () => {
  it('factsLib.deriveVersion delegates to versionCode.mjs (same results, FactsError on bad input)', () => {
    expect(factsDeriveVersion('1.0.0', 1)).toEqual(deriveVersion('1.0.0', 1));
    expect(factsDeriveVersion('1.0.0-rc.1', undefined)).toEqual({ versionName: null, versionCode: null });
    expect(() => factsDeriveVersion('2100.0.0', 1)).toThrow(FactsError);
  });

  it('factsLib.mjs no longer carries a copy of the D-20 formula', () => {
    const source = readFileSync(new URL('../facts/factsLib.mjs', import.meta.url), 'utf8');
    expect(source).not.toMatch(/1_000_000|10_000|1000000|10000/);
    expect(source).toMatch(/from '\.\.\/lib\/versionCode\.mjs'/);
  });
});

describe('scripts/version.mjs CLI (reads the real package.json)', () => {
  const script = fileURLToPath(new URL('../version.mjs', import.meta.url));
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  const cli = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });

  it('--code prints the derived versionCode and --name the versionName', () => {
    const expected = deriveVersion(pkg.version, pkg.androidBuild);
    expect(cli('--code').stdout.trim()).toBe(String(expected.versionCode));
    expect(cli('--name').stdout.trim()).toBe(expected.versionName);
  });

  it('--check passes on the committed package.json (a plain semver, in range, >= 1000001)', () => {
    const run = cli('--check');
    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout).toContain(String(deriveVersionCode(pkg.version, pkg.androidBuild)));
  });

  it('exits 2 with usage for no flag, an unknown flag, or two flags', () => {
    for (const args of [[], ['--nope'], ['--code', '--name']]) {
      const run = cli(...args);
      expect(run.status, args.join(' ')).toBe(2);
      expect(run.stderr).toMatch(/usage:/);
    }
  });
});
