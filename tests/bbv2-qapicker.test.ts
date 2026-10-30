// @vitest-environment jsdom
// SG-12 qaPicker (stopgap v1.2.6 fdc1c199 SG-12) as reused by BBv2 (spec v1.0.3 27e753d8 §6, PMFU BB12; Card #12 4a154bb4):
// BBV2-AC15 (fields, read-only), BBV2-AC2 (a)/(b) jsdom analog (the browser run on the RC dist is QA's), mark = the rendered ★,
// suppressed rules (BBV2-AC14 support).
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { Game } from '../src/game';
import { mem } from './helpers';
import { meaningfulKeys } from '../src/econ/best-buy';
import { bal, ON, OFF, fx, ALLW, L17, BB1 } from './bbv2-fixtures';
import type { Balance } from '../src/config/balance';

let t = 1000;
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (Element.prototype as any).scrollIntoView ??= function () { /* jsdom */ };
  (Element.prototype as any).animate ??= function () { return { cancel() {}, finished: Promise.resolve(), onfinish: null }; };
  vi.spyOn(performance, 'now').mockImplementation(() => t);
});
afterEach(() => { document.body.innerHTML = ''; localStorage.clear(); });
async function mount(state: object, bal: Balance, tab = 'farm') {
  const g = new Game(bal, mem() as any, () => 1760000000000 + t, 1, 'test'); g.state = { ...g.state, ...state } as any;
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui: any = mountApp(document.getElementById('app')!, g, bal, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  document.getElementById('modal-layer')?.classList.remove('open');
  ui.openPanel('upgrades'); (document.querySelector(`[data-tab=${tab}]`) as HTMLElement)?.click(); ui.render(); ui.render();
  return { g, ui };
}
const FIELDS = ['v', 't', 'm4', 'hint', 'hintRaw', 'highlight', 'mark', 'suppressed', 'heldMs', 'evals', 'changes', 'history'];
const chip = () => document.querySelector<HTMLElement>('[data-best-buy]')?.dataset.bestBuy ?? null;
const stripStar = () => /★/.test(document.querySelector('#goal')!.textContent!);
/** The strip ★ template exists only for the F4 targets HENS / VALUE / COLL (goalLabelParts); FARM / workers strips have none. */
const F4 = (k?: string | null) => k === 'HENS' || k === 'VALUE' || k === 'COLL';

describe('BBV2-AC15 [B] qaPicker v1 fields unchanged with the flag on; read-only', () => {
  it.each([['bestBuyV2 0', OFF], ['bestBuyV2 1', ON]])('%s: exactly the SG-12 field names and types (pick = key/affordable/costCents/payback)', async (_n, b) => {
    const { ui } = await mount(L17(3.73e6), b); const q = ui.qaPicker();
    expect(Object.keys(q)).toEqual(FIELDS); expect(q.v).toBe(1); expect(typeof q.t).toBe('number'); expect(q.m4).toBe(true);
    for (const k of ['hint', 'hintRaw', 'highlight']) if (q[k]) expect(Object.keys(q[k])).toEqual(['key', 'affordable', 'costCents', 'payback']);
    expect(typeof q.suppressed).toBe('boolean'); expect(typeof q.heldMs).toBe('number'); expect(typeof q.evals).toBe('number');
    expect(q.history.length).toBe(1); expect(Object.keys(q.history[0])).toEqual(['t', 'key', 'affordable', 'mark']); // load counts as one
    expect(JSON.parse(JSON.stringify(q))).toEqual(q);
  });
  it('payback Infinity serialises as "Infinity"; history is a 32-entry ring; heldMs counts from the last key change', async () => {
    const { g, ui } = await mount(fx(29, 30, 30, 22, { ...ALLW, coinsCents: 0 }), ON);
    expect(ui.qaPicker().hint.payback).toBe('Infinity');
    for (let i = 0; i < 40; i++) { t += 100; g.state = { ...g.state, coinsCents: i % 2 ? 1e12 : 0 }; ui.render(); }
    const q = ui.qaPicker(); expect(q.history.length).toBe(32); expect(q.history[0].t).toBeLessThan(q.history[31].t);
    expect(q.history.every((h: any) => h.key === q.hint.key)).toBe(true); // only affordable flips: the key never changed
    expect(q.heldMs).toBe(4000); // counts from load (t 1000 -> 5000), not capped by the overflowed ring
  });
  it('1,000 calls between frames change no game state, no DOM, no picker evals, no telemetry', async () => {
    const { g, ui } = await mount(L17(3e5), ON); const st = JSON.stringify(g.state), dom = document.body.innerHTML, ev = g.telemetry.events().length, e0 = ui.qaPicker().evals;
    for (let i = 0; i < 1000; i++) ui.qaPicker();
    expect(JSON.stringify(g.state)).toBe(st); expect(document.body.innerHTML).toBe(dom); expect(g.telemetry.events().length).toBe(ev); expect(ui.qaPicker().evals).toBe(e0);
  });
  it('release build lists qaPicker in check-release-build (the gate fails if the string is in dist)', () => {
    expect(readFileSync(`${process.cwd()}/scripts/check-release-build.mjs`, 'utf8')).toMatch(/'qaPicker'/);
  });
});

describe('PMFU BB12: mark is the exact ★ the chip and the strip render; suppressed = hint !== null && mark === null', () => {
  const cases: [string, object, string][] = [['L17 $37,300', L17(3.73e6), 'farm'], ['L17 $3,000', L17(3e5), 'farm'], ['L17 $3,000 coll tab', L17(3e5), 'collection'],
    ...Object.entries(BB1).map(([n, f]) => [n, f(5e6), 'farm'] as [string, object, string]), ['post-L30', fx(30, 30, 30, 22, { ...ALLW, coinsCents: 1e12 }), 'collection']];
  it.each([['bestBuyV2 0', OFF], ['bestBuyV2 1', ON]])('%s: chip key = mark; strip ★ iff mark; suppressed per the rule', async (_n, b) => {
    for (const [name, s, tab] of cases) {
      const { ui } = await mount(s, b, tab); const q = ui.qaPicker();
      expect(chip() === null || chip() === q.mark, `${name} chip ${chip()} mark ${q.mark}`).toBe(true); // the visible row's chip names mark
      if (q.mark === null) expect(chip(), name).toBeNull();
      expect(stripStar(), name).toBe(q.mark !== null && F4(q.hint?.key) && q.mark === q.hint?.key);
      expect(q.suppressed, name).toBe(q.hint !== null && q.mark === null);
    }
  });
  it('bestBuyV2 0: mark = single-arg bestBuyMark = hint key when affordable; suppressed never with an affordable hint (no stopgap, D-HOE-33)', async () => {
    for (const [name, s, tab] of cases) { const { ui } = await mount(s, OFF, tab); const q = ui.qaPicker();
      expect(q.mark, name).toBe(q.hint?.affordable ? q.hint.key : null); expect(q.suppressed && q.hint?.affordable, name).toBeFalsy(); }
  });
  it('bestBuyV2 1: suppressed (with an affordable hint) only in the inert mark-null net = no meaningful row offered (after L30)', async () => {
    for (const [name, s, tab] of cases) { const { g, ui } = await mount(s, ON, tab); const q = ui.qaPicker();
      if (q.suppressed && q.hint?.affordable) expect(meaningfulKeys(g.state, ON).size, name).toBe(0); }
  });
  // NOTE (open Q to PMFU/HoQA): the literal SG-12 formula is also true for an UNAFFORDABLE hint (single-arg bestBuyMark = null),
  // e.g. FX-L17 $3,000 hint FARM affordable:false at either flag value. The ship-config assertion is therefore on the stopgap state
  // = an affordable hint whose ★ was nulled.
  it('ship config (bestBuyV2 1 + zeroGainUi 1), below Farm L30: never an affordable hint with a null ★ (fixtures + a 240 s FX-L17 run; post-L30 needs the #97 ZG filter)', async () => {
    const SHIP = bal(1, { zeroGainUi: 1 }), nulled = (q: any) => q.suppressed && q.hint?.affordable;
    for (const [name, s, tab] of cases.filter(c => c[0] !== 'post-L30')) { const { ui } = await mount(s, SHIP, tab); expect(nulled(ui.qaPicker()), name).toBeFalsy(); }
    const { g, ui } = await mount(L17(3e5), SHIP);
    for (let i = 0; i < 2400; i++) { t += 100; g.frame(); ui.render(); expect(nulled(ui.qaPicker())).toBeFalsy(); }
  });
});

describe('BBV2-AC2 (a)/(b) jsdom analog on FX-L17 (DOM/page.clock checks on the RC dist and build:qa are QA browser runs)', () => {
  it('(a) $37,300: first frame hint = mark = FARM, chip [data-best-buy=FARM], strip ★ on Farm', async () => {
    const { ui } = await mount(L17(3.73e6), ON); const q = ui.qaPicker();
    expect(q.hint.key).toBe('FARM'); expect(q.mark).toBe('FARM'); expect(chip()).toBe('FARM');
    expect(stripStar()).toBe(false); // OPEN Q (PMFU): the FARM strip has no ★ template on rc/v5 (F4 targets only), so "strip ★ on Farm" can't render
  });
  it('(b) $3,000 + 240 s sim, no buy input: no history entry with key or mark COLL; every non-null mark meaningful; hint starts FARM unaffordable/null; at >= $37,300 hint = mark = FARM', async () => {
    const { g, ui } = await mount(L17(3e5), ON); const q0 = ui.qaPicker();
    expect(q0.hint).toMatchObject({ key: 'FARM', affordable: false }); expect(q0.mark).toBeNull();
    const seen: any[] = [];
    for (let i = 0; i < 2400; i++) { t += 100; g.frame(); ui.render(); const q = ui.qaPicker(); seen.push(...q.history);
      if (q.mark) expect(meaningfulKeys(g.state, ON).has(q.mark), `mark ${q.mark}`).toBe(true);
      if (g.state.coinsCents >= 3.73e6) { expect(q.hint.key).toBe('FARM'); expect(q.mark).toBe('FARM'); } }
    expect(seen.some(h => h.key === 'COLL' || h.mark === 'COLL')).toBe(false);
    // flag-off control: the same run shows COLL (the SG-3 known limit) -> the test is not vacuous
    const { g: g0, ui: u0 } = await mount(L17(3e5), OFF); expect(u0.qaPicker().hint.key).toBe('COLL'); void g0;
  });
});
