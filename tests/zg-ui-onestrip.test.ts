// @vitest-environment jsdom
// Zero-gain confirm strip, one strip at a time (UI-ZG-11, ZG-AC10 "opening another row's strip"). On shipped data Egg value is never
// ZG (spec E5) and COLL / HENS sit on different tabs, so the predicate is forced here (HENS and VALUE ZG) to exercise the code path.
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { Game } from '../src/game';
import { mem } from './helpers';
import { fx } from './zg-fixtures';

vi.mock('../src/ui/zero-gain', async orig => {
  const m: any = await orig();
  return { ...m, isZeroGain: (_s: unknown, _b: unknown, k: string) => k === 'HENS' || k === 'VALUE' };
});
let t = 1000;
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (Element.prototype as any).scrollIntoView ??= function () { /* jsdom */ };
  vi.spyOn(performance, 'now').mockImplementation(() => t);
});
const C1 = { ...balance, m4: { ...balance.m4!, enabled: 1, flags: { ...balance.m4!.flags, zeroGainUi: 1 }, zeroGain: { confirm: 1 } } } as Balance;
describe('ZG-AC10 one strip at a time', () => {
  it('opening Hens closes Egg value: one cancel, its aria-expanded false, no buy', async () => {
    const g = new Game(C1, mem() as any, () => 1760000000000, 1, 'test'); g.state = { ...g.state, ...fx(10, 5, 5, 0, { coinsCents: 1e13 }) } as any;
    const { mountApp } = await import('../src/ui/app');
    document.body.innerHTML = '<div id="app"></div>';
    const ui = mountApp(document.getElementById('app')!, g, C1, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
    document.getElementById('modal-layer')?.classList.remove('open');
    ui.openPanel('upgrades'); (document.querySelector('[data-tab=farm]') as HTMLElement).click(); ui.render();
    const buy = (k: string) => document.querySelector<HTMLElement>(`#uRow .up[data-track=${k}] button.btn.buy`)!;
    const lv = [g.state.hensLevel, g.state.eggValueLevel];
    buy('eggValue').click(); expect(document.querySelector<HTMLElement>('#zgc-value')!.hidden).toBe(false);
    buy('hens').dispatchEvent(new Event('pointerdown', { bubbles: true })); buy('hens').click();
    expect(document.querySelector<HTMLElement>('#zgc-value')!.hidden).toBe(true); expect(buy('eggValue').getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector<HTMLElement>('#zgc-hens')!.hidden).toBe(false); expect(buy('hens').getAttribute('aria-expanded')).toBe('true');
    expect(g.telemetry.events().filter(e => e.type === 'zero_gain_confirm').map(e => e.outcome)).toEqual(['cancel']);
    expect([g.state.hensLevel, g.state.eggValueLevel]).toEqual(lv);
  });
});
