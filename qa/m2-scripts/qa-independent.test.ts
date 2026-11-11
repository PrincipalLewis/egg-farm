// QA independent checks (Head of QA, m2-rc1 pass). Not part of the engineering suite.
import { describe, it, expect } from 'vitest';
import { balance as b, validateBalance } from '../src/config/balance';
import { initialState, GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { mood } from '../src/sim/workers';
import { migrate, SAVE_VERSION } from '../src/save/save';
import { manageAllHtml } from '../src/ui/workers-ui';
const run = (s: GameState, secs: number, ev: any[] = []) => { for (let i = 0; i < Math.round(secs * b.tickHz); i++) s = step(s, 1 / b.tickHz, b, ev); return s; };
const base = (o: Partial<GameState> = {}): GameState => ({ ...initialState(b, 7), farmLevel: 10, collectionLevel: 3, nextCustomerInS: 1e9, ...o });
const wk = (energy: number, unpaid = false) => ({ energy, cdS: 0, ...(unpaid ? { unpaid } : {}) });
const tick1 = (s: GameState) => step(s, 1 / b.tickHz, b, []);
describe('QA independent', () => {
  it('E-1 drain timeline (hawker: no wage)', () => {
    let s = base({ workers: { hawker: wk(100) } });
    s = run(s, 630); expect(mood(s.workers.hawker!, b)).toBe('working');
    s = run(s, 9.2); expect(mood(s.workers.hawker!, b)).toBe('tired');
    s = run(s, 900 - 639.2 + 0.2); expect(mood(s.workers.hawker!, b)).toBe('asleep');
  });
  it('U-1 Unpaid no drain, no wage', () => {
    let s = base({ coinsCents: 100, workers: { market_hand: wk(70, true) } }); s = run(s, 300);
    expect(s.workers.market_hand!.energy).toBe(70); expect(s.workers.market_hand!.unpaid).toBe(true); expect(s.coinsCents).toBe(100);
  });
  it('W1-6 goes Unpaid at $1.00 F10 and coins never negative', () => {
    let s = base({ coinsCents: 1, workers: { market_hand: wk(100) } }); s = run(s, 5);
    expect(s.workers.market_hand!.unpaid).toBe(true); expect(s.coinsCents).toBeGreaterThanOrEqual(0);
  });
  it('U-2 Manage on Unpaid refills, stays Unpaid, starts cooldown', () => {
    const s = apply(base({ coinsCents: 0, workers: { market_hand: wk(20, true) } }), { type: 'manage', worker: 'market_hand' }, b);
    expect(s.workers.market_hand).toMatchObject({ energy: 100, unpaid: true }); expect(s.manageCdS).toBe(30);
  });
  it('U-3 Grader tier buy keeps energy', () => {
    const s = apply(base({ farmLevel: 19, coinsCents: 10_000_000, graderTier: 1, workers: { grader: wk(37) } }), { type: 'buyGraderTier' }, b);
    expect(s.graderTier).toBe(2); expect(s.workers.grader!.energy).toBe(37);
  });
  const both = (c: number) => tick1(base({ coinsCents: c, workers: { market_hand: wk(80, true), coop_hand: wk(80, true) } }));
  it.each([[249, true, true], [499, false, true], [600, false, true], [749, false, true], [750, false, false]])('U-5 both Unpaid at $%i c', (c, w1u, w2u) => {
    const s = both(c); expect(!!s.workers.market_hand!.unpaid).toBe(w1u); expect(!!s.workers.coop_hand!.unpaid).toBe(w2u);
  });
  it.each([[500, true], [749, true], [750, false]])('R9 W1 paid, W2 Unpaid, $%i c', (c, w2u) => {
    const s = tick1(base({ coinsCents: c, workers: { market_hand: wk(80), coop_hand: wk(80, true) } }));
    expect(!!s.workers.coop_hand!.unpaid).toBe(w2u);
  });
  it('R9 Market Hand Asleep (paid) + Coop Hand Unpaid, $5.00 at F10 -> Coop Hand resumes', () => {
    const s = tick1(base({ coinsCents: 500, workers: { market_hand: wk(0), coop_hand: wk(80, true) } }));
    expect(mood(s.workers.market_hand!, b)).toBe('asleep'); expect(!!s.workers.coop_hand!.unpaid).toBe(false);
    expect(!!tick1(base({ coinsCents: 499, workers: { market_hand: wk(0), coop_hand: wk(80, true) } })).workers.coop_hand!.unpaid).toBe(true);
  });
  it('E-3 global cooldown 29.9 rejected / 30.0 accepted', () => {
    let s = apply(base({ workers: { hawker: wk(30), grader: wk(30) }, graderTier: 1 }), { type: 'manage', worker: 'hawker' }, b); // P4: Manage only <= 40%
    let a = run(s, 29.9); expect(apply(a, { type: 'manage', worker: 'grader' }, b).workers.grader!.energy).toBeLessThan(100);
    a = run(s, 30.05); expect(apply(a, { type: 'manage', worker: 'grader' }, b).workers.grader!.energy).toBe(100);
  });
  it('U-4 all full: hidden (B5: N=0), no cooldown; 99% not counted; <3 hidden', () => {
    const full = base({ workers: { hawker: wk(100), grader: wk(100), market_hand: wk(100) }, graderTier: 1 });
    expect(apply(full, { type: 'manageAll' }, b).manageCdS).toBe(0);
    expect(manageAllHtml(full, b)).toBe(''); // B5 (Product, Oct 15): hidden when N (<= manage_prompt_threshold) is 0
    const one = { ...full, workers: { ...full.workers, hawker: wk(99) } }; expect(apply(one, { type: 'manageAll' }, b).manageCdS).toBe(0); // P4: nobody <= 40% -> no-op
    expect(manageAllHtml(base({ workers: { hawker: wk(10), grader: wk(10) } }), b)).toBe('');
    expect(manageAllHtml(one, b)).toBe(''); // 99% is above 40%: N=0
    const low = { ...full, workers: { ...full.workers, hawker: wk(40) } }; expect(manageAllHtml(low, b)).toContain('(1 need it)');
    const la = apply(low, { type: 'manageAll' }, b); expect(la.manageCdS).toBe(30); expect(la.workers.hawker!.energy).toBe(100);
    expect(manageAllHtml(la, b)).toContain('aria-disabled="true"'); // PT1-10: greyed during cooldown
    const cd = { ...low, manageCdS: 12 }; expect(manageAllHtml(cd, b)).toContain('0:12');
  });
  it('OFF-4 v4 save migrates to v5 with no workers', () => {
    const st: any = { ...initialState(b) }; delete st.workers; delete st.graderTier; delete st.manageCdS;
    const f = migrate({ version: 4, savedAt: 1, state: st }, b);
    expect(f.version).toBe(SAVE_VERSION); expect(SAVE_VERSION).toBe(5); expect(f.state.workers).toEqual({}); expect(f.state.graderTier).toBe(0);
  });
  it('hooks: off by default, rejected in prod', () => {
    expect((b as any).sim_test).toBeUndefined();
    expect(() => validateBalance({ ...b, sim_test: { demand_scale: 0.75 } } as any, true)).toThrow();
  });
});
