// @vitest-environment jsdom
// M4.1-P1 (product/queue.md): with M4 on, the yard sprites and #henpill follow the Hens track, i.e. CSV hens[hensLevel]
// (the same row the Hens card's Eggs/s uses): sprites = min(hens[H], 12); the pill is shown only when hens[H] > 12 and reads hens[H].
// A Hens buy updates both in the same tick; a Farm buy changes neither. M4 off keeps the legacy S.hens(F).
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import * as S from '../src/sim/state';
import { trackEggsPerSec } from '../src/config/formulas';
import { serialize, SAVE_KEY } from '../src/save/save';
import { Game } from '../src/game';
import { fmtCount } from '../src/ui/format';
import { mem } from './helpers';

const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
const off: Balance = { ...balance, m4: { ...balance.m4!, enabled: 0 } };
// CSV hens column (data/economy.csv), the source the AC names.
const csv = readFileSync(resolve(__dirname, '../data/economy.csv'), 'utf8').trim().split(/\r?\n/).map(l => l.split(','));
const HENS_COL = csv[0].indexOf('hens');
const csvHens = (L: number) => +csv.find(r => r[0] === String(L))![HENS_COL];
const kvOf = () => { const kv = mem() as any; kv.removeItem = (k: string) => kv.m.delete(k); return kv; };
let n = 0; const id = () => (++n).toString(16).padStart(16, '0');

async function mount(b: Balance, F: number, H: number) {
  const kv = kvOf();
  kv.setItem(SAVE_KEY, serialize({ ...initialState(b), tracksV7: 1, seenTracksExplainer: true, farmLevel: F, hensLevel: H, coinsCents: 1e15 } as any, 1760000000000));
  const g = new Game(b, kv, () => 1760000000500 + n * 1000, undefined, 'dev', null, null, { idbBoot: 'absent', newId: id });
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  ui.render();
  return { g, ui };
}
const sprites = () => document.querySelectorAll('#yard img.hen').length;
const pill = () => { const p = document.getElementById('henpill')!; return { hidden: p.hidden, text: p.textContent }; };
const openFarmTab = (ui: { openPanel: (p: 'upgrades') => void; render: () => void }) => {
  ui.openPanel('upgrades'); (document.querySelector('.tabs button[data-tab="farm"]') as HTMLElement).click(); ui.render();
};
const hensCardEps = () => document.querySelector('#uRow .up.track[data-track="hens"] .fx li')!.textContent!;
const buy = (kind: string) => (document.querySelector(`#uRow button.btn[data-kind="${kind}"]`) as HTMLElement).click();

beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (globalThis as any).cancelAnimationFrame ??= (i: number) => clearTimeout(i);
});
afterEach(() => { document.body.innerHTML = ''; });

describe('M4.1-P1 yard hens + #henpill from the Hens track', () => {
  it('CSV sanity: hens[H] is the row the Hens card Eggs/s uses', () => {
    for (const H of [0, 1, 2, 7, 13]) expect(S.hens(H, on)).toBe(csvHens(H));
    expect(csvHens(7)).toBe(40); expect(trackEggsPerSec(7, on)).toBe(8);
  });

  it('(1) F5/H7 (F≠H): pill = hens[7] = 40 (not hens[5] = 30), sprites = min(40, 12), matching the Hens card row (Eggs/s 8)', async () => {
    const { g, ui } = await mount(on, 5, 7);
    expect(g.state.farmLevel).toBe(5); expect(g.state.hensLevel).toBe(7);
    openFarmTab(ui);
    expect(pill()).toEqual({ hidden: false, text: `×${fmtCount(csvHens(7))} hens` });
    expect(pill().text).toBe('×40 hens');
    expect(sprites()).toBe(Math.min(csvHens(7), 12));
    // same DOM render: the Hens card's Eggs/s comes from the same CSV row as the pill's hen count
    expect(hensCardEps()).toMatch(new RegExp(`^Eggs/s ${fmtCount(trackEggsPerSec(7, on))} `));
    expect(hensCardEps().startsWith('Eggs/s 8 ')).toBe(true);
  });

  it('(1b) F5/H1 (F≠H, hens[H] < 12): sprites = hens[1] = 10 (legacy Farm count would be 12), pill hidden', async () => {
    await mount(on, 5, 1);
    expect(sprites()).toBe(csvHens(1)); expect(sprites()).toBe(10);
    expect(pill().hidden).toBe(true);
  });

  it('(2) H13 (>= 13): sprites = 12 and the pill shows hens[13] = 70', async () => {
    await mount(on, 12, 13);
    expect(sprites()).toBe(12);
    expect(pill()).toEqual({ hidden: false, text: `×${fmtCount(csvHens(13))} hens` });
    expect(pill().text).toBe('×70 hens');
  });

  it('(3) a Hens buy updates sprites and pill in the same tick; a Farm buy changes neither', async () => {
    const { g, ui } = await mount(on, 5, 1);
    openFarmTab(ui);
    expect([sprites(), pill().hidden]).toEqual([10, true]);
    buy('hens'); // synchronous: no timers / frames advanced
    expect(g.state.hensLevel).toBe(2);
    expect(sprites()).toBe(Math.min(csvHens(2), 12));
    expect(pill()).toEqual({ hidden: false, text: `×${fmtCount(csvHens(2))} hens` }); // ×15 hens
    const before = { s: sprites(), p: pill() };
    buy('farm');
    expect(g.state.farmLevel).toBe(6);
    expect({ s: sprites(), p: pill() }).toEqual(before);
  });

  it('(3b) hensLevel 0 with M4 on: hens[0] = 5 sprites, pill hidden, no NaN', async () => {
    const { ui } = await mount(on, 5, 0);
    openFarmTab(ui);
    expect(sprites()).toBe(csvHens(0)); expect(sprites()).toBe(5);
    expect(pill().hidden).toBe(true); expect(pill().text).not.toMatch(/NaN/);
    expect(hensCardEps()).not.toMatch(/NaN/);
  });

  it('(4) M4 off keeps the legacy S.hens(F): F5 -> pill ×30, sprites 12, hensLevel ignored', async () => {
    const { g } = await mount(off, 5, 7);
    expect(g.state.farmLevel).toBe(5);
    expect(pill()).toEqual({ hidden: false, text: `×${fmtCount(S.hens(5, off))} hens` });
    expect(pill().text).toBe('×30 hens');
    expect(sprites()).toBe(12);
    const g1 = await mount(off, 1, 7); void g1;
    expect(sprites()).toBe(S.hens(1, off)); expect(pill().hidden).toBe(true);
  });
});

// CCR (reviews/pr69-c849ccf.md n1): the AC boundary "pill shown only when hens[H] > 12". The shipped CSV never lands on
// 11-14 hens, so a synthetic balance puts hens[H] exactly on 12 and 13 (kills the `< 12` / `<= 11` / `<= 13` / `<= 14` mutants).
const b12: Balance = { ...balance, farm: { ...balance.farm, hensBase: 12, hensPerLevel: 1 }, m4: { ...balance.m4!, enabled: 1 } };
describe('M4.1-P1 boundary (CCR): hens[H] = 12 hidden, 13 shown', () => {
  it('H with hens[H] = 12 (F≠H): 12 sprites, pill hidden', async () => {
    await mount(b12, 5, 0); expect(S.hens(0, b12)).toBe(12); expect(S.hens(5, b12)).toBe(17);
    expect(sprites()).toBe(12); expect(pill().hidden).toBe(true);
  });
  it('H with hens[H] = 13 (F≠H): 12 sprites, pill ×13 hens', async () => {
    await mount(b12, 5, 1); expect(S.hens(1, b12)).toBe(13);
    expect(sprites()).toBe(12); expect(pill()).toEqual({ hidden: false, text: '×13 hens' });
  });
  it('F with hens[F] = 13 but hens[H] = 12: pill hidden (Farm row ignored)', async () => {
    await mount(b12, 1, 0); expect(S.hens(1, b12)).toBe(13); expect(pill().hidden).toBe(true);
  });
});
