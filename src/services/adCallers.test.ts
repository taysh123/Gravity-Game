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

  it('no interstitial is requested at level start: showInterstitialIfEligible is called from the win advance only', () => {
    expect(offenders(/\.showInterstitialIfEligible\s*\(/)).toEqual(['scenes/GameScene.ts']);
    const text = sources.find((s) => s.path === 'scenes/GameScene.ts')!.text;
    expect((text.match(/showInterstitialIfEligible\s*\(/g) ?? []).length).toBe(1);
  });
});
