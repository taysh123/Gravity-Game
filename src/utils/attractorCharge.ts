// Hold duration → 0..1 "charge", eased with smoothstep. Drives ONLY the attractor's
// visual escalation (tendril count/alpha + lensing ring). It never touches the
// inverse-square force — the physics is unchanged.
export function chargeLevel(holdMs: number, fullMs: number): number {
  if (fullMs <= 0) return 1;
  const t = holdMs <= 0 ? 0 : holdMs >= fullMs ? 1 : holdMs / fullMs;
  return t * t * (3 - 2 * t); // smoothstep
}
