// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · html5/Time.js  (clean v2)
//  Управление временем: фиксированный шаг симуляции + alpha-интерполяция
//  для рендера. Защита от спирали смерти (maxFrameDelta + cap N=5 шагов).
//  timeScale — для slow-motion/time-scaling. paused — для паузы симуляции.
// ─────────────────────────────────────────────────────────────────────────────

export class Time {
  constructor(fixedStepHz = 60, maxFrameDelta = 0.25) {
    this.elapsed = 0;           // секунды с старта
    this.frameDelta = 0;        // секунды с прошлого кадра
    this.fixedStep = 1 / fixedStepHz;
    this.maxFrameDelta = maxFrameDelta;
    this._accumulator = 0;
    this.alpha = 0;             // 0..1, коэффициент интерполяции
    this.fixedStepsThisFrame = 0;
    this.timeScale = 1;
    this.paused = false;
    this._lastTime = undefined;
  }

  tick(nowSeconds) {
    if (this._lastTime === undefined) {
      this._lastTime = nowSeconds;
      return;
    }
    let delta = nowSeconds - this._lastTime;
    this._lastTime = nowSeconds;
    if (delta > this.maxFrameDelta) delta = this.maxFrameDelta;
    if (delta < 0) delta = 0;
    delta *= this.timeScale;
    this.frameDelta = delta;
    this.elapsed += delta;
    if (!this.paused) this._accumulator += delta;
    let n = 0;
    const maxN = 5; // защита от "спираль смерти"
    while (this._accumulator >= this.fixedStep && n < maxN) {
      this._accumulator -= this.fixedStep;
      n++;
    }
    // Если не успели — сбрасываем остаток, чтобы не накапливать.
    if (n === maxN) this._accumulator = 0;
    this.fixedStepsThisFrame = n;
    this.alpha = this._accumulator / this.fixedStep;
  }

  reset() {
    this._lastTime = undefined;
    this._accumulator = 0;
    this.elapsed = 0;
    this.frameDelta = 0;
    this.alpha = 0;
    this.fixedStepsThisFrame = 0;
  }
}
