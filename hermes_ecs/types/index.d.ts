// ────────────────────────────────────────────────────────────────────────────
//  HermesECS · types/index.d.ts  (clean v3 — pure framework, no demo)
//  TypeScript декларации для IDE-поддержки и типобезопасного использования.
//
//  ВАЖНО: фреймворк НЕ содержит готовых компонентов и систем.
//  Это НАМЕРЕННО: компоненты и системы — код твоей игры.
//  Фреймворк даёт только движок: World, Component, Query, Pipeline,
//  HTML5-адаптеры (Canvas2D/Input/Audio/Assets/Time/Stats/SceneManager).
//
//  Принцип ECS: данные отдельно, функции отдельно.
//    • Компонент = POJO с полями (данные), без методов.
//    • Система   = класс с onStep/onRender (функция), без состояния игры.
//    • Entity    = число (ID), не объект.
// ─────────────────────────────────────────────────────────────────────────────

export declare const VERSION: string;

// ─── UID ───
export declare const UID: {
  nextEntityId(): number;
  nextComponentTypeId(): number;
  readonly entityCount: number;
  readonly componentCount: number;
};
export declare const NULL_ENTITY: number;

// ─── Bitset ───
export declare class Bitset {
  constructor();
  set(n: number): this;
  clear(n: number): this;
  toggle(n: number): this;
  get(n: number): boolean;
  reset(): this;
  copyFrom(other: Bitset): this;
  containsAll(mask: Bitset): boolean;
  containsNone(mask: Bitset): boolean;
  isEmpty(): boolean;
  count(): number;
  toArray(): number[];
  clone(): Bitset;
  readonly capacity: number;
  readonly wordCount: number;
}
export declare function bitsetOr(a: Bitset, b: Bitset): Bitset;

// ─── Component ───
export interface ComponentDef {
  name: string;
  typeId: number;
  factory: () => any;
  reset?: (c: any) => void;
  mask: Bitset;
}
export declare function defineComponent<T extends object>(
  name: string,
  factory: () => T,
  reset?: (c: T) => void
): ComponentDef;
export declare function defineTag(name: string): ComponentDef;
export declare function getComponentByName(name: string): ComponentDef;
export declare function getComponentByTypeId(typeId: number): ComponentDef;
export declare function getAllComponents(): ComponentDef[];
export declare function resolveComponent(spec: ComponentDef | string): ComponentDef;

// ─── Storage ───
export declare class SparseSetStorage {
  constructor(def: ComponentDef, initialCapacity?: number);
  insert(entityId: number, initial?: any | null): any;
  get(entityId: number): any | null;
  has(entityId: number): boolean;
  remove(entityId: number): boolean;
  entities(): Iterable<number>;
  readonly dense: number[];
  readonly components: any[];
  readonly size: number;
  clear(): void;
}

// ─── Query ───
export interface QuerySpec {
  all?: (ComponentDef | string)[];
  any?: (ComponentDef | string)[];
  none?: (ComponentDef | string)[];
  changed?: (ComponentDef | string)[];
}
export declare class Query {
  constructor(spec?: QuerySpec, name?: string);
  readonly name: string;
  readonly entities: number[];
  readonly length: number;
  has(entityId: number): boolean;
  [Symbol.iterator](): IterableIterator<number>;
}
export declare function query(spec: QuerySpec): Query;

// ─── EventQueue ───
export declare class EventQueue {
  on(type: string, handler: (payload: any) => void): () => void;
  once(type: string, handler: (payload: any) => void): () => void;
  off(type: string, handler?: (payload: any) => void): void;
  enqueue(type: string, payload?: any): void;
  emit(type: string, payload?: any): void;
  flush(): void;
  clear(): void;
  readonly pending: number;
  listenerCount(type: string): number;
}

// ─── Pipeline ───
export declare enum PipelineStages {
  INIT = 'init',
  INPUT = 'input',
  PRE_STEP = 'preStep',
  FIXED_STEP = 'fixedStep',
  STEP = 'step',
  POST_STEP = 'postStep',
  RENDER = 'render',
  CLEANUP = 'cleanup',
}
export interface SystemLike {
  name?: string;
  onInit?(world: World): void;
  onInput?(dt: number): void;
  onPreStep?(dt: number): void;
  onFixedStep?(fixedDt: number): void;
  onStep?(dt: number): void;
  onPostStep?(dt: number): void;
  onRender?(alpha: number): void;
  onCleanup?(): void;
  onDestroy?(): void;
}
export declare class Pipeline {
  add(system: SystemLike, opts?: {
    stage?: PipelineStages;
    priority?: number;
    stages?: Partial<Record<PipelineStages, number>>;
  }): SystemLike;
  remove(system: SystemLike): void;
  run(stageName: PipelineStages, arg?: any): void;
  runDestroy(): void;
  readonly totalSystems: number;
}

// ─── World ───
export interface WorldContext { [key: string]: any; }
export declare class World {
  ctx: WorldContext;
  events: EventQueue;
  queries: QueryRegistry;
  pipeline: Pipeline;
  create(): number;
  createMany(n: number): number[];
  has(entityId: number): boolean;
  has(entityId: number, component: ComponentDef | string): boolean;
  destroy(entityId: number): void;
  clear(): void;
  readonly entityCount: number;
  entities(): IterableIterator<number>;
  add(entityId: number, component: ComponentDef | string, initial?: any | null): any;
  get(entityId: number, component: ComponentDef | string): any | null;
  remove(entityId: number, component: ComponentDef | string): boolean;
  markChanged(entityId: number, component: ComponentDef | string): void;
  clearChanged(): void;
  query(spec: QuerySpec, name?: string): Query;
  use<T>(key: string, plugin: T | { init(world: World): T }): T;
  init(): void;
  update(timing: { dt: number; fixedDt: number; alpha: number; frame: number; fixedSteps?: number }): void;
  shutdown(): void;
}

// ─── Entity ───
export declare class Entity {
  constructor(world: World, id: number);
  static create(world: World): Entity;
  static wrap(world: World, id: number): Entity;
  readonly id: number;
  readonly world: World;
  readonly alive: boolean;
  add(component: ComponentDef | string, initial?: any | null): Entity;
  get(component: ComponentDef | string): any | null;
  has(component: ComponentDef | string): boolean;
  remove(component: ComponentDef | string): Entity;
  markChanged(component: ComponentDef | string): Entity;
  destroy(): void;
}

// ─── QueryRegistry ───
export declare class QueryRegistry {
  register(q: Query): Query;
  create(spec: QuerySpec, name?: string): Query;
  onEntityMaskChanged(entityId: number, oldMask: Bitset, newMask: Bitset, changedMask: Bitset): void;
  onEntityDestroyed(entityId: number): void;
  readonly size: number;
  all(): Query[];
}

// ─── System ───
export declare class System {
  world: World | null;
  name: string;
  onInit(world: World): void;
  onInput?(dt: number): void;
  onPreStep?(dt: number): void;
  onFixedStep?(fixedDt: number): void;
  onStep?(dt: number): void;
  onPostStep?(dt: number): void;
  onRender?(alpha: number): void;
  onCleanup?(): void;
  onDestroy?(): void;
}
export declare function installSystem(
  world: World,
  system: System,
  stageOpts: {
    stages?: Partial<Record<PipelineStages, number>>;
    stage?: PipelineStages;
    priority?: number;
  }
): System;

// ─── Utils ───
export declare class Pool {
  constructor(factory: () => any, reset?: (obj: any) => void);
  acquire(): any;
  release(obj: any): void;
  preallocate(n: number): void;
  releaseAll(arr: any[]): void;
  readonly size: number;
  readonly totalCreated: number;
  readonly inUse: number;
  clear(): void;
}

export declare class EventEmitter {
  on(event: string, handler: (payload: any) => void): () => void;
  once(event: string, handler: (payload: any) => void): () => void;
  off(event: string, handler?: (payload: any) => void): void;
  emit(event: string, payload?: any): void;
  clear(): void;
  listenerCount(event: string): number;
  eventTypes(): string[];
}

// ─── MathUtils ───
export declare const PI: number;
export declare const TAU: number;
export declare const DEG2RAD: number;
export declare const RAD2DEG: number;
export declare const EPSILON: number;
export declare function clamp(v: number, min: number, max: number): number;
export declare function clamp01(v: number): number;
export declare function lerp(a: number, b: number, t: number): number;
export declare function invLerp(a: number, b: number, v: number): number;
export declare function remap(v: number, inMin: number, inMax: number, outMin: number, outMax: number): number;
export declare function degToRad(d: number): number;
export declare function radToDeg(r: number): number;
export declare function angleDifference(a: number, b: number): number;
export declare function lerpAngle(a: number, b: number, t: number): number;
export declare function wrapAngle(a: number): number;
export declare function randRange(min: number, max: number): number;
export declare function randInt(min: number, max: number): number;
export declare function randChoice<T>(arr: T[]): T;
export declare function randSign(): number;
export declare function length(x: number, y: number): number;
export declare function lengthSq(x: number, y: number): number;
export declare function normalize(x: number, y: number): [number, number];
export declare function dot(ax: number, ay: number, bx: number, by: number): number;
export declare function distance(ax: number, ay: number, bx: number, by: number): number;
export declare function distanceSq(ax: number, ay: number, bx: number, by: number): number;
export declare function smoothstep(t: number): number;
export declare function smootherstep(t: number): number;
export declare function damp(current: number, target: number, lambda: number, dt: number): number;
export declare function minOf(arr: number[]): number;
export declare function maxOf(arr: number[]): number;
export declare function hash2D(x: number, y: number): number;

// ─── HTML5 ───
export interface GameOptions {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  fixedStepHz?: number;
  showFps?: boolean;
  scenes?: Record<string, () => World>;
  start?: string;
}
export declare class Game {
  canvas: HTMLCanvasElement;
  canvas2d: Canvas2D;
  input: Input;
  assets: AssetLoader;
  audio: AudioEngine;
  time: Time;
  stats: Stats;
  scenes: SceneManager;
  constructor(opts: GameOptions);
  start(): void;
  stop(): void;
  destroy(): void;
}

export declare class Canvas2D {
  canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
  readonly ctx: CanvasRenderingContext2D;
  constructor(canvas: HTMLCanvasElement, logicalWidth: number, logicalHeight: number);
  resize(): void;
  clear(color?: string): void;
  push(): void;
  pop(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;
  drawImage(image: CanvasImageSource, dx: number, dy: number, dw?: number, dh?: number): void;
  drawImageSliced(image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
  fillRect(x: number, y: number, w: number, h: number, color: string): void;
  strokeRect(x: number, y: number, w: number, h: number, color: string, lineWidth?: number): void;
  fillCircle(x: number, y: number, r: number, color: string): void;
  strokeCircle(x: number, y: number, r: number, color: string, lineWidth?: number): void;
  fillText(text: string, x: number, y: number, color?: string, font?: string): void;
  setGlobalAlpha(a: number): void;
  resetGlobalAlpha(): void;
  fillStyle: string;
  strokeStyle: string;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
}

export declare class Input {
  mouseX: number;
  mouseY: number;
  mouseDX: number;
  mouseDY: number;
  mouseWheel: number;
  readonly touches: Array<{ id: number; x: number; y: number; startX: number; startY: number; prevX: number; prevY: number }>;
  constructor(canvas: HTMLCanvasElement);
  isDown(key: string): boolean;
  wasPressed(key: string): boolean;
  wasReleased(key: string): boolean;
  getKeys(): string[];
  readonly mouseDown: boolean;
  readonly mousePressed: boolean;
  readonly mouseReleased: boolean;
  mouseButtonDown(button?: number): boolean;
  mouseButtonPressed(button?: number): boolean;
  mouseButtonReleased(button?: number): boolean;
  getGamepad(index?: number): Gamepad | null;
  endFrame(): void;
  dispose(): void;
}

export declare class AssetLoader {
  readonly progress: number;
  loadImage(url: string): Promise<HTMLImageElement>;
  loadAudio(url: string): Promise<HTMLAudioElement>;
  loadJson(url: string): Promise<any>;
  loadText(url: string): Promise<string>;
  loadFont(family: string, url: string): Promise<FontFace>;
  loadManifest(
    manifest: Record<string, { type: string; url: string; family?: string }>,
    onProgress?: (p: number) => void
  ): Promise<this>;
  get<T = any>(key: string): T | null;
  type(key: string): string | null;
  has(key: string): boolean;
  set(key: string, type: string, asset: any): void;
  clear(): void;
}

export declare class AudioEngine {
  init(): void;
  resume(): void;
  decode(key: string, data: ArrayBuffer): Promise<AudioBuffer>;
  load(key: string, url: string): Promise<AudioBuffer>;
  play(key: string, opts?: {
    bus?: string;
    volume?: number;
    rate?: number;
    loop?: boolean;
    position?: { x: number; y: number } | null;
  }): { stop: () => void; source: AudioBufferSourceNode | null };
  setVolume(bus: string, value: number): void;
  readonly volume: { master: number; music: number; sfx: number; ui: number };
  dispose(): void;
}

export declare class Time {
  elapsed: number;
  frameDelta: number;
  fixedStep: number;
  maxFrameDelta: number;
  alpha: number;
  fixedStepsThisFrame: number;
  timeScale: number;
  paused: boolean;
  constructor(fixedStepHz?: number, maxFrameDelta?: number);
  tick(nowSeconds: number): void;
  reset(): void;
}

export declare class Stats {
  fps: number;
  minFrameTime: number;
  maxFrameTime: number;
  avgFrameTime: number;
  readonly frame: number;
  begin(now: number): void;
  end(now: number): void;
  reset(): void;
}

export declare class SceneManager {
  register(name: string, factory: () => World): this;
  readonly current: World | null;
  readonly currentName: string | null;
  start(name: string, payload?: any): void;
  switch(name: string, payload?: any): void;
  applyPending(): boolean;
  shutdownCurrent(): void;
}

// ВАЖНО: фреймворк НЕ экспортирует готовые компоненты и системы.
// Ты создаёшь их сам в своей игре. Пример:
//
//   import { defineComponent, defineTag } from '../hermes_ecs/src/index.js';
//
//   // ДАННЫЕ — это POJO, никаких методов:
//   export const Transform = defineComponent('Transform', () => ({
//     x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
//   }), (c) => { c.x = 0; c.y = 0; c.rotation = 0; c.scaleX = 1; c.scaleY = 1; });
//
//   // ФУНКЦИИ — это класс-система с onStep, никакого состояния игры:
//   class MovementSystem extends System {
//     onStep(dt) {
//       for (const e of this.world.query({ all: [Transform, Velocity] })) {
//         const t = this.world.get(e, Transform);
//         const v = this.world.get(e, Velocity);
//         t.x += v.x * dt;  t.y += v.y * dt;
//       }
//     }
//   }
