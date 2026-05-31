import Phaser from 'phaser';

export type IconName =
  | 'home'
  | 'settings'
  | 'restart'
  | 'close'
  | 'sound'
  | 'music'
  | 'haptics'
  | 'motion';

// Draw a crisp line-style icon centered at (0,0) into a Graphics, sized to fit
// roughly a `size`×`size` box. Vector-drawn = no icon-font dependency and full
// control over the cosmic line aesthetic. Stroke-based for a consistent weight.
export function drawIcon(
  g: Phaser.GameObjects.Graphics,
  name: IconName,
  size: number,
  color: number,
  alpha = 1,
): void {
  const h = size / 2;
  const w = Math.max(2, size * 0.09);
  g.lineStyle(w, color, alpha);

  switch (name) {
    case 'home': {
      // Roof + body.
      stroke(g, [
        [-h * 0.85, -h * 0.05],
        [0, -h * 0.7],
        [h * 0.85, -h * 0.05],
      ]);
      g.strokeRect(-h * 0.55, -h * 0.05, h * 1.1, h * 0.75);
      // Door.
      g.strokeRect(-h * 0.16, h * 0.28, h * 0.32, h * 0.42);
      break;
    }
    case 'settings': {
      // Sliders — three tracks with offset knobs.
      const ys = [-h * 0.55, 0, h * 0.55];
      const knobX = [h * 0.35, -h * 0.3, h * 0.1];
      ys.forEach((y, i) => {
        line(g, -h * 0.8, y, h * 0.8, y);
        g.fillStyle(color, alpha);
        g.fillCircle(knobX[i], y, w * 1.3);
      });
      break;
    }
    case 'restart': {
      // ~270° arc + arrowhead.
      g.beginPath();
      g.arc(0, 0, h * 0.62, Phaser.Math.DegToRad(-40), Phaser.Math.DegToRad(220));
      g.strokePath();
      const ax = h * 0.62 * Math.cos(Phaser.Math.DegToRad(-40));
      const ay = h * 0.62 * Math.sin(Phaser.Math.DegToRad(-40));
      stroke(g, [
        [ax - h * 0.28, ay - h * 0.05],
        [ax, ay],
        [ax - h * 0.02, ay - h * 0.32],
      ]);
      break;
    }
    case 'close': {
      line(g, -h * 0.55, -h * 0.55, h * 0.55, h * 0.55);
      line(g, h * 0.55, -h * 0.55, -h * 0.55, h * 0.55);
      break;
    }
    case 'sound': {
      // Speaker + two waves.
      stroke(g, [
        [-h * 0.7, -h * 0.22],
        [-h * 0.35, -h * 0.22],
        [-h * 0.02, -h * 0.55],
        [-h * 0.02, h * 0.55],
        [-h * 0.35, h * 0.22],
        [-h * 0.7, h * 0.22],
        [-h * 0.7, -h * 0.22],
      ]);
      arcAt(g, h * 0.05, 0, h * 0.35, -50, 50);
      arcAt(g, h * 0.05, 0, h * 0.6, -50, 50);
      break;
    }
    case 'music': {
      // Two note heads + stems + beam.
      g.fillStyle(color, alpha);
      g.fillCircle(-h * 0.45, h * 0.45, w * 1.6);
      g.fillCircle(h * 0.4, h * 0.25, w * 1.6);
      line(g, -h * 0.45 + w * 1.4, h * 0.45, -h * 0.45 + w * 1.4, -h * 0.55);
      line(g, h * 0.4 + w * 1.4, h * 0.25, h * 0.4 + w * 1.4, -h * 0.55);
      line(g, -h * 0.45 + w * 1.4, -h * 0.55, h * 0.4 + w * 1.4, -h * 0.35);
      break;
    }
    case 'haptics': {
      // Phone + vibration lines.
      g.strokeRoundedRect(-h * 0.28, -h * 0.55, h * 0.56, h * 1.1, w);
      line(g, -h * 0.6, -h * 0.25, -h * 0.6, h * 0.25);
      line(g, h * 0.6, -h * 0.25, h * 0.6, h * 0.25);
      break;
    }
    case 'motion': {
      // Three motion arcs (speed lines).
      arcAt(g, -h * 0.1, 0, h * 0.35, -60, 60);
      arcAt(g, -h * 0.1, 0, h * 0.6, -60, 60);
      arcAt(g, -h * 0.1, 0, h * 0.85, -60, 60);
      break;
    }
  }
}

function line(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number): void {
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.strokePath();
}

function stroke(g: Phaser.GameObjects.Graphics, pts: Array<[number, number]>): void {
  g.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
  g.strokePath();
}

function arcAt(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  r: number,
  deg0: number,
  deg1: number,
): void {
  g.beginPath();
  g.arc(cx, cy, r, Phaser.Math.DegToRad(deg0), Phaser.Math.DegToRad(deg1));
  g.strokePath();
}
