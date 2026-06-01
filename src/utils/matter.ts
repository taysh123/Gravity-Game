import Phaser from 'phaser';

// Phaser bundles Matter.js but does not re-export it in TypeScript types.
// This provides a typed reference to the methods we need for raw body operations.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const RawMatter = (Phaser.Physics.Matter as any).Matter as {
  Body: {
    setVelocity: (body: MatterJS.BodyType, velocity: { x: number; y: number }) => void;
    setPosition: (body: MatterJS.BodyType, position: { x: number; y: number }) => void;
    applyForce: (
      body: MatterJS.BodyType,
      position: { x: number; y: number },
      force: { x: number; y: number },
    ) => void;
  };
};
