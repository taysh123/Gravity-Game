import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PLATFORM } from '../config/platform.config';
import { BUILD_LABEL, CAMPAIGN_SCENE, RUN_SCENE, UNKNOWN_WEBVIEW, sceneCrashKeys, webViewVersion } from './crashContext';

const NO_LEVEL = PLATFORM.CRASH_NO_LEVEL;

describe('sceneCrashKeys: the scene / level / mode custom keys (P00-T21)', () => {
  it('the two gameplay keys are registered gameplay scenes (platformConfig.test.ts pins those against main.ts)', () => {
    expect(PLATFORM.BACK.GAMEPLAY_SCENES).toEqual(expect.arrayContaining([CAMPAIGN_SCENE, RUN_SCENE]));
  });

  it('a campaign level', () => {
    expect(sceneCrashKeys('GameScene', { level: 12 })).toEqual({ scene: 'GameScene', mode: 'campaign', level: 12 });
  });

  it('the daily: mode daily, level = the daily index', () => {
    expect(sceneCrashKeys('GameScene', { level: 1, daily: true, dailyIndex: 3, dailyModifier: 'timed' })).toEqual({ scene: 'GameScene', mode: 'daily', level: 3 });
  });

  it('a GameScene start without a usable level says "no level" instead of inventing one', () => {
    expect(sceneCrashKeys('GameScene', undefined)).toEqual({ scene: 'GameScene', mode: 'campaign', level: NO_LEVEL });
    expect(sceneCrashKeys('GameScene', { level: 'x' })).toEqual({ scene: 'GameScene', mode: 'campaign', level: NO_LEVEL });
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

describe('main.ts wiring', () => {
  it('sets the context keys from READY and again on every scene CREATE, with a breadcrumb per scene start', () => {
    const main = readFileSync(new URL('../main.ts', import.meta.url), 'utf8');
    expect(main).toMatch(/game\.events\.once\(Phaser\.Core\.Events\.READY, \(\) => \{[\s\S]*?installCrashContext\(game\);/);
    expect(main).toMatch(/scene\.sys\.events\.on\(Phaser\.Scenes\.Events\.CREATE, \(\) => describeScene\(scene\)\)/);
    expect(main).toMatch(/Crash\.setKeys\(sceneCrashKeys\(key, scene\.sys\.settings\.data\)\);\s*Crash\.log\(`scene \$\{key\}`\);/);
  });
});
