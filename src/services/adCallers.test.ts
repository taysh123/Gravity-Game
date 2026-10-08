import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// P00-T19 "done when", pinned as a source scan (the same idea as manifestConsent.test.ts): every ad call goes through services/Ads.ts,
// nobody awaits the plugin's show promise (it never settles when the player closes the ad early), the win overlay awaits the
// interstitial before restarting the scene, and a rewarded offer is only ever run through ui/adOffer.ts (disable before awaiting,
// grant only if the scene is still there).

const srcRoot = fileURLToPath(new URL('../', import.meta.url));

function files(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...files(full));
    else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name)) out.push(full);
  }
  return out;
}
const rel = (f: string): string => relative(srcRoot, f).replace(/\\/g, '/');
// Comments out: a comment may say "never awaits showRewardVideoAd()".
const code = (f: string): string => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const sources = files(srcRoot).map((f) => ({ path: rel(f), text: code(f) }));
const offenders = (re: RegExp): string[] => sources.filter((s) => re.test(s.text)).map((s) => s.path);

describe('ad call sites (P00-T19, D-24)', () => {
  it('no code awaits showRewardVideoAd() or showInterstitial() (the plugin never settles a rewarded show on an early close)', () => {
    expect(offenders(/await[^;\n]*\bshow(RewardVideoAd|Interstitial)\s*\(/)).toEqual([]);
    expect(offenders(/\bshow(RewardVideoAd|Interstitial)\s*\([^)]*\)\s*\.then\s*\(/)).toEqual([]);
  });

  it('the plugin show methods are called only by services/Ads.ts (declared in native/admob.ts)', () => {
    expect(offenders(/\.showRewardVideoAd\s*\(/)).toEqual(['services/Ads.ts']);
    expect(offenders(/\.showInterstitial\s*\(/)).toEqual(['services/Ads.ts']);
    expect(offenders(/\.prepare(RewardVideoAd|Interstitial)\s*\(/)).toEqual(['services/Ads.ts']);
  });

  it('a scene never calls Ads.showRewarded itself: every offer goes through ui/adOffer.ts', () => {
    expect(offenders(/\bAds\.showRewarded\s*\(/)).toEqual(['ui/adOffer.ts']);
  });

  it('every rewarded offer is drawn only when a rewarded ad is ready', () => {
    for (const scene of ['scenes/GameScene.ts', 'scenes/EndlessScene.ts', 'scenes/CosmeticsScene.ts']) {
      const text = sources.find((s) => s.path === scene)!.text;
      expect(/Ads\.isRewardedReady\(\)/.test(text), `${scene} must gate its offer on Ads.isRewardedReady()`).toBe(true);
      expect(/runRewardedOffer\(/.test(text), `${scene} must run its offer through runRewardedOffer`).toBe(true);
    }
  });

  it('GameScene.advanceAfterWin is async and awaits the interstitial BEFORE scene.restart; the old fire-and-forget call is gone', () => {
    const text = sources.find((s) => s.path === 'scenes/GameScene.ts')!.text;
    const start = text.indexOf('private async advanceAfterWin(): Promise<void>');
    expect(start).toBeGreaterThan(-1);
    const body = text.slice(start, text.indexOf('private showWinOverlay', start));
    const awaited = body.indexOf('await Ads.showInterstitialIfEligible(');
    const restart = body.indexOf('this.scene.restart({ level: nextLevel })');
    expect(awaited).toBeGreaterThan(-1);
    expect(restart).toBeGreaterThan(awaited);
    expect(/void\s+Ads\./.test(body)).toBe(false);
    expect(/maybeInterstitial/.test(text)).toBe(false);
  });

  it('the 2x skips the interstitial for its advance (flag set before the ad is awaited)', () => {
    const text = sources.find((s) => s.path === 'scenes/GameScene.ts')!.text;
    expect(text.indexOf('this.skipInterstitial = true')).toBeGreaterThan(-1);
    expect(text.indexOf('this.skipInterstitial = true')).toBeLessThan(text.indexOf("runRewardedOffer(this, btn, 'campaign_2x'"));
    expect(/if \(!this\.skipInterstitial\)/.test(text)).toBe(true);
  });

  it('a 2x win still counts as a completed level: the skip branch of advanceAfterWin calls Ads.noteLevelAdvance() before the restart (m4)', () => {
    const text = sources.find((s) => s.path === 'scenes/GameScene.ts')!.text;
    const start = text.indexOf('private async advanceAfterWin(): Promise<void>');
    const body = text.slice(start, text.indexOf('private showWinOverlay', start));
    const skip = body.indexOf('if (!this.skipInterstitial)');
    const note = body.indexOf('Ads.noteLevelAdvance()');
    const restart = body.indexOf('this.scene.restart({ level: nextLevel })');
    expect(note).toBeGreaterThan(skip);
    expect(note).toBeLessThan(restart);
    expect(offenders(/\.noteLevelAdvance\s*\(/)).toEqual(['scenes/GameScene.ts']);
  });

  it('no interstitial is requested at level start: showInterstitialIfEligible is called from the win advance only', () => {
    expect(offenders(/\.showInterstitialIfEligible\s*\(/)).toEqual(['scenes/GameScene.ts']);
    const text = sources.find((s) => s.path === 'scenes/GameScene.ts')!.text;
    expect((text.match(/showInterstitialIfEligible\s*\(/g) ?? []).length).toBe(1);
  });

  // P00-T19 fix pass 1 (m2/m3): while a show is requested (up to 5 s before the ad appears) or playing, nothing may leave, reset or
  // redraw the screen that is waiting on it. unlessAdShowing() is the one check; these pin where it is applied.
  it('Endless run-over: every pill (RETRY, SHARE, REVIVE, 2x) and the scrim go through unlessAdShowing', () => {
    const text = sources.find((s) => s.path === 'scenes/EndlessScene.ts')!.text;
    expect(/c\.on\('pointerup', unlessAdShowing\(/.test(text)).toBe(true);
    expect(/scrim\.on\('pointerup', unlessAdShowing\(/.test(text)).toBe(true);
    expect(/c\.on\('pointerup', \(\) => onTap/.test(text)).toBe(false);
  });

  it('the win overlay HUD toolbar (Home, Settings, Restart) goes through unlessAdShowing', () => {
    const text = sources.find((s) => s.path === 'scenes/GameScene.ts')!.text;
    const start = text.indexOf('private createNav(): void');
    const body = text.slice(start, text.indexOf('const barW = navBarWidth()', start));
    for (const icon of ['home', 'settings', 'restart']) {
      expect(new RegExp(`icon: '${icon}', onClick: unlessAdShowing\\(`).test(body), `${icon} must be guarded`).toBe(true);
    }
  });

  it('the shop: tabs and Back are guarded, and Free Fragments hands its purchase gate to the offer (no manual flag left to forget)', () => {
    const text = sources.find((s) => s.path === 'scenes/CosmeticsScene.ts')!.text;
    expect(/tab\.on\('pointerup', unlessAdShowing\(/.test(text)).toBe(true);
    expect(/'← Back', unlessAdShowing\(/.test(text)).toBe(true);
    const start = text.indexOf('private freeFragmentsCard');
    const body = text.slice(start, text.indexOf('private removeAdsCard', start));
    expect(/gate: this\.gate,/.test(body)).toBe(true);
    expect(/this\.gate\.purchasing = /.test(body)).toBe(false);
  });

  // Fix pass 2: platform may not import services/Ads (layering, src/platform/boundaries.test.ts), so Back asks the dependency-free
  // external-flow flag for the ADS source, which is up exactly while Ads.isShowing() (pinned in Ads.test.ts). The ADS source only: a
  // stuck IAP or consent flag must never swallow Back for good.
  it('Android Back asks the ads external-flow source: handleBack passes it to the router state, and lifecycle.ts does not import Ads', () => {
    const text = sources.find((s) => s.path === 'platform/lifecycle.ts')!.text;
    expect(/deriveBackState\(snapshotScenes\(game\), PLATFORM\.PARENT_SCENE, isExternalFlowActive\(AD_EXTERNAL_FLOW_SOURCE\)\)/.test(text)).toBe(true);
    expect(/services\/Ads/.test(text)).toBe(false);
    expect(/isExternalFlowActive\(\)/.test(text.slice(text.indexOf('export function handleBack'), text.indexOf('async function minimizeApp')))).toBe(false);
  });
});
