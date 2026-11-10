// @vitest-environment jsdom
// v5 streak / tapCoins UI inside the real rc/v5 app (mountApp), mounted through the F6 stub the same way F6's mountOverlay will.
// Flag off (ST-AC29 / R13a): the #app + body HTML is byte-identical with and without the feature. Flag on: the row is the 24 px
// band directly under Collect in .collectbar (ST-AC26) and a real credited Collect drives it.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { Game } from '../src/game';
import { streakMeter } from '../src/ui/streak-meter';
import { stubCtx, mountStub } from '../src/ui/streak-f6-stub';
import { flagOn } from '../src/config/flags';
import { mem } from './helpers';

const mk = (flags: Record<string, number>): Balance => ({ ...balance, m4: { ...balance.m4!, flags: { ...balance.m4!.flags, ...flags } } }) as Balance;
let t = 1000;
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (globalThis as any).cancelAnimationFrame ??= (i: number) => clearTimeout(i);
  (Element.prototype as any).scrollIntoView ??= function () { /* jsdom */ };
  (Element.prototype as any).animate ??= function () { return { finished: Promise.resolve(), cancel() {} }; }; // jsdom: the egg flight
  vi.spyOn(performance, 'now').mockImplementation(() => t);
});
/** F6 API Q4 (Features): every mount is destroyed in afterEach before the next test remounts. */
const teardown: (() => void)[] = [];
const mountF6: typeof mountStub = (...a) => { const o = mountStub(...a); teardown.push(() => o.destroy()); return o; };
afterEach(() => { teardown.splice(0).reverse().forEach(d => d()); document.body.innerHTML = ''; localStorage.clear(); });
async function app(b: Balance, state: object = {}) {
  const g = new Game(b, mem() as any, () => 1760000000000, 1, 'test'); g.state = { ...g.state, ...state } as any;
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.getElementById('app')!;
  const play = vi.fn();
  mountApp(root, g, b, { enabled: false, play, unlock() {} } as any, 'test', { newGame: false });
  return { g, root, play };
}

describe('flag off: byte-identical app DOM', () => {
  it('shipped balance (streak 0, tapCoins 0): mounting + rendering the feature changes nothing', async () => {
    const { g, root } = await app(balance), before = document.body.innerHTML;
    const { ctx } = stubCtx({ g, b: balance, root }), o = mountF6([streakMeter], ctx, f => flagOn(balance, f));
    o.render(t); g.dispatch({ type: 'collect' }); o.render(t);
    const after = document.body.innerHTML; o.destroy();
    // the collect itself may change app text on the next app render; compare the feature's footprint only
    expect(after.includes('streak')).toBe(before.includes('streak')); expect(document.querySelector('#streak,#streak-live,#coin-live,.coin-pop,.streak-pill')).toBeNull();
    expect(root.classList.contains('m5-streak')).toBe(false);
  });
  it('the feature adds zero bytes to a static app snapshot', async () => {
    const { g, root } = await app(balance), before = document.body.innerHTML;
    const { ctx } = stubCtx({ g, b: balance, root }); const o = mountF6([streakMeter], ctx, f => flagOn(balance, f)); o.render(t);
    expect(document.body.innerHTML).toBe(before); o.destroy(); expect(document.body.innerHTML).toBe(before);
  });
});

describe('flag on in the real app', () => {
  it('row = next sibling of #collect inside .collectbar; Collect gets the 48 px class scope; a credited tap shows +1%', async () => {
    const B = mk({ streak: 1, tapCoins: 1 }), F = balance.m4!.tc!.streak_unlock_farm as number;
    const { g, root } = await app(B, { farmLevel: F });
    const { ctx } = stubCtx({ g, b: B, root }); const o = mountF6([streakMeter], ctx, f => flagOn(B, f));
    const row = document.getElementById('streak')!;
    expect(row.parentElement!.classList.contains('collectbar')).toBe(true); expect(row.previousElementSibling!.id).toBe('collect');
    expect(root.classList.contains('m5-streak')).toBe(true);
    g.dispatch({ type: 'collect' }); o.render(t); // jsdom clicks are untrusted (R3 filters them); the credited Collect itself
    expect(row.classList.contains('on')).toBe(true); expect(row.querySelector('.streak-label')!.textContent).toBe('+1% price');
    expect(row.getAttribute('aria-valuetext')).toBe('Streak +1% price, tier 0 of 4');
    o.destroy(); expect(document.getElementById('streak')).toBeNull();
  });
});

describe('app.ts collect path: R2/R3 filter and R16 pitch (ui/streak-tap.ts)', () => {
  const coop = (g: Game) => g.state.coop;
  it('flags off (shipped): a synthetic click still collects and plays collect at rate 1 (rc1)', async () => {
    const { g, play } = await app(balance, { coop: 10 }); const c0 = coop(g);
    (document.getElementById('collect') as HTMLButtonElement).click();
    expect(coop(g)).toBeLessThan(c0); expect(play).toHaveBeenCalledWith('collect', undefined, 1);
  });
  it('streak/tapCoins on: a synthetic (isTrusted false) click on Collect or the scene is ignored: no collect, no credit, no sound', async () => {
    const B = mk({ streak: 1, tapCoins: 1 }), F = balance.m4!.tc!.streak_unlock_farm as number;
    const { g, play } = await app(B, { farmLevel: F, coop: 10 }); const c0 = coop(g), s0 = g.state.coinsCents;
    (document.getElementById('collect') as HTMLButtonElement).click(); document.getElementById('scene')?.click();
    expect(coop(g)).toBe(c0); expect(g.state.streakS ?? 0).toBe(0); expect(g.state.coinsCents).toBe(s0); expect(play).not.toHaveBeenCalledWith('collect', undefined, expect.anything());
  });
});
