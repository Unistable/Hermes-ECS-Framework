// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · core/QueryRegistry.js  (clean v2)
//  Реестр активных запросов в World. Поддерживает актуальные массивы
//  сущностей, удовлетворяющих каждому запросу.
//
//  Алгоритм инкрементального обновления:
//    При изменении маски сущности проверяем все запросы через matches().
//    Если сущность раньше не matching, а теперь matching — добавляем.
//    Если раньше matching, а теперь нет — удаляем.
//
//  Микрооптимизация: для запросов без any/none/changed можно быстро
//  отсеять по пересечению changed-битов с allMask (если не пересекаются —
//  результат запроса не меняется).
// ─────────────────────────────────────────────────────────────────────────────

import { Query } from './Query.js';

export class QueryRegistry {
  constructor(world) {
    this._world = world;
    /** @type {Query[]} */
    this._queries = [];
  }

  register(q) {
    this._queries.push(q);
    this._rebuildOne(q);
    return q;
  }

  create(spec, name) {
    return this.register(new Query(spec, name));
  }

  /**
   * Уведомить реестр об изменении маски сущности.
   * @param {number} entityId
   * @param {import('../utils/Bitset.js').Bitset} oldMask
   * @param {import('../utils/Bitset.js').Bitset} newMask
   * @param {import('../utils/Bitset.js').Bitset} changedMask  Биты, изменённые в этой операции.
   */
  onEntityMaskChanged(entityId, oldMask, newMask, changedMask) {
    const queries = this._queries;
    const n = queries.length;
    for (let i = 0; i < n; i++) {
      const q = queries[i];
      // Быстрая отсечка для all-only запросов.
      if (!q._hasAny && !q._hasNone && !q._hasChanged) {
        // Если изменённые биты не пересекаются с allMask — matching не меняется.
        if (changedMask.containsNone(q.allMask)) continue;
      }
      const was = q.matches(oldMask);
      const now = q.matches(newMask);
      if (was === now) continue;
      if (now) q._add(entityId);
      else     q._remove(entityId);
    }
  }

  onEntityDestroyed(entityId) {
    const queries = this._queries;
    for (let i = 0; i < queries.length; i++) {
      queries[i]._remove(entityId);
    }
  }

  _rebuildOne(q) {
    q.entities.length = 0;
    q._entitySet.clear();
    for (const [entityId, mask] of this._world._entityMasks.entries()) {
      const changed = this._world._entityChanged.get(entityId);
      if (q.matches(mask, changed)) q._add(entityId);
    }
  }

  get size() { return this._queries.length; }

  /** Все зарегистрированные запросы (для отладки/инспекции). */
  all() { return this._queries.slice(); }
}
