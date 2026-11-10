// @vitest-environment jsdom
// CCR F-2 (engineering/reviews/rcv5-vs-main-1a61b36-ccr.md; triage D-HOE-20261030-08 "must land before the streak flag flips"):
// the Sell all preview equals the credit for the same attended read, with the streak live (s > 0) and the player not attended.
import { it, expect, beforeAll, vi } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { Game } from '../src/game';
import { mem } from './helpers';
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (Element.prototype as any).scrollIntoView ??= function () {};
  (Element.prototype as any).animate ??= function () { return { finished: Promise.resolve(), cancel() {} }; }; // jsdom: the sale coin flight
});
const B = { ...balance, m4: { ...balance.m4!, flags: { ...balance.m4!.flags, streak: 1 } } } as Balance;
for (const focused of [false, true]) it(`Sell all label cents == credit (streak s = 0.2, document focused = ${focused})`, async () => {
  vi.spyOn(document, 'hasFocus').mockReturnValue(focused);
  const g = new Game(B, mem() as any, () => 1760000000000, 1, 'test');
  g.state = { ...g.state, farmLevel: 8, basket: 40, streakS: 0.2, streakHoldS: 3, customers: [{ id: 1, demand: 5, filled: 0, waitedS: 0 }, { id: 2, demand: 7, filled: 0, waitedS: 0 }] } as any;
  const { mountApp } = await import('../src/ui/app'); document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, B, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  document.getElementById('modal-layer')?.classList.remove('open');
  ui.openPanel('market'); ui.render(); ui.render();
  const btn = document.getElementById('sellAll')!, label = btn.textContent!, c0 = g.state.coinsCents;
  const m = /\$([\d,]+\.\d\d)/.exec(label); expect(m, label).not.toBeNull();
  btn.click(); expect(g.state.coinsCents - c0).toBe(Math.round(parseFloat(m![1].replace(/,/g, '')) * 100));
});
