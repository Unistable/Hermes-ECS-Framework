// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · html5/Input.js  (clean v2)
//  Унифицированный инпут: keyboard, mouse, touch, gamepad.
//
//  Опрос (в системах):
//    const input = world.ctx.input;
//    if (input.isDown('ArrowLeft')) { ... }
//    if (input.mouseDown) { shoot(); }
//    if (input.wasPressed(' ')) { jump(); }
//
//  Edge-события (wasPressed/wasReleased) сбрасываются в конце кадра через
//  endFrame(). Это гарантирует, что система, запущенная до другой системы,
//  получит тот же edge-event.
// ─────────────────────────────────────────────────────────────────────────────

const KEY_ALIASES = {
  'space': ' ', 'spacebar': ' ',
  'enter': 'Enter', 'return': 'Enter',
  'esc': 'Escape', 'escape': 'Escape',
  'ctrl': 'Control', 'control': 'Control',
  'shift': 'Shift', 'alt': 'Alt',
  'tab': 'Tab', 'backspace': 'Backspace',
  'del': 'Delete', 'delete': 'Delete',
  'up': 'ArrowUp', 'down': 'ArrowDown',
  'left': 'ArrowLeft', 'right': 'ArrowRight',
};

function normalizeKey(k) {
  const lower = k.toLowerCase();
  if (KEY_ALIASES[lower]) return KEY_ALIASES[lower];
  if (k.length === 1) return k.toUpperCase();
  return k;
}

export class Input {
  constructor(canvas) {
    this._canvas = canvas;
    this._keys = new Set();
    this._keysJustPressed = new Set();
    this._keysJustReleased = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mouseWheel = 0;
    this._mouseButtonsDown = new Set();
    this._mouseButtonsJustPressed = new Set();
    this._mouseButtonsJustReleased = new Set();
    this.touches = [];
    this._handlers = [];
    this._attach();
  }

  _attach() {
    const w = window;
    const add = (target, type, fn, opts = false) => {
      target.addEventListener(type, fn, opts);
      this._handlers.push([target, type, fn, opts]);
    };

    add(w, 'keydown', (e) => {
      if (e.repeat) return;
      const k = normalizeKey(e.key);
      this._keysJustPressed.add(k);
      this._keys.add(k);
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
    });
    add(w, 'keyup', (e) => {
      const k = normalizeKey(e.key);
      this._keysJustReleased.add(k);
      this._keys.delete(k);
    });
    add(w, 'blur', () => {
      for (const k of this._keys) this._keysJustReleased.add(k);
      this._keys.clear();
      for (const b of this._mouseButtonsDown) this._mouseButtonsJustReleased.add(b);
      this._mouseButtonsDown.clear();
    });

    add(this._canvas, 'mousemove', (e) => {
      const r = this._canvas.getBoundingClientRect();
      const sx = this._canvas.width / (r.width || 1);
      const sy = this._canvas.height / (r.height || 1);
      const nx = (e.clientX - r.left) * sx / (window.devicePixelRatio || 1);
      const ny = (e.clientY - r.top) * sy / (window.devicePixelRatio || 1);
      this.mouseDX = nx - this.mouseX;
      this.mouseDY = ny - this.mouseY;
      this.mouseX = nx;
      this.mouseY = ny;
    });
    add(this._canvas, 'mousedown', (e) => {
      this._mouseButtonsJustPressed.add(e.button);
      this._mouseButtonsDown.add(e.button);
    });
    add(w, 'mouseup', (e) => {
      this._mouseButtonsJustReleased.add(e.button);
      this._mouseButtonsDown.delete(e.button);
    });
    add(w, 'wheel', (e) => {
      this.mouseWheel = e.deltaY;
    }, { passive: true });
    add(this._canvas, 'contextmenu', (e) => e.preventDefault());

    add(this._canvas, 'touchstart', (e) => {
      e.preventDefault();
      const r = this._canvas.getBoundingClientRect();
      const sx = this._canvas.width / (r.width || 1);
      const sy = this._canvas.height / (r.height || 1);
      for (const t of e.changedTouches) {
        const x = (t.clientX - r.left) * sx / (window.devicePixelRatio || 1);
        const y = (t.clientY - r.top) * sy / (window.devicePixelRatio || 1);
        this.touches.push({
          id: t.identifier, x, y, startX: x, startY: y, prevX: x, prevY: y,
        });
      }
    }, { passive: false });
    add(this._canvas, 'touchmove', (e) => {
      e.preventDefault();
      const r = this._canvas.getBoundingClientRect();
      const sx = this._canvas.width / (r.width || 1);
      const sy = this._canvas.height / (r.height || 1);
      for (const t of e.changedTouches) {
        const idx = this.touches.findIndex((x) => x.id === t.identifier);
        if (idx < 0) continue;
        const entry = this.touches[idx];
        entry.prevX = entry.x; entry.prevY = entry.y;
        entry.x = (t.clientX - r.left) * sx / (window.devicePixelRatio || 1);
        entry.y = (t.clientY - r.top) * sy / (window.devicePixelRatio || 1);
      }
    }, { passive: false });
    add(this._canvas, 'touchend', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const idx = this.touches.findIndex((x) => x.id === t.identifier);
        if (idx >= 0) this.touches.splice(idx, 1);
      }
    }, { passive: false });
    add(this._canvas, 'touchcancel', (e) => {
      for (const t of e.changedTouches) {
        const idx = this.touches.findIndex((x) => x.id === t.identifier);
        if (idx >= 0) this.touches.splice(idx, 1);
      }
    });
  }

  isDown(key)     { return this._keys.has(normalizeKey(key)); }
  wasPressed(key) { return this._keysJustPressed.has(normalizeKey(key)); }
  wasReleased(key){ return this._keysJustReleased.has(normalizeKey(key)); }
  getKeys()       { return Array.from(this._keys); }

  get mouseDown()    { return this._mouseButtonsDown.size > 0; }
  get mousePressed() { return this._mouseButtonsJustPressed.size > 0; }
  get mouseReleased(){ return this._mouseButtonsJustReleased.size > 0; }

  mouseButtonDown(button = 0)   { return this._mouseButtonsDown.has(button); }
  mouseButtonPressed(button = 0){ return this._mouseButtonsJustPressed.has(button); }
  mouseButtonReleased(button = 0) { return this._mouseButtonsJustReleased.has(button); }

  getGamepad(index = 0) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    return pads[index] || null;
  }

  endFrame() {
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mouseWheel = 0;
    this._keysJustPressed.clear();
    this._keysJustReleased.clear();
    this._mouseButtonsJustPressed.clear();
    this._mouseButtonsJustReleased.clear();
  }

  dispose() {
    for (const [t, type, fn, opts] of this._handlers) {
      t.removeEventListener(type, fn, opts);
    }
    this._handlers.length = 0;
  }
}
