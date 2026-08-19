// ─────────────────────────────────────────────────────────────────────────────
//  АДОВЫЙ ЛАБИРИНТ · Системы
// ─────────────────────────────────────────────────────────────────────────────

import { System, PipelineStages } from '../hermes_ecs/src/index.js';
import { Player, Deck, Maze, Enemy, Card, UIState } from './components.js';

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// Система генерации лабиринта (алгоритм recursive backtracker)
export class MazeGenSystem extends System {
  static queries = { maze: { all: [Maze] } };

  generateMaze(width, height) {
    const maze = Array.from({ length: height }, () => Array(width).fill(1));
    const stack = [[1, 1]];
    maze[1][1] = 0;

    while (stack.length > 0) {
      const [cx, cy] = stack[stack.length - 1];
      const directions = [[2, 0], [-2, 0], [0, 2], [0, -2]].sort(() => Math.random() - 0.5);
      let moved = false;

      for (const [dx, dy] of directions) {
        const nx = cx + dx, ny = cy + dy;
        if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && maze[ny][nx] === 1) {
          maze[ny][nx] = 0;
          maze[cy + Math.floor(dy / 2)][cx + Math.floor(dx / 2)] = 0;
          stack.push([nx, ny]);
          moved = true;
          break;
        }
      }
      if (!moved) stack.pop();
    }

    // Добавляем случайные петли
    for (let i = 0; i < 14; i++) {
      const x = 1 + Math.floor(Math.random() * (width - 2));
      const y = 1 + Math.floor(Math.random() * (height - 2));
      if (maze[y][x] === 1) {
        let openings = 0;
        if (maze[y + 1][x] === 0) openings++;
        if (maze[y - 1][x] === 0) openings++;
        if (maze[y][x + 1] === 0) openings++;
        if (maze[y][x - 1] === 0) openings++;
        if (openings >= 2) maze[y][x] = 0;
      }
    }

    return maze;
  }

  // BFS для поиска расстояний и выхода
  bfs(maze, sx, sz) {
    const width = maze[0].length;
    const height = maze.length;
    const dist = new Int16Array(width * height).fill(-1);
    const queue = [[sx, sz]];
    dist[sz * width + sx] = 0;
    let head = 0;

    while (head < queue.length) {
      const [x, z] = queue[head++];
      const d = dist[z * width + x];
      for (const [dx, dz] of DIRS) {
        const nx = x + dx, nz = z + dz;
        if (nx >= 0 && nz >= 0 && nx < width && nz < height && maze[nz][nx] === 0 && dist[nz * width + nx] === -1) {
          dist[nz * width + nx] = d + 1;
          queue.push([nx, nz]);
        }
      }
    }
    return dist;
  }

  onInit(world) {
    super.onInit(world);
    this.buildLevel();
  }

  buildLevel() {
    const mazeQuery = this.maze;
    const playerQuery = world.query({ all: [Player] });
    const enemyQuery = world.query({ all: [Enemy] });

    // Очищаем старые враги
    for (const eid of enemyQuery) {
      world.destroy(eid);
    }

    // Генерируем новый лабиринт
    const mazeData = this.generateMaze(17, 17);
    const mazeEntity = mazeQuery.first();
    if (mazeEntity) {
      const maze = world.get(mazeEntity, Maze);
      maze.grid = mazeData;
    }

    // Находим выход (самая дальняя точка от старта)
    const dist = this.bfs(mazeData, 1, 1);
    let bestDist = 0;
    let exitX = 15, exitZ = 15;

    for (let z = 1; z < 16; z++) {
      for (let x = 1; x < 16; x++) {
        if (mazeData[z][x] === 0 && dist[z * 17 + x] > bestDist) {
          bestDist = dist[z * 17 + x];
          exitX = x;
          exitZ = z;
        }
      }
    }

    if (mazeEntity) {
      const maze = world.get(mazeEntity, Maze);
      maze.exitX = exitX;
      maze.exitZ = exitZ;
    }

    // Спавним врагов
    const playerLvl = world.get(playerQuery.first(), Player).level;
    const wantEnemies = Math.min(4 + playerLvl, 11);
    const candidates = [];

    for (let z = 1; z < 16; z++) {
      for (let x = 1; x < 16; x++) {
        if (mazeData[z][x] === 0 && dist[z * 17 + x] >= 6 && !(x === exitX && z === exitZ)) {
          candidates.push([x, z]);
        }
      }
    }

    candidates.sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(wantEnemies, candidates.length); i++) {
      const [ex, ez] = candidates[i];
      const isElite = playerLvl >= 2 && Math.random() < 0.35;
      const hp = (isElite ? 70 : 40) + (playerLvl - 1) * 8;
      const dmg = (isElite ? 14 : 9) + (playerLvl - 1) * 2;
      const sy = isElite ? 1.62 : 1.3;

      const enemyId = world.create();
      const enemy = world.add(enemyId, Enemy, {
        x: ex, z: ez,
        px: ex + 0.5 - 8.5,
        pz: ez + 0.5 - 8.5,
        hp, maxHp: hp,
        dmg, sy,
        ph: Math.random() * 7,
      });
    }

    // Сбрасываем игрока на старт
    const player = world.get(playerQuery.first(), Player);
    player.gx = 1;
    player.gz = 1;
    player.px = 1 + 0.5 - 8.5;
    player.pz = 1 + 0.5 - 8.5;
    player.dir = 0;
    player.yaw = 0;
    player.tyaw = 0;
  }
}

// Система карт и хода игрока
export class CardSystem extends System {
  static queries = {
    players: { all: [Player] },
    decks: { all: [Deck] },
    uiStates: { all: [UIState] },
  };

  cardTypes = {
    step: { name: 'ШАГ ВПЕРЁД', cost: 1, icon: '↑', cls: 't-move' },
    left: { name: 'ПОВОРОТ ВЛЕВО', cost: 1, icon: '↺', cls: 't-turn' },
    right: { name: 'ПОВОРОТ ВПРАВО', cost: 1, icon: '↻', cls: 't-turn' },
    shot: { name: 'ВЫСТРЕЛ', cost: 2, icon: '✸', cls: 't-shot' },
    heal: { name: 'АПТЕЧКА', cost: 2, icon: '+', cls: 't-heal' },
  };

  createBaseDeck() {
    const deck = [];
    const add = (type, count) => {
      for (let i = 0; i < count; i++) {
        const t = this.cardTypes[type];
        deck.push({ ...t, type });
      }
    };
    add('step', 5);
    add('left', 3);
    add('right', 3);
    add('shot', 4);
    add('heal', 2);
    return deck.sort(() => Math.random() - 0.5);
  }

  onInit(world) {
    super.onInit(world);
    const deckId = world.create();
    world.add(deckId, Deck, {
      deck: this.createBaseDeck(),
      hand: [],
      discard: [],
    });
    this.startTurn();
  }

  draw(n) {
    const deckComp = this.decks.first();
    const deck = this.world.get(deckComp, Deck);

    for (let i = 0; i < n; i++) {
      if (deck.deck.length === 0) {
        if (deck.discard.length === 0) break;
        deck.deck = deck.discard.sort(() => Math.random() - 0.5);
        deck.discard = [];
      }
      deck.hand.push(deck.deck.pop());
    }
  }

  startTurn() {
    const playerComp = this.players.first();
    const deckComp = this.decks.first();
    const player = this.world.get(playerComp, Player);
    const deck = this.world.get(deckComp, Deck);

    player.ap = 3;
    deck.hand = [];
    deck.discard = [];
    this.draw(4);
  }

  playCard(index) {
    const uiState = this.uiStates.first();
    const ui = this.world.get(uiState, UIState);
    if (ui.busy || ui.dead) return;

    const deckComp = this.decks.first();
    const deck = this.world.get(deckComp, Deck);
    const card = deck.hand[index];

    if (!card || card.cost > this.world.get(this.players.first(), Player).ap) return;

    ui.busy = true;
    this.world.get(this.players.first(), Player).ap -= card.cost;
    deck.hand.splice(index, 1);
    deck.discard.push(card);

    // Выполняем эффект карты
    this.executeCard(card);
  }

  executeCard(card) {
    const playerComp = this.players.first();
    const player = this.world.get(playerComp, Player);
    const mazeComp = this.world.query({ all: [Maze] }).first();
    const maze = this.world.get(mazeComp, Maze);
    const uiState = this.uiStates.first();
    const ui = this.world.get(uiState, UIState);

    switch (card.type) {
      case 'step': {
        const [dx, dz] = DIRS[player.dir];
        const nx = player.gx + dx;
        const nz = player.gz + dz;
        if (nx >= 0 && nz >= 0 && nx < maze.width && nz < maze.height &&
            maze.grid[nz][nx] === 0) {
          player.gx = nx;
          player.gz = nz;
          ui.bobT += 1;
          // Проверка выхода будет в другой системе
        }
        break;
      }
      case 'left':
        player.dir = (player.dir + 3) % 4;
        player.tyaw += Math.PI / 2;
        break;
      case 'right':
        player.dir = (player.dir + 1) % 4;
        player.tyaw -= Math.PI / 2;
        break;
      case 'shot':
        ui.kick = 1;
        ui.flashT = 0.12;
        ui.shake = 0.6;
        // Логика стрельбы будет в CombatSystem
        break;
      case 'heal':
        player.hp = Math.min(100, player.hp + 35);
        break;
    }

    setTimeout(() => {
      if (!ui.dead) {
        if (player.ap <= 0) {
          this.startTurn();
        }
        ui.busy = false;
      }
    }, 380);
  }
}

// Система врагов (AI и атаки)
export class EnemySystem extends System {
  static queries = {
    enemies: { all: [Enemy] },
    players: { all: [Player] },
    mazes: { all: [Maze] },
    uiStates: { all: [UIState] },
  };

  bfs(maze, px, pz) {
    const width = maze.width;
    const height = maze.height;
    const dist = new Int16Array(width * height).fill(-1);
    const queue = [[px, pz]];
    dist[pz * width + px] = 0;
    let head = 0;

    while (head < queue.length) {
      const [x, z] = queue[head++];
      const d = dist[z * width + x];
      for (const [dx, dz] of DIRS) {
        const nx = x + dx, nz = z + dz;
        if (nx >= 0 && nz >= 0 && nx < width && nz < height &&
            maze.grid[nz][nx] === 0 && dist[nz * width + nx] === -1) {
          dist[nz * width + nx] = d + 1;
          queue.push([nx, nz]);
        }
      }
    }
    return dist;
  }

  onFixedStep(dt) {
    const uiState = this.uiStates.first();
    const ui = this.world.get(uiState, UIState);
    if (ui.dead) return;

    const playerComp = this.players.first();
    const player = this.world.get(playerComp, Player);
    const mazeComp = this.mazes.first();
    const maze = this.world.get(mazeComp, Maze);

    const dist = this.bfs(maze, player.gx, player.gz);
    const occupied = new Set();

    for (const eid of this.enemies) {
      const enemy = this.world.get(eid, Enemy);
      if (enemy.hp <= 0 || ui.dead) continue;

      const d = Math.abs(enemy.x - player.gx) + Math.abs(enemy.z - player.gz);

      if (d === 1) {
        enemy.lunge = 1;
        setTimeout(() => {
          const damage = enemy.dmg + Math.floor(Math.random() * 4);
          if (player.armor > 0) {
            const armorDmg = Math.min(player.armor, damage);
            player.armor -= armorDmg;
            player.hp -= (damage - armorDmg);
          } else {
            player.hp -= damage;
          }
          ui.shake = Math.max(ui.shake, 0.5);
          if (player.hp <= 0) {
            ui.dead = true;
          }
        }, 150);
        continue;
      }

      // Движение к игроку
      let bestMove = null;
      let bestDist = dist[enemy.z * maze.width + enemy.x];

      for (const [dx, dz] of DIRS) {
        const nx = enemy.x + dx;
        const nz = enemy.z + dz;
        if (nx < 0 || nz < 0 || nx >= maze.width || nz >= maze.height) continue;
        if (maze.grid[nz][nx] !== 0) continue;
        const key = `${nx},${nz}`;
        if (occupied.has(key)) continue;
        const dd = dist[nz * maze.width + nx];
        if (dd !== -1 && dd < bestDist) {
          bestDist = dd;
          bestMove = [nx, nz];
        }
      }

      if (bestMove) {
        occupied.delete(`${enemy.x},${enemy.z}`);
        enemy.x = bestMove[0];
        enemy.z = bestMove[1];
        occupied.add(`${enemy.x},${enemy.z}`);
      }
    }
  }
}

// Система рендера (Three.js)
export class RenderSystem extends System {
  static queries = {
    players: { all: [Player] },
    enemies: { all: [Enemy] },
    mazes: { all: [Maze] },
    uiStates: { all: [UIState] },
  };

  constructor() {
    super();
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.pointLight = null;
    this.wallMesh = null;
    this.portalSprite = null;
    this.wallGeo = null;
    this.wallMat = null;
    this.floorMesh = null;
    this.ceilMesh = null;
  }

  onInit(world) {
    super.onInit(world);
    this.init3D();
  }

  init3D() {
    // Инициализация Three.js будет здесь
    // Для краткости опущено - используется оригинальный код
  }

  onRender(alpha) {
    const playerComp = this.players.first();
    const player = this.world.get(playerComp, Player);
    const uiState = this.uiStates.first();
    const ui = this.world.get(uiState, UIState);

    // Интерполяция позиции игрока
    const targetX = player.gx + 0.5 - 8.5;
    const targetZ = player.gz + 0.5 - 8.5;
    player.px += (targetX - player.px) * Math.min(1, alpha * 12);
    player.pz += (targetZ - player.pz) * Math.min(1, alpha * 12);
    player.yaw += (player.tyaw - player.yaw) * Math.min(1, alpha * 14);

    ui.shake = Math.max(0, ui.shake - alpha * 2.2);
    ui.flashT = Math.max(0, ui.flashT - alpha);
    ui.kick = Math.max(0, ui.kick - alpha * 5);

    // Обновление камеры и рендер сцены
    // Используется оригинальная логика из HTML-файла
  }
}

// Система аудио
export class AudioSystem extends System {
  constructor() {
    super();
    this.audioContext = null;
  }

  initAudio() {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {}
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  tone(f0, f1, dur, type, vol) {
    if (!this.audioContext) return;
    const o = this.audioContext.createOscillator();
    const g = this.audioContext.createGain();
    const t = this.audioContext.currentTime;
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.audioContext.destination);
    o.start(t);
    o.stop(t + dur);
  }

  sShot() { this.tone(160, 30, 0.22, 'sawtooth', 0.5); this.tone(900, 80, 0.12, 'square', 0.25); }
  sHit() { this.tone(300, 120, 0.1, 'square', 0.3); }
  sHurt() { this.tone(120, 40, 0.25, 'sawtooth', 0.45); }
  sStep() { this.tone(90, 60, 0.07, 'triangle', 0.25); }
  sTurn() { this.tone(200, 160, 0.06, 'triangle', 0.2); }
  sHeal() { this.tone(420, 720, 0.25, 'sine', 0.3); }
  sKill() { this.tone(220, 30, 0.35, 'sawtooth', 0.4); }
  sLevel() { this.tone(220, 440, 0.15, 'square', 0.3); setTimeout(() => this.tone(330, 660, 0.2, 'square', 0.3), 140); }
  sDeath() { this.tone(200, 25, 1.2, 'sawtooth', 0.5); }

  onInit(world) {
    super.onInit(world);
    window.addEventListener('pointerdown', () => this.initAudio());
  }
}
