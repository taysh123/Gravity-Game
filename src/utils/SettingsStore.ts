// Lightweight persisted user settings (localStorage). Single source of truth
// for sound/music/haptics/motion across scenes. No framework, no deps.

export type MotionPref = 'system' | 'on' | 'off';

export interface Settings {
  sound: boolean; // SFX + cues
  music: boolean; // ambient pad
  haptics: boolean; // vibration
  reduceMotion: MotionPref; // 'system' follows the OS setting
  seenTutorial: boolean; // first-play coach-mark shown
}

const KEY = 'gravity-flow:settings';

const DEFAULTS: Settings = {
  sound: true,
  music: true,
  haptics: true,
  reduceMotion: 'system',
  seenTutorial: false,
};

let cache: Settings | null = null;

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
    localStorage.setItem(KEY, JSON.stringify(cache));
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
