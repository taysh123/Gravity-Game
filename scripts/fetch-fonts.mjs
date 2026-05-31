// Download self-hosted woff2 for the app fonts (latin subset only) from Google
// Fonts, so the packaged game has no runtime CDN dependency.
// Run: npm run fonts:fetch
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'assets/fonts');
await mkdir(outDir, { recursive: true });

// Modern UA so Google serves woff2.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const cssUrl =
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700&family=Exo+2:wght@400;500;600&display=swap';

const css = await (await fetch(cssUrl, { headers: { 'User-Agent': UA } })).text();

// Keep only the `/* latin */` @font-face blocks.
const segments = css.split('/*').map((s) => '/*' + s);
let count = 0;
for (const seg of segments) {
  if (!seg.includes('latin */')) continue;
  const fam = (seg.match(/font-family:\s*'([^']+)'/) || [])[1];
  const wght = (seg.match(/font-weight:\s*(\d+)/) || [])[1];
  const url = (seg.match(/url\(([^)]+\.woff2)\)/) || [])[1];
  if (!fam || !wght || !url) continue;
  const name = `${fam.toLowerCase().replace(/\s+/g, '-')}-${wght}.woff2`;
  const buf = Buffer.from(await (await fetch(url, { headers: { 'User-Agent': UA } })).arrayBuffer());
  await writeFile(resolve(outDir, name), buf);
  console.log(`${name}: ${(buf.length / 1024).toFixed(0)} KB`);
  count++;
}
console.log(`done — ${count} font files in assets/fonts`);
