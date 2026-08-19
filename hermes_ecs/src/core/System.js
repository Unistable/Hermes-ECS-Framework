// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · core/System.js  (clean v2)
//  Базовый класс для систем. Реальные системы могут не наследоваться
//  от System — достаточно реализовать соответствующие методы (onStep,
//  onRender и т. д.). Но наследование упрощает structur'у кода.
//
//  Идиома (TypeScript-стиль):
//
//    class MovementSystem extends System {
//      static queries = {
//        movers: { all: [Transform, Velocity] },
//      };
//      onInit(world) { super.onInit(world); this._setupQueries(); }
//      onFixedStep(dt) {
//        for (const eid of this.movers) { ... }
//      }
//    }
//
//  _setupQueries() автоматически регистрирует static queries в World
//  и выставляет this.<queryName> как ссылку на Query.
// ─────────────────────────────────────────────────────────────────────────────

import { PipelineStages } from './Pipeline.js';

export class System {
  constructor() {
    this.world = null;
    this.name = this.constructor.name;
    this._queries = {};
  }

  onInit(world) { this.world = world; }
  onInput(dt) {}
  onPreStep(dt) {}
  onFixedStep(fixedDt) {}
  onStep(dt) {}
  onPostStep(dt) {}
  onRender(alpha) {}
  onCleanup() {}
  onDestroy() {}

  /**
   * Автоматически построить this.<queryName> по статической декларации
   * queries в подклассе. Безопасно вызывать из onInit.
   */
  _setupQueries() {
    if (!this.world) return;
    const defs = this.constructor.queries;
    if (!defs) return;
    for (const [name, spec] of Object.entries(defs)) {
      const q = this.world.query(spec, `${this.name}.${name}`);
      this._queries[name] = q;
      // Геттер, чтобы нельзя было перезаписать случайно.
      if (!(name in this)) {
        Object.defineProperty(this, name, {
          get() { return this._queries[name]; },
          configurable: true,
          enumerable: true,
        });
      }
    }
  }
}

/**
 * Зарегистрировать систему в pipeline world'а и сразу построить ей запросы
 * из статической декларации. Опции { stages: { STAGE: priority } } либо
 * { stage, priority } для одной стадии.
 */
export function installSystem(world, system, stageOpts) {
  system.onInit(world);
  system._setupQueries();
  world.pipeline.add(system, stageOpts);
  return system;
}

export { PipelineStages };
