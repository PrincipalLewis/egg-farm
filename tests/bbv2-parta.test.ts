// BBv2 Part A (spec v1.0.3 27e753d8 §2.1–2.4, §4; Card #12 4a154bb4 BBV2-AC1/2c/3/4/5/6/11). Flag m4.flags.bestBuyV2.
import { describe, it, expect } from 'vitest';
import { options, paybackOf, meaningfulKeys, bestPaybackAmong, rankable, bbv2Mark, BUY_ORDER, type BuyKey } from '../src/econ/best-buy';
import { PickHysteresis, DualPicker, allScorer, type Scorer } from '../src/ui/pick-hysteresis';
import { highlightPick } from '../src/ui/tracks-ui';
import { selectGoal } from '../src/ui/next-goal';
import { pickM4All, M1_KEYS } from './bot-m4';
import { bal, ON, OFF, fx, ALLW, L17, BB1, TIE } from './bbv2-fixtures';
import type { GameState } from '../src/sim/state';

const ROWKEY = { farm: 'FARM', hens: 'HENS', eggValue: 'VALUE' } as const;
const BOTKEY = { f: 'FARM', c: 'COLL', hens: 'HENS', eggValue: 'VALUE', W1: 'W1', W2: 'W2', W3: 'W3', W4: 'W4' } as const;
const affFirst = (s: GameState, b = ON) => { const o = options(s, b), a = o.filter(x => s.coinsCents >= Math.round(x.cost * 100)).map(x => x.key); return a.length ? a : o.map(x => x.key); };
/** Every pick path of spec §1 (+ the ★) on one state, flag on. */
function paths(s: GameState, b = ON) {
  const d = new DualPicker().tick(s, b, 0), hp = highlightPick(s, b), g = selectGoal(s, b, 100), bot = pickM4All(s, b, [...M1_KEYS, 'W1', 'W2', 'W3', 'W4']);
  return { bpa: bestPaybackAmong(s, b, affFirst(s, b))?.key ?? null, hint: d.hint?.key ?? null, highlight: d.highlight?.key ?? null,
    tracks: hp ? ROWKEY[hp.row] : null, goal: g.key, bot: bot ? BOTKEY[bot] : null, mark: bbv2Mark(d.hint, s, b) };
}
/** Generated grid: Farm 3..29, Collection / tracks around it, workers none / all, coins 0 / short / rich. */
function* grid() {
  for (let F = 3; F <= 29; F += 2) for (const dc of [-6, -2, 0, 3]) for (const dh of [-1, 1]) for (const w of [0, 1]) for (const coins of [0, 2e5, 5e6, 1e9]) {
    const C = Math.max(0, Math.min(30, F + dc)), H = Math.max(0, Math.min(30, F + dh)), V = Math.max(0, Math.min(30, F + dh - 1));
    yield fx(F, H, V, C, { ...(w ? ALLW : {}), coinsCents: coins });
  }
}

describe('BBV2-AC1 [B] zero-gain never ranked while a meaningful row is offered (all §1 paths + ★)', () => {
  it('generated grid: hint, highlight, next-goal, tracks highlight, bestPaybackAmong, bot pick and ★ are meaningful (0 violations)', () => {
    let n = 0, offFlagged = 0; const bad: string[] = [];
    for (const s of grid()) {
      const M = meaningfulKeys(s, ON); if (!M.size) continue; n++;
      for (const [k, v] of Object.entries(paths(s))) if (v !== null && !M.has(v as BuyKey)) bad.push(`F${s.farmLevel} C${s.collectionLevel} $${s.coinsCents / 100} ${k}=${v}`);
      const off = paths(s, OFF); if (Object.values(off).some(v => v !== null && !M.has(v as BuyKey))) offFlagged++;
    }
    expect(bad).toEqual([]); expect(n).toBeGreaterThan(300);
    expect(offFlagged, 'non-vacuity: the flag-off pickers do rank zero-gain rows on this grid').toBeGreaterThan(0);
  });
  it.each(Object.keys(BB1))('fixture %s at $0 / $3,000 / $37,300 / rich: same property', (name) => {
    for (const c of [0, 3e5, 3.73e6, 1e10]) {
      const s = BB1[name as keyof typeof BB1](c), M = meaningfulKeys(s, ON); expect(M.size).toBeGreaterThan(0);
      for (const [k, v] of Object.entries(paths(s))) if (v !== null) expect(M.has(v as BuyKey), `${name} $${c / 100} ${k}=${v}`).toBe(true);
    }
  });
});

describe('BBV2-AC2 (c) / BBV2-AC3 [B] hysteresis never protects a zero-gain pick', () => {
  it('FX-L17 at $3,000: flag off shows COLL (the C4 lock); the same picker under flag on switches to FARM on the next evaluate, no 2 s hold', () => {
    const s = L17(3e5); expect(meaningfulKeys(s, ON).has('COLL'), 'precondition: COLL zero-gain at FX-L17').toBe(false);
    const p = new PickHysteresis(allScorer); expect(p.evaluate(s, OFF, 1000)?.key).toBe('COLL');
    const q = p.evaluate(s, ON, 1001); expect(q?.key).toBe('FARM'); expect(q?.affordable).toBe(false);
    expect(bbv2Mark(q, s, ON)).toBeNull();
  });
  it('FX-L17 at $37,300: hint = highlight = FARM, ★ FARM (BB-AC2 (a), unit)', () => {
    const s = L17(3.73e6), d = new DualPicker().tick(s, ON, 0);
    expect(d.hint?.key).toBe('FARM'); expect(d.highlight?.key).toBe('FARM'); expect(bbv2Mark(d.hint, s, ON)).toBe('FARM');
  });
  it('generated: every state where the flag-off picker shows a zero-gain pick and a meaningful row is offered drops it on the next evaluate (100%)', () => {
    let cases = 0;
    for (const s of grid()) {
      const M = meaningfulKeys(s, ON); if (!M.size) continue;
      const p = new PickHysteresis(allScorer), k = p.evaluate(s, OFF, 0)?.key; if (!k || M.has(k)) continue;
      cases++; const q = p.evaluate(s, ON, 1); expect(q && M.has(q.key), `F${s.farmLevel} C${s.collectionLevel} ${k}→${q?.key}`).toBe(true);
    }
    expect(cases).toBeGreaterThan(0);
  });
});

describe('BBV2-AC4 [B] ∞-tie: FARM, then BUY_ORDER; cost never decides an ∞-tie', () => {
  it.each(Object.keys(TIE))('FX-TIE %s (reachable on the rc/v5 CSV): all ranked paybacks ∞; bestPaybackAmong = hint = highlight = bot = FARM; unaffordable strip = Farm countdown, no ★', (n) => {
    const s = TIE[n as keyof typeof TIE](), ks = rankable(s, ON, options(s, ON).map(o => o.key));
    for (const k of ks) expect(paybackOf(s, ON, k), `precondition ${k} ∞`).toBe(Infinity);
    const p = paths(s); expect([p.bpa, p.hint, p.highlight]).toEqual(['FARM', 'FARM', 'FARM']);
    expect(pickM4All({ ...s, coinsCents: 1e12 }, ON, M1_KEYS)).toBe('f');
    const g = selectGoal(s, ON, 100, p.hint as any, p.mark as any); expect(g.key).toBe('FARM'); expect(g.state).toBe('waiting'); expect(p.mark).toBeNull();
  });
  it('unit (constructed scorer): ∞ FARM vs a cheaper ∞ row: flag on FARM, flag off the cheaper row; finite ties keep lower cost', () => {
    const rows = (a: [BuyKey, number, number][]): Scorer => () => a.map(([key, costCents, payback]) => ({ key, costCents, payback, level: 0 }));
    const s = fx(29, 30, 30, 22, { coinsCents: 1e12 });
    expect(new PickHysteresis(rows([['W1', 10, Infinity], ['FARM', 100, Infinity]])).evaluate(s, ON, 0)?.key).toBe('FARM');
    expect(new PickHysteresis(rows([['W1', 10, Infinity], ['FARM', 100, Infinity]])).evaluate(s, OFF, 0)?.key).toBe('W1');
    expect(new PickHysteresis(rows([['W2', 10, Infinity], ['W1', 100, Infinity]])).evaluate(s, ON, 0)?.key).toBe('W1'); // BUY_ORDER
    expect(new PickHysteresis(rows([['W1', 10, 50], ['FARM', 100, 50]])).evaluate(s, ON, 0)?.key).toBe('W1'); // finite: cost
    expect(BUY_ORDER[0]).toBe('FARM');
  });
});

describe('BBV2-AC5 [B] dead zone: no affordable meaningful row -> best meaningful row, countdown, no ★', () => {
  it('FX-L17 at $3,000 (COLL affordable, zero-gain): strip targets FARM (best meaningful payback), waiting, no ★; flag off targets COLL', () => {
    const s = L17(3e5), d = new DualPicker().tick(s, ON, 0), mark = bbv2Mark(d.hint, s, ON);
    const g = selectGoal(s, ON, 100, d.hint?.key as any, mark as any);
    expect(g.key).toBe('FARM'); expect(g.state).toBe('waiting'); expect(g.status).toMatch(/^~/); expect(mark).toBeNull();
    expect(selectGoal(s, ON, 100).key).toBe('FARM'); // stateless path agrees
    expect(selectGoal(s, OFF, 100).key).toBe('COLL');
  });
  it('after Farm L30 (no meaningful row offered, zeroGainUi = 0 test config): a zero-gain target is allowed, never ★', () => {
    const s = fx(30, 30, 30, 22, { ...ALLW, coinsCents: 1e12 }); expect(meaningfulKeys(s, ON).size).toBe(0);
    const d = new DualPicker().tick(s, ON, 0); expect(d.hint?.key).toBe('COLL'); expect(bbv2Mark(d.hint, s, ON)).toBeNull();
  });
});

describe('BBV2-AC6 [B] Max-for-this-farm / capped tracks / R11 rows are never candidates', () => {
  it('options() keys are BuyKeys only; a capped or MAX track is never ranked, flag on', () => {
    for (const s of grid()) { const ks = options(s, ON).map(o => o.key); for (const k of ks) expect(BUY_ORDER).toContain(k); }
    const capped = fx(10, 30, 30, 10, { coinsCents: 1e12 }); const p = paths(capped);
    expect([p.hint, p.highlight, p.tracks, p.goal, p.mark]).not.toContain('HENS'); expect([p.hint, p.highlight, p.tracks, p.goal, p.mark]).not.toContain('VALUE');
  });
});

describe('BBV2-AC11 [B] flag 0 = pre-BBv2 behaviour', () => {
  it('rankable is the identity and bestPaybackAmong / DualPicker / selectGoal / highlightPick equal m4.flags.bestBuyV2 absent', () => {
    const { bestBuyV2: _x, ...noKey } = OFF.m4!.flags as any; const ABSENT = { ...OFF, m4: { ...OFF.m4!, flags: noKey } } as any;
    for (const s of grid()) {
      const ks = options(s, OFF).map(o => o.key); expect(rankable(s, OFF, ks)).toEqual(ks);
      expect(paths(s, OFF)).toEqual(paths(s, ABSENT));
    }
    expect(bal(1, { enabled: 0 }).m4!.flags.bestBuyV2).toBe(1); // m4 off: the flag is inert
    const s = L17(3e5); expect(paths(s, bal(1, { enabled: 0 }))).toEqual(paths(s, bal(0, { enabled: 0 })));
  });
});
