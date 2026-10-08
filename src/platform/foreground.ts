// "The app is in the foreground / background" for services (D-11). platform/lifecycle.ts owns foreground detection
// (`visibilitychange` plus the native App `pause` / `resume` events) and calls notifyBackground() / notifyForeground() from its
// onBackground() / onForeground(). Services that refresh on resume (P00-T16 IAP: customer info, pending purchases, refunds, a failed
// init) subscribe to the foreground; Ads (P00-T19) follows both, so its show timers count foreground time only. This module is
// dependency-free on purpose, so services can import it without pulling in Phaser. A return to the app can notify twice
// (visibilitychange + resume), and so can a departure: subscribers must be idempotent.
const listeners = new Set<() => void>();
const backgroundListeners = new Set<() => void>();
let foreground = true;

function run(set: ReadonlySet<() => void>): void {
  for (const listener of [...set]) {
    try {
      listener();
    } catch {
      // one subscriber must never break the lifecycle or the others
    }
  }
}

// Returns an unsubscribe function.
export function onAppForeground(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Returns an unsubscribe function.
export function onAppBackground(listener: () => void): () => void {
  backgroundListeners.add(listener);
  return () => {
    backgroundListeners.delete(listener);
  };
}

export function notifyForeground(): void {
  foreground = true;
  run(listeners);
}

export function notifyBackground(): void {
  foreground = false;
  run(backgroundListeners);
}

// The latest lifecycle answer (true until the first background notification).
export function isAppForeground(): boolean {
  return foreground;
}

// Is the pause overlay (PauseScene) open, or about to open? Only the lifecycle can see the scenes, so it installs the reader once the
// game exists (installLifecycle); until then nothing is up. Lets a service decide whether giving audio back is allowed right now.
let pauseOverlayReader: () => boolean = () => false;

export function setPauseOverlayReader(read: () => boolean): void {
  pauseOverlayReader = read;
}

export function isPauseOverlayUp(): boolean {
  return pauseOverlayReader();
}
