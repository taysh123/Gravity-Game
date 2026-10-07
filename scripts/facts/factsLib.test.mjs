import { describe, expect, it } from 'vitest';
import {
  FactsError,
  buildFacts,
  checkBlock,
  deriveVersion,
  extractBlock,
  hasBlock,
  installedVersion,
  levelFileStats,
  lineDiff,
  parseCiNodeVersions,
  parseSceneNames,
  parseSdk,
  renderFacts,
  renderReadmeLine,
  replaceBlock,
  summarizeVitestReport,
} from './factsLib.mjs';

const DOC = [
  '# Title',
  '',
  'intro',
  '<!-- facts:start -->',
  'old line 1',
  'old line 2',
  '<!-- facts:end -->',
  '',
  'outro',
  '',
].join('\n');

describe('extractBlock', () => {
  it('returns the text between the markers without the surrounding newlines', () => {
    expect(extractBlock(DOC, 'facts')).toBe('old line 1\nold line 2');
  });

  it('normalizes CRLF so Windows checkouts compare equal to generated LF text', () => {
    expect(extractBlock(DOC.replace(/\n/g, '\r\n'), 'facts')).toBe('old line 1\nold line 2');
  });

  it('keeps blocks with different ids independent', () => {
    const text = [
      '<!-- facts:start -->',
      'status',
      '<!-- facts:end -->',
      '<!-- facts:readme:start -->',
      'readme',
      '<!-- facts:readme:end -->',
    ].join('\n');
    expect(extractBlock(text, 'facts')).toBe('status');
    expect(extractBlock(text, 'facts:readme')).toBe('readme');
  });

  it('throws a FactsError naming the marker when the start marker is missing', () => {
    expect(() => extractBlock('no markers here\n<!-- facts:end -->', 'facts')).toThrow(FactsError);
    expect(() => extractBlock('no markers here\n<!-- facts:end -->', 'facts')).toThrow(
      /<!-- facts:start -->/,
    );
  });

  it('throws when the end marker is missing', () => {
    expect(() => extractBlock('<!-- facts:start -->\nx', 'facts')).toThrow(/<!-- facts:end -->/);
  });

  it('throws when a marker appears more than once', () => {
    const dup = DOC + '<!-- facts:start -->\n<!-- facts:end -->\n';
    expect(() => extractBlock(dup, 'facts')).toThrow(/more than once/);
  });

  it('throws when the end marker comes before the start marker', () => {
    const swapped = '<!-- facts:end -->\nx\n<!-- facts:start -->\n';
    expect(() => extractBlock(swapped, 'facts')).toThrow(/before/);
  });
});

describe('hasBlock', () => {
  it('is true when either marker is present and false when neither is', () => {
    expect(hasBlock(DOC, 'facts')).toBe(true);
    expect(hasBlock('<!-- facts:start -->', 'facts')).toBe(true);
    expect(hasBlock('plain text', 'facts')).toBe(false);
    expect(hasBlock(DOC, 'facts:readme')).toBe(false);
  });
});

describe('replaceBlock', () => {
  it('replaces only the block content and leaves everything else byte-identical', () => {
    const next = replaceBlock(DOC, 'facts', 'new A\nnew B\nnew C');
    expect(next).toBe(
      [
        '# Title',
        '',
        'intro',
        '<!-- facts:start -->',
        'new A',
        'new B',
        'new C',
        '<!-- facts:end -->',
        '',
        'outro',
        '',
      ].join('\n'),
    );
  });

  it('is idempotent', () => {
    const once = replaceBlock(DOC, 'facts', 'x\ny');
    expect(replaceBlock(once, 'facts', 'x\ny')).toBe(once);
  });

  it('preserves CRLF line endings of the host file', () => {
    const crlf = DOC.replace(/\n/g, '\r\n');
    const next = replaceBlock(crlf, 'facts', 'a\nb');
    expect(next).toBe(
      ['# Title', '', 'intro', '<!-- facts:start -->', 'a', 'b', '<!-- facts:end -->', '', 'outro', '']
        .join('\r\n'),
    );
    expect(next.includes('\r\r')).toBe(false);
    expect(next.replace(/\r\n/g, '').includes('\n')).toBe(false);
  });

  it('round-trips through extractBlock', () => {
    const content = '| a | b |\n|---|---|\n| 1 | 2 |';
    expect(extractBlock(replaceBlock(DOC, 'facts', content), 'facts')).toBe(content);
  });

  it('throws when the markers are missing instead of appending silently', () => {
    expect(() => replaceBlock('# nothing', 'facts', 'x')).toThrow(FactsError);
  });
});

describe('checkBlock', () => {
  it('reports ok when the block matches the expected content', () => {
    expect(checkBlock(DOC, 'facts', 'old line 1\nold line 2')).toEqual({ ok: true, diff: '' });
  });

  it('reports ok for a CRLF host file', () => {
    const crlf = DOC.replace(/\n/g, '\r\n');
    expect(checkBlock(crlf, 'facts', 'old line 1\nold line 2').ok).toBe(true);
  });

  it('reports a diff naming the changed line when a number is tampered with', () => {
    const generated = '| Levels | 150 |\n| Worlds | 15 |';
    const tampered = replaceBlock(DOC, 'facts', '| Levels | 151 |\n| Worlds | 15 |');
    const result = checkBlock(tampered, 'facts', generated);
    expect(result.ok).toBe(false);
    expect(result.diff).toContain('- | Levels | 150 |');
    expect(result.diff).toContain('+ | Levels | 151 |');
    expect(result.diff).not.toContain('Worlds');
  });
});

describe('lineDiff', () => {
  it('is empty for identical text', () => {
    expect(lineDiff('a\nb', 'a\nb')).toBe('');
  });

  it('marks missing and extra trailing lines', () => {
    const diff = lineDiff('a\nb', 'a');
    expect(diff).toContain('- b');
    const extra = lineDiff('a', 'a\nc');
    expect(extra).toContain('+ c');
  });
});

// ---------------------------------------------------------------------------
// Fact collection (pure parsing of file contents handed in by scripts/facts.mjs)
// ---------------------------------------------------------------------------

describe('deriveVersion (D-20)', () => {
  it('derives versionCode = MAJOR*1_000_000 + MINOR*10_000 + PATCH*100 + BUILD', () => {
    expect(deriveVersion('1.0.0', 1)).toEqual({ versionName: '1.0.0', versionCode: 1000001 });
    expect(deriveVersion('1.2.3', 4)).toEqual({ versionName: '1.2.3', versionCode: 1020304 });
  });

  it('is monotonic when androidBuild is bumped', () => {
    expect(deriveVersion('1.0.0', 2).versionCode).toBeGreaterThan(deriveVersion('1.0.0', 1).versionCode);
  });

  it('derives nothing while androidBuild is unset', () => {
    expect(deriveVersion('1.0.0-rc.1', undefined)).toEqual({ versionName: null, versionCode: null });
  });

  it('rejects out-of-range parts and non MAJOR.MINOR.PATCH versions once androidBuild is set', () => {
    expect(() => deriveVersion('1.100.0', 1)).toThrow(FactsError);
    expect(() => deriveVersion('1.0.100', 1)).toThrow(FactsError);
    expect(() => deriveVersion('1.0.0', 100)).toThrow(FactsError);
    expect(() => deriveVersion('1.0.0', 1.5)).toThrow(FactsError);
    expect(() => deriveVersion('1.0.0-rc.1', 1)).toThrow(FactsError);
  });
});

describe('installedVersion', () => {
  const lock = {
    packages: {
      'node_modules/phaser': { version: '3.90.0' },
      'node_modules/@capacitor/core': { version: '8.4.0' },
    },
  };

  it('reads plain and scoped package versions from package-lock.json', () => {
    expect(installedVersion(lock, 'phaser')).toBe('3.90.0');
    expect(installedVersion(lock, '@capacitor/core')).toBe('8.4.0');
  });

  it('returns null for a package that is not installed', () => {
    expect(installedVersion(lock, 'left-pad')).toBeNull();
  });
});

describe('parseSdk', () => {
  const gradle = [
    'ext {',
    '    minSdkVersion = 24',
    '    compileSdkVersion = 36',
    '    targetSdkVersion = 35',
    "    androidxActivityVersion = '1.11.0'",
    '}',
  ].join('\n');

  it('reads min, compile and target SDK from variables.gradle', () => {
    expect(parseSdk(gradle)).toEqual({ minSdk: 24, compileSdk: 36, targetSdk: 35 });
  });

  it('throws when a value is missing', () => {
    expect(() => parseSdk('ext { minSdkVersion = 24 }')).toThrow(FactsError);
  });
});

describe('parseCiNodeVersions', () => {
  it('collects unique node-version values in file order and ignores commented lines', () => {
    const yml = [
      '      - uses: actions/setup-node@v4',
      '        with:',
      '          node-version: 20',
      "      - with: { node-version: '22' }",
      '  #     - uses: actions/setup-node@v4',
      '  #       with: { node-version: 18 }',
      '          node-version: 20',
    ].join('\n');
    expect(parseCiNodeVersions(yml)).toEqual(['20', '22']);
  });

  it('returns an empty list when CI sets no node version', () => {
    expect(parseCiNodeVersions('name: CI')).toEqual([]);
  });
});

describe('parseSceneNames', () => {
  const mainTs = [
    'const game = new Phaser.Game({',
    '  scale: { mode: 1 },',
    '  scene: [',
    '    BootScene,',
    '    CompanySplashScene, // splash',
    '    // DisabledScene,',
    '    GameScene,',
    '  ],',
    '});',
  ].join('\n');

  it('lists the scene classes registered in the scene array, skipping comments', () => {
    expect(parseSceneNames(mainTs)).toEqual(['BootScene', 'CompanySplashScene', 'GameScene']);
  });

  it('throws when there is no scene array', () => {
    expect(() => parseSceneNames('const x = 1;')).toThrow(FactsError);
  });
});

describe('levelFileStats', () => {
  const indexTs = [
    "import { level1 } from './level1';",
    "import { level2 } from './level2';",
    "// import { level3 } from './level3';",
    "import { level10 } from './level10';",
    'export const LEVELS = [level1, level2, level10];',
  ].join('\n');
  const files = [
    'index.ts', '_template.ts', 'levels.test.ts',
    'level1.ts', 'level2.ts', 'level3.ts', 'level10.ts', 'level6.ts',
  ];

  it('counts level modules on disk and lists the ones index.ts no longer imports', () => {
    expect(levelFileStats(indexTs, files)).toEqual({ onDisk: 5, retired: [3, 6] });
  });
});

describe('summarizeVitestReport', () => {
  const report = {
    numTotalTests: 221,
    numPassedTests: 221,
    numFailedTests: 0,
    numFailedTestSuites: 0,
    testResults: Array.from({ length: 28 }, (_, i) => ({ name: `f${i}`, status: 'passed' })),
  };

  it('reports file and test counts from a Vitest JSON report', () => {
    expect(summarizeVitestReport(report)).toEqual({ files: 28, tests: 221 });
  });

  it('refuses to summarize a red suite', () => {
    expect(() => summarizeVitestReport({ ...report, numFailedTests: 1, numPassedTests: 220 })).toThrow(
      /failing/,
    );
    expect(() => summarizeVitestReport({ ...report, numFailedTestSuites: 1 })).toThrow(/failing/);
  });
});

describe('buildFacts / renderFacts', () => {
  const raw = () => ({
    pkg: { version: '1.0.0-rc.1' },
    lock: {
      packages: {
        'node_modules/phaser': { version: '3.90.0' },
        'node_modules/@capacitor/core': { version: '8.4.0' },
        'node_modules/@capacitor/android': { version: '8.4.0' },
        'node_modules/@capacitor-community/admob': { version: '8.0.0' },
        'node_modules/@revenuecat/purchases-capacitor': { version: '13.1.5' },
        'node_modules/@capacitor-firebase/analytics': { version: '8.3.0' },
        'node_modules/@capacitor-firebase/crashlytics': { version: '8.3.0' },
      },
    },
    variablesGradle: 'minSdkVersion = 24\ncompileSdkVersion = 36\ntargetSdkVersion = 36',
    ciYml: 'node-version: 20',
    mainTs: 'scene: [BootScene, GameScene, EndScene]',
    levelsIndexTs: "import { level1 } from './level1';\nimport { level2 } from './level2';",
    levelDirFiles: ['level1.ts', 'level2.ts', 'level9.ts', 'index.ts'],
    counts: {
      levels: 150, worlds: 15, dailyLevels: 8, chunks: 40, achievements: 14, cosmetics: 23, bundles: 4,
    },
    vitestReport: {
      numTotalTests: 221,
      numPassedTests: 221,
      numFailedTests: 0,
      numFailedTestSuites: 0,
      testResults: Array.from({ length: 28 }, () => ({})),
    },
  });

  it('assembles every fact from the raw inputs', () => {
    const facts = buildFacts(raw());
    expect(facts.counts).toMatchObject({
      levels: 150, worlds: 15, scenes: 3, levelFiles: 3, retiredLevelFiles: 1,
    });
    expect(facts.retiredLevelNumbers).toEqual([9]);
    expect(facts.tests).toEqual({ files: 28, tests: 221 });
    expect(facts.deps.phaser).toBe('3.90.0');
    expect(facts.android).toEqual({ minSdk: 24, compileSdk: 36, targetSdk: 36 });
    expect(facts.ci.nodeVersions).toEqual(['20']);
    expect(facts.app).toEqual({
      version: '1.0.0-rc.1', androidBuild: null, versionName: null, versionCode: null,
    });
  });

  it('derives versionName/versionCode once package.json carries androidBuild', () => {
    const input = raw();
    input.pkg = { version: '1.0.0', androidBuild: 1 };
    expect(buildFacts(input).app).toEqual({
      version: '1.0.0', androidBuild: 1, versionName: '1.0.0', versionCode: 1000001,
    });
  });

  it('fails loudly when the collector output lacks a count', () => {
    const input = raw();
    delete input.counts.chunks;
    expect(() => buildFacts(input)).toThrow(/chunks/);
  });

  it('renders the documented table rows in a fixed order', () => {
    const text = renderFacts(buildFacts(raw()));
    const rows = text.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| Fact'));
    expect(rows.map((r) => r.split(' | ')[0].slice(2))).toEqual([
      'Campaign',
      'Other content',
      'Scenes registered',
      'Level files',
      'Tests',
      'package.json version',
      'androidBuild',
      'Derived versionName / versionCode',
      '`phaser`',
      '`@capacitor/core`',
      '`@capacitor/android`',
      '`@capacitor-community/admob`',
      '`@revenuecat/purchases-capacitor`',
      '`@capacitor-firebase/analytics`',
      '`@capacitor-firebase/crashlytics`',
      'Android SDK (min / compile / target)',
      'CI Node',
    ]);
    expect(text).toContain('| Campaign | 150 levels in 15 worlds |');
    expect(text).toContain('| Tests | 28 files / 221 tests |');
    expect(text).toContain('| Level files | 3 on disk · 1 retired (9) |');
    expect(text).toContain('| Android SDK (min / compile / target) | 24 / 36 / 36 |');
    expect(text).toContain('| `phaser` | 3.90.0 |');
    expect(text).toContain('| CI Node | 20 |');
  });

  it('is deterministic and carries no git hash', () => {
    const a = renderFacts(buildFacts(raw()));
    expect(renderFacts(buildFacts(raw()))).toBe(a);
    expect(a).not.toMatch(/\b(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b/);
  });

  it('says so plainly when the version is not derived yet', () => {
    const text = renderFacts(buildFacts(raw()));
    expect(text).toContain('| androidBuild | unset |');
    expect(text).toContain('not derived');
  });

  it('renders a one-line README summary', () => {
    expect(renderReadmeLine(buildFacts(raw()))).toBe(
      '150 levels in 15 worlds · 28 test files / 221 tests · Phaser 3.90.0 · Capacitor 8.4.0',
    );
  });
});
