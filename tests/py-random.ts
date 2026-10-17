/** Bit-exact port of CPython's `random.Random` (MT19937 + init_by_array seeding) for the draws the seller-variance
 *  reference uses: random(), uniform(), normalvariate() (Kinderman-Monahan), lognormvariate(). Test-only; lets the TS AC7
 *  bot replay product/sim/seller_variance_sim.py's variance stream draw-for-draw. Integer seeds >= 0 only. */
const N = 624, M = 397;
export class PyRandom {
  private mt = new Uint32Array(N); private mti = N + 1;
  constructor(seed: number) {
    if (!Number.isSafeInteger(seed) || seed < 0) throw new Error('PyRandom: non-negative safe-integer seed only');
    const key: number[] = []; let x = seed;
    do { key.push(x % 4294967296); x = Math.floor(x / 4294967296); } while (x > 0);
    this.initByArray(key);
  }
  private initGenrand(s: number) {
    const mt = this.mt; mt[0] = s >>> 0;
    for (let i = 1; i < N; i++) { const p = mt[i - 1] ^ (mt[i - 1] >>> 30); mt[i] = (Math.imul(1812433253, p) + i) >>> 0; }
    this.mti = N;
  }
  private initByArray(key: number[]) {
    this.initGenrand(19650218); const mt = this.mt; let i = 1, j = 0;
    for (let k = Math.max(N, key.length); k; k--) {
      const p = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(p, 1664525)) + key[j] + j) >>> 0; i++; j++;
      if (i >= N) { mt[0] = mt[N - 1]; i = 1; } if (j >= key.length) j = 0;
    }
    for (let k = N - 1; k; k--) {
      const p = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(p, 1566083941)) - i) >>> 0; i++;
      if (i >= N) { mt[0] = mt[N - 1]; i = 1; }
    }
    mt[0] = 0x80000000;
  }
  private genrand(): number {
    const mt = this.mt;
    if (this.mti >= N) {
      let kk = 0, y: number;
      for (; kk < N - M; kk++) { y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff); mt[kk] = mt[kk + M] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0); }
      for (; kk < N - 1; kk++) { y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff); mt[kk] = mt[kk + (M - N)] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0); }
      y = (mt[N - 1] & 0x80000000) | (mt[0] & 0x7fffffff); mt[N - 1] = mt[M - 1] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      this.mti = 0;
    }
    let y = mt[this.mti++];
    y ^= y >>> 11; y ^= (y << 7) & 0x9d2c5680; y ^= (y << 15) & 0xefc60000; y ^= y >>> 18;
    return y >>> 0;
  }
  /** [0, 1) with 53-bit resolution, same as CPython random_random(). */
  random(): number { const a = this.genrand() >>> 5, b = this.genrand() >>> 6; return (a * 67108864 + b) / 9007199254740992; }
  uniform(a: number, b: number): number { return a + (b - a) * this.random(); }
  normalvariate(mu: number, sigma: number): number {
    const NV = 4 * Math.exp(-0.5) / Math.sqrt(2);
    for (;;) { const u1 = this.random(), u2 = 1 - this.random(), z = NV * (u1 - 0.5) / u2; if (z * z / 4 <= -Math.log(u2)) return mu + z * sigma; }
  }
  lognormvariate(mu: number, sigma: number): number { return Math.exp(this.normalvariate(mu, sigma)); }
}
