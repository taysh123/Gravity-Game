// Build mode (P00-T20). Which ids and debug overrides a build carries is decided by the Vite mode, never by a runtime flag:
//   vite build --mode release   (npm run build:release)  -> production ids, no debug overrides
//   every other mode (dev, `vite build`, tests)          -> Google test ids, debug overrides allowed
// monetization.config.ts and consent.config.ts read IS_RELEASE_BUILD at module level, as a constant Rollup can fold, so the branch
// a release build does not take (Google's test ids, the debug env reads) is not in its bundle at all. scripts/release-check.mjs
// --assets scans the synced bundle for exactly those leftovers.
export const RELEASE_MODE = 'release';
export const IS_RELEASE_BUILD: boolean = import.meta.env.MODE === RELEASE_MODE;
