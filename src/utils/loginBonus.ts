// Daily login bonus — a free Stardust/Fragments reward for opening the app,
// escalating by CONSECUTIVE LOGIN DAYS (see DailyStore.claimLoginBonus for the
// login-day counter + the once-per-day idempotent claim). Pure + tested, no
// storage here — mirrors daily.ts/streak.ts. Currency/Fragments only: never a
// purchase, never gameplay-affecting (see Global Constraints — no P2W).
import { RETENTION } from '../config/retention.config';

export interface LoginBonus {
  sd: number;
  fr: number;
}

// The reward for the Nth consecutive login day. Climbs from day 1 up to the
// ladder's last (best) entry, then cycles — day 8 repeats day 1, and so on —
// so a very long login streak keeps paying out instead of running off the end
// of the table. A non-positive or fractional/NaN day defensively reads as day 1.
export function loginBonusFor(consecutiveDays: number): LoginBonus {
  const ladder = RETENTION.LOGIN_BONUS_LADDER;
  const whole = Number.isFinite(consecutiveDays) ? Math.floor(consecutiveDays) : 1;
  const day = Math.max(1, whole);
  const idx = (day - 1) % ladder.length;
  return { ...ladder[idx] };
}
