// Pure helpers for scripts/facts.mjs. No filesystem, no child processes, no clock:
// everything here is a function of its arguments so it can be unit-tested and so the
// generated facts block is deterministic (the CI drift check depends on that).

import { VersionError, deriveVersion as deriveD20Version } from '../lib/versionCode.mjs';

export class FactsError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FactsError';
  }
}

// ---------------------------------------------------------------------------
// Marker blocks:  <!-- {id}:start --> ... <!-- {id}:end -->  (markers on their own lines)
// ---------------------------------------------------------------------------

export function markers(id) {
  return { start: `<!-- ${id}:start -->`, end: `<!-- ${id}:end -->` };
}

/** True when either marker of the block is present (a half-present block is still an error to extract). */
export function hasBlock(text, id) {
  const { start, end } = markers(id);
  return text.includes(start) || text.includes(end);
}

function locate(text, id) {
  const { start, end } = markers(id);
  const find = (marker) => {
    const first = text.indexOf(marker);
    if (first === -1) throw new FactsError(`marker ${marker} not found`);
    if (text.indexOf(marker, first + marker.length) !== -1) {
      throw new FactsError(`marker ${marker} appears more than once`);
    }
    return first;
  };
  const startIdx = find(start);
  const endIdx = find(end);
  if (endIdx < startIdx) throw new FactsError(`${end} comes before ${start}`);
  return { innerStart: startIdx + start.length, endIdx };
}

const toLf = (s) => s.replace(/\r\n/g, '\n');

/** Block content as LF text, without the single newline after the start / before the end marker. */
export function extractBlock(text, id) {
  const { innerStart, endIdx } = locate(text, id);
  return toLf(text.slice(innerStart, endIdx)).replace(/^\n/, '').replace(/\n$/, '');
}

/** Replace the block content; the rest of the file is untouched and the file's EOL style is kept. */
export function replaceBlock(text, id, content) {
  const { innerStart, endIdx } = locate(text, id);
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const body = toLf(content).split('\n').join(eol);
  return text.slice(0, innerStart) + eol + body + eol + text.slice(endIdx);
}

/** Positional line diff: `- ` = generated (expected), `+ ` = found in the file. Empty string when equal. */
export function lineDiff(expected, actual) {
  const a = toLf(expected).split('\n');
  const b = toLf(actual).split('\n');
  const out = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === b[i]) continue;
    if (a[i] !== undefined) out.push(`- ${a[i]}`);
    if (b[i] !== undefined) out.push(`+ ${b[i]}`);
  }
  return out.join('\n');
}

/** Compare the block in `text` with freshly generated `expected` content. */
export function checkBlock(text, id, expected) {
  const actual = extractBlock(text, id);
  const want = toLf(expected);
  return actual === want ? { ok: true, diff: '' } : { ok: false, diff: lineDiff(want, actual) };
}

// ---------------------------------------------------------------------------
// Fact parsing (inputs are file contents / parsed JSON; scripts/facts.mjs does the I/O)
// ---------------------------------------------------------------------------

/** D-20 facts adapter over scripts/lib/versionCode.mjs (the only implementation). Nothing is derived until androidBuild exists. */
export function deriveVersion(version, androidBuild) {
  if (androidBuild === undefined || androidBuild === null) return { versionName: null, versionCode: null };
  try {
    return deriveD20Version(version, androidBuild);
  } catch (err) {
    throw err instanceof VersionError ? new FactsError(err.message) : err;
  }
}

/** Installed (locked) version of a package from package-lock.json, or null when it is not installed. */
export function installedVersion(lock, name) {
  return lock?.packages?.[`node_modules/${name}`]?.version ?? null;
}

/** min / compile / target SDK from android/variables.gradle. */
export function parseSdk(variablesGradle) {
  const read = (key) => {
    const m = new RegExp(`\\b${key}\\s*=\\s*(\\d+)`).exec(variablesGradle);
    if (!m) throw new FactsError(`${key} not found in android/variables.gradle`);
    return Number(m[1]);
  };
  return {
    minSdk: read('minSdkVersion'),
    compileSdk: read('compileSdkVersion'),
    targetSdk: read('targetSdkVersion'),
  };
}

/** Unique `node-version` values from the (uncommented) lines of ci.yml, in file order. */
export function parseCiNodeVersions(ciYml) {
  const found = [];
  for (const line of ciYml.split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue;
    for (const m of line.matchAll(/node-version:\s*['"]?([0-9][^\s'",}#]*)/g)) {
      if (!found.includes(m[1])) found.push(m[1]);
    }
  }
  return found;
}

/** Scene class names registered in the `scene: [...]` array of src/main.ts. */
export function parseSceneNames(mainTs) {
  const m = /\bscene:\s*\[([\s\S]*?)\]/.exec(mainTs.replace(/\/\/[^\n]*/g, ''));
  if (!m) throw new FactsError('scene array not found in src/main.ts');
  return m[1].split(',').map((s) => s.trim()).filter(Boolean);
}

/** Level modules on disk, and the ones src/config/levels/index.ts no longer imports (retired). */
export function levelFileStats(levelsIndexTs, filenames) {
  const imported = new Set(
    [...levelsIndexTs.matchAll(/^import\s*\{\s*level(\d+)\s*\}\s*from\s*['"]\.\/level\1['"]/gm)].map((m) =>
      Number(m[1]),
    ),
  );
  const onDisk = filenames
    .map((f) => /^level(\d+)\.ts$/.exec(f))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  return {
    onDisk: onDisk.length,
    retired: onDisk.filter((n) => !imported.has(n)).sort((a, b) => a - b),
  };
}

/** File and test counts from a `vitest --reporter=json` report; refuses a red run. */
export function summarizeVitestReport(report) {
  const failedTests = report.numFailedTests ?? 0;
  const failedSuites = report.numFailedTestSuites ?? 0;
  if (failedTests > 0 || failedSuites > 0) {
    throw new FactsError(
      `the test run has failing tests (${failedTests} tests, ${failedSuites} suites); facts are only generated from a green run`,
    );
  }
  return { files: report.testResults.length, tests: report.numTotalTests };
}

// ---------------------------------------------------------------------------
// Assembly + rendering
// ---------------------------------------------------------------------------

// Order matters: it is the row order of the rendered table.
const DEP_PACKAGES = [
  'phaser',
  '@capacitor/core',
  '@capacitor/android',
  '@capacitor-community/admob',
  '@revenuecat/purchases-capacitor',
  '@capacitor-firebase/analytics',
  '@capacitor-firebase/crashlytics',
];

// Counts that scripts/facts/collect.ts must print (the TS-derived ones).
const COLLECT_KEYS = ['levels', 'worlds', 'dailyLevels', 'chunks', 'achievements', 'cosmetics', 'bundles'];

/** Assemble the deterministic facts object. Throws FactsError on any missing or inconsistent input. */
export function buildFacts(raw) {
  for (const key of COLLECT_KEYS) {
    if (!Number.isInteger(raw.counts?.[key])) {
      throw new FactsError(`collector output is missing the "${key}" count`);
    }
  }
  const levelFiles = levelFileStats(raw.levelsIndexTs, raw.levelDirFiles);
  const androidBuild = raw.pkg.androidBuild ?? null;
  return {
    app: {
      version: raw.pkg.version,
      androidBuild,
      ...deriveVersion(raw.pkg.version, androidBuild),
    },
    deps: Object.fromEntries(DEP_PACKAGES.map((name) => [name, installedVersion(raw.lock, name)])),
    android: parseSdk(raw.variablesGradle),
    ci: { nodeVersions: parseCiNodeVersions(raw.ciYml) },
    counts: {
      ...Object.fromEntries(COLLECT_KEYS.map((key) => [key, raw.counts[key]])),
      scenes: parseSceneNames(raw.mainTs).length,
      levelFiles: levelFiles.onDisk,
      retiredLevelFiles: levelFiles.retired.length,
    },
    retiredLevelNumbers: levelFiles.retired,
    tests: summarizeVitestReport(raw.vitestReport),
  };
}

/** The markdown that lives between <!-- facts:start --> and <!-- facts:end --> in docs/STATUS.md. */
export function renderFacts(facts) {
  const { app, deps, android, ci, counts, tests } = facts;
  const retired = facts.retiredLevelNumbers.length ? ` (${facts.retiredLevelNumbers.join(', ')})` : '';
  const rows = [
    ['Campaign', `${counts.levels} levels in ${counts.worlds} worlds`],
    [
      'Other content',
      `${counts.dailyLevels} daily levels · ${counts.chunks} run chunks · ${counts.achievements} achievements · ${counts.cosmetics} cosmetics · ${counts.bundles} bundles`,
    ],
    ['Scenes registered', String(counts.scenes)],
    ['Level files', `${counts.levelFiles} on disk · ${counts.retiredLevelFiles} retired${retired}`],
    ['Tests', `${tests.files} files / ${tests.tests} tests`],
    ['package.json version', app.version],
    ['androidBuild', app.androidBuild === null ? 'unset' : String(app.androidBuild)],
    [
      'Derived versionName / versionCode',
      app.versionCode === null
        ? 'not derived (androidBuild unset in package.json; D-20)'
        : `${app.versionName} / ${app.versionCode}`,
    ],
    ...Object.entries(deps).map(([name, version]) => [`\`${name}\``, version ?? 'not installed']),
    [
      'Android SDK (min / compile / target)',
      `${android.minSdk} / ${android.compileSdk} / ${android.targetSdk}`,
    ],
    ['CI Node', ci.nodeVersions.join(', ') || 'not set'],
  ];
  return [
    '> Generated by `node scripts/facts.mjs`; do not edit by hand. CI runs `node scripts/facts.mjs --check`.',
    '> Git state (HEAD, last tag, commits since tag) is deliberately not recorded: a committed file cannot contain its own hash. The script prints it.',
    '',
    '| Fact | Value |',
    '|---|---|',
    ...rows.map(([label, value]) => `| ${label} | ${value} |`),
  ].join('\n');
}

/** The one-line summary for README.md's <!-- facts:readme:start/end --> block. */
export function renderReadmeLine(facts) {
  const { counts, tests, deps } = facts;
  return `${counts.levels} levels in ${counts.worlds} worlds · ${tests.files} test files / ${tests.tests} tests · Phaser ${deps.phaser ?? 'n/a'} · Capacitor ${deps['@capacitor/core'] ?? 'n/a'}`;
}
