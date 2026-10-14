import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// P00-T28 guard (STATUS B-14). The Vercel build runs `npm run build` (`tsc && vite build`) on an upload that leaves
// out every path `.vercelignore` lists, and `tsc` checks all of `src/`, tests included. A `src` file that imports from
// an excluded path therefore breaks every web deploy, while local runs and GitHub CI (full checkout) stay green.
// That is how `95953fc` (P00-T20) broke the web build for six days without a red check anywhere.

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const srcDir = join(repoRoot, 'src');

/** Non-comment entries of .vercelignore, without leading or trailing slashes. */
function ignoredEntries(): string[] {
  return readFileSync(join(repoRoot, '.vercelignore'), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => line.replace(/^\/+|\/+$/g, ''));
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|mts)$/.test(name) ? [full] : [];
  });
}

// Static `import … from`, `export … from`, side-effect `import '…'` and `import('…')` with a relative specifier.
const RELATIVE_IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"](\.{1,2}\/[^'"]+)['"]/g;

/** Every relative import in src/, resolved to a repo-relative path with forward slashes. */
function resolvedImports(): { file: string; spec: string; target: string }[] {
  return sourceFiles(srcDir).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(RELATIVE_IMPORT)].map(([, spec]) => ({
      file: relative(repoRoot, file).split('\\').join('/'),
      spec,
      target: relative(repoRoot, resolve(dirname(file), spec)).split('\\').join('/'),
    })),
  );
}

describe('.vercelignore vs src imports (B-14)', () => {
  it('lists only plain paths, so this guard reads every entry correctly (no globs or negations)', () => {
    for (const entry of ignoredEntries()) expect(entry).toMatch(/^[\w.@-]+(\/[\w.@-]+)*$/);
  });

  it('sees the src -> scripts/lib release-guard imports (positive control: the scan is not vacuous)', () => {
    const targets = resolvedImports().map((i) => i.target);
    expect(targets).toContain('scripts/lib/releaseCheck.mjs');
    expect(targets).toContain('scripts/lib/releaseInputs.mjs');
  });

  it('no file under src/ imports a path that the Vercel upload leaves out', () => {
    const ignored = ignoredEntries();
    const offenders = resolvedImports()
      .filter(({ target }) => ignored.some((entry) => target === entry || target.startsWith(`${entry}/`)))
      .map(({ file, spec }) => `${file} -> ${spec}`);
    expect(offenders).toEqual([]);
  });
});
