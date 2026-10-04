// Small random helper mirroring the bits of Python's `random.Random` we use.

export interface Rng {
  random(): number;
  choice<T>(items: readonly T[]): T;
  uniform(a: number, b: number): number;
}

class BaseRng implements Rng {
  constructor(private readonly next: () => number) {}

  random(): number {
    return this.next();
  }

  choice<T>(items: readonly T[]): T {
    return items[Math.floor(this.random() * items.length)];
  }

  uniform(a: number, b: number): number {
    return a + (b - a) * this.random();
  }
}

/** Default generator backed by `Math.random`. */
export function defaultRng(): Rng {
  return new BaseRng(() => Math.random());
}

/** Deterministic generator for tests and reproducible runs (mulberry32). */
export function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  return new BaseRng(() => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  });
}
