// ─────────────────────────────────────────────────────────────────────────────
//  АДОВЫЙ ЛАБИРИНТ · Компоненты
// ─────────────────────────────────────────────────────────────────────────────

import { defineComponent, defineTag } from '../hermes_ecs/src/index.js';

// Компонент игрока с данными состояния
export const Player = defineComponent('Player', () => ({
  gx: 1, gz: 1,        // позиция в сетке лабиринта
  px: 0, pz: 0,        // интерполированная позиция для рендера
  dir: 0,              // направление (0-3)
  yaw: 0, tyaw: 0,     // угол поворота камеры
  hp: 100,             // здоровье
  armor: 25,           // броня
  ap: 3,               // очки действий
  level: 1,            // текущий уровень
  kills: 0,            // убито врагов
}));

// Компонент колоды карт
export const Deck = defineComponent('Deck', () => ({
  deck: [],
  hand: [],
  discard: [],
}));

// Компонент лабиринта
export const Maze = defineComponent('Maze', () => ({
  grid: [],            // 2D массив лабиринта
  width: 17,
  height: 17,
  exitX: 1,
  exitZ: 1,
}));

// Компонент врага
export const Enemy = defineComponent('Enemy', () => ({
  x: 0, z: 0,          // позиция в сетке
  px: 0, pz: 0,        // интерполированная позиция
  hp: 40,
  maxHp: 40,
  dmg: 9,
  sy: 1.3,             // размер спрайта
  flash: 0,            // эффект попадания
  lunge: 0,            // атака рывком
  ph: 0,               // фаза анимации
  sprite: null,        // ссылка на спрайт
}));

// Компонент карты в руке
export const Card = defineComponent('Card', () => ({
  type: '',            // тип карты (step, left, right, shot, heal)
  name: '',
  cost: 1,
  icon: '',
  cls: '',
}));

// Компонент UI состояния
export const UIState = defineComponent('UIState', () => ({
  busy: false,
  dead: false,
  shake: 0,
  kick: 0,
  flashT: 0,
  bobT: 0,
}));

// Тег-компоненты
export const ActiveEnemy = defineTag('ActiveEnemy');
export const Wall = defineTag('Wall');
export const Portal = defineTag('Portal');
export const Floor = defineTag('Floor');
export const Ceiling = defineTag('Ceiling');
