// ─────────────────────────────────────────────────────────────────────────────
//  АДОВЫЙ ЛАБИРИНТ · Главный файл запуска
// ─────────────────────────────────────────────────────────────────────────────

import { World, PipelineStages } from '../hermes_ecs/src/index.js';
import { Player, Deck, Maze, Enemy, UIState } from './components.js';
import { MazeGenSystem, CardSystem, EnemySystem, AudioSystem } from './systems.js';

export function createGameWorld() {
  const world = new World();

  // Создаём сущности
  const playerId = world.create();
  world.add(playerId, Player, {
    gx: 1, gz: 1, px: 0, pz: 0, dir: 0, yaw: 0, tyaw: 0,
    hp: 100, armor: 25, ap: 3, level: 1, kills: 0,
  });

  const mazeId = world.create();
  world.add(mazeId, Maze, { grid: [], width: 17, height: 17, exitX: 1, exitZ: 1 });

  const deckId = world.create();
  world.add(deckId, Deck, { deck: [], hand: [], discard: [] });

  const uiId = world.create();
  world.add(uiId, UIState, { busy: false, dead: false, shake: 0, kick: 0, flashT: 0, bobT: 0 });

  // Регистрируем системы
  const mazeGen = new MazeGenSystem();
  const cardSys = new CardSystem();
  const enemySys = new EnemySystem();
  const audioSys = new AudioSystem();

  world.pipeline.add(audioSys, { stage: PipelineStages.INPUT });
  world.pipeline.add(enemySys, { stage: PipelineStages.FIXED_STEP });
  world.pipeline.add(mazeGen, { stage: PipelineStages.PRE_STEP });
  world.pipeline.add(cardSys, { stage: PipelineStages.STEP });

  // Сохраняем ссылки для внешнего доступа
  world._playerId = playerId;
  world._mazeId = mazeId;
  world._deckId = deckId;
  world._uiId = uiId;
  world._systems = { mazeGen, cardSys, enemySys, audioSys };

  return world;
}

export { Player, Deck, Maze, Enemy, UIState } from './components.js';
export { MazeGenSystem, CardSystem, EnemySystem, AudioSystem } from './systems.js';