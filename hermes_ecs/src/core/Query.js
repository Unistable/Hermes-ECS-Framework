// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · core/Query.js  (clean v2)
//  Декларативный запрос к компонентам сущностей.
//
//  Семантика полей:
//    all:     сущность должна иметь ВСЕ перечисленные компоненты (AND)
//    any:     сущность должна иметь ХОТЯ БЫ ОДИН из перечисленных (OR)
//    none:    сущность НЕ должна иметь НИ ОДНОГО из перечисленных (NOT)
//    changed: сущность должна иметь "грязный" компонент (отметка markChanged или add)
//
//  QueryRegistry поддерживает актуальный массив matching-сущностей
//  инкрементально — при add/remove компонента переоцениваются только
//  затронутые запросы (по маске changed bits).
// ─────────────────────────────────────────────────────────────────────────────

import { Bitset } from '../utils/Bitset.js';
import { resolveComponent } from './Component.js';

function buildMask(specs) {
  const mask = new Bitset();
  if (!specs) return mask;
  const arr = Array.isArray(specs) ? specs : [specs];
  for (const s of arr) {
    const def = resolveComponent(s);
    mask.set(def.typeId);
  }
  return mask;
}

export class Query {
  constructor(spec = {}, name = null) {
    this.name = name || `Query#` + Math.random().toString(36).slice(2, 7);
    this.allMask     = buildMask(spec.all);
    this.anyMask     = buildMask(spec.any);
    this.noneMask    = buildMask(spec.none);
    this.changedMask = buildMask(spec.changed);

    this._hasAny     = !this.anyMask.isEmpty();
    this._hasNone     = !this.noneMask.isEmpty();
    this._hasChanged = !this.changedMask.isEmpty();

    this.entities = [];
    this._entitySet = new Set(); // для O(1) проверок принадлежности
  }

  /**
   * Проверка matching'а сущности по маске.
   * @param {Bitset} entityMask
   * @param {Bitset} [changedMask]
   */
  matches(entityMask, changedMask = null) {
    // all: сущность должна содержать все биты allMask.
    if (!entityMask.containsAll(this.allMask)) return false;
    // any: сущность должна пересекаться с anyMask (хотя бы один бит).
    if (this._hasAny && entityMask.containsNone(this.anyMask)) return false;
    // none: сущность не должна пересекаться с noneMask.
    if (this._hasNone && !entityMask.containsNone(this.noneMask)) return false;
    // changed: все биты changedMask должны быть в маске изменений сущности.
    if (this._hasChanged) {
      if (!changedMask || !changedMask.containsAll(this.changedMask)) return false;
    }
    return true;
  }

  /** Содержит ли запрос сущность (O(1)). */
  has(entityId) {
    return this._entitySet.has(entityId);
  }

  /** Добавить сущность в запрос (вызывается QueryRegistry). */
  _add(entityId) {
    if (this._entitySet.has(entityId)) return;
    this._entitySet.add(entityId);
    this.entities.push(entityId);
  }

  /** Удалить сущность из запроса (swap-remove). */
  _remove(entityId) {
    if (!this._entitySet.has(entityId)) return;
    this._entitySet.delete(entityId);
    const idx = this.entities.indexOf(entityId);
    if (idx >= 0) {
      const last = this.entities.length - 1;
      if (idx !== last) {
        const lastEntity = this.entities[last];
        this.entities[idx] = lastEntity;
      }
      this.entities.pop();
    }
  }

  *[Symbol.iterator]() {
    for (let i = 0; i < this.entities.length; i++) {
      yield this.entities[i];
    }
  }

  get length() {
    return this.entities.length;
  }
}

/** Сахар: построить запрос по простой записи. */
export function query(spec) {
  return new Query(spec);
}
