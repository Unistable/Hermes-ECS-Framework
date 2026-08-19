# HermesECS · v3.0.0 — Чистый ECS Framework для HTML5 игр

**ДАННЫЕ отдельно, ФУНКЦИИ отдельно.** Это не просто слоган — это архитектура:

- **Компонент** = POJO с полями, **без единого метода**.
- **Система** = класс с `onStep()`/`onRender()`, **без полей-данных игры**.
- **Entity** = просто `number` (ID), не объект.

Фреймворк **строго соблюдает** этот принцип. В нём нет готовых `Transform`, `Velocity`, `MovementSystem` — ты создаёшь их сам под свою игру. Фреймворк даёт только движок.

---

## Что внутри

```
clean_hermes_ecs/
├── hermes_ecs/              ← ЧИСТЫЙ ФРЕЙМВОРК (не трогать)
│   ├── src/
│   │   ├── core/            ← движок ECS
│   │   │   ├── World.js        — сущности + компоненты + pipeline
│   │   │   ├── Component.js   — defineComponent / defineTag
│   │   │   ├── Storage.js      — SparseSet: O(1) add/remove
│   │   │   ├── Query.js        — битовые маски, инкрементальное обновление
│   │   │   ├── QueryRegistry.js
│   │   │   ├── Pipeline.js    — 8 стадий, приоритеты
│   │   │   ├── System.js       — базовый класс + installSystem()
│   │   │   ├── EventQueue.js  — отложенные события (без mutation-during-iter)
│   │   │   └── Entity.js       — chainable wrapper (опционально)
│   │   ├── utils/          ← Bitset, Pool, UID, MathUtils, EventEmitter
│   │   ├── html5/          ← адаптеры под браузер
│   │   │   ├── Game.js        — главный цикл + rAF + связывание
│   │   │   ├── Time.js        — fixed timestep + interpolation
│   │   │   ├── Canvas2D.js    — 2D-рендер (DPR-aware)
│   │   │   ├── Input.js       — keyboard/mouse/touch/gamepad
│   │   │   ├── AssetLoader.js — images/audio/json/text/fonts
│   │   │   ├── Audio.js       — Web Audio API + buses
│   │   │   ├── Stats.js       — FPS/frame timing
│   │   │   └── SceneManager.js — переключение сцен
│   │   └── index.js        ← единая точка импорта
│   ├── types/index.d.ts    ← TypeScript декларации для IDE
│   ├── package.json
│   └── LICENSE
├── my_game/                 ← ТВОЯ ИГРА (пустой шаблон)
│   ├── components/         ← ДАННЫЕ (POJO, без методов)
│   ├── systems/           ← ФУНКЦИИ (классы с onStep/onRender)
│   ├── entities/          ← фабрики сущностей
│   ├── scenes/            ← фабрики сцен (создают World)
│   ├── assets/
│   │   ├── sprites/
│   │   ├── audio/
│   │   ├── data/
│   │   └── fonts/
│   ├── index.html
│   ├── main.js            ← bootstrap
│   └── README.md          ← инструкция для твоей игры
├── server.js               ← статический HTTP-сервер (без зависимостей)
└── README.md               ← этот файл
```

---

## Быстрый старт

### Запуск

```bash
node server.js
```

Открой в браузере: **http://localhost:8080/my_game/**

увидишь синюю точку, медленно движущуюся вверх-вправо по тёмному фону, и счётчик FPS в углу. Это и есть минимальный рабочий пример на чистом ECS.

### Что происходит в `main.js`

```js
import { World, Game, System, installSystem, PipelineStages, defineComponent, defineTag } from '../hermes_ecs/src/index.js';

// 1. ДАННЫЕ — компоненты (POJO, без методов)
const Position = defineComponent('Position', () => ({ x: 0, y: 0 }), (c) => { c.x = 0; c.y = 0; });
const Velocity = defineComponent('Velocity', () => ({ vx: 0, vy: 0 }), (c) => { c.vx = 0; c.vy = 0; });
const PlayerTag = defineTag('PlayerTag');

// 2. ФУНКЦИИ — системы (классы, без состояния)
class MovementSystem extends System {
  static queries = { movers: { all: [Position, Velocity] } };
  onStep(dt) {
    for (const e of this.movers) {
      const p = this.world.get(e, Position);
      const v = this.world.get(e, Velocity);
      p.x += v.vx * dt;  p.y += v.vy * dt;
    }
  }
}

class RenderSystem extends System {
  static queries = { sprites: { all: [Position] } };
  onRender(alpha) {
    const ctx = this.world.ctx.canvas2d;
    ctx.clear('#0d1117');
    ctx.fillStyle = '#58a6ff';
    for (const e of this.sprites) {
      const p = this.world.get(e, Position);
      ctx.fillCircle(p.x, p.y, 8);
    }
  }
}

// 3. Сцена — фабрика World'а
function createMainScene() {
  const world = new World();
  installSystem(world, new MovementSystem(), { stages: { [PipelineStages.STEP]: 100 } });
  installSystem(world, new RenderSystem(), { stages: { [PipelineStages.RENDER]: 100 } });

  const player = world.create();
  world.add(player, Position, { x: 640, y: 360 });
  world.add(player, Velocity, { vx: 80, vy: -50 });
  world.add(player, PlayerTag);

  return world;
}

// 4. Bootstrap
const game = new Game({
  canvas: document.getElementById('game'),
  width: 1280, height: 720,
  fixedStepHz: 60, showFps: true,
  scenes: { main: () => createMainScene() },
  start: 'main',
});
game.start();
```

---

## Архитектура ECS — почему так

### ДАННЫЕ: Компоненты — это POJO

```js
// ✅ Правильно: только поля, никаких методов
const Health = defineComponent('Health', () => ({
  hp: 100, maxHp: 100, invulnerable: false,
}), (c) => { c.hp = 100; c.maxHp = 100; c.invulnerable = false; });

// ❌ Неправильно: метод в компоненте — это уже не ECS
const BadHealth = defineComponent('BadHealth', () => ({
  hp: 100,
  damage(amount) { this.hp -= amount; },   // ← так нельзя
}));
```

**Почему так:** V8 делает hidden classes для POJO с одинаковым shape — это даёт скорость C++-структур. Если добавляешь методы, shape ломается, объекты уходят в dictionary mode, итерации замедляются.

### ФУНКЦИИ: Системы — это классы без состояния игры

```js
// ✅ Правильно: система читает и пишет в компоненты, ничего своего не хранит
class DamageSystem extends System {
  static queries = { victims: { all: [Health] } };
  onStep(dt) {
    for (const e of this.victims) {
      const h = this.world.get(e, Health);
      if (h.invulnerable) continue;
      h.hp -= 10 * dt;  // ← пишем в данные компонента, не в поля системы
    }
  }
}

// ❌ Неправильно: система хранит состояние игры
class BadDamageSystem extends System {
  constructor() {
    super();
    this._entityHealths = new Map();   // ← так нельзя, данные утекли из ECS
  }
}
```

**Почему так:** данные в компонентах автоматически следуют за сущностью при добавлении/удалении, видны всем системам, попадают в запросы. Системные поля — это чёрная дыра, куда данные уходят навсегда.

### Entity — это просто `number`

В HermesECS сущность — это `uint32` ID. Не объект, не класс. Минимум оверхеда, максимум кэш-локальности.

---

## Внешние либы (three.js, pixi.js, matter.js, howler.js, ...)

Фреймворк **рендер-агностичный**. `Canvas2D`, `Audio`, `Input` — опциональные адаптеры, ты можешь их не использовать и заменить любой другой либой.

### Установка
```bash
npm install three
# или
npm install pixi.js matter-js howler
```

### three.js как рендер

```js
// my_game/systems/ThreeRenderSystem.js
import * as THREE from 'three';
import { System, PipelineStages, installSystem } from '../../hermes_ecs/src/index.js';
import { Position, Sprite } from '../components/index.js';

export class ThreeRenderSystem extends System {
  onInit(world) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(1280, 720);
    document.body.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 16/9, 0.1, 1000);
    this.camera.position.z = 10;
    this._meshes = new Map();
  }

  onStep(dt) {
    for (const e of this.world.query({ all: [Position, Sprite] })) {
      let mesh = this._meshes.get(e);
      if (!mesh) {
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshBasicMaterial({ color: 0x58a6ff });
        mesh = new THREE.Mesh(geo, mat);
        this.scene.add(mesh);
        this._meshes.set(e, mesh);
      }
      const p = this.world.get(e, Position);
      mesh.position.set(p.x / 100, p.y / 100, 0);
    }
  }

  onRender(alpha) {
    this.renderer.render(this.scene, this.camera);
  }

  onDestroy() {
    this.renderer.dispose();
  }
}
```

### matter.js для физики

```js
import Matter from 'matter-js';
import { System, installSystem, PipelineStages } from '../../hermes_ecs/src/index.js';
import { Position, Collider } from '../components/index.js';

export class MatterPhysicsSystem extends System {
  onInit() {
    this.engine = Matter.Engine.create();
    this._bodies = new Map();
  }

  onFixedStep(fixedDt) {
    Matter.Engine.update(this.engine, fixedDt * 1000);
    for (const [e, body] of this._bodies) {
      const p = this.world.get(e, Position);
      p.x = body.position.x;
      p.y = body.position.y;
    }
  }
}
```

### howler.js для звука

```js
import { System } from '../../hermes_ecs/src/index.js';
import { Howl } from 'howler';

export class HowlerAudioSystem extends System {
  onInit() {
    this.sounds = {
      shoot: new Howl({ src: ['../assets/audio/shoot.mp3'] }),
      explosion: new Howl({ src: ['../assets/audio/explosion.mp3'] }),
    };
    this.world.events.on('sound:shoot', () => this.sounds.shoot.play());
    this.world.events.on('sound:explosion', () => this.sounds.explosion.play());
  }
}
```

### pixi.js для рендера

Аналогично three.js — `PIXI.Application` создаёшь в `onInit`, в `onStep` синхронизируешь `PIXI.Sprite` с компонентами.

---

## Ключевые API

### Component
```js
import { defineComponent, defineTag } from '../hermes_ecs/src/index.js';

const Position = defineComponent('Position', () => ({ x: 0, y: 0 }), (c) => { c.x = 0; c.y = 0; });
const PlayerTag = defineTag('PlayerTag');   // тег = компонент без данных
```

### World
```js
const world = new World();                  // ctx будет прокинут из Game

const e = world.create();                  // → entityId (число)
world.add(e, Position, { x: 100, y: 200 });
world.get(e, Position);                     // → { x: 100, y: 200 }
world.has(e, PlayerTag);                    // → false
world.remove(e, Position);
world.destroy(e);

world.query({ all: [Position, Velocity], none: [DeadTag] });  // → Query (iterable)
```

### System
```js
import { System, installSystem, PipelineStages } from '../hermes_ecs/src/index.js';

class MovementSystem extends System {
  static queries = { movers: { all: [Position, Velocity] } };
  onStep(dt) {
    for (const e of this.movers) { /* ... */ }
  }
}

installSystem(world, new MovementSystem(), {
  stages: { [PipelineStages.STEP]: 100 },  // priority 100 в стадии STEP
});
```

### Pipeline stages (порядок выполнения в кадре)

```
INIT → INPUT → PRE_STEP → FIXED_STEP → STEP → POST_STEP → RENDER → CLEANUP
```

| Stage | Что делать |
|---|---|
| `INIT` | одноразовая инициализация систем (вызывается через `world.init()`) |
| `INPUT` | чтение ввода, преобразование в意图ения |
| `PRE_STEP` | подготовка к симуляции |
| `FIXED_STEP` | детерминированная симуляция (физика), вызывается N раз за кадр |
| `STEP` | основная игровая логика (один раз за кадр, с переменным dt) |
| `POST_STEP` | пост-обработка после симуляции |
| `RENDER` | отрисовка с интерполяцией alpha |
| `CLEANUP` | очистка событий, удаление умерших сущностей |

### Events (отложенные, безопасные)
```js
world.events.on('explosion', (payload) => { /* ... */ });
world.events.enqueue('explosion', { x: 100, y: 200 });  // → попадёт в очередь
// события обработаются в конце текущего кадра (в CLEANUP)
```

---

## Оптимизации

- **SparseSet storage**: O(1) add/remove/has, плотная итерация по `dense`
- **Bitset queries**: 256 типов компонентов × 8×Uint32, `containsAll` = 8 сравнений
- **Инкрементальные обновления**: query не пересчитывается каждый кадр, только когда меняется маска сущности
- **Pool**: реюз объектов для GC pressure reduction
- **Fixed timestep**: стабильная физика + interpolation alpha для рендера
- **Death-spiral protection**: максимум 5 fixed steps за кадр
- **V8 hidden classes**: компоненты — POJO с одинаковым shape → C++-скорость
- **DPR cap at 2**: рисуем чётко на retina без перерасхода GPU

---

## Лицензия

MIT — делай что хочешь. См. `hermes_ecs/LICENSE`.
