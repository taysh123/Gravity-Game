// "The app is in the foreground again" subscribers (D-11). platform/lifecycle.ts owns foreground detection
// (`visibilitychange` plus the native App `resume` event) and calls notifyForeground() from its onForeground(); services
// that refresh on resume (P00-T16 IAP: customer info, pending purchases, refunds, a failed init) subscribe here. This
// module is dependency-free on purpose, so services can import it without pulling in Phaser. A return to the app can
// notify twice (visibilitychange + resume): subscribers must be idempotent.
const listeners = new Set<() => void>();

// Returns an unsubscribe function.
export function onAppForeground(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyForeground(): void {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch {
      // one subscriber must never break the lifecycle or the others
    }
  }
}
