// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · html5/Audio.js  (clean v2)
//  Обёртка над Web Audio API: четыре шины (master/music/sfx/ui), декодинг
//  в AudioBuffer, SFX с лёгким рандом-детюном, чтобы звук не приедался.
// ─────────────────────────────────────────────────────────────────────────────

export class AudioEngine {
  constructor() {
    this._ctx = null;
    this._master = null;
    this._buses = new Map();
    this._clips = new Map();
    this._volumes = { master: 1, music: 0.7, sfx: 0.8, ui: 0.9 };
    this._initialized = false;
  }

  init() {
    if (this._initialized) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this._ctx = new AC();
    this._master = this._ctx.createGain();
    this._master.gain.value = this._volumes.master;
    this._master.connect(this._ctx.destination);
    for (const name of ['music', 'sfx', 'ui']) {
      const g = this._ctx.createGain();
      g.gain.value = this._volumes[name];
      g.connect(this._master);
      this._buses.set(name, g);
    }
    this._initialized = true;
  }

  resume() {
    if (this._ctx && this._ctx.state === 'suspended') this._ctx.resume();
  }

  async decode(key, data) {
    this.init();
    const buf = await this._ctx.decodeAudioData(data);
    this._clips.set(key, buf);
    return buf;
  }

  async load(key, url) {
    this.init();
    const r = await fetch(url);
    const data = await r.arrayBuffer();
    return this.decode(key, data);
  }

  play(key, opts = {}) {
    if (!this._initialized) this.init();
    const buf = this._clips.get(key);
    if (!buf) {
      console.warn(`[AudioEngine] клип "${key}" не найден.`);
      return { stop: () => {}, source: null };
    }
    const {
      bus = 'sfx',
      volume = 1,
      rate = 1,
      loop = false,
      position = null,
    } = opts;

    const source = this._ctx.createBufferSource();
    source.buffer = buf;
    source.loop = loop;
    source.playbackRate.value = rate;
    // Лёгкий рандом-детюн для неперегружающих звуков.
    if (!loop && rate === 1) {
      source.playbackRate.value = 1 + (Math.random() * 2 - 1) * 0.02;
    }

    const gain = this._ctx.createGain();
    gain.gain.value = volume;

    const busGain = this._buses.get(bus) || this._master;
    if (position !== null) {
      const panner = this._ctx.createPanner();
      panner.panningModel = 'equalpower';
      panner.setPosition(position.x, position.y, 0);
      source.connect(gain);
      gain.connect(panner);
      panner.connect(busGain);
    } else {
      source.connect(gain);
      gain.connect(busGain);
    }

    source.start();
    const handle = {
      stop: () => {
        try { source.stop(); } catch (e) { /* уже остановлен */ }
      },
      source,
    };
    source.onended = () => {
      try {
        source.disconnect();
        gain.disconnect();
      } catch (e) {}
    };
    return handle;
  }

  setVolume(bus, value) {
    this._volumes[bus] = value;
    if (bus === 'master' && this._master) {
      this._master.gain.setTargetAtTime(value, this._ctx.currentTime, 0.05);
    } else if (this._buses.has(bus)) {
      this._buses.get(bus).gain.setTargetAtTime(value, this._ctx.currentTime, 0.05);
    }
  }

  get volume() { return this._volumes; }

  dispose() {
    if (this._ctx) this._ctx.close();
    this._clips.clear();
    this._buses.clear();
    this._initialized = false;
  }
}
