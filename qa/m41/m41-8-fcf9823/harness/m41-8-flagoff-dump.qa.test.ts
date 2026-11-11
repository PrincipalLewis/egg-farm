// @vitest-environment jsdom
// QA (PR #62 fcf9823): dump next-goal strip labels + aria and Upgrades rows so the SAME file run on base dd223f5 and on the PR can be
// byte-compared. Part A: M4 OFF (balance.m4.enabled = 0) -> must be byte-identical (author claim). Part B: M4 ON, only goals whose key is
// FARM / W1-W4 / done -> must be byte-identical (spec §18: FARM, W1-W4 and Done labels unchanged).
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { selectGoal, goalAria } from '../src/ui/next-goal';
import { Game } from '../src/game';
import { mem } from './helpers';
const OFF = { ...balance, m4: { ...balance.m4!, enabled: 0 } } as Balance, ON = balance as Balance;
const W = [{}, { market_hand: { energy: 100, cdS: 0 } }, { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 } }];
it('dump', async () => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  let fakeT = 1e6; (performance as any).now = () => fakeT;
  const A: string[] = [], B: string[] = [];
  for (let F = 0; F <= 30; F++) for (let C = 0; C <= 30; C += 1) for (const coins of [0, 5e4, 5e7, 1e15]) for (const [wi, w] of W.entries()) for (const rate of [0, 100]) {
    const s = { ...initialState(OFF), farmLevel: F, collectionLevel: C, coinsCents: coins, workers: w } as any;
    const g0 = selectGoal(s, OFF, rate); A.push(`F${F} C${C} c${coins} w${wi} r${rate}\t${JSON.stringify(g0)}\t${goalAria(g0)}`);
    const s1 = { ...s, tracksV7: 1, hensLevel: Math.min(30, F + 3), eggValueLevel: Math.min(30, F + 3) }; // tracks at cap -> FARM/COLL/W goals
    const g1 = selectGoal(s1, ON, rate);
    if (!['HENS', 'VALUE', 'COLL'].includes(g1.key as string)) B.push(`F${F} C${C} c${coins} w${wi} r${rate}\t${g1.key}|${g1.state}|${g1.label}|${g1.status}|${g1.tab}\t${goalAria(g1)}`);
  }
  // DOM, M4 off: #goal button + farm and collection tab rows
  const g = new Game(OFF, mem() as any, () => 1760000000000, 1, 'test');
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, OFF, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  document.getElementById('modal-layer')?.classList.remove('open'); ui.openPanel('upgrades');
  const D: string[] = [];
  for (const tab of ['farm', 'collection']) { (document.querySelector(`[data-tab=${tab}]`) as HTMLElement).click();
    for (let F = 0; F <= 30; F += 1) for (const C of [0, 5, 15, 29, 30]) for (const coins of [0, 1e15]) {
      g.state = { ...g.state, farmLevel: F, collectionLevel: C, coinsCents: coins } as any; for (let k = 0; k < 3; k++) { fakeT += 1100; ui.render(); } // GoalHold(2): settle the 1 Hz hold (M4 off)
      const goal = document.querySelector('#goal')!, rows = document.querySelector('.tabs')?.parentElement?.querySelectorAll('.up');
      D.push(`${tab} F${F} C${C} c${coins}\t${goal.outerHTML.replace(/\s+/g, ' ')}\t${[...(rows ?? [])].map(r => r.outerHTML.replace(/\s+/g, ' ')).join('')}`);
    } }
  const o = process.env.QA_OUT!; writeFileSync(`${o}-A-m4off-select.txt`, A.join('\n') + '\n'); writeFileSync(`${o}-B-m4on-farm-w.txt`, B.join('\n') + '\n'); writeFileSync(`${o}-D-m4off-dom.txt`, D.join('\n') + '\n');
}, 600000);
