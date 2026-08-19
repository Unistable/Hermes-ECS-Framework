// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · src/index.js  (clean v3 — pure framework, no demo)
//  Единая точка импорта фреймворка. Все экспорты собраны здесь.
//
//    import { World, Game, defineComponent, System, ... } from '../hermes_ecs/src/index.js';
//
//  ВАЖНО: фреймворк НЕ содержит готовых компонентов (Transform, Velocity, ...)
//  и НЕ содержит готовых систем (MovementSystem, RenderSystem, ...).
//  Это НАМЕРЕННО: компоненты и системы — это код твоей игры.
//  Фреймворк даёт только движок: хранение данных, запросы, планировщик систем,
//  цикл игры и адаптеры под HTML5 (Canvas2D, Input, Audio, Assets, Time).
//
//  Принцип ECS: ДАННЫЕ ОТДЕЛЬНО, ФУНКЦИИ ОТДЕЛЬНО.
//    • Компонент — это POJO с полями (данные), без методов.
//    • Система — это класс с методом update() (функция), без состояния игры.
//    • Entity — это просто число (ID), не объект.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Core (движок ECS) ───
export { World, NULL_ENTITY } from './core/World.js';
export { Entity } from './core/Entity.js';
export {
  defineComponent, defineTag,
  getComponentByName, getComponentByTypeId, getAllComponents,
  resolveComponent, _resetComponentRegistry,
} from './core/Component.js';
export { SparseSetStorage } from './core/Storage.js';
export { Query, query } from './core/Query.js';
export { QueryRegistry } from './core/QueryRegistry.js';
export { EventQueue } from './core/EventQueue.js';
export { Pipeline, PipelineStages } from './core/Pipeline.js';
export { System, installSystem } from './core/System.js';

// ─── Utils ───
export { UID, NULL_ENTITY as NULL } from './utils/UID.js';
export { Bitset, bitsetOr } from './utils/Bitset.js';
export { Pool } from './utils/Pool.js';
export {
  PI, TAU, DEG2RAD, RAD2DEG, EPSILON,
  clamp, clamp01, lerp, invLerp, remap,
  degToRad, radToDeg,
  angleDifference, lerpAngle,
  randRange, randInt, randChoice, randSign,
  length, lengthSq, normalize, dot, distance, distanceSq,
  smoothstep, smootherstep,
  damp, wrapAngle,
  minOf, maxOf, hash2D,
} from './utils/MathUtils.js';
export { EventEmitter } from './utils/EventEmitter.js';

// ─── HTML5 интеграции ───
export { Game } from './html5/Game.js';
export { Canvas2D } from './html5/Canvas2D.js';
export { Input } from './html5/Input.js';
export { AssetLoader } from './html5/AssetLoader.js';
export { AudioEngine } from './html5/Audio.js';
export { Time } from './html5/Time.js';
export { Stats } from './html5/Stats.js';
export { SceneManager } from './html5/SceneManager.js';

export const VERSION = '3.0.0';
