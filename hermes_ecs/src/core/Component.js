// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · core/Component.js  (clean v2)
//  Компоненты — это POJO, создаваемые фабриками. Каждой фабрике
//  присваивается уникальный typeId (0..255), используемый как индекс бита
//  в маске сущности и как ключ в storage-мапе.
//
//  V8 строит под каждую фабрику отдельный hidden class — это даёт быстрый
//  property access. Поэтому важно: НЕ модифицируйте компоненты ad-hoc,
//  всегда объявляйте все поля в фабрике (даже undefined/null).
// ─────────────────────────────────────────────────────────────────────────────

import { UID } from '../utils/UID.js';
import { Bitset } from '../utils/Bitset.js';

const _byName = new Map();
const _byTypeId = new Map();

/**
 * @typedef {Object} ComponentDef
 * @property {string} name
 * @property {number} typeId
 * @property {() => object} factory
 * @property {(c: object) => void} [reset]
 * @property {Bitset} mask — маска с одним установленным битом (для O(1) проверок)
 */

export function defineComponent(name, factory, reset = null) {
  if (typeof name !== 'string' || name.length === 0) {
    throw new Error('HermesECS.defineComponent: имя должно быть непустой строкой.');
  }
  if (_byName.has(name)) {
    throw new Error(`HermesECS.defineComponent: компонент "${name}" уже определён.`);
  }
  if (typeof factory !== 'function') {
    throw new Error(`HermesECS.defineComponent: фабрика должна быть функцией (для "${name}").`);
  }
  const typeId = UID.nextComponentTypeId();
  const mask = new Bitset().set(typeId);
  const def = { name, typeId, factory, reset, mask };
  _byName.set(name, def);
  _byTypeId.set(typeId, def);
  return def;
}

/** Тег-компонент (без данных, только метка). */
export function defineTag(name) {
  return defineComponent(name, () => ({}), null);
}

export function getComponentByName(name) {
  const def = _byName.get(name);
  if (!def) throw new Error(`HermesECS: компонент "${name}" не найден.`);
  return def;
}

export function getComponentByTypeId(typeId) {
  const def = _byTypeId.get(typeId);
  if (!def) throw new Error(`HermesECS: компонент с typeId=${typeId} не найден.`);
  return def;
}

export function getAllComponents() {
  return Array.from(_byName.values());
}

export function _resetComponentRegistry() {
  _byName.clear();
  _byTypeId.clear();
}

export function resolveComponent(spec) {
  if (typeof spec === 'string') return getComponentByName(spec);
  if (spec && typeof spec === 'object' && typeof spec.typeId === 'number') return spec;
  throw new Error(`HermesECS: некорректная спецификация компонента: ${String(spec)}`);
}
