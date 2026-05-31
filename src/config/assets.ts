// Central image asset map. PNGs live outside src/ and are import-bundled by
// Vite (returns a hashed, base-aware URL) — never reference raw paths, or the
// build won't fingerprint them. Optimized via `npm run optimize:assets`.
import trueStoryLogo from '../../assets/images/true-story-logo.png';
import gravityFlowLogo from '../../assets/images/gravity-flow-logo.png';

export const IMAGES = {
  trueStoryLogo: { key: 'true-story-logo', url: trueStoryLogo },
  gravityFlowLogo: { key: 'gravity-flow-logo', url: gravityFlowLogo },
} as const;
