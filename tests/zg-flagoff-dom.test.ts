// @vitest-environment jsdom
// ZG-AC12 / ZG-AC19 [no-regression]: with m4.flags.zeroGainUi = 0 the Upgrades markup, the nav dot and the next-goal strip on every
// zero-gain fixture are byte-identical to rc/v5 65a7443 (the pre-ZG baseline). The pin was produced by running THIS file, unmodified,
// on a 65a7443 checkout (it imports nothing from the zero-gain code).
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { balance, type Balance } from '../src/config/balance';
import { Game } from '../src/game';
import { mem } from './helpers';
import { FX, fx } from './zg-fixtures';

const BASE_65A7443 = '9c4b6439016e5d5b6a779b34643f70793fda5df8d44728f9bcc32844c662ee35';
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  vi.spyOn(performance, 'now').mockImplementation(() => 5000);
});
const cfgs: [string, Balance][] = [
  ['shipped', balance],
  ['m4on-zg0', { ...balance, m4: { ...balance.m4!, enabled: 1, flags: { ...balance.m4!.flags, zeroGainUi: 0 } } } as Balance],
  ['m4off', { ...balance, m4: { ...balance.m4!, enabled: 0 } } as Balance],
];
async function dump(state: object, tab: string, bal: Balance) {
  const g = new Game(bal, mem() as any, () => 1760000000000, 1, 'test'); g.state = { ...g.state, ...state } as any;
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, bal, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  document.getElementById('modal-layer')?.classList.remove('open');
  ui.openPanel('upgrades'); (document.querySelector(`[data-tab=${tab}]`) as HTMLElement)?.click(); ui.render(); ui.render();
  const b = document.querySelector('[data-best-buy]');
  return [document.querySelector('#uRow')!.innerHTML, (document.querySelector('[data-nav=upgrades] .badge') as HTMLElement).hidden,
    document.querySelector('#goal')!.outerHTML, document.querySelector('#goalDesc')?.textContent ?? '', b?.outerHTML ?? ''].join('\u0001');
}
describe('ZG-AC12/19 flag-off DOM byte-identical to 65a7443', () => {
  it('sha256 over (config x fixture x tab) markup + nav dot + strip', async () => {
    const h = createHash('sha256'); const fixtures = { ...FX, COLL_ZG: () => fx(4, 5, 0, 1, { coinsCents: 1e9 }), COLL_ZG0: () => fx(4, 5, 0, 1, { coinsCents: 0 }) };
    for (const [c, bal] of cfgs) for (const [n, f] of Object.entries(fixtures)) for (const tab of ['collection', 'farm']) h.update(`${c}|${n}|${tab}\u0002${await dump(f(), tab, bal)}\u0003`);
    const got = h.digest('hex'); console.log('ZG-FLAGOFF-DOM ' + got);
    expect(got).toBe(BASE_65A7443);
  });
});
