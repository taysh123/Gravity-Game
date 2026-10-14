import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ts from 'typescript';

// P00-T28 guard (STATUS B-14). The Vercel build runs `npm run build` (`tsc && vite build`) on an upload that leaves
// out every path `.vercelignore` lists. A file that `tsc` reads (anything under `src/`, tests included, plus whatever
// they import) and that sits under an excluded path breaks every web deploy. Local runs and GitHub CI (full checkout)
// stay green meanwhile. That is how `95953fc` (P00-T20) broke the web build for six days without a red check anywhere.
// Scope: what `tsc` reads. Assets that only `vite build` reads (CSS url(), image imports) are not covered here.

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

/** Raw non-comment lines of .vercelignore. */
function ignoreLines(): string[] {
  return readFileSync(join(repoRoot, '.vercelignore'), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
}

/**
 * gitignore semantics for plain entries (Vercel follows them):
 * - an entry with no inner slash (`docs`, `node_modules/`) matches a path segment at any depth;
 * - an entry with a leading or inner slash (`/dist`, `assets/raw`) is anchored at the repo root.
 */
function isIgnored(repoPath: string, line: string): boolean {
  const entry = line.replace(/^\/+|\/+$/g, '');
  const anchored = line.startsWith('/') || entry.includes('/');
  if (anchored) return repoPath === entry || repoPath.startsWith(`${entry}/`);
  return repoPath.split('/').includes(entry);
}

/** Every non-node_modules file the compiler reads for `npm run build`'s `tsc` step, as repo-relative paths. */
function filesTscReads(): string[] {
  const configPath = join(repoRoot, 'tsconfig.json');
  const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, repoRoot);
  const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
  return program
    .getSourceFiles()
    .map((sf) => relative(repoRoot, sf.fileName).split('\\').join('/'))
    .filter((p) => !p.startsWith('..') && !p.split('/').includes('node_modules'));
}

describe('.vercelignore vs what tsc reads (B-14)', () => {
  it('lists only plain paths, so isIgnored reads every entry correctly (no globs or negations)', () => {
    for (const line of ignoreLines()) expect(line).toMatch(/^\/?[\w.@-]+(\/[\w.@-]+)*\/?$/);
  });

  it('matches like gitignore: slash-less entries at any depth, slashed entries from the root only', () => {
    expect(isIgnored('docs/STATUS.md', 'docs')).toBe(true);
    expect(isIgnored('src/help/docs/page.ts', 'docs')).toBe(true);
    expect(isIgnored('src/documents.ts', 'docs')).toBe(false);
    expect(isIgnored('dist/index.html', '/dist')).toBe(true);
    expect(isIgnored('src/dist/x.ts', '/dist')).toBe(false);
    expect(isIgnored('assets/raw/logo.png', 'assets/raw')).toBe(true);
    expect(isIgnored('src/assets/raw/x.ts', 'assets/raw')).toBe(false);
    expect(isIgnored('scripts/lib/releaseCheck.d.mts', 'scripts')).toBe(true);
    expect(isIgnored('node_modules/phaser/types/phaser.d.ts', 'node_modules/')).toBe(true);
    expect(isIgnored('src/vendor/node_modules/x.ts', 'node_modules/')).toBe(true);
  });

  it(
    'no file that tsc reads sits under a path the Vercel upload leaves out',
    () => {
      const files = filesTscReads();
      // Positive control: the program really is the build's (entry point present, many files), not an empty list.
      expect(files).toContain('src/main.ts');
      expect(files.length).toBeGreaterThan(50);
      const lines = ignoreLines();
      const offenders = files.filter((file) => lines.some((line) => isIgnored(file, line)));
      expect(offenders).toEqual([]);
    },
    60_000,
  );
});
