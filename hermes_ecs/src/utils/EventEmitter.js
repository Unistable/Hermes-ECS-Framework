// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · utils/EventEmitter.js  (clean v2)
//  Синхронный эмиттер событий. Подписки — Set (быстрый add/delete),
//  эмит итерирует по копии массива, чтобы обработчик мог отписать сам себя.
// ─────────────────────────────────────────────────────────────────────────────

export class EventEmitter {
  constructor() {
    this._listeners = new Map();
    this._emitting = new Set(); // типы, которые сейчас эмитятся — для защиты от ре-входа
  }

  on(event, handler) {
    let set = this._listeners.get(event);
    if (!set) {
      set = new Set();
      this._listeners.set(event, set);
    }
    set.add(handler);
    return () => this.off(event, handler);
  }

  once(event, handler) {
    const off = this.on(event, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  off(event, handler) {
    if (handler === undefined) {
      this._listeners.delete(event);
      return;
    }
    const set = this._listeners.get(event);
    if (set) set.delete(handler);
  }

  emit(event, payload) {
    const set = this._listeners.get(event);
    if (!set || set.size === 0) return;
    // Копируем массив, чтобы гарантировать отсутствие гонок при мутации set во время эмитта.
    const arr = new Array(set.size);
    let n = 0;
    for (const fn of set) arr[n++] = fn;
    for (let i = 0; i < n; i++) {
      try {
        arr[i](payload);
      } catch (err) {
        console.error(`[HermesECS.EventEmitter] ошибка в обработчике "${event}":`, err);
      }
    }
  }

  clear() {
    this._listeners.clear();
  }

  listenerCount(event) {
    const set = this._listeners.get(event);
    return set ? set.size : 0;
  }

  /** Все зарегистрированные типы событий (для отладки). */
  eventTypes() {
    return Array.from(this._listeners.keys());
  }
}
