// "The app is in the foreground" for services (D-11). platform/lifecycle.ts owns foreground detection (`visibilitychange` plus the
// native App `pause` / `resume` events). This module is dependency-free on purpose, so services can import it without pulling in
// Phaser. Two signals leave it, for two different questions:
//
// 1. notifyForeground() / onAppForeground(): "the app came back" from EITHER source. Services that refresh on resume subscribe (P00-T16
//    IAP: customer info, pending purchases, refunds, a failed init; P00-T19 Ads: re-check expiry). A return can notify twice
//    (visibilitychange + resume): subscribers must be idempotent.
//
// 2. reportActivity() / isActivityResumed() / onActivityChange(): "is OUR ACTIVITY resumed", from ONE source. On Android that is the
//    native pause / resume. The WebView's visibilitychange is not good enough there: AdMob's AdActivity is translucent, so after Home
//    -> return during an ad the WebView reports `visible` while the ad is still on top and MainActivity is still paused (P00-T19
//    fix pass 2). On the web there is no native event, and visibilitychange drives it. The routing: a native event is always taken,
//    and from the first one on the WebView's visibility is ignored (before it, e.g. in the first moments after launch, it drives).
const listeners = new Set<() => void>();
const activityListeners = new Set<(resumed: boolean) => void>();
let activityResumed = true;
let nativeSeen = false;

function run<A extends unknown[]>(set: ReadonlySet<(...args: A) => void>, ...args: A): void {
  for (const listener of [...set]) {
    try {
      listener(...args);
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

export function notifyForeground(): void {
  run(listeners);
}

// The host activity paused / resumed (source 'native'), or the page was hidden / shown (source 'visibility').
export function reportActivity(source: 'visibility' | 'native', resumed: boolean): void {
  if (source === 'native') nativeSeen = true;
  else if (nativeSeen) return;
  if (resumed === activityResumed) return;
  activityResumed = resumed;
  run(activityListeners, resumed);
}

// The latest answer (true until the first report says otherwise).
export function isActivityResumed(): boolean {
  return activityResumed;
}

// Called on every change, with the new value, once isActivityResumed() already reads it. Returns an unsubscribe function.
export function onActivityChange(listener: (resumed: boolean) => void): () => void {
  activityListeners.add(listener);
  return () => {
    activityListeners.delete(listener);
  };
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
