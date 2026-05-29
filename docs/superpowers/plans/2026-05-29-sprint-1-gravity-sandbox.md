# Sprint 1: Gravity Sandbox — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A minimal playable sandbox that proves the gravity attraction mechanic is fun. Ball + Attractor + World Bounds + Death Detection + Instant Restart. Nothing else.

**Architecture:** Single GameScene with a physics ball, tap-to-create gravity attractors, four static boundary walls, and position-based death detection. All attractor force logic and world bounds live inline in GameScene — no premature abstraction. Physics constants live in `physics.config.ts` as the single tuning surface.

**Tech Stack:** Phaser 3.80+ · TypeScript 5.4+ · Matter.js (bundled in Phaser) · Vite 5.2+ · Vitest 1.6+

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `package.json` | Dependencies, scripts |
| Create | `vite.config.ts` | Build + test config |
| Create | `tsconfig.json` | TypeScript strict config |
| Create | `index.html` | Canvas entry, viewport meta |
| Create | `src/types/index.ts` | `Vec2` shared type |
| Create | `src/utils/MathUtils.ts` | `normalize`, `clamp`, `distance` |
| Create | `src/utils/MathUtils.test.ts` | TDD tests for MathUtils |
| Create | `src/config/physics.config.ts` | All tuning constants |
| Create | `src/entities/Ball.ts` | Physics circle + Graphics visual |
| Create | `src/entities/Attractor.ts` | Pulsing ring visual + lifetime |
| Create | `src/scenes/BootScene.ts` | Immediately transitions to GameScene |
| Create | `src/scenes/GameScene.ts` | Core: bounds, input, force, death, restart |
| Create | `src/main.ts` | Phaser.Game bootstrap |

---

## Task 1: Project Scaffolding

**Files:** Create `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "gravity-game",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "phaser": "^3.80.1"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "vite": "^5.2.11",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.ts`**

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
});
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <title>Project Gravity</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        background: #0d0d1a;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
      }
      canvas { display: block; }
    </style>
  </head>
  <body>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`

Expected: `node_modules/` created, no errors. Phaser ~3.80.x installed.

- [ ] **Step 6: Commit**

```
git init
git add package.json vite.config.ts tsconfig.json index.html
git commit -m "chore: project scaffold — Phaser 3 + TypeScript + Vite"
```

---

## Task 2: Shared Types + Math Utilities (TDD)

**Files:** Create `src/types/index.ts`, `src/utils/MathUtils.test.ts`, `src/utils/MathUtils.ts`

- [ ] **Step 1: Create `src/types/index.ts`**

```typescript
export interface Vec2 {
  x: number;
  y: number;
}
```

- [ ] **Step 2: Write failing tests — `src/utils/MathUtils.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { normalize, clamp, distance } from './MathUtils';

describe('normalize', () => {
  it('returns a unit vector for (3, 4)', () => {
    const result = normalize(3, 4);
    expect(result.x).toBeCloseTo(0.6);
    expect(result.y).toBeCloseTo(0.8);
  });

  it('returns (0, 0) for a zero vector', () => {
    expect(normalize(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('returns a vector with magnitude 1 for any nonzero input', () => {
    const result = normalize(7, 24);
    const mag = Math.sqrt(result.x ** 2 + result.y ** 2);
    expect(mag).toBeCloseTo(1);
  });
});

describe('clamp', () => {
  it('clamps value above max down to max', () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });

  it('clamps value below min up to min', () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });

  it('returns value unchanged when within range', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it('returns min when value equals min', () => {
    expect(clamp(0, 0, 100)).toBe(0);
  });
});

describe('distance', () => {
  it('calculates distance between two points', () => {
    expect(distance(0, 0, 3, 4)).toBeCloseTo(5);
  });

  it('returns 0 for the same point', () => {
    expect(distance(5, 5, 5, 5)).toBe(0);
  });

  it('is symmetric', () => {
    expect(distance(1, 2, 4, 6)).toBeCloseTo(distance(4, 6, 1, 2));
  });
});
```

- [ ] **Step 3: Run tests — verify they FAIL**

Run: `npm test`

Expected: FAIL — `Cannot find module './MathUtils'` or similar. If tests pass, the module already exists (unexpected). Stop and investigate.

- [ ] **Step 4: Implement `src/utils/MathUtils.ts`**

```typescript
import type { Vec2 } from '../types';

export function normalize(x: number, y: number): Vec2 {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
}
```

- [ ] **Step 5: Run tests — verify they PASS**

Run: `npm test`

Expected: `8 tests | 8 passed`. No failures, no warnings.

- [ ] **Step 6: Commit**

```
git add src/types/index.ts src/utils/MathUtils.ts src/utils/MathUtils.test.ts
git commit -m "feat: Vec2 type and MathUtils (normalize, clamp, distance)"
```

---

## Task 3: Physics Constants

**Files:** Create `src/config/physics.config.ts`

No unit test — pure data. Correctness is validated through playtesting.

- [ ] **Step 1: Create `src/config/physics.config.ts`**

```typescript
export const PHYSICS = {
  // Attractor — primary tuning surface
  ATTRACTOR_STRENGTH: 0.0015,      // Force multiplier. Too high = ball snaps. Too low = floaty.
  ATTRACTOR_DURATION_MS: 800,      // How long a tap lasts (ms). Increase if timing feels harsh.
  ATTRACTOR_MIN_DIST: 30,          // Clamp distance to prevent force spike at close range.

  // Ball
  BALL_RADIUS: 16,
  BALL_RESTITUTION: 0.65,          // Bounciness: 0 = no bounce, 1 = perfect elastic.
  BALL_FRICTION: 0.01,             // Surface drag. Keep low — ball should slide.
  BALL_FRICTION_AIR: 0.005,        // Air damping. Prevents infinite acceleration.
  BALL_START_VX: 1.5,              // Initial horizontal velocity.
  BALL_START_VY: 0.5,              // Initial vertical velocity.

  // World bounds
  WALL_THICKNESS: 20,
  WALL_RESTITUTION: 0.5,
  PLAY_WIDTH: 360,                 // Play area inside 390px canvas.
  PLAY_HEIGHT: 780,                // Play area inside 844px canvas.

  // Colors
  COLOR_BACKGROUND: 0x0d0d1a,
  COLOR_BALL: 0xf0f0ff,
  COLOR_BALL_GLOW: 0xffd166,
  COLOR_ATTRACTOR: 0x7c5cff,
  COLOR_ATTRACTOR_PULSE: 0x00d4ff,
  COLOR_WALL: 0x1a2a3a,
} as const;
```

- [ ] **Step 2: Commit**

```
git add src/config/physics.config.ts
git commit -m "feat: physics constants (all tuning in one place)"
```

---

## Task 4: Ball Entity

**Files:** Create `src/entities/Ball.ts`

No unit test — requires live Phaser context. Verified by browser observation.

- [ ] **Step 1: Create `src/entities/Ball.ts`**

```typescript
import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';

export class Ball {
  readonly body: MatterJS.BodyType;
  readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.body = scene.matter.add.circle(x, y, PHYSICS.BALL_RADIUS, {
      restitution: PHYSICS.BALL_RESTITUTION,
      friction: PHYSICS.BALL_FRICTION,
      frictionAir: PHYSICS.BALL_FRICTION_AIR,
      label: 'ball',
    });

    Phaser.Physics.Matter.Matter.Body.setVelocity(this.body, {
      x: PHYSICS.BALL_START_VX,
      y: PHYSICS.BALL_START_VY,
    });

    this.graphics = scene.add.graphics();
    this.draw();
  }

  private draw(): void {
    this.graphics.clear();
    // Outer glow ring
    this.graphics.lineStyle(3, PHYSICS.COLOR_BALL_GLOW, 0.35);
    this.graphics.strokeCircle(0, 0, PHYSICS.BALL_RADIUS + 7);
    // Ball body
    this.graphics.fillStyle(PHYSICS.COLOR_BALL, 1);
    this.graphics.fillCircle(0, 0, PHYSICS.BALL_RADIUS);
  }

  update(): void {
    this.graphics.setPosition(this.body.position.x, this.body.position.y);
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
```

- [ ] **Step 2: Commit**

```
git add src/entities/Ball.ts
git commit -m "feat: Ball entity — physics body + Graphics visual"
```

---

## Task 5: Attractor Entity

**Files:** Create `src/entities/Attractor.ts`

No unit test — requires live Phaser context. Verified by browser observation.

- [ ] **Step 1: Create `src/entities/Attractor.ts`**

```typescript
import Phaser from 'phaser';
import { PHYSICS } from '../config/physics.config';

const RING_RADIUS = 30;

export class Attractor {
  readonly x: number;
  readonly y: number;
  private remainingMs: number;
  private readonly totalMs: number;
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.remainingMs = PHYSICS.ATTRACTOR_DURATION_MS;
    this.totalMs = PHYSICS.ATTRACTOR_DURATION_MS;
    this.graphics = scene.add.graphics();
    this.draw(1.0);
  }

  private draw(fraction: number): void {
    const r = RING_RADIUS * fraction;
    this.graphics.clear();
    // Outer pulse ring (fades with lifetime)
    this.graphics.lineStyle(2, PHYSICS.COLOR_ATTRACTOR_PULSE, fraction * 0.5);
    this.graphics.strokeCircle(this.x, this.y, r + 10);
    // Core ring
    this.graphics.lineStyle(3, PHYSICS.COLOR_ATTRACTOR, fraction);
    this.graphics.strokeCircle(this.x, this.y, r);
    // Center dot
    this.graphics.fillStyle(PHYSICS.COLOR_ATTRACTOR_PULSE, fraction * 0.8);
    this.graphics.fillCircle(this.x, this.y, 4);
  }

  update(deltaMs: number): void {
    this.remainingMs -= deltaMs;
    const fraction = Math.max(0, this.remainingMs / this.totalMs);
    this.draw(fraction);
  }

  isExpired(): boolean {
    return this.remainingMs <= 0;
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
```

- [ ] **Step 2: Commit**

```
git add src/entities/Attractor.ts
git commit -m "feat: Attractor entity — pulsing ring visual with lifetime"
```

---

## Task 6: Scenes and Entry Point

**Files:** Create `src/scenes/BootScene.ts`, `src/scenes/GameScene.ts`, `src/main.ts`

GameScene is the core. It wires everything together: world bounds (inline), input → attractor creation, per-frame force application (inline), death detection, and restart.

- [ ] **Step 1: Create `src/scenes/BootScene.ts`**

```typescript
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
```

- [ ] **Step 2: Create `src/scenes/GameScene.ts`**

```typescript
import Phaser from 'phaser';
import { Ball } from '../entities/Ball';
import { Attractor } from '../entities/Attractor';
import { PHYSICS } from '../config/physics.config';
import { normalize, clamp, distance } from '../utils/MathUtils';

export class GameScene extends Phaser.Scene {
  private ball!: Ball;
  private attractor: Attractor | null = null;
  private restartKey!: Phaser.Input.Keyboard.Key;

  // Play area offset — centers PLAY_WIDTH x PLAY_HEIGHT inside the canvas
  private get playX(): number {
    return (this.scale.width - PHYSICS.PLAY_WIDTH) / 2;
  }
  private get playY(): number {
    return (this.scale.height - PHYSICS.PLAY_HEIGHT) / 2;
  }

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.createWorldBounds();
    this.createBall();
    this.setupInput();
    this.restartKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.R,
    );
  }

  private createWorldBounds(): void {
    const ox = this.playX;
    const oy = this.playY;
    const pw = PHYSICS.PLAY_WIDTH;
    const ph = PHYSICS.PLAY_HEIGHT;
    const t = PHYSICS.WALL_THICKNESS;
    const opts = { isStatic: true, restitution: PHYSICS.WALL_RESTITUTION, friction: 0, label: 'wall' };

    // Top, Bottom, Left, Right walls
    this.matter.add.rectangle(ox + pw / 2, oy - t / 2, pw, t, opts);
    this.matter.add.rectangle(ox + pw / 2, oy + ph + t / 2, pw, t, opts);
    this.matter.add.rectangle(ox - t / 2, oy + ph / 2, t, ph, opts);
    this.matter.add.rectangle(ox + pw + t / 2, oy + ph / 2, t, ph, opts);

    // Visual border
    const g = this.add.graphics();
    g.lineStyle(1, PHYSICS.COLOR_WALL, 0.6);
    g.strokeRect(ox, oy, pw, ph);
  }

  private createBall(): void {
    const x = this.playX + PHYSICS.PLAY_WIDTH / 2;
    const y = this.playY + PHYSICS.PLAY_HEIGHT / 2;
    this.ball = new Ball(this, x, y);
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.attractor?.destroy();
      this.attractor = new Attractor(this, pointer.x, pointer.y);
    });
  }

  update(_time: number, delta: number): void {
    this.ball.update();
    this.tickAttractor(delta);
    this.applyAttractorForce();
    this.checkDeath();

    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.triggerRestart();
    }
  }

  private tickAttractor(deltaMs: number): void {
    if (!this.attractor) return;
    this.attractor.update(deltaMs);
    if (this.attractor.isExpired()) {
      this.attractor.destroy();
      this.attractor = null;
    }
  }

  private applyAttractorForce(): void {
    if (!this.attractor) return;
    const bx = this.ball.body.position.x;
    const by = this.ball.body.position.y;
    const dx = this.attractor.x - bx;
    const dy = this.attractor.y - by;
    const dist = clamp(distance(bx, by, this.attractor.x, this.attractor.y), PHYSICS.ATTRACTOR_MIN_DIST, Infinity);
    const dir = normalize(dx, dy);
    const mag = PHYSICS.ATTRACTOR_STRENGTH / (dist * dist);

    Phaser.Physics.Matter.Matter.Body.applyForce(
      this.ball.body,
      this.ball.body.position,
      { x: dir.x * mag, y: dir.y * mag },
    );
  }

  private checkDeath(): void {
    const margin = 60;
    const bx = this.ball.body.position.x;
    const by = this.ball.body.position.y;
    const ox = this.playX;
    const oy = this.playY;

    if (
      bx < ox - margin ||
      bx > ox + PHYSICS.PLAY_WIDTH + margin ||
      by < oy - margin ||
      by > oy + PHYSICS.PLAY_HEIGHT + margin
    ) {
      this.triggerRestart();
    }
  }

  private triggerRestart(): void {
    this.attractor?.destroy();
    this.attractor = null;
    this.scene.restart();
  }
}
```

- [ ] **Step 3: Create `src/main.ts`**

```typescript
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

new Phaser.Game({
  type: Phaser.AUTO,
  width: 390,
  height: 844,
  backgroundColor: '#0d0d1a',
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene],
});
```

- [ ] **Step 4: Commit**

```
git add src/scenes/BootScene.ts src/scenes/GameScene.ts src/main.ts
git commit -m "feat: BootScene + GameScene + main.ts entry point"
```

---

## Task 7: Browser Verification

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

Expected: `Local: http://localhost:5173/` — no build errors in terminal.

- [ ] **Step 2: Open browser and observe**

Navigate to `http://localhost:5173/`

Expected observations:
- Dark background (`#0d0d1a`) fills the screen
- White circle (ball) is visible in the center of the play area
- Ball is moving (initial velocity applied)
- Ball bounces off the four walls

- [ ] **Step 3: Test tap/click input**

Click or tap anywhere on the canvas.

Expected:
- A purple ring appears at the click position
- Ring pulses and shrinks over ~800ms
- Ball accelerates toward the click point
- Ball continues on momentum after ring disappears

- [ ] **Step 4: Test chaining**

Click rapidly in different positions to redirect the ball.

Expected: Ball responds to each new attractor, momentum is retained between attractors.

- [ ] **Step 5: Test restart**

Press R key.

Expected: Ball resets to center, initial velocity reapplied, attractor cleared. Restart should feel near-instant (< 500ms).

- [ ] **Step 6: TypeScript check**

Run: `npx tsc --noEmit`

Expected: 0 errors.

- [ ] **Step 7: Commit verification result**

```
git commit --allow-empty -m "verify: Sprint 1 sandbox confirmed working in browser"
```

---

## Task 8: Physics Tuning (Playtest)

No code changes until playtesting reveals what needs adjustment. Tune `src/config/physics.config.ts` only.

- [ ] **Step 1: Playtest for 5 minutes with the following questions in mind**

  - Does the pull feel physical (inverse-square distance decay perceptible)?
  - Does the ball retain momentum between attractors (can you chain taps)?
  - Is 800ms the right duration — long enough to feel intentional, short enough to feel responsive?
  - Is the ball speed comfortable — not too fast to track, not too slow to feel sluggish?
  - Do wall bounces feel satisfying?

- [ ] **Step 2: Apply constant adjustments if needed**

Common tuning adjustments and their effects:

| Problem | Adjustment |
|---------|-----------|
| Pull too weak | Increase `ATTRACTOR_STRENGTH` (try 0.002–0.003) |
| Pull too snappy/violent | Decrease `ATTRACTOR_STRENGTH` or increase `ATTRACTOR_MIN_DIST` |
| Attractor expires too fast | Increase `ATTRACTOR_DURATION_MS` (try 1000–1200) |
| Ball slows down too fast | Decrease `BALL_FRICTION_AIR` (try 0.001–0.003) |
| Walls feel mushy | Increase `WALL_RESTITUTION` (try 0.7–0.8) |
| Ball feels too bouncy off walls | Decrease `BALL_RESTITUTION` (try 0.4–0.5) |

- [ ] **Step 3: Commit final tuned constants**

```
git add src/config/physics.config.ts
git commit -m "tune: physics constants after Sprint 1 playtest"
```

---

## Task 9: Generate CLAUDE.md

- [ ] **Step 1: Run `/init` skill**

Use the harness `init` skill to generate `CLAUDE.md`.

- [ ] **Step 2: Verify CLAUDE.md contains all 9 required sections**

Required sections (add or edit after generation if any are missing):

1. **Project Vision** — what the game is, one paragraph
2. **MVP Goals** — 3 levels, prove mechanic is fun, playtest gate
3. **Core Gameplay Principles** — no world gravity, inverse-square attractor, ball physics rules
4. **Architecture Overview** — 3 scenes, entity list, systems list, why each exists
5. **Folder Structure** — current state + Sprint 2 additions marked
6. **Coding Standards** — strict TypeScript, all constants in physics.config.ts, Phaser Graphics API for visuals, no premature abstraction
7. **Skill Usage Rules** — writing-plans before each sprint, TDD for discrete logic, playtesting for physics feel, webapp-testing in Sprint 3+, verification-before-completion always
8. **Sprint Workflow** — approved sprint sequence, current position (Sprint 1 complete)
9. **Future Expansion Principles** — add mechanic = new entity class + LevelConfig field; never change AttractorSystem force model pattern

- [ ] **Step 3: Commit CLAUDE.md**

```
git add CLAUDE.md
git commit -m "docs: CLAUDE.md — project memory for future sessions"
```

---

## Self-Review

**Spec coverage check:**
- Ball physics ✅ Task 4
- Gravity attractor ✅ Tasks 5 + 6 (GameScene.applyAttractorForce)
- World bounds ✅ Task 6 (GameScene.createWorldBounds)
- Death detection ✅ Task 6 (GameScene.checkDeath)
- Instant restart ✅ Task 6 (GameScene.triggerRestart)
- CLAUDE.md ✅ Task 9

**Type consistency check:**
- `Vec2` defined in `types/index.ts`, used in `MathUtils.ts` return type ✅
- `PHYSICS` constants referenced consistently across Ball, Attractor, GameScene ✅
- `MatterJS.BodyType` used for `ball.body` in Ball and GameScene ✅
- `normalize()` in GameScene matches signature in MathUtils ✅

**Placeholder check:** No TBDs, no "implement later", no incomplete steps.

---

## Sprint 1 Success Criterion

> You can tap anywhere on the canvas and guide the ball using gravity attraction. The ball responds immediately. The pull feels physical and satisfying. Wall bounces are natural. Press R restarts instantly. You want to keep playing for 5 minutes.

**Gate:** If this criterion is not met after tuning, rework the force model before beginning Sprint 2.
