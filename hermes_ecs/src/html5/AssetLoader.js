// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · html5/AssetLoader.js  (clean v2)
//  Загрузчик ресурсов: image/audio/json/text/font с кэшем по ключу.
//  Promise-based API + пакетная загрузка manifest'а с прогрессом.
// ─────────────────────────────────────────────────────────────────────────────

export class AssetLoader {
  constructor() {
    /** @type {Map<string, {type:string, asset:any}>} */
    this._cache = new Map();
    this._total = 0;
    this._loaded = 0;
  }

  get progress() {
    return this._total === 0 ? 1 : this._loaded / this._total;
  }

  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`AssetLoader: не удалось загрузить изображение ${url}`));
      img.src = url;
    });
  }

  loadAudio(url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      audio.addEventListener('canplaythrough', () => resolve(audio), { once: true });
      audio.addEventListener('error', () =>
        reject(new Error(`AssetLoader: не удалось загрузить аудио ${url}`)),
        { once: true });
      audio.src = url;
    });
  }

  loadJson(url) {
    return fetch(url).then((r) => {
      if (!r.ok) throw new Error(`AssetLoader: HTTP ${r.status} для ${url}`);
      return r.json();
    });
  }

  loadText(url) {
    return fetch(url).then((r) => {
      if (!r.ok) throw new Error(`AssetLoader: HTTP ${r.status} для ${url}`);
      return r.text();
    });
  }

  loadFont(family, url) {
    const face = new FontFace(family, `url(${url})`);
    document.fonts.add(face);
    return face.load();
  }

  async loadManifest(manifest, onProgress = null) {
    const entries = Object.entries(manifest);
    this._total += entries.length;
    const jobs = entries.map(async ([key, spec]) => {
      let asset;
      switch (spec.type) {
        case 'image': asset = await this.loadImage(spec.url); break;
        case 'audio': asset = await this.loadAudio(spec.url); break;
        case 'json':  asset = await this.loadJson(spec.url);  break;
        case 'text':  asset = await this.loadText(spec.url);  break;
        case 'font':  asset = await this.loadFont(spec.family, spec.url); break;
        default: throw new Error(`AssetLoader: неизвестный тип "${spec.type}"`);
      }
      this._cache.set(key, { type: spec.type, asset });
      this._loaded += 1;
      if (onProgress) onProgress(this.progress);
      return [key, asset];
    });
    await Promise.all(jobs);
    return this;
  }

  get(key) {
    const entry = this._cache.get(key);
    return entry ? entry.asset : null;
  }

  type(key) {
    const entry = this._cache.get(key);
    return entry ? entry.type : null;
  }

  has(key) {
    return this._cache.has(key);
  }

  /** Программно добавить ресурс в кэш (для процедурных атласов). */
  set(key, type, asset) {
    this._cache.set(key, { type, asset });
  }

  clear() {
    this._cache.clear();
    this._total = 0;
    this._loaded = 0;
  }
}
