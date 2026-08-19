// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · html5/SceneManager.js  (clean v2)
//  Менеджер сцен: переключение между разными World'ами (меню/игра/пауза).
//  Старая сцена автоматически shutdown'ится, новая — инициализируется.
//
//  Переключение отложенное (applyPending в начале следующего кадра) —
//  безопасно, если запрос пришёл из системы во время итерации мира.
// ─────────────────────────────────────────────────────────────────────────────

import { World } from '../core/World.js';

export class SceneManager {
  constructor() {
    this._factories = new Map();
    this._current = null;
    this._currentName = null;
    this._pending = null;
    this._sharedCtx = null; // опциональный ctx, прокидываемый в каждый World
  }

  setSharedCtx(ctx) {
    this._sharedCtx = ctx;
  }

  register(name, factory) {
    this._factories.set(name, factory);
    return this;
  }

  get current() { return this._current; }
  get currentName() { return this._currentName; }

  start(name, payload = null) {
    return this.switch(name, payload);
  }

  switch(name, payload = null) {
    if (!this._factories.has(name)) {
      throw new Error(`SceneManager: сцена "${name}" не зарегистрирована.`);
    }
    this._pending = { name, payload };
  }

  applyPending() {
    if (!this._pending) return false;
    const { name, payload } = this._pending;
    this._pending = null;
    if (this._current) {
      this._current.shutdown();
      this._current = null;
    }
    const factory = this._factories.get(name);
    const world = factory(payload);
    if (this._sharedCtx) {
      world.ctx = Object.assign({}, this._sharedCtx, world.ctx || {});
    }
    world.init();
    this._current = world;
    this._currentName = name;
    if (payload && typeof payload.onSceneReady === 'function') {
      payload.onSceneReady(world);
    }
    return true;
  }

  /** Уничтожить текущую сцену (если есть). */
  shutdownCurrent() {
    if (this._current) {
      this._current.shutdown();
      this._current = null;
      this._currentName = null;
    }
  }
}
