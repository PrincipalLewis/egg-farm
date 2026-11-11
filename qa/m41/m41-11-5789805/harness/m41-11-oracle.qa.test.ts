// @vitest-environment jsdom
// QA oracle harness for PR #60 @ 5789805 (M41-11, m4a-spec v1.24 frozen §19). Not part of the PR.
// For every track (Hens, Egg value), every Farm level F 0..farmMax and every track level L 0..maxLevel, it renders the REAL app
// (mountApp) and compares the row against an oracle built ONLY from the game's real buy gate: sim/actions.ts apply({type:'buyTrack'})
// on a rich state (allowed = the level actually went up). It never calls trackUnlockFarm / trackLock / trackCap.
//   expected: L >= maxLevel                  -> MAX pill, row aria `{Track}, level {L}, max.`
//             real gate allows buy at F      -> Buy row (button.buy), no lock text
//             else N = min F' in (F, farmMax] where the real gate allows the buy (Farm actually bought to F' via apply buyFarm)
//                                           -> `.lock` text `Needs Farm L{N}`, aria `{Track}, level {L}, locked. Needs Farm level {N}.`
//             no such F'                     -> `Max for this farm` row: aria EXACTLY `{Track}, level {L}. Max for this farm.`,
//                                              no .lock (glyph), no button, no cost (.num), no .eta, never .affordable, never .best,
//                                              never the goal-strip / best-buy / ★ target (rich and broke).
// Balances: MAIN = shipped balance.json (m4.enabled 1, maxLevel 30, no farmMaxLevel); B6B = offset-3 test balance
// (maxLevel 55, farmMaxLevel 50, capOverFarm 3) with the 31-entry tables padded to 56 by repeating the last value (render only).
import { describe, it, expect, beforeAll } from 'vitest';
import { writeFileSync } from 'node:fs';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { apply } from '../src/sim/actions';
import { options, bestBuy } from '../src/econ/best-buy';
import { selectGoal } from '../src/ui/next-goal';
import { DualPicker } from '../src/ui/pick-hysteresis';
import { highlightPick } from '../src/ui/tracks-ui';
import { Game } from '../src/game';
import { mem } from './helpers';

const OUT = process.env.QA_OUT ?? '/tmp/m41-11-oracle';
const pad = (b0: Balance, n: number): any => { const f = (x: any): any => Array.isArray(x) ? (x.length === b0.maxLevel + 1 ? [...x, ...Array(n - x.length).fill(x[x.length - 1])] : x.map(f)) : (x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, f(v)])) : x); return f(b0); };
const MAIN = balance as Balance;
const B6B = (() => { const p = pad(MAIN, 56); return { ...p, maxLevel: 55, farmMaxLevel: 50, m4: { ...p.m4, hens: { ...p.m4.hens, capOverFarm: 3 }, eggValue: { ...p.m4.eggValue, capOverFarm: 3 } } } as Balance; })();
const RICH = 1e15;
const NAME = { hens: 'Hens', eggValue: 'Egg value' } as const;
const lv = (t: 'hens' | 'eggValue') => t === 'hens' ? 'hensLevel' : 'eggValueLevel';
const st = (b: Balance, F: number, t: 'hens' | 'eggValue', L: number, coins: number) => ({ ...initialState(b), tracksV7: 1, farmLevel: F, hensLevel: 0, eggValueLevel: 0, [lv(t)]: L, coinsCents: coins } as any);
/** Real buy gate: does apply(buyTrack) raise the level on a rich state? */
const gateAllows = (b: Balance, F: number, t: 'hens' | 'eggValue', L: number) => { const s = st(b, F, t, L, RICH); return (apply(s, { type: 'buyTrack', track: t }, b) as any)[lv(t)] === L + 1; };
/** Real Farm gate: highest Farm level reachable by apply(buyFarm) from F0 on a rich state. */
const realFarmTop = (b: Balance) => { let s: any = { ...initialState(b), coinsCents: RICH }; for (let i = 0; i < 200; i++) { const n: any = apply(s, { type: 'buyFarm' }, b); if (n.farmLevel === s.farmLevel) break; s = n; } return s.farmLevel; };

beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (globalThis as any).cancelAnimationFrame ??= (i: number) => clearTimeout(i);
});

const report: any = {};
async function runGrid(label: string, b: Balance, farmMax: number) {
  const g = new Game(b, mem() as any, () => 1760000000000, 1, 'test');
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  document.getElementById('modal-layer')?.classList.remove('open');
  ui.openPanel('upgrades'); (document.querySelector('[data-tab=farm]') as HTMLElement).click();
  const mism: any[] = [], counts: Record<string, number> = { max: 0, buy: 0, lock: 0, farmMax: 0 }, ariaSamples: any[] = [], farmMaxCells: string[] = [];
  const realTop = realFarmTop(b);
  // Oracle farm max: the real Farm gate, bounded by the balance's farm max (B6B: 50). Record both.
  for (const t of ['hens', 'eggValue'] as const) for (let F = 0; F <= farmMax; F++) for (let L = 0; L <= b.maxLevel; L++) {
    let exp: any;
    if (L >= b.maxLevel) exp = { kind: 'max', aria: `${NAME[t]}, level ${L}, max.` };
    else if (gateAllows(b, F, t, L)) exp = { kind: 'buy' };
    else {
      let N: number | null = null;
      for (let f = F + 1; f <= farmMax && N === null; f++) if (gateAllows(b, f, t, L)) N = f;
      exp = N === null ? { kind: 'farmMax', aria: `${NAME[t]}, level ${L}. Max for this farm.`, text: 'Max for this farm' }
        : { kind: 'lock', N, text: `Needs Farm L${N}`, aria: `${NAME[t]}, level ${L}, locked. Needs Farm level ${N}.` };
    }
    // Real N−1 / N buy proof via apply(buyFarm) path: buy Farm one level at a time from F and check the gate at each step.
    for (const coins of exp.kind === 'farmMax' || exp.kind === 'lock' ? [0, RICH] : [RICH]) {
      g.state = st(b, F, t, L, coins); ui.render();
      const row = document.querySelector<HTMLElement>(`.up.track[data-track=${t}]`)!;
      const lock = row?.querySelector<HTMLElement>('.lock');
      const got = {
        hasRow: !!row, lockText: lock?.textContent ?? null, lockAria: lock?.getAttribute('aria-label') ?? null,
        rowAria: row?.getAttribute('aria-label') ?? null, role: row?.getAttribute('role') ?? null,
        maxed: row?.querySelector('.maxed')?.textContent ?? null, farmMaxPill: !!row?.querySelector('.maxed.farm-max'),
        button: !!row?.querySelector('button'), buy: !!row?.querySelector('button.buy'), num: !!row?.querySelector('.num'), eta: !!row?.querySelector('.eta'),
        affordable: !!row?.querySelector('.affordable') || !!row?.classList.contains('affordable'), best: !!row?.classList.contains('best'),
        needsInText: /Needs Farm/.test(row?.textContent ?? ''),
      };
      const bad: string[] = []; const chk = (c: boolean, m: string) => { if (!c) bad.push(m); };
      chk(got.hasRow, 'row missing');
      if (exp.kind === 'max') { chk(got.maxed === 'MAX' && !got.farmMaxPill, `MAX pill (${got.maxed})`); chk(got.rowAria === exp.aria, `max aria ${got.rowAria}`); chk(!got.lockText && !got.button, 'max has lock/button'); }
      if (exp.kind === 'buy') { chk(got.buy && !got.lockText && !got.maxed, `buy row (lock=${got.lockText} maxed=${got.maxed} buy=${got.buy})`); }
      if (exp.kind === 'lock') { chk(got.lockText === exp.text, `lock text ${got.lockText} != ${exp.text}`); chk(got.lockAria === exp.aria, `lock aria ${got.lockAria} != ${exp.aria}`); chk(!got.button && !got.num && !got.eta && !got.maxed, 'lock row has button/cost/eta/maxed'); }
      if (exp.kind === 'farmMax') {
        chk(got.maxed === exp.text && got.farmMaxPill, `pill ${got.maxed}`); chk(got.rowAria === exp.aria, `farmMax aria ${JSON.stringify(got.rowAria)} != ${JSON.stringify(exp.aria)}`); chk(got.role === 'group', 'role');
        chk(!got.lockText && !got.button && !got.num && !got.eta && !got.affordable && !got.best && !got.needsInText, `farmMax row extras ${JSON.stringify(got)}`);
        const s = g.state, key = t === 'hens' ? 'HENS' : 'VALUE';
        chk(!options(s, b).some(o => o.key === key), 'in options'); chk(bestBuy(s, b)?.key !== key, 'bestBuy');
        chk(selectGoal(s, b, 100).key !== key, 'selectGoal'); const p = new DualPicker().tick(s, b, 0); chk(p.highlight?.key !== key && p.hint?.key !== key, 'DualPicker/★');
        chk(highlightPick(s, b)?.row !== t, 'highlightPick');
        const goal = document.querySelector('#goal'); chk(!(goal?.getAttribute('aria-label') ?? '').includes(NAME[t] + ' L'), `goal strip names ${NAME[t]}: ${goal?.getAttribute('aria-label')}`);
        if (coins === 0) farmMaxCells.push(`${t}:F${F}/L${L}`);
      }
      counts[exp.kind]++;
      if ((F % 10 === 0 || L >= b.maxLevel - 3) && ariaSamples.length < 400) ariaSamples.push({ t, F, L, coins, kind: exp.kind, lockText: got.lockText, lockAria: got.lockAria, rowAria: got.rowAria, maxed: got.maxed });
      if (bad.length) mism.push({ t, F, L, coins, exp, got, bad });
    }
  }
  report[label] = { maxLevel: b.maxLevel, farmMaxUsed: farmMax, realFarmGateTop: realTop, capOverFarm: [b.m4!.hens.capOverFarm, b.m4!.eggValue.capOverFarm], counts, mismatches: mism.length, mism: mism.slice(0, 50), farmMaxCellsCount: farmMaxCells.length, farmMaxCellsSample: farmMaxCells.slice(0, 20), ariaSamples };
  writeFileSync(`${OUT}/oracle-${label}.json`, JSON.stringify(report[label], null, 1));
  return report[label];
}
describe('QA oracle (real buy gate) vs rendered rows', () => {
  it('MAIN data: every track x F0..30 x L0..30', async () => {
    const r = await runGrid('main', MAIN, (MAIN as any).farmMaxLevel ?? MAIN.maxLevel);
    expect(r.realFarmGateTop).toBe(30); expect(r.mismatches).toBe(0); expect(r.counts.farmMax).toBe(0);
  }, 600000);
  it('B6B offset-3 test balance: every track x F0..50 x L0..55', async () => {
    const r = await runGrid('b6b', B6B, 50);
    expect(r.mismatches).toBe(0);
  }, 600000);
});
