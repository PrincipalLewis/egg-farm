// @vitest-environment jsdom
// QA combined oracle for a LOCAL-ONLY merge of PR #60 5789805 + PR #62 fcf9823 (never pushed). Based on qa/m41/m41-11-5789805/harness.
// Adds (M41-8 F3/F4, F4-13, F4-19, B1-10): the UX-M4 ★ Best buy chip (.best-chip) and the next-goal strip target / ★ never land on a
// locked ('Needs Farm') or 'Max for this farm' row, across every F x L, broke and rich; at most one chip; chip == strip ★ (F4-13).
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

const OUT = process.env.QA_OUT ?? '/tmp/m41-8-combined';
const lockedKinds = new Set(['lock', 'farmMax']);
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
let stats: any;
// The strip text refreshes on purchases or on its 1 Hz tick (app.ts renderGoal). This harness sets g.state directly (no purchase
// event), so it advances a fake performance.now by 1100 ms before every render: each cell is the settled frame, not a <1 s transient.
// QA_BUMP=0 instead keeps the clock still (transient frames: strip text may be up to 1 s stale vs the rows).
const BUMP = +(process.env.QA_BUMP ?? 1100); const SUF = BUMP ? '' : '-nobump';
let fakeT = 1e6; const realNow = performance.now.bind(performance); (performance as any).now = () => fakeT;
const cats: Record<string, Record<string, number>> = {};
async function runGrid(label: string, b: Balance, farmMax: number) {
  const g = new Game(b, mem() as any, () => 1760000000000, 1, 'test');
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  document.getElementById('modal-layer')?.classList.remove('open');
  ui.openPanel('upgrades'); (document.querySelector('[data-tab=farm]') as HTMLElement).click();
  const mism: any[] = [], counts: Record<string, number> = { max: 0, buy: 0, lock: 0, farmMax: 0 }, ariaSamples: any[] = [], farmMaxCells: string[] = [];
  const realTop = realFarmTop(b); stats = { cells: 0, lockedCells: 0, star: 0, chip: {}, strip: { hens: 0, eggValue: 0 } };
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
      g.state = st(b, F, t, L, coins); fakeT += BUMP; ui.render();
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
      { // M41-8 checks on the same rendered frame
        const chips = [...document.querySelectorAll<HTMLElement>('.best-chip')];
        chk(chips.length <= 1, `chips=${chips.length}`);
        const chipKey = chips[0]?.dataset.bestBuy ?? null;
        const chipRow = chips[0]?.closest<HTMLElement>('.up');
        const rowKind = (tk: 'hens' | 'eggValue') => tk === t ? exp.kind : (gateAllows(b, F, tk, 0) ? 'buy' : 'lock');
        if (chipKey === 'HENS' || chipKey === 'VALUE') { const tk = chipKey === 'HENS' ? 'hens' : 'eggValue'; chk(!lockedKinds.has(rowKind(tk)), `CHIP on locked ${tk} (${rowKind(tk)})`); chk(chipRow?.dataset.track === tk, 'chip row mismatch'); }
        if (lockedKinds.has(exp.kind)) chk(!row.querySelector('.best-chip'), `CHIP inside ${exp.kind} row`);
        const lbl = document.querySelector<HTMLElement>('#goal .goal-label'), gAria = document.querySelector('#goal')?.getAttribute('aria-label') ?? '';
        const star = !!lbl?.querySelector('.ng-star'), nameTxt = lbl?.querySelector('.ng-name')?.textContent ?? null, lblTxt = lbl?.textContent ?? '';
        const stripTrack = /^Next goal: (best buy, )?Hens level /.test(gAria) ? 'hens' : /^Next goal: (best buy, )?Egg value level /.test(gAria) ? 'eggValue' : null;
        if (stripTrack) chk(!lockedKinds.has(rowKind(stripTrack)), `STRIP target on locked ${stripTrack} (${rowKind(stripTrack)}): ${gAria}`);
        chk(!/unlocks/.test(lblTxt + gAria), `Farm-unlock variant shown: ${lblTxt}`);
        // F4-13: strip ★ and chip from one source -> when the strip carries ★ the chip is on that target (if the target's row is on this tab)
        if (star && stripTrack) chk(chipKey === (stripTrack === 'hens' ? 'HENS' : 'VALUE'), `★ on ${stripTrack} but chip=${chipKey}`);
        if (chipKey === 'HENS' || chipKey === 'VALUE') { const tk = chipKey === 'HENS' ? 'hens' : 'eggValue'; if (stripTrack === tk) chk(gAria.startsWith('Next goal: best buy, '), `chip on ${tk} but strip aria lacks best buy: ${gAria}`); }
        if (/^Next goal: best buy, (Hens|Egg value) /.test(gAria)) chk(chipKey === (stripTrack === 'hens' ? 'HENS' : 'VALUE'), `strip says best buy ${stripTrack} but chip=${chipKey}`);
        stats.cells++; if (chipKey) stats.chip[chipKey] = (stats.chip[chipKey] ?? 0) + 1; if (star) stats.star++; if (stripTrack) stats.strip[stripTrack]++;
        if (lockedKinds.has(exp.kind)) { stats.lockedCells++; }
        // pure: selectGoal / DualPicker never on a locked track for this state
        const s2 = g.state, hp = new DualPicker().tick(s2, b, 0).hint, sg = selectGoal(s2, b, 100, hp?.key, hp?.affordable ? hp.key : null);
        for (const [k, tk] of [['HENS', 'hens'], ['VALUE', 'eggValue']] as const) if (lockedKinds.has(rowKind(tk))) { chk(sg.key !== k, `selectGoal -> locked ${k}`); chk(hp?.key !== k, `DualPicker hint -> locked ${k}`); }
      }
      counts[exp.kind]++;
      if ((F % 10 === 0 || L >= b.maxLevel - 3) && ariaSamples.length < 400) ariaSamples.push({ t, F, L, coins, kind: exp.kind, lockText: got.lockText, lockAria: got.lockAria, rowAria: got.rowAria, maxed: got.maxed });
      if (bad.length) { mism.push({ t, F, L, coins, exp, got, bad }); for (const x of bad) { const k = x.replace(/[0-9]+/g, '#').slice(0, 80); (cats[label] ??= {})[k] = ((cats[label] ??= {})[k] ?? 0) + 1; } }
    }
  }
  report[label] = { maxLevel: b.maxLevel, farmMaxUsed: farmMax, realFarmGateTop: realTop, capOverFarm: [b.m4!.hens.capOverFarm, b.m4!.eggValue.capOverFarm], counts, mismatches: mism.length, categories: cats[label] ?? {}, m418: stats, mism: mism.slice(0, 50), farmMaxCellsCount: farmMaxCells.length, farmMaxCellsSample: farmMaxCells.slice(0, 20), ariaSamples };
  writeFileSync(`${OUT}/combined-oracle-${label}${SUF}.json`, JSON.stringify(report[label], null, 1));
  return report[label];
}
describe('QA oracle (real buy gate) vs rendered rows', () => {
  it('MAIN data: every track x F0..30 x L0..30', async () => {
    const r = await runGrid('main', MAIN, (MAIN as any).farmMaxLevel ?? MAIN.maxLevel);
    expect(r.realFarmGateTop).toBe(30); if (BUMP) expect(r.mismatches).toBe(0); expect(r.counts.farmMax).toBe(0);
  }, 600000);
  it('B6B offset-3 test balance: every track x F0..50 x L0..55', async () => {
    const r = await runGrid('b6b', B6B, 50);
    if (BUMP) expect(r.mismatches).toBe(0);
  }, 600000);
});
