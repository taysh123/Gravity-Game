// TS-derived counts for scripts/facts.mjs. Run through vite-node (it resolves the .ts
// imports the same way Vitest does): `npx vite-node scripts/facts/collect.ts`.
// Prints one JSON object on stdout. Keep the keys in sync with COLLECT_KEYS in factsLib.mjs.
import { LEVELS } from '../../src/config/levels';
import { WORLDS } from '../../src/config/worlds';
import { DAILY_LEVELS } from '../../src/config/dailyLevels';
import { CHUNKS } from '../../src/config/endless/chunks';
import { ACHIEVEMENTS } from '../../src/utils/achievements';
import { COSMETICS } from '../../src/utils/cosmetics';
import { BUNDLES } from '../../src/config/monetization.config';

process.stdout.write(
  JSON.stringify({
    levels: LEVELS.length,
    worlds: WORLDS.length,
    dailyLevels: DAILY_LEVELS.length,
    chunks: CHUNKS.length,
    achievements: ACHIEVEMENTS.length,
    cosmetics: COSMETICS.length,
    bundles: BUNDLES.length,
  }) + '\n',
);
