import Phaser from 'phaser';
import { LEVELS } from '../config/levels';
import { WORLDS } from '../config/worlds';
import { SPLASH } from '../config/splash.config';
import { THEME } from '../config/theme.config';
import { themeForWorld } from '../config/worldThemes';
import { CosmicBackground } from '../entities/CosmicBackground';
import { Button } from '../ui/Button';
import { fadeIn, fadeToScene, warpToScene } from '../utils/transitions';
import { reducedMotionActive, safeAreaInsetsScaled } from '../utils/a11y';
import { ProgressStore } from '../utils/ProgressStore';
import { worldOf } from '../utils/world';

const NODE_GAP = 98;   // vertical spacing between world nodes
const NODE_R = 23;     // planet node radius
const WIND = 64;       // horizontal wind amplitude of the constellation path
const DRAG_THRESHOLD = 8;

// THE STAR MAP — the 15 worlds as glowing destination nodes on a winding
// constellation path. The lost star's journey through the cosmos. Scrollable;
// opens centred on the player's current world. Tap an unlocked world to warp in.
export class WorldMapScene extends Phaser.Scene {
  private cosmic!: CosmicBackground;
  private content!: Phaser.GameObjects.Container;
  private scrollMin = 0;
  private scrolled = false;
  private dragStartY = 0;
  private contentStartY = 0;

  constructor() {
    super({ key: 'WorldMapScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const sx = this.scale.displaySize.width / this.scale.gameSize.width;
    const sy = this.scale.displaySize.height / this.scale.gameSize.height;
    const insets = safeAreaInsetsScaled(sx, sy);
    const reduced = reducedMotionActive();

    this.cosmic = new CosmicBackground(this);
    fadeIn(this);

    this.add
      .text(cx, Math.max(height * 0.07, insets.top + 38), 'THE COSMOS', {
        fontFamily: THEME.FONT_DISPLAY, fontSize: '22px', color: THEME.TEXT_PRIMARY, fontStyle: '700',
      })
      .setOrigin(0.5)
      .setLetterSpacing(3)
      .setDepth(10);

    const viewTop = Math.max(height * 0.14, insets.top + 76);
    const backY = Math.min(height - Math.max(SPLASH.SAFE_AREA_MIN_PAD, insets.bottom) - 30, height * 0.95);
    const viewBottom = backY - 38;
    const viewH = viewBottom - viewTop;

    this.content = this.add.container(0, 0);

    // The constellation path line (behind the nodes), brighter up to the furthest
    // reached world.
    const path = this.add.graphics();
    this.content.add(path);

    const nodeX = (i: number) => cx + Math.sin(i * 0.95) * WIND;
    const nodeY = (i: number) => viewTop + i * NODE_GAP + NODE_GAP / 2;
    const reachedIndex = worldOf(ProgressStore.nextLevel(LEVELS.length)).id - 1;

    // Path segments.
    for (let i = 1; i < WORLDS.length; i++) {
      const lit = i <= reachedIndex;
      path.lineStyle(2, lit ? 0x9fb4ff : 0x2a3050, lit ? 0.5 : 0.3);
      path.beginPath();
      path.moveTo(nodeX(i - 1), nodeY(i - 1));
      path.lineTo(nodeX(i), nodeY(i));
      path.strokePath();
    }

    WORLDS.forEach((world, i) => {
      const unlocked = ProgressStore.isUnlocked(world.from);
      const node = this.makeNode(nodeX(i), nodeY(i), world.id, unlocked, reduced, i, i === reachedIndex);
      this.content.add(node);
    });

    // Clip + scroll.
    const maskShape = this.make.graphics({});
    maskShape.fillRect(0, viewTop, width, viewH);
    this.content.setMask(maskShape.createGeometryMask());

    const contentBottom = viewTop + WORLDS.length * NODE_GAP + NODE_GAP / 2;
    this.scrollMin = Math.min(0, viewBottom - contentBottom);
    // Open centred on the current world.
    const focusY = nodeY(reachedIndex);
    this.content.y = Phaser.Math.Clamp(viewTop + viewH * 0.45 - focusY, this.scrollMin, 0);
    this.setupScroll(viewTop, viewBottom);

    new Button(this, cx, backY, '← Back', () => fadeToScene(this, 'MainMenuScene'), {
      width: 150, height: 46, fontSize: 18,
    }).container.setDepth(10);
  }

  private makeNode(
    x: number, y: number, worldId: number, unlocked: boolean, reduced: boolean, index: number, isCurrent: boolean,
  ): Phaser.GameObjects.Container {
    const world = WORLDS[worldId - 1];
    const t = themeForWorld(worldId);
    const accent = t.accent;
    const accentHex = `#${accent.toString(16).padStart(6, '0')}`;

    const levels: number[] = [];
    for (let n = world.from; n <= Math.min(world.to, LEVELS.length); n++) levels.push(n);
    const earned = levels.reduce((s, n) => s + ProgressStore.get(n).stars, 0);
    const maxStars = levels.length * 3;

    const children: Phaser.GameObjects.GameObject[] = [];

    if (unlocked) {
      const glow = this.add
        .image(0, 0, 'glow')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(accent)
        .setAlpha(0.4)
        .setDisplaySize(NODE_R * 5, NODE_R * 5);
      children.push(glow);
    }

    const disc = this.add.graphics();
    disc.fillStyle(unlocked ? accent : 0x232842, unlocked ? 0.9 : 0.8);
    disc.fillCircle(0, 0, NODE_R);
    disc.lineStyle(2, unlocked ? 0xffffff : 0x3a4060, unlocked ? 0.7 : 0.5);
    disc.strokeCircle(0, 0, NODE_R);
    children.push(disc);

    // Roman numeral inside the node.
    children.push(
      this.add.text(0, 0, t.roman, {
        fontFamily: THEME.FONT_DISPLAY, fontSize: '15px',
        color: unlocked ? '#0d0d1a' : THEME.TEXT_MUTED, fontStyle: '700',
      }).setOrigin(0.5),
    );

    // Name + star tally to the side (alternates so labels don't collide with the path).
    const labelLeft = x > this.scale.width / 2;
    const lx = labelLeft ? -NODE_R - 12 : NODE_R + 12;
    const origin = labelLeft ? 1 : 0;
    children.push(
      this.add.text(lx, -9, world.name, {
        fontFamily: THEME.FONT_DISPLAY, fontSize: '15px',
        color: unlocked ? accentHex : THEME.TEXT_MUTED, fontStyle: '600',
      }).setOrigin(origin, 0.5).setLetterSpacing(1),
    );
    // The current node's tally is emphasized (gold + bold) — the one piece of
    // "where am I, and how am I doing here" clarity a returning player needs
    // at a glance; every other node's tally stays a muted, secondary detail.
    const emphasizeTally = isCurrent && unlocked;
    children.push(
      this.add.text(lx, 10, unlocked ? `${earned}/${maxStars}★` : 'locked', {
        fontFamily: THEME.FONT_BODY,
        fontSize: emphasizeTally ? '13px' : '12px',
        color: emphasizeTally ? '#ffd166' : THEME.TEXT_MUTED,
        fontStyle: emphasizeTally ? '700' : '400',
      }).setOrigin(origin, 0.5),
    );

    const node = this.add.container(x, y, children);
    node.setSize(NODE_R * 2, NODE_R * 2);

    if (unlocked) {
      node.setInteractive(new Phaser.Geom.Circle(0, 0, NODE_R + 8), Phaser.Geom.Circle.Contains);
      if (node.input) node.input.cursor = 'pointer';
      node.on('pointerup', () => {
        if (this.scrolled) return;
        warpToScene(this, 'LevelSelectScene', { world: worldId }, accent);
      });
    } else {
      node.setAlpha(0.55);
    }

    if (!reduced) {
      node.setScale(0.7).setAlpha(0);
      this.tweens.add({
        targets: node, scale: 1, alpha: unlocked ? 1 : 0.55,
        delay: 40 + index * 30, duration: 360, ease: THEME.EASE_POP,
      });
    }
    return node;
  }

  private setupScroll(viewTop: number, viewBottom: number): void {
    const inView = (py: number) => py >= viewTop && py <= viewBottom;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!inView(p.y)) return;
      this.scrolled = false;
      this.dragStartY = p.y;
      this.contentStartY = this.content.y;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown || this.scrollMin === 0) return;
      const dy = p.y - this.dragStartY;
      if (Math.abs(dy) > DRAG_THRESHOLD) this.scrolled = true;
      if (this.scrolled) this.content.y = Phaser.Math.Clamp(this.contentStartY + dy, this.scrollMin, 0);
    });
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (this.scrollMin === 0) return;
      this.content.y = Phaser.Math.Clamp(this.content.y - dy, this.scrollMin, 0);
    });
  }

  update(): void {
    this.cosmic.update();
  }
}
