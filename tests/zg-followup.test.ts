// @vitest-environment jsdom
// Architect review engineering/reviews/v5-zerogain-546de85-architect.md (sha256 1f8c0337) (Minor 1: tests/zg-telemetry-annotate.test.ts):
// Minor 2 (an unrelated re-render keeps focus on the control it was on; never moves to "Buy anyway"), N2 (dispose).
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { Game } from '../src/game';
import { mem } from './helpers';
import { FX } from './zg-fixtures';

const mk = (zeroGainUi: number, confirm = 0): Balance =>
  ({ ...balance, m4: { ...balance.m4!, enabled: 1, flags: { ...balance.m4!.flags, zeroGainUi }, zeroGain: { confirm } } }) as Balance;
const C1 = mk(1, 1);
let t = 1000;
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (globalThis as any).cancelAnimationFrame ??= (i: number) => clearTimeout(i);
  (Element.prototype as any).scrollIntoView ??= function () { /* jsdom */ };
  vi.spyOn(performance, 'now').mockImplementation(() => t);
});
afterEach(() => { document.body.innerHTML = ''; localStorage.clear(); });
async function mount(state: object, bal: Balance) {
  const g = new Game(bal, mem() as any, () => 1760000000000, 1, 'test');
  g.state = { ...g.state, ...state } as any;
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, bal, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  document.getElementById('modal-layer')?.classList.remove('open');
  ui.openPanel('upgrades'); (document.querySelector('[data-tab=farm]') as HTMLElement).click(); ui.render(); ui.render();
  return { g, ui };
}
/** FX.FLIP on the Farm tab: HENS is ZG and affordable (strip #zgc-hens); Egg value is a non-ZG neighbour row. */
const COLL_ZG = () => FX.FLIP();
const buy = () => document.querySelector<HTMLButtonElement>('#uRow .up[data-track=hens] button.btn.buy')!;
const strip = () => document.querySelector<HTMLElement>('#zgc-hens')!;
const btn = (z: 'confirm' | 'cancel') => strip().querySelector<HTMLButtonElement>(`[data-zg=${z}]`)!;
const zgc = (g: Game) => g.telemetry.events().filter(e => e.type === 'zero_gain_confirm').map(e => e.outcome);
/** An unrelated re-render that really swaps uRow's markup (the Egg value row changes; HENS stays ZG): the strip node is replaced.
 *  (A coins tick does not change this markup when every row is affordable, so it would not exercise the swap.) */
function rerender(g: Game, ui: { render(): void }) {
  const before = strip(); g.state = { ...g.state, eggValueLevel: g.state.eggValueLevel + 1 }; t += 100; ui.render();
  expect(strip(), 'the markup was swapped').not.toBe(before); expect(strip().hidden).toBe(false);
}

describe('Minor 2: an unrelated re-render while the strip is open keeps focus where it was (confirm = 1)', () => {
  it('focus on Cancel + re-render: focus stays on Cancel; Enter (click) then cancels: one cancel, no buy', async () => {
    t = 10_000; const { g, ui } = await mount(COLL_ZG(), C1); buy().click(); t += 1000;
    btn('cancel').focus(); rerender(g, ui);
    expect(document.activeElement).toBe(btn('cancel'));
    (document.activeElement as HTMLElement).click();
    expect(zgc(g)).toEqual(['cancel']); expect(g.state.hensLevel).toBe(5);
  });
  it('focus on "Buy anyway" + re-render inside the 350 ms guard: focus stays there and the guard still ignores the activation', async () => {
    t = 20_000; const { g, ui } = await mount(COLL_ZG(), C1); buy().click();
    expect(document.activeElement).toBe(btn('confirm')); rerender(g, ui); // t = open + 100 ms
    expect(document.activeElement).toBe(btn('confirm')); btn('confirm').click();
    expect(zgc(g)).toEqual([]); expect(g.state.hensLevel).toBe(5); // ignored: inside the guard
    t += 400; btn('confirm').click(); expect(zgc(g)).toEqual(['confirm']); expect(g.state.hensLevel).toBe(6);
  });
  it('focus on the row Buy + re-render: focus returns to the row Buy, not "Buy anyway"', async () => {
    t = 30_000; const { g, ui } = await mount(COLL_ZG(), C1); buy().click(); t += 1000;
    buy().focus(); rerender(g, ui); expect(document.activeElement).toBe(buy());
  });
  it('focus outside the rows + re-render: focus is not moved into the strip', async () => {
    t = 40_000; const { g, ui } = await mount(COLL_ZG(), C1); buy().click(); t += 1000;
    (document.activeElement as HTMLElement).blur(); expect(document.activeElement).toBe(document.body);
    rerender(g, ui); expect(document.activeElement).toBe(document.body);
  });
});

