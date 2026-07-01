// Pure win-celebration tiering. Maps a run's result (stars + boss-ness) to a
// coordinated feel spec (shake, optional screen flash, camera punch, bloom
// swell, haptic pattern) consumed by GameScene.triggerWin. Escalates
// monotonically: normal → great → perfect → boss.
import { FX } from '../config/fx.config';

export type CelebrationTier = 'normal' | 'great' | 'perfect' | 'boss';

export interface CelebrationSpec {
  tier: CelebrationTier;
  shakeMs: number;
  shakeIntensity: number;
  screenFlash: boolean;   // whether to fire the screen-wide celebrationFlash bloom
  bloomBoost: number;     // transient add to the global post-FX bloom strength
  cameraPunch: number;    // zoom kick factor
  hapticKey: 'HAPTIC_WIN_PATTERN' | 'HAPTIC_PERFECT_PATTERN' | 'HAPTIC_BOSS_PATTERN';
}

export function celebrationTier(stars: number, isBoss: boolean): CelebrationTier {
  if (isBoss) return 'boss';
  if (stars >= 3) return 'perfect';
  if (stars >= 2) return 'great';
  return 'normal';
}

export function celebrationSpec(tier: CelebrationTier): CelebrationSpec {
  const c =
    tier === 'boss' ? FX.CELEB_BOSS :
    tier === 'perfect' ? FX.CELEB_PERFECT :
    tier === 'great' ? FX.CELEB_GREAT : FX.CELEB_NORMAL;
  const hapticKey =
    tier === 'boss' ? 'HAPTIC_BOSS_PATTERN' :
    tier === 'perfect' ? 'HAPTIC_PERFECT_PATTERN' : 'HAPTIC_WIN_PATTERN';
  return { tier, ...c, hapticKey };
}
