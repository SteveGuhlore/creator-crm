// Deterministic, dependency-free PRNG so fixtures + seed are fully reproducible.
// mulberry32: fast, good-enough distribution for mock data.

export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** float in [0, 1) */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('Rng.pick on empty array');
    return arr[this.int(0, arr.length - 1)]!;
  }

  /** Pick `n` distinct items (or all if n >= length). */
  sample<T>(arr: readonly T[], n: number): T[] {
    const copy = [...arr];
    const out: T[] = [];
    const count = Math.min(n, copy.length);
    for (let i = 0; i < count; i++) {
      const idx = this.int(0, copy.length - 1);
      out.push(copy.splice(idx, 1)[0]!);
    }
    return out;
  }

  bool(pTrue = 0.5): boolean {
    return this.next() < pTrue;
  }

  /** A date `daysBack`..0 days before `now`, with random time-of-day. */
  dateWithin(now: Date, daysBack: number): Date {
    const ms = this.int(0, daysBack * 24 * 60 * 60 * 1000);
    return new Date(now.getTime() - ms);
  }
}

/** Stable string hash → seed, so a label deterministically maps to a stream. */
export function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
