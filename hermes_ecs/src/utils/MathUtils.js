// ─────────────────────────────────────────────────────────────────────────────
//  HermesECS · utils/MathUtils.js  (clean v2)
//  Математические помощники. Используются в системах, компонентах, демо.
// ─────────────────────────────────────────────────────────────────────────────

export const PI = Math.PI;
export const TAU = PI * 2;
export const DEG2RAD = PI / 180;
export const RAD2DEG = 180 / PI;
export const EPSILON = 1e-6;

export const clamp   = (v, min, max) => v < min ? min : v > max ? max : v;
export const lerp    = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (v - a) / (b - a);
export const remap   = (v, inMin, inMax, outMin, outMax) =>
  lerp(outMin, outMax, clamp(invLerp(inMin, inMax, v), 0, 1));

export const degToRad = (d) => d * DEG2RAD;
export const radToDeg = (r) => r * RAD2DEG;

/** Самый короткий угол из a в b (радианы, диапазон -PI..PI). */
export function angleDifference(a, b) {
  let d = (b - a) % TAU;
  if (d > PI) d -= TAU;
  if (d < -PI) d += TAU;
  return d;
}

export function lerpAngle(a, b, t) {
  return a + angleDifference(a, b) * t;
}

export const randRange = (min, max) => min + Math.random() * (max - min);
export const randInt   = (min, max) => Math.floor(min + Math.random() * (max - min + 1));
export const randChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const randSign   = () => Math.random() < 0.5 ? -1 : 1;

export const length   = (x, y) => Math.sqrt(x * x + y * y);
export const lengthSq = (x, y) => x * x + y * y;

export function normalize(x, y) {
  const len = length(x, y);
  if (len < EPSILON) return [0, 0];
  return [x / len, y / len];
}

export const dot        = (ax, ay, bx, by) => ax * bx + ay * by;
export const distance   = (ax, ay, bx, by) => length(bx - ax, by - ay);
export const distanceSq = (ax, ay, bx, by) => lengthSq(bx - ax, by - ay);

export const smoothstep  = (t) => t * t * (3 - 2 * t);
export const smootherstep= (t) => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * Критическое затухание для game-feel: плавно приближает current к target
 * с константой lambda (чем больше, тем жёстче). Frame-rate independent.
 * Использует экспоненциальное затухание: 1 - exp(-lambda * dt).
 */
export function damp(current, target, lambda, dt) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/** Ограничить угол в диапазон [-π, π). */
export const wrapAngle = (a) => {
  let r = (a + PI) % TAU;
  if (r < 0) r += TAU;
  return r - PI;
};

/** Ограничить значение в диапазоне [0, 1]. */
export const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;

/** Минимум массива. */
export const minOf = (arr) => {
  let m = Infinity;
  for (let i = 0; i < arr.length; i++) if (arr[i] < m) m = arr[i];
  return m;
};

/** Максимум массива. */
export const maxOf = (arr) => {
  let m = -Infinity;
  for (let i = 0; i < arr.length; i++) if (arr[i] > m) m = arr[i];
  return m;
};

/**
 * Псевдо-шум для процедурных эффектов (не криптографический).
 * Реализация на основе целочисленного хэша — детерминированная, без зависимостей.
 */
export function hash2D(x, y) {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff;
}
