// @vitest-environment jsdom
// HoE/zeroGainUi-6: m4.flags.bestBuyV2 0/1 x m4.zeroGain.confirm 0/1 matrix, zeroGainUi = 1, over the shared §9 fixtures
// (spec v0.3.7 f86de04e + errata v0.3.8 rev 2 4cfe6895). Per cell: verdict / ★-filter parity with the (bb 0, confirm 0) reference,
// Buy behaviour (direct at confirm 0, strip at confirm 1), upgrade.zero_gain, ★ never on a ZG row. Flag-off cells (zeroGainUi = 0) at
// each bestBuyV2 (and confirm) value: DOM and telemetry identical to the m4-on/zeroGainUi-0 config pinned to 65a7443 in zg-flagoff-dom.
// BBv2 mechanics are row 29 and not built here: bestBuyV2 = 1 is expected to change nothing in these cells.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { Game } from '../src/game';
import { isZeroGain } from '../src/ui/zero-gain';
import { mem } from './helpers';
import { fx, FX } from './zg-fixtures';

const mk = (zeroGainUi: number, confirm: number, bestBuyV2: number): Balance =>
  ({ ...balance, m4: { ...balance.m4!, enabled: 1, flags: { ...balance.m4!.flags, zeroGainUi, bestBuyV2 }, zeroGain: { confirm } } }) as Balance;
const COLL_ZG = () => fx(4, 5, 0, 1, { coinsCents: 1e9 });
const FIX: Record<string, () => object> = { ...FX, COLL_ZG, COLL_ZG0: () => fx(4, 5, 0, 1, { coinsCents: 0 }) };
const TABS = ['collection', 'farm'] as const;
const KEYS = ['COLL', 'HENS', 'VALUE'] as const;
const ZG_SEL = '.zg, .zg-chip, [data-zero-gain], [id^=zg-desc-], .zg-confirm, .zg-line, .fx-t, button.btn.buy[aria-expanded], button.btn.buy[aria-controls], button.btn.buy[aria-describedby]';
let t = 1000;
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (globalThis as any).cancelAnimationFrame ??= (i: number) => clearTimeout(i);
  (Element.prototype as any).scrollIntoView ??= function () { /* jsdom */ };
  vi.spyOn(performance, 'now').mockImplementation(() => t);
});
afterEach(() => { document.body.innerHTML = ''; localStorage.clear(); });
async function mount(state: object, tab: string, bal: Balance) {
  const g = new Game(bal, mem() as any, () => 1760000000000, 1, 'test');
  g.state = { ...g.state, ...state } as any;
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, bal, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  document.getElementById('modal-layer')?.classList.remove('open');
  ui.openPanel('upgrades'); (document.querySelector(`[data-tab=${tab}]`) as HTMLElement).click(); ui.render(); ui.render();
  return { g, ui };
}
const row = (k: string) => document.querySelector<HTMLElement>(k === 'COLL' ? '#uRow .up' : `#uRow .up[data-track=${k === 'HENS' ? 'hens' : 'eggValue'}]`);
const buyOf = (k: string) => row(k)!.querySelector<HTMLButtonElement>('button.btn.buy')!;
const LVL = { COLL: 'collectionLevel', HENS: 'hensLevel' } as const;
const lastUp = (g: Game) => [...g.telemetry.events()].reverse().find(e => e.type === 'upgrade');
const zgc = (g: Game) => g.telemetry.events().filter(e => e.type === 'zero_gain_confirm').map(e => e.outcome);
/** ★ / verdict view of one mounted fixture: which rows are ZG, which row holds the ★, the strip text, the nav dot. */
function view() {
  const zg = [...document.querySelectorAll('#uRow [data-zero-gain]')].map(r => r.getAttribute('data-zero-gain')).join(',');
  const star = document.querySelector('[data-best-buy]'); const starRow = star?.closest('.up');
  return { zg, star: star ? (starRow?.getAttribute('data-track') ?? 'coll') + ':' + star.getAttribute('data-best-buy') : '',
    goal: document.querySelector('#goal')!.textContent, dot: (document.querySelector('[data-nav=upgrades] .badge') as HTMLElement).hidden };
}
function dump() {
  const b = document.querySelector('[data-best-buy]');
  return [document.querySelector('#uRow')!.innerHTML, (document.querySelector('[data-nav=upgrades] .badge') as HTMLElement).hidden,
    document.querySelector('#goal')!.outerHTML, document.querySelector('#goalDesc')?.textContent ?? '', b?.outerHTML ?? ''].join('\u0001');
}
const REF = mk(1, 0, 0);
const CELLS = [[0, 0], [0, 1], [1, 0], [1, 1]] as const;

describe.each(CELLS)('ZG matrix zeroGainUi=1, bestBuyV2=%i, confirm=%i', (bb, confirm) => {
  const B = mk(1, confirm, bb);
  it('verdict + ★ filter parity with (bb 0, confirm 0); DOM data-zero-gain = isZeroGain; ★ never on a ZG row (ZG-AC1/2/5/16/17/17b/18)', async () => {
    let zgRows = 0, stars = 0; // non-vacuity: the fixtures must show ZG rows and a ★ somewhere
    for (const [n, f] of Object.entries(FIX)) {
      for (const k of KEYS) expect(isZeroGain(f() as any, B, k), `${n} ${k}`).toBe(isZeroGain(f() as any, REF, k));
      for (const tab of TABS) {
        await mount(f(), tab, REF); const ref = view();
        await mount(f(), tab, B); const got = view();
        expect(got, `${n}/${tab}`).toEqual(ref); if (got.zg) zgRows++; if (got.star) stars++;
        for (const r of document.querySelectorAll('[data-zero-gain]')) { expect(r.hasAttribute('data-best-buy')).toBe(false); expect(r.querySelector('[data-best-buy]')).toBeNull(); }
        for (const k of KEYS) {
          const r = row(k); if (!r || (k === 'COLL' ? tab !== 'collection' : tab !== 'farm')) continue;
          const offered = !!r.querySelector('button.btn.buy');
          if (offered) expect(r.getAttribute('data-zero-gain') === k, `${n}/${tab}/${k}`).toBe(isZeroGain(f() as any, B, k));
        }
      }
    }
    expect(zgRows).toBeGreaterThan(0); expect(stars).toBeGreaterThan(0);
  });
  it(`Buy: ${confirm ? 'ZG rows open the strip, Buy anyway buys' : 'direct buy'}; non-ZG rows buy directly; upgrade.zero_gain = pre-buy verdict (ZG-AC9/10/15)`, async () => {
    const cases: [() => object, 'collection' | 'farm', 'COLL' | 'HENS', boolean][] = [
      [COLL_ZG, 'collection', 'COLL', true], [FX.FLIP, 'collection', 'COLL', false], [FX.FLIP, 'farm', 'HENS', true], [COLL_ZG, 'farm', 'HENS', false]];
    for (const [f, tab, k, zg] of cases) {
      t += 10000; const { g } = await mount(f(), tab, B); const lv0 = (g.state as any)[LVL[k]];
      expect(isZeroGain(g.state, B, k), `${k} precondition`).toBe(zg);
      const b = buyOf(k); b.click();
      if (zg && confirm) {
        expect((g.state as any)[LVL[k]], 'strip, not a buy').toBe(lv0);
        const strip = document.getElementById(b.getAttribute('aria-controls')!)!; expect(strip.hidden).toBe(false); expect(b.getAttribute('aria-expanded')).toBe('true');
        expect(lastUp(g)).toBeUndefined();
        t += 400; (strip.querySelector('[data-zg=confirm]') as HTMLElement).click();
        expect(zgc(g)).toEqual(['confirm']);
      } else {
        expect(b.hasAttribute('aria-expanded')).toBe(false); expect(document.querySelector('.zg-confirm:not([hidden])')).toBeNull(); expect(zgc(g)).toEqual([]);
      }
      expect((g.state as any)[LVL[k]], `${k} bought`).toBe(lv0 + 1);
      expect(lastUp(g)!.zero_gain, `${k} zero_gain`).toBe(zg);
      expect(document.querySelectorAll('.zg-confirm').length).toBe(confirm && document.querySelector('[data-zero-gain]') ? document.querySelectorAll('[data-zero-gain] button.btn.buy[aria-controls]').length : 0);
    }
  });
});

describe.each([0, 1])('ZG matrix flag-off cell: zeroGainUi=0, bestBuyV2=%i', (bb) => {
  const REF0 = mk(0, 0, 0);
  it.each([0, 1])('confirm=%i: DOM byte-identical to the 65a7443-pinned zeroGainUi-0 config on every fixture/tab; no ZG nodes (ZG-AC12/19)', async (confirm) => {
    for (const [n, f] of Object.entries(FIX)) for (const tab of TABS) {
      await mount(f(), tab, REF0); const ref = dump();
      await mount(f(), tab, mk(0, confirm, bb)); expect(dump(), `${n}/${tab}`).toBe(ref);
      expect(document.querySelectorAll(ZG_SEL).length).toBe(0);
    }
  });
  it.each([0, 1])('confirm=%i: Buy on a would-be ZG row buys directly; upgrade record equals the reference, no zero_gain / zero_gain_confirm', async (confirm) => {
    const recs: any[] = [];
    for (const bal of [REF0, mk(0, confirm, bb)]) {
      t = 5000; const { g } = await mount(COLL_ZG(), 'collection', bal); buyOf('COLL').click();
      expect(g.state.collectionLevel).toBe(2); expect(zgc(g)).toEqual([]); recs.push({ ...lastUp(g) });
    }
    expect(recs[0]).not.toHaveProperty('zero_gain'); expect(recs[1]).toEqual(recs[0]);
  });
});
