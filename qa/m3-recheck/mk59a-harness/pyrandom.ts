export class PyRandom { mt = new Uint32Array(624); i = 625;
  constructor(seed: number) { this.initByArray(seed); }
  initGen(s: number) { const mt = this.mt; mt[0] = s >>> 0; for (let i = 1; i < 624; i++) { const p = mt[i-1] ^ (mt[i-1] >>> 30); mt[i] = (Math.imul(1812433253, p) + i) >>> 0; } this.i = 624; }
  initByArray(seed: number) { // Python seeds an int via its 32-bit chunks
    const key: number[] = []; let n = BigInt(Math.abs(seed)); if (n === 0n) key.push(0); while (n > 0n) { key.push(Number(n & 0xffffffffn)); n >>= 32n; }
    this.initGen(19650218); const mt = this.mt; let i = 1, j = 0;
    for (let k = Math.max(624, key.length); k; k--) { const p = mt[i-1] ^ (mt[i-1] >>> 30); mt[i] = ((mt[i] ^ Math.imul(p, 1664525)) + key[j] + j) >>> 0; i++; j++; if (i >= 624) { mt[0] = mt[623]; i = 1; } if (j >= key.length) j = 0; }
    for (let k = 623; k; k--) { const p = mt[i-1] ^ (mt[i-1] >>> 30); mt[i] = ((mt[i] ^ Math.imul(p, 1566083941)) - i) >>> 0; i++; if (i >= 624) { mt[0] = mt[623]; i = 1; } }
    mt[0] = 0x80000000; this.i = 624; }
  u32() { const mt = this.mt; if (this.i >= 624) { for (let k = 0; k < 624; k++) { const y = (mt[k] & 0x80000000) | (mt[(k+1)%624] & 0x7fffffff); mt[k] = mt[(k+397)%624] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0); } this.i = 0; }
    let y = mt[this.i++]; y ^= y >>> 11; y ^= (y << 7) & 0x9d2c5680; y ^= (y << 15) & 0xefc60000; y ^= y >>> 18; return y >>> 0; }
  random() { const a = this.u32() >>> 5, c = this.u32() >>> 6; return (a * 67108864 + c) / 9007199254740992; }
  normal(mu: number, s: number) { const M = 4 * Math.exp(-0.5) / Math.sqrt(2); let z: number; for (;;) { const u1 = this.random(), u2 = 1 - this.random(); z = M * (u1 - 0.5) / u2; if (z * z / 4 <= -Math.log(u2)) break; } return mu + z * s; }
  lognorm(mu: number, s: number) { return Math.exp(this.normal(mu, s)); }
  uniform(a: number, c: number) { return a + (c - a) * this.random(); }
}
