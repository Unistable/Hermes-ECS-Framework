// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · core/Entity.js  (clean v2)
//  Chainable-обёртка над числовым ID сущности. Удобна для декларативного
//  описания сущности:
//
//    const player = Entity.create(world)
//      .add(Transform, { x: 100, y: 100 })
//      .add(Velocity, {})
//      .add(Sprite, { image: 'player' })
//      .add(PlayerTag);
//
//  Внутри — те же world.create()/world.add(), без оверхеда.
// ─────────────────────────────────────────────────────────────────────────────

import { World } from './World.js';

export class Entity {
  constructor(world, id) {
    this.world = world;
    this.id = id;
  }

  static create(world) { return new Entity(world, world.create()); }
  static wrap(world, id) { return new Entity(world, id); }

  add(component, initial = null) {
    this.world.add(this.id, component, initial);
    return this;
  }

  get(component) {
    return this.world.get(this.id, component);
  }

  has(component) {
    return this.world.has(this.id, component);
  }

  remove(component) {
    this.world.remove(this.id, component);
    return this;
  }

  markChanged(component) {
    this.world.markChanged(this.id, component);
    return this;
  }

  destroy() {
    this.world.destroy(this.id);
    this.id = 0;
  }

  get alive() {
    return this.id !== 0 && this.world.has(this.id);
  }
}
