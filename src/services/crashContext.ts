// Crashlytics custom keys (P00-T21): what the game was doing when a report was made. Pure, so the mapping is unit-tested. main.ts
// calls it on every scene start (Phaser.Scenes.Events.CREATE) and hands the result to Crash.setKeys.
//   scene        the scene that started last (overlays included)
//   level, mode  the gameplay context: GameScene = a campaign level or the daily (its index), EndlessScene = endless / weekly, any
//                other full-screen scene = menu with no level. An overlay (Settings, Pause) leaves both as they were, so a crash in
//                the pause menu still names the level underneath.
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

const levelOf = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : PLATFORM.CRASH_NO_LEVEL);

export function sceneCrashKeys(sceneKey: string, data: unknown): CrashKeys {
  if (PLATFORM.BACK.OVERLAY_SCENES.includes(sceneKey)) return { scene: sceneKey };
  const d = asRecord(data);
  if (sceneKey === CAMPAIGN_SCENE) {
    return d.daily === true
      ? { scene: sceneKey, mode: 'daily', level: levelOf(d.dailyIndex) }
      : { scene: sceneKey, mode: 'campaign', level: levelOf(d.level) };
  }
  if (sceneKey === RUN_SCENE) return { scene: sceneKey, mode: d.mode === 'weekly' ? 'weekly' : 'endless', level: PLATFORM.CRASH_NO_LEVEL };
  return { scene: sceneKey, mode: 'menu', level: PLATFORM.CRASH_NO_LEVEL };
}

export function webViewVersion(userAgent: string): string {
  return /Chrome\/(\d+(?:\.\d+)*)/.exec(userAgent)?.[1] ?? UNKNOWN_WEBVIEW;
}
