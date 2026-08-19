// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · utils/UID.js  (clean v2)
//  Монотонный счётчик для ID сущностей (пропускает 0 как NULL_ENTITY).
//  Лимит — 2^31 (беззнаковый диапазон Uint32).
// ─────────────────────────────────────────────────────────────────────────────

let _entityCounter = 0;
let _componentCounter = 0;

export const NULL_ENTITY = 0;

export const UID = {
  nextEntityId() {
    _entityCounter = (_entityCounter + 1) | 0;
    if (_entityCounter === 0) _entityCounter = 1;
    return _entityCounter;
  },

  nextComponentTypeId() {
    if (_componentCounter >= 256) {
      throw new Error(
        `HermesECS: превышен лимит типов компонентов (256). ` +
        `Уменьшите количество определений компонентов.`
      );
    }
    const id = _componentCounter;
    _componentCounter += 1;
    return id;
  },

  /** Сброс — использовать только в тестах. */
  _reset() {
    _entityCounter = 0;
    _componentCounter = 0;
  },

  get entityCount() { return _entityCounter; },
  get componentCount() { return _componentCounter; },
};
