// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · core/World.js  (clean v2)
//  Мир — главный контейнер ECS: сущности, компоненты, запросы, очередь
//  событий и pipeline. Один World = одна сцена игры.
//
//  Жизненный цикл:
//    world.init()    — вызвать onInit всех систем (один раз).
//    world.update(t) — прогнать стадии кадра (INPUT/PRE_STEP/FIXED_STEP*N/
//                     STEP/POST_STEP/RENDER/CLEANUP) + flush events.
//    world.shutdown() — вызвать onDestroy всех систем, очистить всё.
//
//  Методы:
//    create()             -> entityId
//    createMany(n)        -> entityId[]
//    destroy(entityId)    — удалить сущность со всеми компонентами
//    has(entityId)        -> bool
//    clear()              — удалить все сущности
//    add(id, comp, init)  -> compInstance
//    get(id, comp)        -> compInstance | null
//    has(id, comp)        -> bool
//    remove(id, comp)     -> bool
//    markChanged(id, comp)— пометить для changed-запросов
//    query(spec, name)    -> Query
//    use(key, plugin)     -> plugin instance
// ─────────────────────────────────────────────────────────────────────────────

import { UID, NULL_ENTITY } from '../utils/UID.js';
import { Bitset } from '../utils/Bitset.js';
import { resolveComponent } from './Component.js';
import { SparseSetStorage } from './Storage.js';
import { QueryRegistry } from './QueryRegistry.js';
import { EventQueue } from './EventQueue.js';
import { Pipeline, PipelineStages } from './Pipeline.js';

export class World {
  constructor() {
    this._storages = new Map();          // typeId -> SparseSetStorage
    this._entityMasks = new Map();       // entityId -> Bitset (current)
    this._entityChanged = new Map();     // entityId -> Bitset (changed this frame)
    this._entities = new Set();          // alive entities
    this.events = new EventQueue();
    this.queries = new QueryRegistry(this);
    this.pipeline = new Pipeline();
    this._plugins = new Map();
    /** Контекст — любой общий ресурс (canvas, input, audio, assets, ...). */
    this.ctx = {};
    this._initialized = false;
  }

  // ─── Entities ──────────────────────────────────────────────────────────

  create() {
    const id = UID.nextEntityId();
    this._entities.add(id);
    this._entityMasks.set(id, new Bitset());
    this._entityChanged.set(id, new Bitset());
    return id;
  }

  createMany(n) {
    const ids = new Array(n);
    for (let i = 0; i < n; i++) {
      const id = UID.nextEntityId();
      this._entities.add(id);
      this._entityMasks.set(id, new Bitset());
      this._entityChanged.set(id, new Bitset());
      ids[i] = id;
    }
    return ids;
  }

  has(entityId, component) {
    // Перегрузка: has(entityId) — сущность жива?
    if (component === undefined) return this._entities.has(entityId);
    const def = resolveComponent(component);
    const storage = this._storages.get(def.typeId);
    if (!storage) return false;
    return storage.has(entityId);
  }

  destroy(entityId) {
    if (!this._entities.has(entityId)) return;
    // Снимаем все компоненты.
    for (const storage of this._storages.values()) {
      if (storage.has(entityId)) storage.remove(entityId);
    }
    const oldMask = this._entityMasks.get(entityId).clone();
    const emptyMask = new Bitset();
    const changed = oldMask; // все биты "изменились"
    this.queries.onEntityMaskChanged(entityId, oldMask, emptyMask, changed);
    this.queries.onEntityDestroyed(entityId);
    this._entityMasks.delete(entityId);
    this._entityChanged.delete(entityId);
    this._entities.delete(entityId);
    this.events.enqueue('entity:destroyed', { entity: entityId });
  }

  clear() {
    for (const id of Array.from(this._entities)) {
      this.destroy(id);
    }
    for (const s of this._storages.values()) s.clear();
    this._storages.clear();
    this._entityMasks.clear();
    this._entityChanged.clear();
    this._entities.clear();
  }

  get entityCount() { return this._entities.size; }
  entities() { return this._entities[Symbol.iterator](); }

  // ─── Components ────────────────────────────────────────────────────────

  _storage(def) {
    let s = this._storages.get(def.typeId);
    if (!s) {
      s = new SparseSetStorage(def);
      this._storages.set(def.typeId, s);
    }
    return s;
  }

  add(entityId, component, initial = null) {
    const def = resolveComponent(component);
    const storage = this._storage(def);
    const comp = storage.insert(entityId, initial);

    const mask = this._entityMasks.get(entityId);
    if (!mask) {
      // Сущность не существует — это ошибка, но не валимся.
      throw new Error(`HermesECS.World.add: сущность ${entityId} не существует.`);
    }
    const wasPresent = mask.get(def.typeId);
    // Снимаем снапшот до мутации маски.
    const prevMask = mask.clone();
    mask.set(def.typeId);
    const changed = this._entityChanged.get(entityId);
    changed.set(def.typeId);

    if (!wasPresent) {
      this.queries.onEntityMaskChanged(entityId, prevMask, mask, def.mask);
      this.events.enqueue('component:added', { entity: entityId, component: def.name });
    } else {
      this.events.enqueue('component:changed', { entity: entityId, component: def.name });
    }
    return comp;
  }

  get(entityId, component) {
    const def = resolveComponent(component);
    const storage = this._storages.get(def.typeId);
    if (!storage) return null;
    return storage.get(entityId);
  }

  has(entityId, component) {
    // Перегрузка: has(entityId) — сущность жива?
    if (component === undefined) return this._entities.has(entityId);
    const def = resolveComponent(component);
    const storage = this._storages.get(def.typeId);
    if (!storage) return false;
    return storage.has(entityId);
  }

  remove(entityId, component) {
    const def = resolveComponent(component);
    const storage = this._storages.get(def.typeId);
    if (!storage || !storage.has(entityId)) return false;

    const mask = this._entityMasks.get(entityId);
    const prevMask = mask.clone();
    mask.clear(def.typeId);
    const changed = this._entityChanged.get(entityId);
    changed.set(def.typeId);

    storage.remove(entityId);
    this.queries.onEntityMaskChanged(entityId, prevMask, mask, def.mask);
    this.events.enqueue('component:removed', { entity: entityId, component: def.name });
    return true;
  }

  markChanged(entityId, component) {
    const def = resolveComponent(component);
    if (!this.has(entityId, def)) return;
    const changed = this._entityChanged.get(entityId);
    if (changed) changed.set(def.typeId);
    this.events.enqueue('component:changed', { entity: entityId, component: def.name });
  }

  clearChanged() {
    for (const mask of this._entityChanged.values()) mask.reset();
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  query(spec, name) {
    return this.queries.create(spec, name);
  }

  // ─── Plugins ───────────────────────────────────────────────────────────

  use(key, plugin) {
    if (this._plugins.has(key)) return this._plugins.get(key);
    const instance = typeof plugin === 'function'
      ? plugin(this)
      : (plugin && plugin.init ? plugin.init(this) : plugin);
    this._plugins.set(key, instance);
    return instance;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  init() {
    if (this._initialized) return;
    this.pipeline.run(PipelineStages.INIT);
    this._initialized = true;
  }

  update(timing) {
    const { dt, fixedDt, alpha, frame, fixedSteps = 1 } = timing;
    this.pipeline.run(PipelineStages.INPUT, dt);
    this.pipeline.run(PipelineStages.PRE_STEP, dt);
    for (let i = 0; i < fixedSteps; i++) {
      this.pipeline.run(PipelineStages.FIXED_STEP, fixedDt);
    }
    this.pipeline.run(PipelineStages.STEP, dt);
    this.pipeline.run(PipelineStages.POST_STEP, dt);
    this.pipeline.run(PipelineStages.RENDER, alpha);
    this.pipeline.run(PipelineStages.CLEANUP);
    this.events.flush();
    this.clearChanged();
  }

  shutdown() {
    this.pipeline.runDestroy();
    this.clear();
    this.events.clear();
  }
}

export { NULL_ENTITY };
