// Crashlytics custom keys (P00-T21): what the game was doing when a report was made. Pure, so the mapping is unit-tested. main.ts
// calls it when a scene starts, resumes or wakes (watchSceneCrashKeys) and hands the result to Crash.setKeys. START, not CREATE:
// Phaser emits CREATE only after create() returns, so a throw inside create() would be reported under the previous scene.
//   scene        the scene that started last (overlays included)
//   level, mode  the gameplay context: GameScene = a campaign level, or the daily by its number (index + 1; a start that names no
//                level or index is level 1, as GameScene plays it), EndlessScene = endless / weekly with level CRASH_NO_LEVEL, any
//                other full-screen scene = menu with level CRASH_NO_LEVEL. An overlay (Settings, Pause) leaves both as they were,
//                so a crash in the pause menu still names the level underneath.
//   webview_ver  the Chrome version in the WebView user agent
//   build        package.json version + androidBuild (e.g. 1.0.0+1): the two inputs of the versionCode (D-20), so the one formula
//                stays in scripts/lib/versionCode.mjs. Crashlytics records the versionCode itself on every report.
import { androidBuild, version } from '../../package.json';
import { PLATFORM } from '../config/platform.config';

export type CrashKeys = Record<string, string | number>;

// The two gameplay scenes, by key; crashContext.test.ts pins both into PLATFORM.BACK.GAMEPLAY_SCENES.
export const CAMPAIGN_SCENE = 'GameScene';
export const RUN_SCENE = 'EndlessScene';
export const UNKNOWN_WEBVIEW = 'unknown';
export const BUILD_LABEL = `${version}+${androidBuild}`;

const asRecord = (data: unknown): Record<string, unknown> =>
  data !== null && typeof data === 'object' ? (data as Record<string, unknown>) : {};

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function sceneCrashKeys(sceneKey: string, data: unknown): CrashKeys {
  if (PLATFORM.BACK.OVERLAY_SCENES.includes(sceneKey)) return { scene: sceneKey };
  const d = asRecord(data);
  if (sceneKey === CAMPAIGN_SCENE) {
    return d.daily === true
      ? { scene: sceneKey, mode: 'daily', level: PLATFORM.CRASH_FIRST_LEVEL + (finite(d.dailyIndex) ? d.dailyIndex : 0) }
      : { scene: sceneKey, mode: 'campaign', level: finite(d.level) ? d.level : PLATFORM.CRASH_FIRST_LEVEL };
  }
  if (sceneKey === RUN_SCENE) return { scene: sceneKey, mode: d.mode === 'weekly' ? 'weekly' : 'endless', level: PLATFORM.CRASH_NO_LEVEL };
  return { scene: sceneKey, mode: 'menu', level: PLATFORM.CRASH_NO_LEVEL };
}

export function webViewVersion(userAgent: string): string {
  return /Chrome\/(\d+(?:\.\d+)*)/.exec(userAgent)?.[1] ?? UNKNOWN_WEBVIEW;
}

// The slice of a Phaser.Scene that the crash keys read, so this file imports no Phaser and runs in node.
export interface CrashScene {
  scene: { key: string };
  sys: { settings: { active: boolean; data: unknown }; events: { on(event: string, listener: () => void): unknown } };
}

/**
 * Keeps the crash keys and the scene breadcrumb in step with `scenes`: `describe(sceneKey, data)` runs each time one of `events`
 * (main.ts passes START, RESUME and WAKE) fires on a scene, with the scene's settings.data of that moment (Systems.start sets it
 * before it emits START). A scene that is already active when this is called has started before any listener existed (it may
 * still be loading, so this checks settings.active, not isActive()), so it is described now. A scene is never described twice for
 * one start: the scenes active here have already emitted their START, and the others have not.
 */
export function watchSceneCrashKeys(
  scenes: readonly CrashScene[],
  events: readonly string[],
  describe: (sceneKey: string, data: unknown) => void,
): void {
  for (const scene of scenes) {
    const run = (): void => describe(scene.scene.key, scene.sys.settings.data);
    for (const event of events) scene.sys.events.on(event, run);
    if (scene.sys.settings.active) run();
  }
}
