// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · html5/Game.js  (clean v2)
//  Главный игровой движок: связывает Canvas2D, Input, AssetLoader, Audio,
//  Time, Stats, SceneManager и World в один цикл requestAnimationFrame.
//
//  Идиома:
//
//    const game = new Game({
//      canvas: document.getElementById('game'),
//      width: 1280, height: 720,
//      scenes: { menu: () => createMenuScene(game) },
//      start: 'menu',
//    });
//    game.start();
//
//  game.ctx = { canvas2d, input, assets, audio, time, stats, game }
//  автоматически прокидывается во все создаваемые World'ы — системы
//  получают доступ через this.world.ctx.*.
// ─────────────────────────────────────────────────────────────────────────────

import { Canvas2D } from './Canvas2D.js';
import { Input } from './Input.js';
import { AssetLoader } from './AssetLoader.js';
import { AudioEngine } from './Audio.js';
import { Time } from './Time.js';
import { Stats } from './Stats.js';
import { SceneManager } from './SceneManager.js';

export class Game {
  constructor(opts) {
    const { canvas, width, height } = opts;
    if (!canvas) throw new Error('Game: требуется canvas.');
    this.opts = opts;
    this.canvas = canvas;
    this.canvas2d = new Canvas2D(canvas, width, height);
    this.input = new Input(canvas);
    this.assets = new AssetLoader();
    this.audio = new AudioEngine();
    this.time = new Time(opts.fixedStepHz || 60, 0.25);
    this.stats = new Stats();
    this.scenes = new SceneManager();

    // Прокинуть общий ctx в каждый создаваемый World.
    this._sharedCtx = {
      canvas2d: this.canvas2d,
      input: this.input,
      assets: this.assets,
      audio: this.audio,
      time: this.time,
      stats: this.stats,
      game: this,
    };
    this.scenes.setSharedCtx(this._sharedCtx);

    if (opts.scenes) {
      for (const [name, factory] of Object.entries(opts.scenes)) {
        this.scenes.register(name, factory);
      }
    }
    this._startScene = opts.start || null;
    this._rafId = 0;
    this._running = false;
    this._showFps = opts.showFps ?? true;
    this._boundLoop = this._loop.bind(this);
    // Реагируем на ресайз окна.
    this._onResize = () => this.canvas2d.resize();
    window.addEventListener('resize', this._onResize);
  }

  start() {
    if (this._running) return;
    if (this._startScene) this.scenes.start(this._startScene);
    this._running = true;
    this._rafId = requestAnimationFrame(this._boundLoop);
  }

  stop() {
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = 0;
  }

  _loop(now) {
    if (!this._running) return;
    const nowSec = now / 1000;
    this.stats.begin(now);
    this.scenes.applyPending();
    this.time.tick(nowSec);
    const world = this.scenes.current;
    if (world) {
      world.update({
        dt: this.time.frameDelta,
        fixedDt: this.time.fixedStep,
        alpha: this.time.alpha,
        frame: this.stats.frame,
        fixedSteps: this.time.fixedStepsThisFrame,
      });
    }
    if (this._showFps) this._renderFps();
    this.input.endFrame();
    this.stats.end(now);
    this._rafId = requestAnimationFrame(this._boundLoop);
  }

  _renderFps() {
    const ctx = this.canvas2d.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(8, 8, 110, 40);
    ctx.fillStyle = '#7ee787';
    ctx.font = '12px monospace';
    ctx.fillText(`FPS: ${this.stats.fps}`, 14, 24);
    ctx.fillStyle = '#9ecbff';
    ctx.fillText(`frame: ${this.stats.frame}`, 14, 40);
    ctx.restore();
  }

  destroy() {
    this.stop();
    this.scenes.shutdownCurrent();
    this.audio.dispose();
    this.input.dispose();
    window.removeEventListener('resize', this._onResize);
  }
}
