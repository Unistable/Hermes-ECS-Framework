// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · core/EventQueue.js  (clean v2)
//  Двухрежимная очередь событий:
//    • немедленные — emit() вызывает обработчики синхронно;
//    • отложенные — enqueue() помещает в очередь, flush() обрабатывает
//      в конце кадра (или в явной точке).
//
//  Отложенность важна для безопасности: если система во время итерации
//  сгенерирует событие и оно будет обработано немедленно, мы получим
//  каскадные изменения структур данных → гонки и потенциально бесконечный
//  цикл. Отложенная очередь гарантирует детерминизм.
// ─────────────────────────────────────────────────────────────────────────────

import { EventEmitter } from '../utils/EventEmitter.js';

export class EventQueue {
  constructor() {
    this._bus = new EventEmitter();
    this._deferred = [];
    this._draining = false;
    this._maxIterations = 1000;
  }

  on(type, handler)     { return this._bus.on(type, handler); }
  once(type, handler)   { return this._bus.once(type, handler); }
  off(type, handler)    { this._bus.off(type, handler); }

  /** Поставить событие в отложенную очередь. */
  enqueue(type, payload) {
    this._deferred.push({ type, payload });
  }

  /** Мгновенно вызвать событие (синхронно). */
  emit(type, payload) {
    this._bus.emit(type, payload);
  }

  /**
   * Сбросить отложенную очередь — последовательно вызвать обработчики.
   * События, поставленные во время flush, тоже будут обработаны.
   * Защита от бесконечного цикла — _maxIterations.
   */
  flush() {
    if (this._draining) return;
    this._draining = true;
    let iterations = 0;
    while (this._deferred.length > 0 && iterations < this._maxIterations) {
      iterations++;
      const batch = this._deferred;
      this._deferred = [];
      for (let i = 0; i < batch.length; i++) {
        const ev = batch[i];
        this._bus.emit(ev.type, ev.payload);
      }
    }
    if (iterations >= this._maxIterations) {
      console.warn(
        `[HermesECS.EventQueue] превишен лимит итераций flush (${this._maxIterations}) — возможна гонка событий.`
      );
      // Сбросить остаток, чтобы не зациклиться.
      this._deferred.length = 0;
    }
    this._draining = false;
  }

  clear() {
    this._deferred.length = 0;
    this._bus.clear();
  }

  get pending() { return this._deferred.length; }
  listenerCount(type) { return this._bus.listenerCount(type); }
}
