import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PLATFORM } from '../config/platform.config';
import {
  BUILD_LABEL,
  CAMPAIGN_SCENE,
  RUN_SCENE,
  UNKNOWN_WEBVIEW,
  sceneCrashKeys,
  watchSceneCrashKeys,
  webViewVersion,
  type CrashScene,
} from './crashContext';

const NO_LEVEL = PLATFORM.CRASH_NO_LEVEL;
const FIRST_LEVEL = PLATFORM.CRASH_FIRST_LEVEL;

describe('sceneCrashKeys: the scene / level / mode custom keys (P00-T21)', () => {
  it('the two gameplay keys are registered gameplay scenes (platformConfig.test.ts pins those against main.ts)', () => {
    expect(PLATFORM.BACK.GAMEPLAY_SCENES).toEqual(expect.arrayContaining([CAMPAIGN_SCENE, RUN_SCENE]));
  });

  it('a campaign level', () => {
    expect(sceneCrashKeys('GameScene', { level: 12 })).toEqual({ scene: 'GameScene', mode: 'campaign', level: 12 });
  });

  it('the daily: mode daily, level = the daily number (its 0-based index + 1, like a campaign level)', () => {
    expect(sceneCrashKeys('GameScene', { level: 1, daily: true, dailyIndex: 3, dailyModifier: 'timed' })).toEqual({ scene: 'GameScene', mode: 'daily', level: 4 });
    expect(sceneCrashKeys('GameScene', { daily: true, dailyIndex: 0 })).toEqual({ scene: 'GameScene', mode: 'daily', level: FIRST_LEVEL });
  });

  it('a daily start without a usable index plays the first daily, as GameScene does', () => {
    expect(sceneCrashKeys('GameScene', { daily: true })).toEqual({ scene: 'GameScene', mode: 'daily', level: FIRST_LEVEL });
    expect(sceneCrashKeys('GameScene', { daily: true, dailyIndex: 'x' })).toEqual({ scene: 'GameScene', mode: 'daily', level: FIRST_LEVEL });
  });

  it('a GameScene start without a usable level plays level 1, as GameScene does', () => {
    expect(sceneCrashKeys('GameScene', undefined)).toEqual({ scene: 'GameScene', mode: 'campaign', level: FIRST_LEVEL });
    expect(sceneCrashKeys('GameScene', {})).toEqual({ scene: 'GameScene', mode: 'campaign', level: FIRST_LEVEL });
    expect(sceneCrashKeys('GameScene', { level: 'x' })).toEqual({ scene: 'GameScene', mode: 'campaign', level: FIRST_LEVEL });
    expect(sceneCrashKeys('GameScene', { level: Number.NaN })).toEqual({ scene: 'GameScene', mode: 'campaign', level: FIRST_LEVEL });
  });

  it('level 0 (CRASH_NO_LEVEL) means only "not a level scene": no GameScene start ever reports it', () => {
    expect(FIRST_LEVEL).toBeGreaterThan(NO_LEVEL);
    for (const data of [undefined, {}, { level: 1 }, { daily: true }, { daily: true, dailyIndex: 0 }]) {
      expect(sceneCrashKeys('GameScene', data).level).toBeGreaterThanOrEqual(FIRST_LEVEL);
    }
  });

  it('Gravity Run: endless or weekly, no level', () => {
    expect(sceneCrashKeys('EndlessScene', { mode: 'weekly' })).toEqual({ scene: 'EndlessScene', mode: 'weekly', level: NO_LEVEL });
    expect(sceneCrashKeys('EndlessScene', {})).toEqual({ scene: 'EndlessScene', mode: 'endless', level: NO_LEVEL });
  });

  it('an overlay names itself and leaves level and mode as they were (a crash in the pause menu still names its level)', () => {
    for (const key of PLATFORM.BACK.OVERLAY_SCENES) expect(sceneCrashKeys(key, { caller: 'GameScene' })).toEqual({ scene: key });
  });

  it('any other scene is a menu with no level', () => {
    for (const key of ['MainMenuScene', 'WorldMapScene', 'BootScene']) {
      expect(sceneCrashKeys(key, {})).toEqual({ scene: key, mode: 'menu', level: NO_LEVEL });
    }
  });
});

describe('webViewVersion', () => {
  it('reads the Chrome version of an Android System WebView user agent', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 16; Pixel 8 Build/BP2A.250605.031; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/138.0.7204.63 Mobile Safari/537.36';
    expect(webViewVersion(ua)).toBe('138.0.7204.63');
  });

  it('reads desktop Chrome too', () => {
    expect(webViewVersion('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36')).toBe('141.0.0.0');
  });

  it('a user agent with no Chrome token is unknown', () => {
    expect(webViewVersion('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1')).toBe(UNKNOWN_WEBVIEW);
  });
});

describe('BUILD_LABEL (the build key)', () => {
  it('is package.json version + androidBuild, the two inputs of the versionCode (D-20)', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string; androidBuild: number };
    expect(BUILD_LABEL).toBe(`${pkg.version}+${pkg.androidBuild}`);
    expect(BUILD_LABEL).toMatch(/^\d+\.\d+\.\d+\+\d+$/);
  });
});

// A fake Phaser scene: the slice crashContext reads, plus emit() to fire an event on its emitter.
function fakeScene(key: string, active: boolean, data: unknown = {}) {
  const listeners = new Map<string, Array<() => void>>();
  return {
    scene: { key },
    sys: {
      settings: { active, data },
      events: {
        on(event: string, listener: () => void) {
          listeners.set(event, [...(listeners.get(event) ?? []), listener]);
          return this;
        },
      },
    },
    emit(event: string): void {
      for (const listener of listeners.get(event) ?? []) listener();
    },
  } satisfies CrashScene & { emit(event: string): void };
}

describe('watchSceneCrashKeys: the keys follow a scene START / RESUME / WAKE, not its CREATE (P00-T21 review)', () => {
  const EVENTS = ['start', 'resume', 'wake'];
  const seen = (calls: Array<[string, unknown]>): string[] => calls.map(([key]) => key);

  it('describes a scene that is already active at install, once, with the data it started with', () => {
    const calls: Array<[string, unknown]> = [];
    const game = fakeScene('GameScene', true, { level: 7 });
    watchSceneCrashKeys([game], EVENTS, (key, data) => calls.push([key, data]));
    expect(calls).toEqual([['GameScene', { level: 7 }]]);
  });

  it('does not describe a scene that has not started; its START does', () => {
    const calls: Array<[string, unknown]> = [];
    const menu = fakeScene('MainMenuScene', false);
    watchSceneCrashKeys([menu], EVENTS, (key, data) => calls.push([key, data]));
    expect(calls).toEqual([]);
    menu.sys.settings.data = { fresh: true }; // Systems.start sets the data before it emits START
    menu.sys.settings.active = true;
    menu.emit('start');
    expect(calls).toEqual([['MainMenuScene', { fresh: true }]]);
  });

  it('describes again on START, RESUME and WAKE, reading the data of that moment (pause menu closed: the level is back)', () => {
    const calls: Array<[string, unknown]> = [];
    const game = fakeScene('GameScene', false, { level: 1 });
    watchSceneCrashKeys([game], EVENTS, (key, data) => calls.push([key, data]));
    game.sys.settings.data = { level: 2 };
    game.emit('start');
    game.emit('resume');
    game.sys.settings.data = { level: 3 };
    game.emit('wake');
    expect(calls).toEqual([
      ['GameScene', { level: 2 }],
      ['GameScene', { level: 2 }],
      ['GameScene', { level: 3 }],
    ]);
  });

  it('CREATE is not an event it listens to: create() can throw before CREATE fires, and the report must already name the scene', () => {
    const calls: Array<[string, unknown]> = [];
    const game = fakeScene('GameScene', false);
    watchSceneCrashKeys([game], EVENTS, (key, data) => calls.push([key, data]));
    game.emit('create');
    expect(calls).toEqual([]);
  });

  it('watches every scene it is given, and one event describes one scene once', () => {
    const calls: Array<[string, unknown]> = [];
    const a = fakeScene('GameScene', true);
    const b = fakeScene('PauseScene', false);
    watchSceneCrashKeys([a, b], EVENTS, (key, data) => calls.push([key, data]));
    expect(seen(calls)).toEqual(['GameScene']);
    b.emit('start');
    expect(seen(calls)).toEqual(['GameScene', 'PauseScene']);
    a.emit('resume');
    expect(seen(calls)).toEqual(['GameScene', 'PauseScene', 'GameScene']);
  });
});

describe('main.ts wiring', () => {
  const main = readFileSync(new URL('../main.ts', import.meta.url), 'utf8');

  it('sets the keys that need no game (webview_ver, build) right after Crash.init(), before READY', () => {
    expect(main).toMatch(
      /Crash\.init\(\);\s*(?:\/\/[^\n]*\n\s*)*Crash\.setKeys\(\{\s*webview_ver: webViewVersion\(navigator\.userAgent\),\s*build: BUILD_LABEL,?\s*\}\);/,
    );
  });

  it('installs the crash context from READY, where the renderer is known', () => {
    expect(main).toMatch(/game\.events\.once\(Phaser\.Core\.Events\.READY, \(\) => \{[\s\S]*?installCrashContext\(game\);/);
    expect(main).toMatch(/Crash\.setKeys\(\{\s*renderer: g\.config\.renderType === Phaser\.WEBGL \? 'WebGL' : 'Canvas',?\s*\}\);/);
  });

  it('follows every scene (also one still loading at READY) on START, RESUME and WAKE, never CREATE, with a breadcrumb per start', () => {
    expect(main).toMatch(
      /watchSceneCrashKeys\(\s*g\.scene\.getScenes\(false\),\s*\[Phaser\.Scenes\.Events\.START, Phaser\.Scenes\.Events\.RESUME, Phaser\.Scenes\.Events\.WAKE\],/,
    );
    expect(main).toMatch(/Crash\.setKeys\(sceneCrashKeys\(key, data\)\);\s*Crash\.log\(`scene \$\{key\}`\);/);
    expect(main).not.toMatch(/Scenes\.Events\.CREATE/);
  });
});
