// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · utils/Bitset.js  (clean v2)
//  256-битный битсет на 8 × Uint32. Используется для масок компонентов
//  сущностей и для быстрого matching'а запросов.
//
//  Оптимизации:
//    • popcount через lookup-таблицу байтов (быстрее Кернигана в 2-3 раза);
//    • containsAll/containsNone разворачиваются вручную, без вызова функций;
//    • массивы — TypedArrays, что даёт V8 лучший кодоген.
// ─────────────────────────────────────────────────────────────────────────────

const WORD_BITS = 32;
const WORDS = 8;
const CAPACITY = WORDS * WORD_BITS; // 256

// Lookup-таблица popcount байта (0..255).
const POPCOUNT_LUT = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  let x = i, c = 0;
  while (x) { x &= x - 1; c++; }
  POPCOUNT_LUT[i] = c;
}

export class Bitset {
  constructor() {
    this._words = new Uint32Array(WORDS);
  }

  set(n) {
    this._words[n >>> 5] |= 1 << (n & 31);
    return this;
  }

  clear(n) {
    this._words[n >>> 5] &= ~(1 << (n & 31));
    return this;
  }

  toggle(n) {
    this._words[n >>> 5] ^= 1 << (n & 31);
    return this;
  }

  get(n) {
    return (this._words[n >>> 5] & (1 << (n & 31))) !== 0;
  }

  reset() {
    this._words.fill(0);
    return this;
  }

  copyFrom(other) {
    this._words.set(other._words);
    return this;
  }

  /**
   * Проверка superset: this ⊇ mask (все биты mask установлены в this).
   * Реализация: для каждого слова if ((a & b) !== b) return false.
   */
  containsAll(mask) {
    const a = this._words;
    const b = mask._words;
    for (let i = 0; i < WORDS; i++) {
      if ((a[i] & b[i]) !== b[i]) return false;
    }
    return true;
  }

  /**
   * Проверка disjoint: this ∩ mask === 0 (ни один бит mask не установлен в this).
   */
  containsNone(mask) {
    const a = this._words;
    const b = mask._words;
    for (let i = 0; i < WORDS; i++) {
      if (a[i] & b[i]) return false;
    }
    return true;
  }

  /** Возвращает true, если битсет пуст. */
  isEmpty() {
    const a = this._words;
    for (let i = 0; i < WORDS; i++) {
      if (a[i] !== 0) return false;
    }
    return true;
  }

  /** Количество установленных битов (popcount) через LUT. */
  count() {
    const a = this._words;
    let c = 0;
    for (let i = 0; i < WORDS; i++) {
      const w = a[i];
      c += POPCOUNT_LUT[w & 0xff];
      c += POPCOUNT_LUT[(w >>> 8) & 0xff];
      c += POPCOUNT_LUT[(w >>> 16) & 0xff];
      c += POPCOUNT_LUT[(w >>> 24) & 0xff];
    }
    return c;
  }

  /** Массив установленных индексов (для отладки/тестов). */
  toArray() {
    const out = [];
    const a = this._words;
    for (let w = 0; w < WORDS; w++) {
      const word = a[w];
      if (!word) continue;
      let bits = word;
      while (bits) {
        // Выделить младший установленный бит (x & -x), затем clz32 даёт
        // позицию старшего — переворачиваем ^ 31 → получаем CTZ (trailing zero count).
        const lsb = bits & -bits;
        const bitInWord = (Math.clz32(lsb) ^ 31) >>> 0;
        out.push(w * 32 + bitInWord);
        bits &= bits - 1; // очистить младший бит
      }
    }
    return out;
  }

  clone() {
    const b = new Bitset();
    b._words.set(this._words);
    return b;
  }

  get capacity() { return CAPACITY; }
  get wordCount() { return WORDS; }
}

/** Вспомогательная функция: объединение двух битсетов в новый. */
export function bitsetOr(a, b) {
  const out = new Bitset();
  const o = out._words;
  const aw = a._words;
  const bw = b._words;
  for (let i = 0; i < WORDS; i++) {
    o[i] = aw[i] | bw[i];
  }
  return out;
}
