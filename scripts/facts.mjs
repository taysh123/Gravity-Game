#!/usr/bin/env node
// Regenerates (or, with --check, verifies) the generated facts blocks:
//   docs/STATUS.md  between <!-- facts:start --> and <!-- facts:end -->          (required)
//   README.md       between <!-- facts:readme:start --> and <!-- facts:readme:end -->  (only once its markers exist)
//
//   node scripts/facts.mjs                       rewrite the blocks
//   node scripts/facts.mjs --check               exit 1 + diff when a block is stale (CI)
//   node scripts/facts.mjs --vitest-json <path>  reuse a `vitest --reporter=json` report instead of running the suite
//
// Exit codes: 0 ok / written, 1 stale block (--check), 2 error (bad markers, red tests, collector failure, ...).
// Git state (HEAD, last tag, commits since tag) is printed but never written: a committed file cannot contain its own hash.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FactsError,
  buildFacts,
  checkBlock,
  hasBlock,
  renderFacts,
  renderReadmeLine,
  replaceBlock,
} from './facts/factsLib.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TARGETS = [
  { file: 'docs/STATUS.md', id: 'facts', required: true, render: renderFacts },
  { file: 'README.md', id: 'facts:readme', required: false, render: renderReadmeLine },
];

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

function parseArgs(argv) {
  const opts = { check: false, vitestJson: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--check') opts.check = true;
    else if (argv[i] === '--vitest-json') {
      opts.vitestJson = argv[++i];
      if (!opts.vitestJson) throw new FactsError('--vitest-json needs a path');
    } else throw new FactsError(`unknown argument "${argv[i]}" (usage: facts.mjs [--check] [--vitest-json <path>])`);
  }
  return opts;
}

function nodeBin(rel, hint) {
  const full = join(ROOT, rel);
  if (!existsSync(full)) throw new FactsError(`${rel} not found; ${hint}`);
  return full;
}

/** Counts that only TypeScript can give us (imports the real config modules through vite-node). */
function collectCounts() {
  const viteNode = nodeBin('node_modules/vite-node/vite-node.mjs', 'run `npm ci` first');
  const run = spawnSync(process.execPath, [viteNode, 'scripts/facts/collect.ts'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (run.status !== 0) {
    throw new FactsError(`scripts/facts/collect.ts failed (exit ${run.status}):\n${run.stderr || run.stdout}`);
  }
  const line = run.stdout.trim().split('\n').filter((l) => l.startsWith('{')).pop();
  if (!line) throw new FactsError(`scripts/facts/collect.ts printed no JSON:\n${run.stdout}`);
  return JSON.parse(line);
}

/** A Vitest JSON report: reuse `--vitest-json <path>` or run the whole suite once. */
function loadVitestReport(vitestJson) {
  if (vitestJson) return JSON.parse(readFileSync(resolve(vitestJson), 'utf8'));
  const vitest = nodeBin('node_modules/vitest/vitest.mjs', 'run `npm ci` first');
  const dir = mkdtempSync(join(tmpdir(), 'gravity-facts-'));
  const out = join(dir, 'vitest.json');
  try {
    // A red suite still writes the report; summarizeVitestReport turns it into a clear error.
    const run = spawnSync(process.execPath, [vitest, 'run', '--reporter=json', `--outputFile=${out}`], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    if (!existsSync(out)) {
      throw new FactsError(`vitest produced no report (exit ${run.status}):\n${run.stderr || run.stdout}`);
    }
    return JSON.parse(readFileSync(out, 'utf8'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function gitLine() {
  // stderr is discarded: a shallow CI checkout has no tags, and `git describe` would print "fatal: No names found".
  const git = (...args) =>
    execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  try {
    const head = git('rev-parse', '--short', 'HEAD');
    let tag = 'none';
    let since = 'n/a';
    try {
      tag = git('describe', '--tags', '--abbrev=0');
      since = git('rev-list', '--count', `${tag}..HEAD`);
    } catch {
      // no tags reachable
    }
    return `git: HEAD ${head} · last tag ${tag} · ${since} commits since tag (printed only, never written to a block)`;
  } catch {
    return 'git: unavailable';
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const facts = buildFacts({
    pkg: JSON.parse(read('package.json')),
    lock: JSON.parse(read('package-lock.json')),
    variablesGradle: read('android/variables.gradle'),
    ciYml: read('.github/workflows/ci.yml'),
    mainTs: read('src/main.ts'),
    levelsIndexTs: read('src/config/levels/index.ts'),
    levelDirFiles: readdirSync(join(ROOT, 'src/config/levels')),
    counts: collectCounts(),
    vitestReport: loadVitestReport(opts.vitestJson),
  });

  let stale = false;
  for (const { file, id, required, render } of TARGETS) {
    const text = read(file);
    if (!required && !hasBlock(text, id)) {
      console.log(`facts: ${file} has no <!-- ${id}:start --> marker; skipped`);
      continue;
    }
    const expected = render(facts);
    try {
      if (opts.check) {
        const { ok, diff } = checkBlock(text, id, expected);
        if (ok) console.log(`facts: ${file} block "${id}" is current`);
        else {
          stale = true;
          console.error(`facts: ${file} block "${id}" is stale ('-' generated now, '+' found in the file):\n${diff}`);
        }
      } else {
        const next = replaceBlock(text, id, expected);
        if (next !== text) writeFileSync(join(ROOT, file), next);
        console.log(`facts: ${file} block "${id}" ${next === text ? 'already current' : 'written'}`);
      }
    } catch (err) {
      throw err instanceof FactsError ? new FactsError(`${file}: ${err.message}`) : err;
    }
  }
  console.log(gitLine());
  if (stale) {
    console.error('facts: run `node scripts/facts.mjs` and commit the result.');
    return 1;
  }
  return 0;
}

try {
  process.exitCode = main();
} catch (err) {
  console.error(`facts: error: ${err instanceof FactsError ? err.message : (err?.stack ?? err)}`);
  process.exitCode = 2;
}
