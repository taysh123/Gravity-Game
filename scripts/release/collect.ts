// The production ids the release guard checks, read from the real config module so the guard sees exactly what a release build
// would bake in. Run through vite-node by scripts/release-check.mjs (the same way scripts/facts.mjs runs scripts/facts/collect.ts):
// `npx vite-node scripts/release/collect.ts`. Prints one JSON object on stdout. Not part of the app bundle or the tsconfig include.
import { ADMOB_PROD, REVENUECAT_API_KEY_PROD } from '../../src/config/monetization.config';

process.stdout.write(JSON.stringify({ admobProd: ADMOB_PROD, revenueCatApiKey: REVENUECAT_API_KEY_PROD }) + '\n');
