import { describe, it, expect, afterEach, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  lifecycleDecision,
  deriveLifecycleScenes,
  resumeAudioAfterAd,
  type LifecycleInput,
  type LifecycleActions,
} from './lifecycleDecision';
import { setExternalFlowActive, isExternalFlowActive } from './externalFlow';
import { isPauseOverlayUp, notifyForeground, onAppForeground, setPauseOverlayReader } from './foreground';
import { AD_EXTERNAL_FLOW_SOURCE } from '../config/monetization.config';
import type { SceneSnapshot } from './backRouter';

// The pure half of the background/foreground contract (D-11, P00-T11). lifecycle.ts reads the live scenes and
// settings, calls lifecycleDecision() and executes the actions; nothing here needs Phaser, a DOM or an AudioContext.

const base: LifecycleInput = {
  visibility: 'hidden',
  gameplayActive: true,
  pauseOverlayUp: false,
  externalFlowActive: false,
  adFlowActive: false,
  sound: true,
  music: true,
};
const hidden = (o: Partial<LifecycleInput> = {}): LifecycleActions => lifecycleDecision({ ...base, ...o });
const visible = (o: Partial<LifecycleInput> = {}): LifecycleActions =>
  lifecycleDecision({ ...base, visibility: 'visible', ...o });

describe('lifecycleDecision: hidden (background)', () => {
  it('live gameplay, nothing else going on: open the pause overlay and suspend audio', () => {
    expect(hidden()).toEqual({ requestPause: true, suspendAudio: true, refreshScale: false, resumeAudio: false });
  });

  it('gameplay already ended (won / dying / leaving / Endless run over): no pause, audio still suspended', () => {
    expect(hidden({ gameplayActive: false })).toEqual({
      requestPause: false,
      suspendAudio: true,
      refreshScale: false,
      resumeAudio: false,
    });
  });

  it('pause overlay already up: no second pause, audio still suspended', () => {
    expect(hidden({ pauseOverlayUp: true })).toEqual({
      requestPause: false,
      suspendAudio: true,
      refreshScale: false,
      resumeAudio: false,
    });
  });

  it('an ad / purchase flow is in flight: it must not open the pause overlay, audio still suspended', () => {
    expect(hidden({ externalFlowActive: true })).toEqual({
      requestPause: false,
      suspendAudio: true,
      refreshScale: false,
      resumeAudio: false,
    });
  });

  it('menus (no gameplay): only audio is suspended', () => {
    expect(hidden({ gameplayActive: false, pauseOverlayUp: false })).toMatchObject({
      requestPause: false,
      suspendAudio: true,
    });
  });

  it('Sound / Music settings do not change what happens on hidden', () => {
    for (const sound of [true, false]) {
      for (const music of [true, false]) {
        expect(hidden({ sound, music })).toEqual(hidden());
      }
    }
  });
});

describe('lifecycleDecision: visible (foreground)', () => {
  it('no overlay, sound and music on: refit and resume audio', () => {
    expect(visible({ gameplayActive: false })).toEqual({
      requestPause: false,
      suspendAudio: false,
      refreshScale: true,
      resumeAudio: true,
    });
  });

  it('the pause overlay is up (the common return from a mid-level Home): refit but stay silent', () => {
    expect(visible({ pauseOverlayUp: true })).toEqual({
      requestPause: false,
      suspendAudio: false,
      refreshScale: true,
      resumeAudio: false,
    });
  });

  it('Sound off, Music on: audio resumes (the ambient pad still plays)', () => {
    expect(visible({ sound: false, music: true, gameplayActive: false }).resumeAudio).toBe(true);
  });

  it('Sound on, Music off: audio resumes (SFX still play)', () => {
    expect(visible({ sound: true, music: false, gameplayActive: false }).resumeAudio).toBe(true);
  });

  it('Sound and Music both off: audio stays suspended', () => {
    expect(visible({ sound: false, music: false, gameplayActive: false }).resumeAudio).toBe(false);
  });

  it('an ad / purchase flow that just returned does not block the refit or the audio resume', () => {
    expect(visible({ externalFlowActive: true, gameplayActive: false })).toMatchObject({
      refreshScale: true,
      resumeAudio: true,
    });
  });

  // P00-T19 fix pass 2: AdMob's AdActivity is translucent, so after Home -> return during an ad the WebView can report visible while
  // the ad is still on top. The foreground path must not start the game audio under it; Ads.finishShow gives it back when the ad ends.
  it('an ad is still on screen (the ads flow source is up): refit, but no audio under it', () => {
    expect(visible({ adFlowActive: true, gameplayActive: false })).toEqual({
      requestPause: false,
      suspendAudio: false,
      refreshScale: true,
      resumeAudio: false,
    });
    expect(visible({ adFlowActive: true, gameplayActive: true, sound: true, music: false }).resumeAudio).toBe(false);
  });

  it('the ad flag only matters for the audio: the pause rules of the hidden path are unchanged by it', () => {
    expect(hidden({ adFlowActive: true })).toEqual(hidden());
    expect(hidden({ adFlowActive: true, externalFlowActive: true }).requestPause).toBe(false);
  });

  it('always refits the scale', () => {
    for (const pauseOverlayUp of [true, false]) {
      for (const gameplayActive of [true, false]) {
        expect(visible({ pauseOverlayUp, gameplayActive }).refreshScale).toBe(true);
      }
    }
  });
});

describe('lifecycleDecision: invariants over the whole input space', () => {
  const bools = [true, false];
  const all: LifecycleInput[] = [];
  for (const visibility of ['hidden', 'visible'] as const) {
    for (const gameplayActive of bools) {
      for (const pauseOverlayUp of bools) {
        for (const externalFlowActive of bools) {
          for (const adFlowActive of bools) {
            for (const sound of bools) {
              for (const music of bools) {
                all.push({ visibility, gameplayActive, pauseOverlayUp, externalFlowActive, adFlowActive, sound, music });
              }
            }
          }
        }
      }
    }
  }

  it('covers 128 combinations', () => {
    expect(all).toHaveLength(128);
  });

  it('never auto-resumes gameplay: there is no resume-gameplay action at all', () => {
    for (const i of all) {
      expect(Object.keys(lifecycleDecision(i)).sort()).toEqual(
        ['refreshScale', 'requestPause', 'resumeAudio', 'suspendAudio'].sort(),
      );
    }
  });

  it('hidden always suspends audio and never refits or resumes; visible never suspends or pauses', () => {
    for (const i of all) {
      const a = lifecycleDecision(i);
      if (i.visibility === 'hidden') {
        expect(a.suspendAudio).toBe(true);
        expect(a.refreshScale).toBe(false);
        expect(a.resumeAudio).toBe(false);
      } else {
        expect(a.suspendAudio).toBe(false);
        expect(a.requestPause).toBe(false);
        expect(a.refreshScale).toBe(true);
      }
    }
  });

  it('requestPause only for live gameplay with no overlay and no external flow', () => {
    for (const i of all) {
      const expected = i.visibility === 'hidden' && i.gameplayActive && !i.pauseOverlayUp && !i.externalFlowActive;
      expect(lifecycleDecision(i).requestPause).toBe(expected);
    }
  });

  it('audio never resumes under the pause overlay, under an ad, nor with both audio settings off', () => {
    for (const i of all) {
      const a = lifecycleDecision(i);
      if (i.pauseOverlayUp) expect(a.resumeAudio).toBe(false);
      if (i.adFlowActive) expect(a.resumeAudio).toBe(false);
      if (!i.sound && !i.music) expect(a.resumeAudio).toBe(false);
      if (i.visibility === 'visible') expect(a.resumeAudio).toBe(!i.pauseOverlayUp && !i.adFlowActive && (i.sound || i.music));
    }
  });
});

describe('deriveLifecycleScenes', () => {
  const snap = (key: string, running: boolean, paused = false, gameplayEnded?: boolean): SceneSnapshot => ({
    key,
    running,
    paused,
    gameplayEnded,
  });

  it('a running, not-ended GameScene is the live gameplay scene', () => {
    expect(deriveLifecycleScenes([snap('GameScene', true, false, false)])).toEqual({
      gameplayKey: 'GameScene',
      pauseOverlayUp: false,
    });
  });

  it('a running, not-ended EndlessScene is the live gameplay scene', () => {
    expect(deriveLifecycleScenes([snap('MainMenuScene', false), snap('EndlessScene', true, false, false)])).toEqual({
      gameplayKey: 'EndlessScene',
      pauseOverlayUp: false,
    });
  });

  it('ended gameplay is not live (won / dying / leaving level, dead Endless run)', () => {
    expect(deriveLifecycleScenes([snap('GameScene', true, false, true)]).gameplayKey).toBeNull();
    expect(deriveLifecycleScenes([snap('EndlessScene', true, false, true)]).gameplayKey).toBeNull();
  });

  it('a gameplay scene without the Pausable contract (gameplayEnded unknown) is not live', () => {
    expect(deriveLifecycleScenes([snap('GameScene', true, false, undefined)]).gameplayKey).toBeNull();
  });

  it('a paused gameplay scene is not live (overlay or Settings holds it)', () => {
    expect(deriveLifecycleScenes([snap('GameScene', false, true, false)]).gameplayKey).toBeNull();
  });

  it('PauseScene running or paused (Settings open over it) counts as the pause overlay being up', () => {
    const running = deriveLifecycleScenes([snap('GameScene', false, true, false), snap('PauseScene', true)]);
    expect(running.pauseOverlayUp).toBe(true);
    const underSettings = deriveLifecycleScenes([
      snap('GameScene', false, true, false),
      snap('PauseScene', false, true),
      snap('SettingsScene', true),
    ]);
    expect(underSettings.pauseOverlayUp).toBe(true);
    expect(underSettings.gameplayKey).toBeNull();
  });

  it('a stopped PauseScene is not an overlay', () => {
    expect(deriveLifecycleScenes([snap('GameScene', true, false, false), snap('PauseScene', false)])).toEqual({
      gameplayKey: 'GameScene',
      pauseOverlayUp: false,
    });
  });

  it('Settings alone over a paused level does not count as the pause overlay', () => {
    const s = deriveLifecycleScenes([snap('GameScene', false, true, false), snap('SettingsScene', true)]);
    expect(s).toEqual({ gameplayKey: null, pauseOverlayUp: false });
  });

  it('menus and splashes: nothing live, no overlay', () => {
    expect(deriveLifecycleScenes([snap('MainMenuScene', true)])).toEqual({ gameplayKey: null, pauseOverlayUp: false });
    expect(deriveLifecycleScenes([])).toEqual({ gameplayKey: null, pauseOverlayUp: false });
  });

  it('feeds lifecycleDecision: Home mid-level = pause + suspend; return = refit, silent, still paused', () => {
    const live = deriveLifecycleScenes([snap('GameScene', true, false, false)]);
    expect(
      lifecycleDecision({ ...base, visibility: 'hidden', ...live }),
    ).toMatchObject({ requestPause: true, suspendAudio: true });
    const overlay = deriveLifecycleScenes([snap('GameScene', false, true, false), snap('PauseScene', true)]);
    expect(
      lifecycleDecision({ ...base, visibility: 'visible', gameplayActive: overlay.gameplayKey !== null, ...overlay }),
    ).toEqual({ requestPause: false, suspendAudio: false, refreshScale: true, resumeAudio: false });
  });
});

// P00-T16: services that refresh on resume (IAP customer info) subscribe here; lifecycle.ts notifies on foreground.
describe('foreground subscribers', () => {
  it('notifies every subscriber; one that throws does not stop the others; unsubscribe works', () => {
    const calls: string[] = [];
    const offA = onAppForeground(() => calls.push('a'));
    const offB = onAppForeground(() => {
      throw new Error('boom');
    });
    const offC = onAppForeground(() => calls.push('c'));
    expect(() => notifyForeground()).not.toThrow();
    expect(calls).toEqual(['a', 'c']);
    offA();
    offB();
    notifyForeground();
    expect(calls).toEqual(['a', 'c', 'c']);
    offC();
  });

  it('lifecycle.onForeground notifies them after running the foreground actions', () => {
    const src = readFileSync(fileURLToPath(new URL('./lifecycle.ts', import.meta.url)), 'utf8');
    expect(src).toMatch(/export function onForeground\(\)[^{]*\{\s*const actions = runLifecycle\('visible'\);\s*notifyForeground\(\);/);
  });

  it('lifecycle reports the activity from the right source: visibilitychange as "visibility", the native pause / resume as "native"', () => {
    const src = readFileSync(fileURLToPath(new URL('./lifecycle.ts', import.meta.url)), 'utf8');
    expect(src).toMatch(/reportActivity\('visibility', /);
    expect(src).toMatch(/addListener\('pause', \(\) => \{\s*onBackground\(\);\s*reportActivity\('native', false\);/);
    expect(src).toMatch(/addListener\('resume', \(\) => \{\s*onForeground\(\);\s*reportActivity\('native', true\);/);
  });
});

// P00-T19 fix passes 1-2: the ad reducer must know whether OUR ACTIVITY is resumed, not whether the WebView is visible. AdMob's
// AdActivity is translucent, so after Home -> return during an ad the WebView reports `visible` while the ad is still on top. On Android
// the signal is therefore the native App pause / resume; on the web it is visibilitychange. platform/foreground.ts routes the two
// sources and keeps the latest answer. (Each test loads a fresh module: the routing remembers that a native event was seen.)
describe('activity state: reportActivity routes the two sources', () => {
  async function fresh() {
    vi.resetModules();
    return await import('./foreground');
  }

  it('starts resumed', async () => {
    const f = await fresh();
    expect(f.isActivityResumed()).toBe(true);
  });

  it('web: visibilitychange drives it', async () => {
    const f = await fresh();
    f.reportActivity('visibility', false);
    expect(f.isActivityResumed()).toBe(false);
    f.reportActivity('visibility', true);
    expect(f.isActivityResumed()).toBe(true);
  });

  it('Android: the native pause / resume drive it', async () => {
    const f = await fresh();
    f.reportActivity('native', false);
    expect(f.isActivityResumed()).toBe(false);
    f.reportActivity('native', true);
    expect(f.isActivityResumed()).toBe(true);
  });

  it('WebView visible + native paused (the translucent ad is still on top): stays paused; only the native resume brings it back', async () => {
    const f = await fresh();
    f.reportActivity('native', false); // the ad's activity paused ours
    f.reportActivity('visibility', true); // Home -> return: the WebView reports visible, the ad is still on top
    expect(f.isActivityResumed()).toBe(false);
    f.reportActivity('visibility', false);
    f.reportActivity('visibility', true);
    expect(f.isActivityResumed()).toBe(false);
    f.reportActivity('native', true); // the ad closed, MainActivity resumed
    expect(f.isActivityResumed()).toBe(true);
  });

  it('once a native event was seen the WebView no longer drives it (it cannot pause it either)', async () => {
    const f = await fresh();
    f.reportActivity('native', true);
    f.reportActivity('visibility', false);
    expect(f.isActivityResumed()).toBe(true);
  });

  it('before any native event (the first moments, or a plugin that never loaded) visibilitychange still drives it', async () => {
    const f = await fresh();
    f.reportActivity('visibility', false);
    expect(f.isActivityResumed()).toBe(false);
  });

  it('notifies subscribers only on a change, with the new value, after the state is current; a throwing subscriber breaks nothing', async () => {
    const f = await fresh();
    const seen: Array<[boolean, boolean]> = [];
    const off = f.onActivityChange((resumed) => seen.push([resumed, f.isActivityResumed()]));
    f.onActivityChange(() => {
      throw new Error('boom');
    });
    f.reportActivity('native', true); // already resumed: no change
    expect(seen).toEqual([]);
    expect(() => f.reportActivity('native', false)).not.toThrow();
    f.reportActivity('native', false); // same again: no change
    f.reportActivity('native', true);
    expect(seen).toEqual([[false, false], [true, true]]);
    off();
    f.reportActivity('native', false);
    expect(seen).toHaveLength(2);
  });
});

describe('pause overlay reader', () => {
  afterEach(() => {
    setPauseOverlayReader(() => false);
  });

  it('defaults to "not up" and is replaced by the lifecycle once the game exists', () => {
    expect(isPauseOverlayUp()).toBe(false);
    setPauseOverlayReader(() => true);
    expect(isPauseOverlayUp()).toBe(true);
  });
});

// An ad ended: the audio Ads muted at its start goes back only when the foreground path could do the same (D-11): the app is in
// front, no pause overlay is up and Sound or Music is on. In every other case the lifecycle's foreground path (or the overlay's own
// CONTINUE) restores it, so a settled ad can never start sound behind a hidden app or under the pause overlay.
describe('resumeAudioAfterAd', () => {
  const ok = { wasWanted: true, foreground: true, pauseOverlayUp: false, sound: true, music: true };

  it('resumes only when everything allows it', () => {
    expect(resumeAudioAfterAd(ok)).toBe(true);
    expect(resumeAudioAfterAd({ ...ok, sound: false })).toBe(true);
    expect(resumeAudioAfterAd({ ...ok, music: false })).toBe(true);
  });

  it('never while the app is hidden, under the pause overlay, with both settings off, or when audio was not wanted to begin with', () => {
    expect(resumeAudioAfterAd({ ...ok, foreground: false })).toBe(false);
    expect(resumeAudioAfterAd({ ...ok, pauseOverlayUp: true })).toBe(false);
    expect(resumeAudioAfterAd({ ...ok, sound: false, music: false })).toBe(false);
    expect(resumeAudioAfterAd({ ...ok, wasWanted: false })).toBe(false);
  });

  it('agrees with the foreground path of lifecycleDecision whenever audio was wanted', () => {
    for (const pauseOverlayUp of [true, false]) {
      for (const sound of [true, false]) {
        for (const music of [true, false]) {
          const viaLifecycle = visible({ pauseOverlayUp, sound, music }).resumeAudio;
          expect(resumeAudioAfterAd({ wasWanted: true, foreground: true, pauseOverlayUp, sound, music })).toBe(viaLifecycle);
        }
      }
    }
  });
});

describe('external flow flag (Ads.showing / IAP.inFlight will drive it in P00-T16 / T19)', () => {
  afterEach(() => {
    setExternalFlowActive(false);
    setExternalFlowActive(false, 'ads');
    setExternalFlowActive(false, 'iap');
  });

  it('defaults to false', () => {
    expect(isExternalFlowActive()).toBe(false);
  });

  it('set and clear', () => {
    setExternalFlowActive(true);
    expect(isExternalFlowActive()).toBe(true);
    setExternalFlowActive(false);
    expect(isExternalFlowActive()).toBe(false);
  });

  it('is idempotent', () => {
    setExternalFlowActive(true);
    setExternalFlowActive(true);
    setExternalFlowActive(false);
    expect(isExternalFlowActive()).toBe(false);
  });

  it('independent sources overlap safely: the flag stays up until every source has cleared', () => {
    setExternalFlowActive(true, 'ads');
    setExternalFlowActive(true, 'iap');
    expect(isExternalFlowActive()).toBe(true);
    setExternalFlowActive(false, 'ads');
    expect(isExternalFlowActive()).toBe(true);
    setExternalFlowActive(false, 'iap');
    expect(isExternalFlowActive()).toBe(false);
  });

  it('clearing a source that never set the flag changes nothing', () => {
    setExternalFlowActive(true, 'ads');
    setExternalFlowActive(false, 'iap');
    expect(isExternalFlowActive()).toBe(true);
  });

  // P00-T19 fix pass 2: Android Back asks about the ADS source only (a stuck IAP or consent flag must never kill Back for good).
  it('asked about one source it answers for that source alone; asked about none it answers for all', () => {
    expect(isExternalFlowActive(AD_EXTERNAL_FLOW_SOURCE)).toBe(false);
    setExternalFlowActive(true, 'iap');
    expect(isExternalFlowActive()).toBe(true);
    expect(isExternalFlowActive('iap')).toBe(true);
    expect(isExternalFlowActive(AD_EXTERNAL_FLOW_SOURCE)).toBe(false); // an IAP flow alone is not an ad
    setExternalFlowActive(true, AD_EXTERNAL_FLOW_SOURCE);
    expect(isExternalFlowActive(AD_EXTERNAL_FLOW_SOURCE)).toBe(true);
    setExternalFlowActive(false, 'iap');
    expect(isExternalFlowActive(AD_EXTERNAL_FLOW_SOURCE)).toBe(true);
    expect(isExternalFlowActive('iap')).toBe(false);
    setExternalFlowActive(false, AD_EXTERNAL_FLOW_SOURCE);
    expect(isExternalFlowActive(AD_EXTERNAL_FLOW_SOURCE)).toBe(false);
    expect(isExternalFlowActive()).toBe(false);
  });

  it('the default (unnamed) source is its own source', () => {
    setExternalFlowActive(true);
    expect(isExternalFlowActive(AD_EXTERNAL_FLOW_SOURCE)).toBe(false);
    expect(isExternalFlowActive('external')).toBe(true);
  });
});

// Source-level guards: the background contract has exactly one owner (lifecycle.ts), installed once from main.ts.
describe('lifecycle wiring source guards', () => {
  const srcRoot = fileURLToPath(new URL('../', import.meta.url));
  function sourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
      else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name)) out.push(full);
    }
    return out;
  }
  const code = (f: string): string => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const rel = (f: string): string => relative(srcRoot, f).replace(/\\/g, '/');
  const files = sourceFiles(srcRoot);

  it('only platform/lifecycle.ts listens to visibilitychange (no second, audio-only handler)', () => {
    const offenders = files.filter((f) => /visibilitychange/.test(code(f))).map(rel);
    expect(offenders).toEqual(['platform/lifecycle.ts']);
  });

  it('handleBack asks the router about the ADS flow source only (platform may not import services/Ads, and an IAP or consent flag must not swallow Back)', () => {
    const src = code(join(srcRoot, 'platform/lifecycle.ts'));
    expect(src).toMatch(/deriveBackState\(snapshotScenes\(game\), PLATFORM\.PARENT_SCENE, isExternalFlowActive\(AD_EXTERNAL_FLOW_SOURCE\)\)/);
    expect(src).not.toMatch(/services\/Ads/);
  });

  it('the foreground path is told whether an ad is up (it must not resume audio under it)', () => {
    const src = code(join(srcRoot, 'platform/lifecycle.ts'));
    expect(src).toMatch(/adFlowActive: isExternalFlowActive\(AD_EXTERNAL_FLOW_SOURCE\)/);
  });

  it('main.ts installs the lifecycle exactly once', () => {
    const main = code(join(srcRoot, 'main.ts'));
    expect(main).toMatch(/installLifecycle\(game\)/);
    expect(main.match(/installLifecycle\(/g)).toHaveLength(1);
  });

  // P00-T11 review: hidden must always be silent, even when opening the pause overlay throws.
  it('hidden: audio is suspended BEFORE the pause is requested', () => {
    const src = code(join(srcRoot, 'platform/lifecycle.ts'));
    const iSuspend = src.indexOf('sharedAudio().suspend()');
    const iPause = src.indexOf("requestPause('background')");
    expect(iSuspend).toBeGreaterThan(-1);
    expect(iPause).toBeGreaterThan(-1);
    expect(iSuspend).toBeLessThan(iPause);
  });

  it('hidden: requestPause runs inside try/catch that reports through Crash and never rethrows', () => {
    const src = code(join(srcRoot, 'platform/lifecycle.ts'));
    const m = /try\s*\{\s*scene\.requestPause\('background'\)[\s\S]*?\}\s*catch\s*\(\w+\)\s*\{([\s\S]*?)\r?\n\s*\}\r?\n/.exec(src);
    expect(m).not.toBeNull();
    expect(m?.[1]).toMatch(/Crash\.recordError\(/);
    expect(m?.[1]).not.toMatch(/\bthrow\b/);
  });
});
