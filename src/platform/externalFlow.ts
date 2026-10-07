// "An external flow is in flight" flag for the background pause (D-11, P00-T11). While an ad, a Play purchase or a
// consent form is on screen, Android pauses our Activity and the WebView reports `hidden`, but the player did not
// leave the game: the pause overlay must not open for it. The ad and purchase services call
// setExternalFlowActive(true) just before they hand control to the native sheet and (false) when it settles
// (P00-T16 IAP, P00-T19 Ads). The default is false.
//
// Each caller passes its own `source` so two overlapping flows cannot clear each other's flag: the flag is up until
// every source that raised it has cleared it. This module is dependency-free on purpose (services import it without
// pulling in Phaser); lifecycle.ts re-exports it.
const DEFAULT_SOURCE = 'external';
const active = new Set<string>();

export function setExternalFlowActive(isActive: boolean, source: string = DEFAULT_SOURCE): void {
  if (isActive) active.add(source);
  else active.delete(source);
}

export function isExternalFlowActive(): boolean {
  return active.size > 0;
}
