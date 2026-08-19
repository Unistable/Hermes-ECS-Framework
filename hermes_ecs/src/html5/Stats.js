// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · html5/Stats.js  (clean v2)
//  Простой счётчик FPS и frame timing. Без аллокаций в горячем цикле.
// ─────────────────────────────────────────────────────────────────────────────

export class Stats {
  constructor() {
    this._frame = 0;
    this._lastFpsCheck = 0;
    this._fps = 0;
    this._framesSinceCheck = 0;
    this.minFrameTime = Infinity;
    this.maxFrameTime = 0;
    this.avgFrameTime = 0;
    this._accTime = 0;
    this._begin = 0;
  }

  begin(now) {
    this._begin = now;
  }

  end(now) {
    if (this._begin === undefined) return;
    const dt = now - this._begin;
    if (dt < this.minFrameTime) this.minFrameTime = dt;
    if (dt > this.maxFrameTime) this.maxFrameTime = dt;
    this._accTime += dt;
    this._framesSinceCheck += 1;
    this._frame += 1;
    if (now - this._lastFpsCheck >= 500) {
      const elapsed = now - this._lastFpsCheck;
      this._fps = elapsed > 0 ? Math.round(this._framesSinceCheck * 1000 / elapsed) : 0;
      this.avgFrameTime = this._framesSinceCheck > 0 ? this._accTime / this._framesSinceCheck : 0;
      this._lastFpsCheck = now;
      this._framesSinceCheck = 0;
      this._accTime = 0;
    }
  }

  get frame() { return this._frame; }
  get fps()   { return this._fps; }

  reset() {
    this._frame = 0;
    this._lastFpsCheck = 0;
    this._fps = 0;
    this._framesSinceCheck = 0;
    this.minFrameTime = Infinity;
    this.maxFrameTime = 0;
    this.avgFrameTime = 0;
    this._accTime = 0;
  }
}
