import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLATFORM } from '../config/platform.config';
import { routeBack, deriveBackState, type BackAction, type BackState, type SceneSnapshot } from './backRouter';

// P00-T10: every row of the Back routing table (docs/roadmap/phases/P00-foundation.md section 3, decision D-11).
// The router is pure: a scene snapshot goes in, one action comes out. Wiring (lifecycle.ts) executes the action.

const PARENTS = PLATFORM.PARENT_SCENE;

function state(over: Partial<BackState> & { active: string }): BackState {
  return { overlay: null, gameplayEnded: false, adShowing: false, parents: PARENTS, ...over };
}

// P00-T19 fix pass 1 (m2): while a full-screen ad is requested or on screen (Ads.isShowing(), from the moment the show is asked for,
// up to 5 s before the ad is actually visible) Back does nothing at all. Otherwise it would walk away from the screen that is waiting
// on the ad (Endless run-over -> menu), and the reward would be dropped.
describe('routeBack: an ad in flight swallows Back', () => {
  const cases: Array<[string, Partial<BackState> & { active: string }]> = [
    ['an ended Endless run (would go to the menu)', { active: 'EndlessScene', gameplayEnded: true }],
    ['a running level (would pause)', { active: 'GameScene' }],
    ['the shop (would go to the menu)', { active: 'CosmeticsScene' }],
    ['the main menu (would background the app)', { active: 'MainMenuScene' }],
    ['Settings open over a level', { active: 'GameScene', overlay: 'SettingsScene' }],
    ['PauseScene open over a level', { active: 'GameScene', overlay: 'PauseScene' }],
  ];

  for (const [name, over] of cases) {
    it(`${name}: none while an ad is in flight, the normal action once it is gone`, () => {
      expect(routeBack(state({ ...over, adShowing: true }))).toEqual({ type: 'none' });
      expect(routeBack(state({ ...over, adShowing: false })).type).not.toBe('none');
    });
  }

  it('deriveBackState carries the flag through (default: no ad)', () => {
    const scenes: SceneSnapshot[] = [{ key: 'EndlessScene', running: true, paused: false, gameplayEnded: true }];
    expect(deriveBackState(scenes, PARENTS).adShowing).toBe(false);
    expect(deriveBackState(scenes, PARENTS, true).adShowing).toBe(true);
    expect(routeBack(deriveBackState(scenes, PARENTS, true))).toEqual({ type: 'none' });
    expect(routeBack(deriveBackState(scenes, PARENTS, false))).toEqual({ type: 'toScene', key: 'MainMenuScene' });
  });
});

describe('routeBack: open overlays win over everything beneath them', () => {
  it('closes Settings opened over a running level', () => {
    expect(routeBack(state({ active: 'GameScene', overlay: 'SettingsScene' }))).toEqual({
      type: 'closeOverlay',
      key: 'SettingsScene',
    });
  });

  it('closes Settings opened over Endless', () => {
    expect(routeBack(state({ active: 'EndlessScene', overlay: 'SettingsScene' }))).toEqual({
      type: 'closeOverlay',
      key: 'SettingsScene',
    });
  });

  it('closes Settings opened over MainMenuScene (so the system exit never fires with an overlay open)', () => {
    expect(routeBack(state({ active: 'MainMenuScene', overlay: 'SettingsScene' }))).toEqual({
      type: 'closeOverlay',
      key: 'SettingsScene',
    });
  });

  it('resumes the paused level when PauseScene is the open overlay', () => {
    expect(routeBack(state({ active: 'GameScene', overlay: 'PauseScene' }))).toEqual({
      type: 'resume',
      key: 'GameScene',
    });
  });

  it('resumes the paused Endless run when PauseScene is the open overlay', () => {
    expect(routeBack(state({ active: 'EndlessScene', overlay: 'PauseScene' }))).toEqual({
      type: 'resume',
      key: 'EndlessScene',
    });
  });

  it('an overlay still wins when the run underneath has ended', () => {
    expect(routeBack(state({ active: 'GameScene', overlay: 'SettingsScene', gameplayEnded: true }))).toEqual({
      type: 'closeOverlay',
      key: 'SettingsScene',
    });
    expect(routeBack(state({ active: 'EndlessScene', overlay: 'PauseScene', gameplayEnded: true }))).toEqual({
      type: 'resume',
      key: 'EndlessScene',
    });
  });
});

describe('routeBack: gameplay scenes', () => {
  it('opens the pause menu over a running level', () => {
    expect(routeBack(state({ active: 'GameScene' }))).toEqual({ type: 'pause', key: 'GameScene' });
  });

  it('opens the pause menu over a running Endless run', () => {
    expect(routeBack(state({ active: 'EndlessScene' }))).toEqual({ type: 'pause', key: 'EndlessScene' });
  });

  it('ignores Back on a won / dying / leaving level (auto-advance or auto-restart is in progress)', () => {
    expect(routeBack(state({ active: 'GameScene', gameplayEnded: true }))).toEqual({ type: 'none' });
  });

  it('sends Back from an ended Endless run (run over) to the main menu', () => {
    expect(routeBack(state({ active: 'EndlessScene', gameplayEnded: true }))).toEqual({
      type: 'toScene',
      key: 'MainMenuScene',
    });
  });
});

describe('routeBack: menus and splashes', () => {
  it('hands Back to the system on MainMenuScene (warm background exit, never exitApp)', () => {
    expect(routeBack(state({ active: 'MainMenuScene' }))).toEqual({ type: 'system' });
  });

  it.each(['BootScene', 'CompanySplashScene', 'IntroSplashScene'])('ignores Back on %s', (key) => {
    expect(routeBack(state({ active: key }))).toEqual({ type: 'none' });
  });

  it.each(Object.entries(PARENTS))('sub-menu %s goes to its parent %s', (child, parent) => {
    expect(routeBack(state({ active: child }))).toEqual({ type: 'toScene', key: parent });
  });

  it('pins the documented parent table (LevelSelect -> WorldMap, the rest -> MainMenu)', () => {
    expect(PARENTS).toEqual({
      LevelSelectScene: 'WorldMapScene',
      WorldMapScene: 'MainMenuScene',
      AchievementsScene: 'MainMenuScene',
      CosmeticsScene: 'MainMenuScene',
      RunSelectScene: 'MainMenuScene',
      EndScene: 'MainMenuScene',
    });
  });

  it('a stale gameplayEnded flag does not affect sub-menu routing', () => {
    expect(routeBack(state({ active: 'WorldMapScene', gameplayEnded: true }))).toEqual({
      type: 'toScene',
      key: 'MainMenuScene',
    });
  });

  it('ignores Back when there is no active scene or an unknown key', () => {
    expect(routeBack(state({ active: '' }))).toEqual({ type: 'none' });
    expect(routeBack(state({ active: 'SomeFutureScene' }))).toEqual({ type: 'none' });
  });

  it('does not treat Object.prototype members as parents', () => {
    for (const key of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
      expect(routeBack(state({ active: key }))).toEqual({ type: 'none' });
    }
  });
});

describe('routeBack: invariants', () => {
  const scenes = [
    '',
    'BootScene',
    'CompanySplashScene',
    'IntroSplashScene',
    'MainMenuScene',
    'GameScene',
    'EndlessScene',
    ...Object.keys(PARENTS),
  ];
  const overlays: Array<string | null> = [null, 'SettingsScene', 'PauseScene'];
  const allowed = new Set<BackAction['type']>(['closeOverlay', 'pause', 'resume', 'toScene', 'system', 'none']);

  it('always returns a known action and never an app exit', () => {
    for (const active of scenes) {
      for (const overlay of overlays) {
        for (const gameplayEnded of [false, true]) {
          const a = routeBack(state({ active, overlay, gameplayEnded }));
          expect(allowed.has(a.type)).toBe(true);
          expect(JSON.stringify(a)).not.toMatch(/exit/i);
        }
      }
    }
  });

  it('only returns system on MainMenuScene with no overlay open', () => {
    for (const active of scenes) {
      for (const overlay of overlays) {
        for (const gameplayEnded of [false, true]) {
          const a = routeBack(state({ active, overlay, gameplayEnded }));
          if (a.type === 'system') {
            expect(active).toBe('MainMenuScene');
            expect(overlay).toBeNull();
          }
        }
      }
    }
  });

  it('never opens the pause menu while an overlay is open or the run has ended', () => {
    for (const active of scenes) {
      for (const overlay of overlays) {
        const ended = routeBack(state({ active, overlay, gameplayEnded: true }));
        expect(ended.type).not.toBe('pause');
        if (overlay) expect(routeBack(state({ active, overlay })).type).not.toBe('pause');
      }
    }
  });
});

describe('deriveBackState: scene snapshot -> router state', () => {
  const snap = (key: string, running: boolean, paused = false, gameplayEnded?: boolean): SceneSnapshot => ({
    key,
    running,
    paused,
    gameplayEnded,
  });

  it('a running level has no overlay', () => {
    const s = deriveBackState([snap('MainMenuScene', false), snap('GameScene', true)], PARENTS);
    expect(s).toEqual({ overlay: null, active: 'GameScene', gameplayEnded: false, adShowing: false, parents: PARENTS });
  });

  it('Settings over a paused level reports Settings as the overlay and the level as active', () => {
    const s = deriveBackState([snap('SettingsScene', true), snap('GameScene', false, true)], PARENTS);
    expect(s.overlay).toBe('SettingsScene');
    expect(s.active).toBe('GameScene');
  });

  it('PauseScene over a paused level reports PauseScene as the overlay', () => {
    const s = deriveBackState([snap('PauseScene', true), snap('EndlessScene', false, true)], PARENTS);
    expect(s.overlay).toBe('PauseScene');
    expect(s.active).toBe('EndlessScene');
  });

  it('Settings over a paused PauseScene over a paused level: Settings is the topmost overlay', () => {
    const s = deriveBackState(
      [snap('SettingsScene', true), snap('PauseScene', false, true), snap('GameScene', false, true)],
      PARENTS,
    );
    expect(s.overlay).toBe('SettingsScene');
    expect(s.active).toBe('GameScene');
  });

  it('a paused overlay beneath a running one is not the overlay', () => {
    const s = deriveBackState([snap('PauseScene', false, true), snap('SettingsScene', true), snap('GameScene', false, true)], PARENTS);
    expect(s.overlay).toBe('SettingsScene');
  });

  it('overlay scenes are never the active scene', () => {
    const s = deriveBackState([snap('PauseScene', true), snap('SettingsScene', true)], PARENTS);
    expect(s.active).toBe('');
  });

  it('Settings over a paused MainMenuScene', () => {
    const s = deriveBackState([snap('MainMenuScene', false, true), snap('SettingsScene', true)], PARENTS);
    expect(s).toEqual({ overlay: 'SettingsScene', active: 'MainMenuScene', gameplayEnded: false, adShowing: false, parents: PARENTS });
  });

  it('carries gameplayEnded from the active scene only', () => {
    const ended = deriveBackState([snap('EndlessScene', true, false, true)], PARENTS);
    expect(ended.gameplayEnded).toBe(true);
    const other = deriveBackState([snap('GameScene', false, false, true), snap('MainMenuScene', true)], PARENTS);
    expect(other.active).toBe('MainMenuScene');
    expect(other.gameplayEnded).toBe(false);
  });

  it('ignores stopped scenes and reports no active scene when nothing runs', () => {
    const s = deriveBackState([snap('MainMenuScene', false), snap('GameScene', false)], PARENTS);
    expect(s.active).toBe('');
    expect(s.overlay).toBeNull();
  });

  it('prefers the last (topmost) of several live scenes', () => {
    const s = deriveBackState([snap('LevelSelectScene', true), snap('WorldMapScene', true)], PARENTS);
    expect(s.active).toBe('WorldMapScene');
  });

  it('composes with routeBack end to end', () => {
    const live = (rows: SceneSnapshot[]): BackAction => routeBack(deriveBackState(rows, PARENTS));
    expect(live([snap('GameScene', true)])).toEqual({ type: 'pause', key: 'GameScene' });
    expect(live([snap('GameScene', false, true), snap('PauseScene', true)])).toEqual({ type: 'resume', key: 'GameScene' });
    expect(live([snap('GameScene', false, true), snap('PauseScene', false, true), snap('SettingsScene', true)])).toEqual({
      type: 'closeOverlay',
      key: 'SettingsScene',
    });
    expect(live([snap('MainMenuScene', true)])).toEqual({ type: 'system' });
    expect(live([snap('EndlessScene', true, false, true)])).toEqual({ type: 'toScene', key: 'MainMenuScene' });
  });
});

// Source-level guards for the rules the router must never break (D-11): the app is never force-closed from JS and
// the native plugin never reaches the web bundle.
describe('Back wiring source guards', () => {
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

  // Code only: comments may (and do) mention exitApp() when explaining why it is never called.
  const code = (f: string): string => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const files = sourceFiles(srcRoot);

  it('never calls exitApp()', () => {
    const offenders = files.filter((f) => /\bexitApp\s*\(/.test(code(f)));
    expect(offenders).toEqual([]);
  });

  // The native plugin is reached only by NAME through registerPlugin('App') in src/utils/native/app.ts, so no source
  // file may import the package at all: a value import would put the plugin's web implementation into the bundle,
  // where its listeners are not gated by Capacitor.isNativePlatform(). Type-only imports are erased and are fine.
  // The matcher runs over the comment-stripped source as ONE string, so it also catches multi-line named imports,
  // side-effect imports, re-exports, dynamic import() and require().
  const PKG = String.raw`['"]@capacitor\/app['"]`;
  const VALUE_USES = [
    new RegExp(String.raw`\bimport\s+(?!type\b)[^;'"]*?\bfrom\s*${PKG}`), // import x / { a,\n b } / * as x from
    new RegExp(String.raw`\bimport\s*${PKG}`), // import '@capacitor/app'
    new RegExp(String.raw`\bexport\s+(?!type\b)[^;'"]*?\bfrom\s*${PKG}`), // export { a } from
    new RegExp(String.raw`\bimport\s*\(\s*${PKG}\s*\)`), // import('@capacitor/app')
    new RegExp(String.raw`\brequire\s*\(\s*${PKG}\s*\)`), // require('@capacitor/app')
  ];
  const usesCapacitorApp = (src: string): boolean => VALUE_USES.some((re) => re.test(src));

  it('never imports @capacitor/app as a value anywhere in src (it is reached only by name through the native seam)', () => {
    const offenders = files.filter((f) => usesCapacitorApp(code(f)));
    expect(offenders).toEqual([]);
  });

  it('the @capacitor/app matcher catches every value-import form, including multi-line and dynamic', () => {
    const bad = [
      "import { App } from '@capacitor/app';",
      'import {\n  App,\n  type AppState,\n} from "@capacitor/app";',
      "import * as capApp from '@capacitor/app'",
      "import App from '@capacitor/app'",
      "import '@capacitor/app';",
      "export { App } from '@capacitor/app';",
      "const m = await import('@capacitor/app');",
      'const m = await import(\n  "@capacitor/app"\n);',
      "const m = require('@capacitor/app');",
    ];
    for (const src of bad) expect(usesCapacitorApp(src), src).toBe(true);
  });

  it('the @capacitor/app matcher allows type-only imports and unrelated modules', () => {
    const ok = [
      "import type { AppPlugin } from '@capacitor/app';",
      'import type {\n  AppState,\n} from "@capacitor/app";',
      "import { registerPlugin } from '@capacitor/core';",
      "import { Preferences } from '@capacitor/preferences';",
      "const m = await import('../utils/native/app');",
      "registerPlugin<AppBridge>('App');",
    ];
    for (const src of ok) expect(usesCapacitorApp(src), src).toBe(false);
  });

  it('the old single-line guard missed multi-line and dynamic imports (why the matcher above exists)', () => {
    const legacy = (src: string): boolean =>
      src.split('\n').some((line) => /^\s*import\s+(?!type\b)[^;]*from\s+['"]@capacitor\/app['"]/.test(line));
    const multiLine = 'import {\n  App,\n} from "@capacitor/app";';
    const dynamic = "const m = await import('@capacitor/app');";
    expect(legacy(multiLine)).toBe(false);
    expect(legacy(dynamic)).toBe(false);
    expect(usesCapacitorApp(multiLine)).toBe(true);
    expect(usesCapacitorApp(dynamic)).toBe(true);
  });

  it('the native seam loads the plugin by name via registerPlugin, with no package import', () => {
    const seam = code(join(srcRoot, 'utils', 'native', 'app.ts'));
    expect(seam).toMatch(/registerPlugin<AppBridge>\(\s*'App'\s*\)/);
    expect(usesCapacitorApp(seam)).toBe(false);
  });
});
