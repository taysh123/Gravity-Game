import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PLATFORM } from './platform.config';

// P00-T10: pin the platform scene keys against the scenes that main.ts really registers. A typo or a renamed scene
// would otherwise turn a Back press into a silent no-op (Phaser ignores unknown keys) that only a device would reveal.

const root = (rel: string): string => fileURLToPath(new URL(`../../${rel}`, import.meta.url));

// Scene keys from main.ts's `scene: [...]` array: identifier -> import path -> `super({ key: '...' })`.
function registeredSceneKeys(): string[] {
  const main = readFileSync(root('src/main.ts'), 'utf8');
  const array = /scene:\s*\[([\s\S]*?)\]/.exec(main);
  if (!array) throw new Error('scene array not found in src/main.ts');
  const identifiers = array[1]
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, '').replace(/,/g, '').trim())
    .filter((line) => /^[A-Za-z_]\w*$/.test(line));
  return identifiers.map((id) => {
    const imp = new RegExp(`import\\s*\\{[^}]*\\b${id}\\b[^}]*\\}\\s*from\\s*'(\\./scenes/[^']+)'`).exec(main);
    if (!imp) throw new Error(`no ./scenes import for ${id}`);
    const file = readFileSync(root(`src/${imp[1].slice(2)}.ts`), 'utf8');
    const key = /super\(\s*\{\s*key:\s*'([^']+)'/.exec(file);
    if (!key) throw new Error(`no super({ key }) in ${id}`);
    return key[1];
  });
}

const REGISTERED = registeredSceneKeys();
const asSet = new Set(REGISTERED);

describe('registered scene discovery (test helper sanity)', () => {
  it('finds every scene in main.ts, with unique keys, including the overlays', () => {
    expect(REGISTERED.length).toBeGreaterThanOrEqual(14);
    expect(asSet.size).toBe(REGISTERED.length);
    for (const key of ['BootScene', 'MainMenuScene', 'GameScene', 'EndlessScene', 'SettingsScene', 'PauseScene']) {
      expect(asSet.has(key)).toBe(true);
    }
  });
});

describe('PLATFORM.PARENT_SCENE', () => {
  const entries = Object.entries(PLATFORM.PARENT_SCENE);

  it('has only registered scenes as keys and as values', () => {
    for (const [child, parent] of entries) {
      expect(asSet.has(child), `child ${child} is not a registered scene`).toBe(true);
      expect(asSet.has(parent), `parent ${parent} (of ${child}) is not a registered scene`).toBe(true);
    }
  });

  it('never maps a scene to itself and always reaches the main menu', () => {
    for (const [child] of entries) {
      let key = child;
      for (let hops = 0; hops < 6 && key !== PLATFORM.BACK.MENU_SCENE; hops++) {
        const parent = PLATFORM.PARENT_SCENE[key];
        expect(parent, `no parent for ${key} (from ${child})`).toBeDefined();
        expect(parent).not.toBe(key);
        key = parent;
      }
      expect(key, `${child} never reaches the menu`).toBe(PLATFORM.BACK.MENU_SCENE);
    }
  });

  it('excludes the scenes the router handles explicitly', () => {
    const explicit = [
      PLATFORM.BACK.MENU_SCENE,
      ...PLATFORM.BACK.GAMEPLAY_SCENES,
      ...PLATFORM.BACK.OVERLAY_SCENES,
      ...PLATFORM.BACK.INERT_SCENES,
    ];
    for (const key of explicit) expect(PLATFORM.PARENT_SCENE[key]).toBeUndefined();
  });
});

describe('PLATFORM.BACK scene keys', () => {
  const all = [
    PLATFORM.BACK.MENU_SCENE,
    PLATFORM.BACK.PAUSE_SCENE,
    ...PLATFORM.BACK.GAMEPLAY_SCENES,
    ...PLATFORM.BACK.OVERLAY_SCENES,
    ...PLATFORM.BACK.ENDED_TO_MENU_SCENES,
    ...PLATFORM.BACK.INERT_SCENES,
  ];

  it('are all registered scenes', () => {
    for (const key of all) expect(asSet.has(key), `${key} is not a registered scene`).toBe(true);
  });

  it('lists the pause overlay below Settings (topmost first) and as an overlay', () => {
    expect(PLATFORM.BACK.OVERLAY_SCENES).toEqual(['SettingsScene', 'PauseScene']);
    expect(PLATFORM.BACK.PAUSE_SCENE).toBe('PauseScene');
  });

  it('only sends an ended run to the menu from a gameplay scene', () => {
    for (const key of PLATFORM.BACK.ENDED_TO_MENU_SCENES) {
      expect(PLATFORM.BACK.GAMEPLAY_SCENES).toContain(key);
    }
  });

  it('keeps the splash scenes inert and distinct from the menu', () => {
    expect(PLATFORM.BACK.INERT_SCENES).toEqual(['BootScene', 'CompanySplashScene', 'IntroSplashScene']);
    expect(PLATFORM.BACK.INERT_SCENES).not.toContain(PLATFORM.BACK.MENU_SCENE);
  });
});

describe('PLATFORM.PAUSE_UI touch targets', () => {
  it('keeps every pause control at or above 44 px, and CONTINUE at or above 48 px', () => {
    expect(PLATFORM.PAUSE_UI.SECONDARY_H).toBeGreaterThanOrEqual(44);
    expect(PLATFORM.PAUSE_UI.PRIMARY_H).toBeGreaterThanOrEqual(48);
    expect(PLATFORM.PAUSE_UI.HUD_BUTTON_SIZE).toBeGreaterThanOrEqual(44);
  });

  it('names the caller event after the documented contract', () => {
    expect(PLATFORM.PAUSE_ACTION_EVENT).toBe('pause-action');
  });
});
