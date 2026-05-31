// Central image asset map. PNGs live outside src/ and are import-bundled by
// Vite (returns a hashed, base-aware URL) — never reference raw paths, or the
// build won't fingerprint them. Optimized via `npm run optimize:assets`.
import gravityFlowLogo from '../../assets/images/gravity-flow-logo.png';
import trueStoryLabsLogo from '../../assets/images/true-story-labs-logo.png';

export const IMAGES = {
  gravityFlowLogo: { key: 'gravity-flow-logo', url: gravityFlowLogo },
  trueStoryLabsLogo: { key: 'true-story-labs-logo', url: trueStoryLabsLogo },
} as const;
