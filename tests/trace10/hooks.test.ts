// QA-D-1110-TRACE10-G0 condition (c) / D-HOE-54: the 3 trace10 hooks in tests/bot-m5.ts are observe-only.
import { describe, it, expect } from 'vitest';
import { balance } from '../../src/config/balance';
import { run, PROFS, M5X_STACKS } from '../bot-m5';
import { SellerVariance, VAR_DEFAULT } from '../seller-variance';
import { varianceCursor } from './rngcursor';
import { canon } from './encode';

// Independent copy of the runner stream formula (bot-m5.ts `rng`, L37) to check the hooked values are R0's sequence in order.
const refRng = (seed: number) => { let a = (seed * 2654435761 + 99) >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const enc = (r: ReturnType<typeof run>) => canon({ ...r, final: r.final });
const SEED = 4, T = 1500, P = PROFS.optimal, K = M5X_STACKS.AssZ; // AssZ draws R (golden egg from F8)

describe('trace10 hooks in tests/bot-m5.ts are observe-only (G0 cond. c)', () => {
  it('onRunnerDraw: R calls R0 exactly once per draw, same values, same run', () => {
    const plain = run(balance, SEED, P, K, T);
    const draws: [number, number][] = [];
    const hooked = run(balance, SEED, P, K, T, { onRunnerDraw: (n, u) => { draws.push([n, u]); } });
    expect(enc(hooked)).toBe(enc(plain));
    expect(draws.length).toBeGreaterThan(0);
    const ref = refRng(SEED); draws.forEach(([n, u], k) => { expect(n).toBe(k + 1); expect(u).toBe(ref()); });
  }, 120_000);
  it('onRunnerDraw under CFG none: measured explicit 0 draws', () => {
    let n = 0; run(balance, SEED, P, M5X_STACKS.none, 600, { onRunnerDraw: () => { n++; } }); expect(n).toBe(0);
  }, 60_000);
  it('onVariance fires once, after construction and before the first method call', () => {
    let calls = 0, firstKind: string | null = null, atHook: unknown = null, traced = 0;
    const plain = run(balance, SEED, PROFS.seller15, M5X_STACKS.none, 600);
    const hooked = run(balance, SEED, PROFS.seller15, M5X_STACKS.none, 600, { onVariance: V => {
      calls++; atHook = varianceCursor(V); V.trace = k => { traced++; firstKind ??= k; }; } });
    expect(calls).toBe(1);
    expect(atHook).toEqual(varianceCursor(new SellerVariance(VAR_DEFAULT, SEED))); // constructor done, no method yet
    expect(firstKind).toBe('check'); expect(traced).toBeGreaterThan(0);          // first method = sellT checkInterval
    expect(enc(hooked)).toBe(enc(plain));
  }, 60_000);
  it('onTick: one step + one end per tick, clones only (mutating / freezing them has no effect)', () => {
    const plain = run(balance, SEED, P, M5X_STACKS.none, 300);
    const ph: string[] = [];
    const hooked = run(balance, SEED, P, M5X_STACKS.none, 300, { onTick: (phase, i, _t, s) => {
      ph.push(phase + i); (s as any).coinsCents = -1; s.customers.length = 0; (s.workers as any).market_hand = { energy: 0, cdS: 0 }; Object.freeze(s); } });
    expect(enc(hooked)).toBe(enc(plain));
    const n = 300 * balance.tickHz; expect(ph.length).toBe(2 * n);
    expect(ph.slice(0, 3)).toEqual(['step1', 'end1', 'step2']); expect(ph[ph.length - 1]).toBe('end' + n);
  }, 60_000);
});
