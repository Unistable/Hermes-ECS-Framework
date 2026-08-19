// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · html5/Canvas2D.js  (clean v2)
//  Обёртка над Canvas 2D context: управление DPR (retina), стек
//  трансформаций, простые сахара для fillRect/fillText/drawImage.
//  Очистка clear() не сбрасывает стек — она только заливает фон.
// ─────────────────────────────────────────────────────────────────────────────

export class Canvas2D {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {number} logicalWidth
   * @param {number} logicalHeight
   */
  constructor(canvas, logicalWidth, logicalHeight) {
    this.canvas = canvas;
    this.logicalWidth = logicalWidth;
    this.logicalHeight = logicalHeight;
    /** @type {CanvasRenderingContext2D} */
    this.ctx = canvas.getContext('2d', { alpha: false });
    this._dpr = 1;
    this._applyDPR();
    this.resize();
  }

  _applyDPR() {
    // Ограничиваем DPR до 2 — выше HTML5 тормозит.
    this._dpr = Math.min(window.devicePixelRatio || 1, 2);
  }

  /** Изменить логический размер и пересчитать DPR. */
  resize() {
    this._applyDPR();
    this.canvas.width = Math.floor(this.logicalWidth * this._dpr);
    this.canvas.height = Math.floor(this.logicalHeight * this._dpr);
    this.canvas.style.width = `${this.logicalWidth}px`;
    this.canvas.style.height = `${this.logicalHeight}px`;
    this.ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  get dpr() { return this._dpr; }
  get width()  { return this.logicalWidth; }
  get height() { return this.logicalHeight; }

  /** Залить весь canvas цветом. */
  clear(color = '#101018') {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
    ctx.restore();
  }

  push() { this.ctx.save(); }
  pop()  { this.ctx.restore(); }

  translate(x, y) { this.ctx.translate(x, y); }
  rotate(angle)   { this.ctx.rotate(angle); }
  scale(x, y)      { this.ctx.scale(x, y); }

  drawImage(image, dx, dy, dw, dh) {
    if (dw !== undefined) this.ctx.drawImage(image, dx, dy, dw, dh);
    else                  this.ctx.drawImage(image, dx, dy);
  }

  drawImageSliced(image, sx, sy, sw, sh, dx, dy, dw, dh) {
    this.ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  fillRect(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }

  strokeRect(x, y, w, h, color, lineWidth = 1) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeRect(x, y, w, h);
  }

  fillCircle(x, y, r, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  strokeCircle(x, y, r, color, lineWidth = 1) {
    const ctx = this.ctx;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  fillText(text, x, y, color = '#fff', font = '14px monospace') {
    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.fillText(text, x, y);
  }

  setGlobalAlpha(a) { this.ctx.globalAlpha = a; }
  resetGlobalAlpha() { this.ctx.globalAlpha = 1; }

  set fillStyle(v) { this.ctx.fillStyle = v; }
  set strokeStyle(v) { this.ctx.strokeStyle = v; }
  set font(v) { this.ctx.font = v; }
  set textAlign(v) { this.ctx.textAlign = v; }
  set textBaseline(v) { this.ctx.textBaseline = v; }
}
