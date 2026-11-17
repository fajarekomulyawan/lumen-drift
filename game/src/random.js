// A tiny seeded random generator (mulberry32): the same seed always deals the same night,
// which is what makes the screenshot scenes reproducible and the waves fair to practise.

export function makeRandom(seed) {
  let state = (seed >>> 0) || 1;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random float in [min, max). */
export function range(rand, min, max) {
  return min + rand() * (max - min);
}

/** Random integer in [min, max], both ends included. */
export function intRange(rand, min, max) {
  return min + Math.floor(rand() * (max - min + 1));
}

/** Pick one element of a non-empty array. */
export function pick(rand, items) {
  return items[Math.floor(rand() * items.length)];
}
