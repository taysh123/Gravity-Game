// Lightweight persisted user settings (localStorage). Single source of truth
// for sound/music/haptics/motion across scenes. No framework, no deps.
import { Saves } from '../platform/saves';

export type MotionPref = 'system' | 'on' | 'off';

export interface Settings {
  sound: boolean; // SFX + cues
  music: boolean; // ambient pad
  haptics: boolean; // vibration
  reduceMotion: MotionPref; // 'system' follows the OS setting
  seenTutorial: boolean; // first-play coach-mark shown
  seenFirstWin: boolean; // one-time first-ever campaign win beat shown
}

const KEY = 'gravity-flow:settings';

const DEFAULTS: Settings = {
  sound: true,
  music: true,
  haptics: true,
  reduceMotion: 'system',
  seenTutorial: false,
  seenFirstWin: false,
};

let cache: Settings | null = null;
// Saves.hydrate() may restore this key from the Preferences mirror after an early read: drop the cache.
Saves.onRestore(KEY, () => {
  cache = null;
});

function load(): Settings {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) } : { ...DEFAULTS };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

function persist(): void {
  try {
    Saves.write(KEY, JSON.stringify(cache));
  } catch {
    // Private mode / storage disabled — keep the in-memory cache.
  }
}

export const SettingsStore = {
  get(): Settings {
    return { ...load() };
  },
  set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    const s = load();
    s[key] = value;
    persist();
  },
};
