// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · core/Storage.js  (clean v2)
//  Sparse-set хранилище для одного типа компонентов.
//
//  Архитектура:
//    • sparse: Map<entityId, denseIndex>          — быстрый lookup
//    • dense:  Array<entityId>                    — компактный массив ID
//    • components: Array<object>                  — параллельный массив значений
//
//  Преимущества:
//    • O(1) insert/get/has/remove (через swap-remove)
//    • Compact iteration (хорошо для кэша)
//    • Переиспользование объектов компонентов через Pool, если есть reset
//
//  Альтернатива — archetype storage — даёт быстрее итерацию, но медленнее
//  add/remove (нужна миграция архетипов). Sparse-set оптимален для
//  динамических HTML5-игр, где компоненты часто добавляются/удаляются.
// ─────────────────────────────────────────────────────────────────────────────

import { Pool } from '../utils/Pool.js';

export class SparseSetStorage {
  constructor(def, initialCapacity = 64) {
    this.def = def;
    this._sparse = new Map();
    this._dense = [];
    this._components = [];
    this._pool = def.reset ? new Pool(def.factory, def.reset) : null;
    if (this._pool && initialCapacity > 0) {
      this._pool.preallocate(initialCapacity);
    }
  }

  /**
   * Вставить/обновить компонент.
   * @param {number} entityId
   * @param {object} [initial] Поля для Object.assign поверх дефолта.
   * @returns {object}
   */
  insert(entityId, initial = null) {
    const idx = this._sparse.get(entityId);
    if (idx !== undefined) {
      // Компонент уже есть — обновляем поля без вызова factory.
      const comp = this._components[idx];
      if (initial) Object.assign(comp, initial);
      return comp;
    }
    const comp = this._pool ? this._pool.acquire() : this.def.factory();
    if (initial) Object.assign(comp, initial);
    const i = this._dense.length;
    this._dense.push(entityId);
    this._components.push(comp);
    this._sparse.set(entityId, i);
    return comp;
  }

  get(entityId) {
    const idx = this._sparse.get(entityId);
    if (idx === undefined) return null;
    return this._components[idx];
  }

  has(entityId) {
    return this._sparse.has(entityId);
  }

  /**
   * Swap-remove: последний элемент переносится на место удаляемого.
   * O(1). Возвращает true, если компонент был удалён.
   *
   * ВАЖНО: release компонента в пул делается ДО swap-remove — иначе
   * reset() повредит активный компонент, который был перемещён.
   */
  remove(entityId) {
    const idx = this._sparse.get(entityId);
    if (idx === undefined) return false;
    const lastIdx = this._dense.length - 1;

    // Сначала release удаляемый компонент (это вызовет reset, который
    // сбросит поля в дефолт — но компонент уже не активен).
    const removedComp = this._components[idx];
    if (this._pool && removedComp) this._pool.release(removedComp);

    if (idx !== lastIdx) {
      // Переносим последний элемент на место удаляемого.
      const lastEntity = this._dense[lastIdx];
      this._dense[idx] = lastEntity;
      this._components[idx] = this._components[lastIdx];
      this._sparse.set(lastEntity, idx);
    }
    this._dense.pop();
    this._components.pop();
    this._sparse.delete(entityId);
    return true;
  }

  *entities() {
    for (let i = 0; i < this._dense.length; i++) {
      yield this._dense[i];
    }
  }

  get dense()      { return this._dense; }
  get components() { return this._components; }
  get size()       { return this._dense.length; }

  clear() {
    if (this._pool) {
      for (let i = 0; i < this._components.length; i++) {
        this._pool.release(this._components[i]);
      }
    }
    this._dense.length = 0;
    this._components.length = 0;
    this._sparse.clear();
  }
}
