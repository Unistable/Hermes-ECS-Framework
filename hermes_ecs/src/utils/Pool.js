// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · utils/Pool.js  (clean v2)
//  Объектный пул для переиспользования временных объектов (векторов,
//  матриц, событий, компонентов). Снижает давление на GC в горячих циклах.
// ─────────────────────────────────────────────────────────────────────────────

export class Pool {
  /**
   * @param {() => any} factory   Фабрика новых объектов.
   * @param {(obj: any) => void} [reset]  Опциональный сброс перед release.
   */
  constructor(factory, reset = null) {
    this._factory = factory;
    this._reset = reset;
    this._free = [];
    this._created = 0;
    this._acquired = 0;
    this._released = 0;
  }

  /** Получить объект (из пула или создать новый). */
  acquire() {
    this._acquired += 1;
    if (this._free.length > 0) {
      return this._free.pop();
    }
    this._created += 1;
    return this._factory();
  }

  /** Вернуть объект в пул. */
  release(obj) {
    if (obj == null) return;
    this._released += 1;
    if (this._reset) this._reset(obj);
    this._free.push(obj);
  }

  /** Предварительно выделить N объектов. */
  preallocate(n) {
    for (let i = 0; i < n; i++) {
      const obj = this._factory();
      if (this._reset) this._reset(obj);
      this._free.push(obj);
      this._created += 1;
    }
  }

  /** Вернуть все объекты из массива. Удобно для batched операций. */
  releaseAll(arr) {
    for (let i = 0; i < arr.length; i++) {
      this.release(arr[i]);
    }
    arr.length = 0;
  }

  get size() { return this._free.length; }
  get totalCreated() { return this._created; }
  get inUse() { return this._acquired - this._released; }

  clear() {
    this._free.length = 0;
  }
}
