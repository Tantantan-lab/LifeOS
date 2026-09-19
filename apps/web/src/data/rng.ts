/**
 * Deterministic RNG — zero Math.random(). Every per-day value derives from
 * a hash of (SEED, domain, dateKey), so generation is order-independent,
 * past days never change, and the UI is byte-identical between reloads.
 */

/** FNV-1a 32-bit. */
export function hashSeed(...parts: (string | number)[]): number {
  let h = 2166136261;
  for (const p of parts) {
    const s = String(p);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  }
  return h >>> 0;
}

/** mulberry32 PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngFor(...parts: (string | number)[]): () => number {
  return mulberry32(hashSeed(...parts));
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

export function uniform(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Standard normal via Box-Muller. */
export function gaussian(rng: () => number, mean: number, sigma: number): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * sigma;
}

/** Poisson via Knuth's algorithm (λ < 10). */
export function poisson(rng: () => number, lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** easeOutCubic — smooth ramp-ups in the realism curves. */
export function easeOut(x: number): number {
  const t = clamp(x, 0, 1);
  return 1 - (1 - t) ** 3;
}

/**
 * easeInQuad — improvement spread across the WHOLE window.
 * easeOutCubic saturates too early: at 2/3 of the window it is already
 * 96% done, which makes recent deltas flat and old deltas enormous.
 */
export function easeIn(x: number): number {
  const t = clamp(x, 0, 1);
  return t * t;
}
