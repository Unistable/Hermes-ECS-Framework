// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · core/Pipeline.js  (clean v2)
//  Планировщик систем. Системы регистрируются в одной или нескольких
//  стадиях, внутри стадии сортируются по priority (меньше = раньше).
//
//  Стандартные стадии (по порядку выполнения):
//    INIT      — одноразовая инициализация (создание стартовых сущностей).
//    INPUT     — сбор инпута (один раз за кадр).
//    PRE_STEP  — подготовка к симуляции.
//    FIXED_STEP — физика/логика с фиксированным dt (1..N раз за кадр).
//    STEP      — кадрозависимая логика (один раз за кадр).
//    POST_STEP — постобработка.
//    RENDER    — отрисовка. alpha — коэффициент интерполяции.
//    CLEANUP   — сбор мусора, сброс changed-фасок.
//
//  Сортировка систем в стадии делается один раз при add, через binary
//  поиск подходящей позиции + splice (вместо sort() по всему массиву).
// ─────────────────────────────────────────────────────────────────────────────

export const PipelineStages = Object.freeze({
  INIT:       'init',
  INPUT:      'input',
  PRE_STEP:   'preStep',
  FIXED_STEP: 'fixedStep',
  STEP:       'step',
  POST_STEP:  'postStep',
  RENDER:     'render',
  CLEANUP:    'cleanup',
});

const STAGE_METHODS = Object.freeze({
  [PipelineStages.INIT]:       'onInit',
  [PipelineStages.INPUT]:      'onInput',
  [PipelineStages.PRE_STEP]:   'onPreStep',
  [PipelineStages.FIXED_STEP]: 'onFixedStep',
  [PipelineStages.STEP]:       'onStep',
  [PipelineStages.POST_STEP]:  'onPostStep',
  [PipelineStages.RENDER]:     'onRender',
  [PipelineStages.CLEANUP]:    'onCleanup',
});

class Stage {
  constructor(name) {
    this.name = name;
    this.entries = []; // [{priority, system}]
  }

  add(system, priority) {
    // Binary search для позиции вставки.
    const arr = this.entries;
    let lo = 0, hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (arr[mid].priority <= priority) lo = mid + 1;
      else hi = mid;
    }
    arr.splice(lo, 0, { priority, system });
  }

  remove(system) {
    const arr = this.entries;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].system === system) {
        arr.splice(i, 1);
        return;
      }
    }
  }

  get size() { return this.entries.length; }
}

export class Pipeline {
  constructor() {
    this._stages = new Map();
    for (const s of Object.values(PipelineStages)) {
      this._stages.set(s, new Stage(s));
    }
  }

  add(system, opts = {}) {
    if (!system.name) {
      system.name = system.constructor?.name || `System#${Math.random().toString(36).slice(2, 6)}`;
    }
    const stages = opts.stages || {};
    if (opts.stage !== undefined || opts.priority !== undefined) {
      const stageName = opts.stage || PipelineStages.STEP;
      const priority = opts.priority ?? 0;
      stages[stageName] = priority;
    }
    if (Object.keys(stages).length === 0) {
      stages[PipelineStages.STEP] = 0;
    }
    for (const [stageName, priority] of Object.entries(stages)) {
      const stage = this._stages.get(stageName);
      if (!stage) {
        throw new Error(`HermesECS.Pipeline: неизвестная стадия "${stageName}".`);
      }
      stage.add(system, priority);
    }
    return system;
  }

  remove(system) {
    for (const stage of this._stages.values()) stage.remove(system);
  }

  run(stageName, arg = undefined) {
    const stage = this._stages.get(stageName);
    if (!stage) return;
    const methodName = STAGE_METHODS[stageName];
    if (!methodName) return;
    const arr = stage.entries;
    for (let i = 0; i < arr.length; i++) {
      const sys = arr[i].system;
      const fn = sys[methodName];
      if (fn) fn.call(sys, arg);
    }
  }

  /** Запустить onDestroy() у всех систем (вне стандартных стадий). */
  runDestroy() {
    // Система может быть зарегистрирована в нескольких стадиях — вызываем
    // onDestroy только один раз на систему.
    const visited = new Set();
    for (const stage of this._stages.values()) {
      const arr = stage.entries;
      for (let i = 0; i < arr.length; i++) {
        const sys = arr[i].system;
        if (visited.has(sys)) continue;
        visited.add(sys);
        if (sys.onDestroy) sys.onDestroy();
      }
    }
  }

  get totalSystems() {
    let sum = 0;
    for (const s of this._stages.values()) sum += s.size;
    return sum;
  }

  get stages() { return Array.from(this._stages.values()); }
}
