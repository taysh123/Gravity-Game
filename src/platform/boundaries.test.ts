import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Layer boundary for src/platform (docs/architecture/TECHNICAL-ARCHITECTURE.md section 3): services import platform, never the reverse.
// P00-T19 fix pass 2: platform/lifecycle.ts had grown an import of services/Ads (to ask Ads.isShowing() for Back), which made the two
// layers depend on each other. It now asks the dependency-free externalFlow flag instead, and this scan keeps it that way.

const srcRoot = fileURLToPath(new URL('../', import.meta.url));

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name)) out.push(full);
  }
  return out;
}

const rel = (f: string): string => relative(srcRoot, f).replace(/\\/g, '/');
const code = (f: string): string => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

// Every module a file pulls in (static import, export-from, dynamic import with a literal), as a src-relative path without extension.
function imports(file: string): string[] {
  const text = code(file);
  const specs: string[] = [];
  const re = /(?:\bimport|\bexport)\s[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (let m = re.exec(text); m; m = re.exec(text)) specs.push(m[1] ?? m[2] ?? m[3]);
  return specs
    .filter((s) => s.startsWith('.'))
    .map((s) => relative(srcRoot, resolve(dirname(file), s)).replace(/\\/g, '/'));
}

const all = sourceFiles(srcRoot);
const platformFiles = all.filter((f) => rel(f).startsWith('platform/'));
const serviceFiles = all.filter((f) => rel(f).startsWith('services/'));
const serviceKey = (f: string): string => rel(f).replace(/\.ts$/, '');

// Services that import src/platform (the other half of a two-way dependency).
const servicesUsingPlatform = serviceFiles.filter((f) => imports(f).some((i) => i.startsWith('platform/'))).map(serviceKey);

// platform -> services imports that exist today, as "platform file -> service module".
const platformToServices = platformFiles.flatMap((f) =>
  imports(f).filter((i) => i.startsWith('services/')).map((i) => `${rel(f)} -> ${i}`),
);

describe('src/platform does not depend on the services layer', () => {
  it('the scan sees the layers (a sanity check so the assertions below cannot pass vacuously)', () => {
    expect(platformFiles.length).toBeGreaterThan(8);
    expect(servicesUsingPlatform).toEqual(expect.arrayContaining(['services/Ads', 'services/IAP']));
    expect(imports(join(srcRoot, 'services/Ads.ts'))).toContain('platform/externalFlow');
  });

  it('no platform file imports services/Ads', () => {
    expect(platformToServices.filter((e) => e.endsWith('-> services/Ads'))).toEqual([]);
  });

  it('no platform file imports any service that itself imports src/platform (no two-way dependency)', () => {
    const twoWay = platformToServices.filter((e) => servicesUsingPlatform.includes(e.split(' -> ')[1]));
    expect(twoWay).toEqual([]);
  });

  // Pre-existing and left alone on purpose (not trivial to move; behaviour-identical to keep). Both targets are LEAF modules: Crash
  // imports only @capacitor/core, and the pure entitlements mapping imports only src/config. Neither imports src/platform, so they
  // form no cycle. A NEW platform -> services import fails here and needs an explicit decision.
  it('the only platform -> services imports are the three known ones, all on leaf modules', () => {
    expect([...platformToServices].sort()).toEqual([
      'platform/lifecycle.ts -> services/Crash',
      'platform/migrations.ts -> services/entitlements',
      'platform/saves.ts -> services/Crash',
    ]);
    for (const leaf of ['services/Crash.ts', 'services/entitlements.ts']) {
      expect(imports(join(srcRoot, leaf)).filter((i) => i.startsWith('platform/')), leaf).toEqual([]);
    }
  });

  it('platform never imports scenes or entities (section 3 enforcement)', () => {
    const up = platformFiles.flatMap((f) => imports(f).filter((i) => i.startsWith('scenes/') || i.startsWith('entities/')).map((i) => `${rel(f)} -> ${i}`));
    expect(up).toEqual([]);
  });
});
