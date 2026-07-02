// Pure win-overlay spend-nudge gating (Wave 3 Task 4). No localStorage/Phaser
// here — GameScene owns the impure glue (the persisted "wins since the nudge
// last showed" counter) and resolves every field before calling in, mirroring
// utils/interstitial.ts's pure-gate / impure-glue split. Keeping this pure
// makes the "genuinely helpful, genuinely infrequent" rules directly testable.

export interface AffordabilityItem {
  id: string;
  cost: number;
  currency: string;
}

// True iff at least one NOT-owned, Stardust-priced item in `cosmetics` costs no
// more than `stardust` — i.e. the player can actually spend right now. Never a
// fake "you can afford it!" claim: Fragments-priced and already-owned items
// never count.
export function canAffordAnyUnowned(
  stardust: number,
  cosmetics: AffordabilityItem[],
  owned: Set<string>,
): boolean {
  return cosmetics.some(
    (c) => c.currency === 'stardust' && !owned.has(c.id) && c.cost <= stardust,
  );
}

// True once at least `cooldownWins` ELIGIBLE wins have passed since the nudge
// last showed (the caller defines "eligible" — campaign, non-first-win — and
// owns incrementing/resetting the persisted counter). Keeps the nudge
// genuinely infrequent/helpful rather than nagging.
export function nudgeDue(winsSinceLast: number, cooldownWins: number): boolean {
  return winsSinceLast >= cooldownWins;
}
