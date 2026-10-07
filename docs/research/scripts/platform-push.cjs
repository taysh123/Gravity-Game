// Static "moving platform" pushing a resting ball: setPosition(updateVelocity=false) (current
// MovingPlatform behaviour) vs updateVelocity=true, using Phaser's bundled Matter 0.20.
// Usage: node platform-push.cjs "<repo root>"
const path = require('path');
const lib = path.join(process.argv[2], 'node_modules/phaser/src/physics/matter-js/lib');
const Engine = require(path.join(lib, 'core/Engine'));
const Bodies = require(path.join(lib, 'factory/Bodies'));
const Body = require(path.join(lib, 'body/Body'));
const Composite = require(path.join(lib, 'body/Composite'));

function run(updateVelocity, pxPerStep, stepsPerMove) {
  const engine = Engine.create({ gravity: { x: 0, y: 0 } });
  const ball = Bodies.circle(200, 300, 16, { restitution: 0.65, friction: 0.01, frictionAir: 0.02 });
  const plat = Bodies.rectangle(150, 300, 20, 120, { isStatic: true, restitution: 0.4, friction: 0.05 });
  Composite.add(engine.world, [ball, plat]);
  let x = 150;
  for (let i = 0; i < 40; i++) {
    // stepsPerMove=2 emulates a 30fps tween: the platform jumps 2 steps' worth once per render frame
    if (i < 20 && i % stepsPerMove === 0) { x += pxPerStep * stepsPerMove; Body.setPosition(plat, { x, y: 300 }, updateVelocity); }
    else if (updateVelocity) Body.setPosition(plat, { x, y: 300 }, true); // zero-velocity hold
    Engine.update(engine, 1000 / 60);
  }
  return `ball vx=${ball.velocity.x.toFixed(2)} px/step, x=${ball.position.x.toFixed(1)}`;
}
console.log('platform 3 px/step, moved every step  | updateVelocity=false:', run(false, 3, 1), '| true:', run(true, 3, 1));
console.log('platform 3 px/step, moved every 2nd step (30fps tween) | false:', run(false, 3, 2), '| true:', run(true, 3, 2));
