// @vitest-environment jsdom
// M5.1 zero-gain UI in the real app (jsdom): ZG-AC4/5/6/9/10/12/15/16/17/17b/21 + UI-ZG-11/13/14/15/16/18 + the bestBuyV2 interaction.
// Spec product/collection/m5.1-zero-gain-purchase-ui.md v0.3.7 f86de04e + errata v0.3.8 rev 2 4cfe6895 (m4.flags.zeroGainUi,
// m4.zeroGain.confirm 0/1, m4.flags.bestBuyV2); visuals art-ux/m5.1-zero-gain-ui.md v1.4 14ec8850.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { Game } from '../src/game';
import { isZeroGain } from '../src/ui/zero-gain';
import { mem } from './helpers';
import { fx, FX } from './zg-fixtures';

const mk = (zeroGainUi: number, confirm = 0, bestBuyV2 = 0, enabled = 1): Balance =>
  ({ ...balance, m4: { ...balance.m4!, enabled, flags: { ...balance.m4!.flags, zeroGainUi, bestBuyV2 }, zeroGain: { confirm } } }) as Balance;
const ON = mk(1), OFF = mk(0);
let t = 1000;
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (globalThis as any).cancelAnimationFrame ??= (i: number) => clearTimeout(i);
  (Element.prototype as any).scrollIntoView ??= function () { /* jsdom */ };
  vi.spyOn(performance, 'now').mockImplementation(() => t);
});
afterEach(() => { document.body.innerHTML = ''; localStorage.clear(); });
async function mount(state: object, tab: 'collection' | 'farm', bal: Balance) {
  const g = new Game(bal, mem() as any, () => 1760000000000, 1, 'test');
  g.state = { ...g.state, ...state } as any;
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, bal, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  document.getElementById('modal-layer')?.classList.remove('open');
  ui.openPanel('upgrades'); (document.querySelector(`[data-tab=${tab}]`) as HTMLElement).click(); ui.render(); ui.render();
  return { g, ui };
}
const row = (k: string) => document.querySelector<HTMLElement>(k === 'COLL' ? '#uRow .up' : `#uRow .up[data-track=${k === 'HENS' ? 'hens' : 'eggValue'}]`)!;
const buyOf = (k: string) => row(k).querySelector<HTMLButtonElement>('button.btn.buy')!;
const dot = () => document.querySelector<HTMLElement>('[data-nav=upgrades] .badge')!;
const ZG_SEL = '.zg, .zg-chip, [data-zero-gain], [id^=zg-desc-], .zg-confirm, .zg-line, .fx-t, button.btn.buy[aria-expanded], button.btn.buy[aria-controls], button.btn.buy[aria-describedby]';
// FX-FLIP after one COLL buy: COLL ZG (affordable with coins), HENS not ZG.
const COLL_ZG = (coins = 1e9) => fx(4, 5, 0, 1, { coinsCents: coins });

describe('ZG-AC4 [UI] display', () => {
  it('affordable ZG Collection row: .up.zg[data-zero-gain=COLL], one chip, muted line markup, plain Buy, describedby', async () => {
    const s = COLL_ZG(); expect(isZeroGain(s, ON, 'COLL')).toBe(true);
    await mount(s, 'collection', ON);
    const r = row('COLL'); expect(r.matches('.up.zg[data-zero-gain=COLL]')).toBe(true);
    const li = r.querySelector('ul.fx > li')!; expect(li.className).toBe('zg-line');
    expect(li.children[0].className).toBe('fx-t'); expect(li.querySelectorAll('.zg-chip').length).toBe(1);
    expect(li.querySelector('.zg-chip')!.textContent).toBe('No gain now'); expect(li.querySelector('.fx-t')!.textContent).toMatch(/^Eggs per tap \d+ → \d+$/);
    expect(li.querySelector('.fx-t .arrow')).not.toBeNull();
    expect(r.textContent).not.toMatch(/\+0/);
    const b = buyOf('COLL'); expect(b.classList.contains('affordable')).toBe(false); expect(b.getAttribute('aria-disabled')).toBe('false');
    expect(b.hasAttribute('aria-label')).toBe(false); expect(b.getAttribute('aria-describedby')).toBe('zg-desc-coll');
    const d = document.getElementById('zg-desc-coll')!; expect(d.hidden).toBe(true); expect(d.textContent).toBe("No income gain now. Buying won't raise income.");
    expect(document.querySelectorAll('[aria-label*="gain"]').length).toBe(0);
  });
  it('unaffordable ZG Collection: disabled Buy + Need $X more; unaffordable ZG Hens: disabled Buy, no Need / ETA', async () => {
    await mount(COLL_ZG(0), 'collection', ON);
    expect(buyOf('COLL').getAttribute('aria-disabled')).toBe('true'); expect(row('COLL').textContent).toMatch(/Need \$[\d.,KMBT]+ more/);
    expect(row('COLL').matches('.zg')).toBe(true);
    const h = FX.FLIP(); expect(isZeroGain(h, ON, 'HENS')).toBe(true);
    await mount({ ...h, coinsCents: 0 }, 'farm', ON);
    const r = row('HENS'); expect(r.matches('.up.zg[data-zero-gain=HENS]')).toBe(true);
    expect(buyOf('HENS').getAttribute('aria-disabled')).toBe('true'); expect(buyOf('HENS').getAttribute('aria-describedby')).toBe('zg-desc-hens');
    expect(r.textContent).not.toMatch(/Need|Ready in|Affordable in/); expect(r.querySelector('.hint.eta')).toBeNull();
  });
  it('non-ZG rows: no .zg / data-zero-gain / chip / zg-desc describedby; .affordable follows coins', async () => {
    const s = FX.FLIP(); expect(isZeroGain(s, ON, 'COLL')).toBe(false);
    await mount(s, 'collection', ON);
    expect(row('COLL').matches('.zg, [data-zero-gain]')).toBe(false); expect(document.querySelector('.zg-chip')).toBeNull();
    expect(buyOf('COLL').classList.contains('affordable')).toBe(true); expect(buyOf('COLL').hasAttribute('aria-describedby')).toBe(false);
  });
});

describe('ZG-AC6 [UI] not offered', () => {
  it('FX-L30: MAX Hens / Egg value / Farm never carry data-zero-gain; only COLL does', async () => {
    await mount(FX.L30(), 'farm', ON);
    expect(document.querySelectorAll('[data-zero-gain]').length).toBe(0);
    await mount(FX.L30(), 'collection', ON);
    expect([...document.querySelectorAll<HTMLElement>('[data-zero-gain]')].map(e => e.dataset.zeroGain)).toEqual(['COLL']);
  });
});

describe('ZG-AC5/16/17/17b/18 [UI] ★ never on a ZG row', () => {
  it('FX-L30 (all ZG): no [data-best-buy], strip has no ★, COLL muted', async () => {
    await mount(FX.L30(), 'collection', ON);
    expect(document.querySelector('[data-best-buy]')).toBeNull(); expect(document.querySelector('#goal .ng-star')).toBeNull();
    expect(document.querySelector('#goal')!.textContent).not.toMatch(/★/); expect(row('COLL').matches('.zg')).toBe(true);
  });
  it('flag off, same FX-L30: the stock picker may mark COLL (baseline behaviour kept)', async () => {
    await mount(FX.L30(), 'collection', OFF);
    expect(document.querySelector('.zg, [data-zero-gain]')).toBeNull();
  });
  it('FX-L30u (E18): no [data-best-buy] anywhere; strip names Farm without ★', async () => {
    for (const tab of ['collection', 'farm'] as const) { await mount(FX.L30u(), tab, ON); expect(document.querySelector('[data-best-buy]')).toBeNull(); }
    const g = document.querySelector('#goal')!.textContent!; expect(g).not.toMatch(/★/); expect(g).toMatch(/Farm/);
  });
  it('FX-FLIP after the COLL buy: no row has both data-zero-gain and data-best-buy; the chip key (if any) is non-ZG', async () => {
    for (const tab of ['collection', 'farm'] as const) {
      await mount(COLL_ZG(), tab, ON);
      for (const r of document.querySelectorAll('[data-zero-gain]')) expect(r.querySelector('[data-best-buy]')).toBeNull();
    }
  });
});

describe('ZG-AC21 [UI] Upgrades nav dot', () => {
  it('FX-L30 (COLL affordable + ZG, Farm MAX): hidden; flag off: shown (baseline)', async () => {
    await mount(FX.L30(), 'collection', ON); expect(dot().hidden).toBe(true);
    await mount(FX.L30(), 'collection', OFF); expect(dot().hidden).toBe(false);
  });
  it('FX-FLIP after the COLL buy, coins >= C1 cost and < Farm cost: hidden; before the buy: shown', async () => {
    const { farmCost, collectionCost } = await import('../src/sim/state');
    const coins = Math.max(collectionCost(1, ON), 0) * 100 + 1; expect(coins).toBeLessThan(farmCost(4, ON) * 100);
    await mount(COLL_ZG(coins), 'collection', ON); expect(dot().hidden).toBe(true);
    await mount({ ...FX.FLIP(), coinsCents: collectionCost(0, ON) * 100 + 1 }, 'collection', ON); expect(dot().hidden).toBe(false);
    await mount({ ...COLL_ZG(farmCost(4, ON) * 100 + 1) }, 'collection', ON); expect(dot().hidden).toBe(false); // Farm affordable
  });
});

describe('ZG-AC9 / ZG-AC15 [UI + telemetry] Buy works with confirm 0; upgrade.zero_gain', () => {
  const lastUp = (g: Game) => [...g.telemetry.events()].reverse().find(e => e.type === 'upgrade')!;
  it('one Buy tap on an affordable ZG row: sim event deep-equal to flag-off; telemetry = flag-off record + zero_gain: true', async () => {
    const evs: Record<string, unknown[]> = {}; const recs: Record<string, any> = {};
    for (const [name, bal] of [['on', ON], ['off', OFF]] as const) {
      const { g } = await mount(COLL_ZG(), 'collection', bal); evs[name] = []; g.on((e: any) => { if (e.type === 'upgrade') evs[name].push(e); });
      buyOf('COLL').click(); recs[name] = { ...lastUp(g) }; expect(g.state.collectionLevel).toBe(2);
    }
    expect(evs.on).toEqual(evs.off); expect(evs.on.length).toBe(1);
    expect(recs.off).not.toHaveProperty('zero_gain'); expect(recs.on).toEqual({ ...recs.off, zero_gain: true });
  });
  it('flag on: zero_gain = isZeroGain(pre-buy) for collection/hens/eggValue (true and false cases); absent for farm; flag off absent', async () => {
    const cases: [object, 'collection' | 'farm', string, boolean | undefined][] = [
      [COLL_ZG(), 'collection', 'COLL', true], [FX.FLIP(), 'collection', 'COLL', false],
      [{ ...FX.FLIP() }, 'farm', 'HENS', true], [COLL_ZG(), 'farm', 'HENS', false], [FX.FLIP(), 'farm', 'VALUE', undefined], [FX.FLIP(), 'farm', 'FARM', undefined]];
    for (const [s, tab, k, want] of cases) {
      const { g } = await mount(s, tab, ON);
      if (want !== undefined) expect(isZeroGain(g.state, ON, k as any)).toBe(want);
      const b = k === 'FARM' ? document.querySelector<HTMLElement>('#uRow .up[data-track=farm] button.btn.buy')! : buyOf(k); b.click();
      const r = lastUp(g); expect(r, k).toBeTruthy();
      if (k === 'FARM') expect(r).not.toHaveProperty('zero_gain');
      else if (k === 'VALUE') expect(r.zero_gain).toBe(isZeroGain(s as any, ON, 'VALUE'));
      else expect(r.zero_gain).toBe(want);
      const { g: g0 } = await mount(s, tab, OFF);
      (k === 'FARM' ? document.querySelector<HTMLElement>('#uRow .up[data-track=farm] button.btn.buy')! : buyOf(k)).click();
      expect(lastUp(g0)).not.toHaveProperty('zero_gain');
    }
    expect(OFF.m4!.zeroGain!.confirm).toBe(0);
  });
  it('confirm 0 (shipped tunable): no .zg-confirm, no aria-expanded / aria-controls; no zero_gain_confirm', async () => {
    const { g } = await mount(COLL_ZG(), 'collection', ON);
    expect(document.querySelector('.zg-confirm')).toBeNull(); expect(buyOf('COLL').hasAttribute('aria-expanded')).toBe(false);
    expect(buyOf('COLL').hasAttribute('aria-controls')).toBe(false);
    buyOf('COLL').click(); expect(g.telemetry.events().some(e => e.type === 'zero_gain_confirm')).toBe(false);
  });
});

describe('ZG-AC12 [no-regression] flag off: no ZG markup, stock picker, no zero_gain; save bytes equal on vs off', () => {
  it.each([['(0, m4 1)', mk(0)], ['(1, m4 0)', mk(1, 1, 0, 0)], ['(0, 0)', mk(0, 0, 0, 0)]])('%s: no ZG nodes on every fixture', async (_n, bal) => {
    for (const f of [FX.FLIP, COLL_ZG, FX.L30, FX.L30u, FX.H20]) for (const tab of ['collection', 'farm'] as const) {
      await mount(f(), tab, bal); expect(document.querySelectorAll(ZG_SEL).length).toBe(0);
    }
  });
  it('save JSON after the same actions is byte-identical with the flag on and off', async () => {
    const raws: string[] = [];
    for (const bal of [ON, OFF]) { const { g } = await mount(COLL_ZG(), 'collection', bal); buyOf('COLL').click(); g.save(); raws.push((g as any).kv.getItem('eggfarm.save')); }
    // v6BackupId is a random per-Game id (and `sum` covers it): pinned to one value before comparing; every other byte must match.
    const norm = (r: string) => { const o = JSON.parse(r); o.state.v6BackupId = 'X'; delete o.sum; return JSON.stringify(o); };
    expect(raws[0]).toBeTruthy(); expect(norm(raws[0])).toBe(norm(raws[1]));
  });
});

describe('bestBuyV2 interaction (errata E-3; BBv2 mechanics are row 29, not built: the flag alone changes nothing here)', () => {
  it('zeroGainUi on: markup, nav dot and ★ are identical with m4.flags.bestBuyV2 = 0 and 1 on every fixture', async () => {
    for (const f of [FX.FLIP, COLL_ZG, FX.L30, FX.L30u, FX.H20]) for (const tab of ['collection', 'farm'] as const) {
      const out: string[] = [];
      for (const bb of [0, 1]) { await mount(f(), tab, mk(1, 0, bb)); out.push(document.querySelector('#uRow')!.innerHTML + '|' + dot().hidden + '|' + document.querySelector('#goal')!.textContent); }
      expect(out[1]).toBe(out[0]);
    }
  });
});

describe('ZG-AC10 [UI] confirm strip (m4.zeroGain.confirm = 1, test config only) — UI-ZG-11/13/14/15/16/18', () => {
  const C1 = mk(1, 1);
  const strip = () => document.querySelector<HTMLElement>('#zgc-coll')!;
  const zgc = (g: Game) => g.telemetry.events().filter(e => e.type === 'zero_gain_confirm').map(e => e.outcome);
  it('rendered once, hidden; Buy is a disclosure (aria-controls resolves, aria-expanded false); non-ZG rows have neither', async () => {
    await mount(COLL_ZG(), 'collection', C1);
    expect(document.querySelectorAll('.zg-confirm').length).toBe(1); expect(strip().hidden).toBe(true);
    expect(strip().getAttribute('role')).toBe('group'); expect(document.getElementById(strip().getAttribute('aria-labelledby')!)!.textContent).toBe("This won't raise income now.");
    expect(buyOf('COLL').getAttribute('aria-controls')).toBe('zgc-coll'); expect(buyOf('COLL').getAttribute('aria-expanded')).toBe('false');
    expect(row('COLL').nextElementSibling).toBe(strip());
    await mount(FX.FLIP(), 'collection', C1); expect(buyOf('COLL').hasAttribute('aria-expanded')).toBe(false); expect(document.querySelector('.zg-confirm')).toBeNull();
  });
  it('tap opens (no buy, focus Buy anyway); Buy anyway at +80 ms ignored; at +450 ms: one confirm then the upgrade (zero_gain true), focus row Buy', async () => {
    t = 10000; const { g } = await mount(COLL_ZG(), 'collection', C1); const st0 = strip();
    buyOf('COLL').click(); expect(g.state.collectionLevel).toBe(1); expect(strip().hidden).toBe(false);
    expect(buyOf('COLL').getAttribute('aria-expanded')).toBe('true'); expect(document.activeElement?.textContent).toBe('Buy anyway');
    t += 80; (strip().querySelector('[data-zg=confirm]') as HTMLElement).click(); expect(g.state.collectionLevel).toBe(1); expect(strip().hidden).toBe(false); expect(zgc(g)).toEqual([]);
    (strip().querySelector('[data-zg=cancel]') as HTMLElement).click(); expect(strip().hidden).toBe(false); // guarded too
    expect(strip()).toBe(st0); // never re-inserted while open
    t += 370; (strip().querySelector('[data-zg=confirm]') as HTMLElement).click();
    expect(g.state.collectionLevel).toBe(2); expect(zgc(g)).toEqual(['confirm']);
    const ev = g.telemetry.events(); const iC = ev.findIndex(e => e.type === 'zero_gain_confirm'), iU = ev.findIndex(e => e.type === 'upgrade');
    expect(iC).toBeLessThan(iU); expect(ev[iU].zero_gain).toBe(true); expect(ev[iC]).toMatchObject({ upgrade_id: 'collection', outcome: 'confirm' });
    expect(document.activeElement).toBe(buyOf('COLL'));
  });
  it('E16: Buy anyway with coins < cost -> confirm logged, no upgrade', async () => {
    t = 20000; const { g } = await mount(COLL_ZG(), 'collection', C1); buyOf('COLL').click(); g.state = { ...g.state, coinsCents: 0 };
    t += 400; (strip().querySelector('[data-zg=confirm]') as HTMLElement).click();
    expect(g.state.collectionLevel).toBe(1); expect(zgc(g)).toEqual(['confirm']); expect(g.telemetry.events().some(e => e.type === 'upgrade')).toBe(false);
  });
  it('re-tap on Buy (also within 350 ms) closes: no buy, one cancel, focus stays on Buy, no tab re-render', async () => {
    t = 30000; const { g } = await mount(COLL_ZG(), 'collection', C1); const b = buyOf('COLL');
    b.focus(); b.click(); t += 60; b.click();
    expect(strip().hidden).toBe(true); expect(b.getAttribute('aria-expanded')).toBe('false'); expect(document.activeElement).toBe(b);
    expect(b.isConnected).toBe(true); expect(g.state.collectionLevel).toBe(1); expect(zgc(g)).toEqual(['cancel']);
  });
  it('Cancel / Esc / outside pointerdown close with one cancel each and focus the row Buy; Esc does not close the panel', async () => {
    t = 40000; const { g } = await mount(COLL_ZG(), 'collection', C1);
    buyOf('COLL').click(); t += 400; (strip().querySelector('[data-zg=cancel]') as HTMLElement).click();
    expect(strip().hidden).toBe(true); expect(document.activeElement).toBe(buyOf('COLL'));
    buyOf('COLL').click(); t += 400; (document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(strip().hidden).toBe(true); expect(document.activeElement).toBe(buyOf('COLL'));
    buyOf('COLL').click(); document.querySelector('#goal')!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(strip().hidden).toBe(true); expect(buyOf('COLL').getAttribute('aria-expanded')).toBe('false');
    expect(zgc(g)).toEqual(['cancel', 'cancel', 'cancel']); expect(g.state.collectionLevel).toBe(1);
  });
  it('one strip at a time: unreachable via two rows on shipped data (Egg value is never ZG on the F5–28 grid, spec E5); see zg-ui-onestrip.test.ts', () => {
    let n = 0; for (let F = 5; F <= 28; F++) for (let V = 0; V < F + 3; V++) if (isZeroGain(fx(F, 0, V, 0), C1, 'VALUE')) n++;
    expect(n).toBe(0);
  });
  it('UI-ZG-18: repeat Enter/Space keydown on Buy anyway / Cancel is defaultPrevented and does nothing, any time after opening', async () => {
    t = 60000; const { g } = await mount(COLL_ZG(), 'collection', C1); buyOf('COLL').click(); t += 600;
    for (const sel of ['[data-zg=confirm]', '[data-zg=cancel]']) for (const key of ['Enter', ' ']) {
      const ev = new KeyboardEvent('keydown', { key, repeat: true, bubbles: true, cancelable: true }); strip().querySelector(sel)!.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true);
    }
    expect(strip().hidden).toBe(false); expect(g.state.collectionLevel).toBe(1); expect(zgc(g)).toEqual([]);
  });
  it('the open strip survives an unrelated re-render (coins tick) and stays the same open state', async () => {
    t = 70000; const { g, ui } = await mount(COLL_ZG(), 'collection', C1); buyOf('COLL').click();
    g.state = { ...g.state, coinsCents: g.state.coinsCents + 12345 }; t += 1500; ui.render();
    expect(strip().hidden).toBe(false); expect(buyOf('COLL').getAttribute('aria-expanded')).toBe('true');
  });
});

describe('D-COL-2026-10-30-29 (a): every opened strip ends in exactly one confirm or one cancel (ZG-AC10, spec L379-382)', () => {
  const C1 = mk(1, 1);
  const zgc = (g: Game) => g.telemetry.events().filter(e => e.type === 'zero_gain_confirm').map(e => ({ id: e.upgrade_id, o: e.outcome }));
  it('re-tap on Buy while open: closes, no buy, exactly one cancel, focus stays on Buy', async () => {
    t = 80000; const { g } = await mount(COLL_ZG(), 'collection', C1); const b = buyOf('COLL'); const coins = g.state.coinsCents;
    b.focus(); b.click(); t += 1000; b.click();
    expect(document.querySelector<HTMLElement>('#zgc-coll')!.hidden).toBe(true); expect(document.activeElement).toBe(b);
    expect(zgc(g)).toEqual([{ id: 'collection', o: 'cancel' }]); expect(g.state.collectionLevel).toBe(1); expect(g.state.coinsCents).toBe(coins);
  });
  it('tab switch while open: exactly one cancel, no buy; the strip is not re-opened on return', async () => {
    t = 81000; const { g, ui } = await mount(COLL_ZG(), 'collection', C1); buyOf('COLL').click();
    (document.querySelector('[data-tab=farm]') as HTMLElement).click(); ui.render(); ui.render();
    expect(zgc(g)).toEqual([{ id: 'collection', o: 'cancel' }]); expect(g.state.collectionLevel).toBe(1);
    (document.querySelector('[data-tab=collection]') as HTMLElement).click(); ui.render(); ui.render();
    expect(document.querySelector<HTMLElement>('#zgc-coll')!.hidden).toBe(true); expect(buyOf('COLL').getAttribute('aria-expanded')).toBe('false');
    expect(zgc(g)).toHaveLength(1);
  });
  it('re-render that drops the strip (row no longer ZG): exactly one cancel, no buy', async () => {
    t = 82000; const { g, ui } = await mount(COLL_ZG(), 'collection', C1); buyOf('COLL').click();
    g.state = { ...g.state, collectionLevel: 0 } as any; expect(isZeroGain(g.state, C1, 'COLL')).toBe(false); t += 1000; ui.render(); ui.render();
    expect(document.querySelector('#zgc-coll')).toBeNull(); expect(zgc(g)).toEqual([{ id: 'collection', o: 'cancel' }]);
    expect(g.telemetry.events().some(e => e.type === 'upgrade')).toBe(false);
    ui.render(); expect(zgc(g)).toHaveLength(1);
  });
  it('closing the Upgrades panel while open: exactly one cancel, no buy; reopening shows it closed', async () => {
    t = 83000; const { g, ui } = await mount(COLL_ZG(), 'collection', C1); buyOf('COLL').click();
    ui.openPanel(null); ui.render(); expect(zgc(g)).toEqual([{ id: 'collection', o: 'cancel' }]);
    ui.openPanel('upgrades'); ui.render(); ui.render();
    expect(document.querySelector<HTMLElement>('#zgc-coll')!.hidden).toBe(true); expect(zgc(g)).toHaveLength(1); expect(g.state.collectionLevel).toBe(1);
  });
  it('unrelated re-render keeps the strip open with no event; the later confirm is the only event', async () => {
    t = 84000; const { g, ui } = await mount(COLL_ZG(), 'collection', C1); buyOf('COLL').click();
    g.state = { ...g.state, coinsCents: g.state.coinsCents + 1 }; ui.render(); expect(zgc(g)).toEqual([]);
    t += 400; (document.querySelector('#zgc-coll [data-zg=confirm]') as HTMLElement).click();
    expect(zgc(g)).toEqual([{ id: 'collection', o: 'confirm' }]); expect(g.state.collectionLevel).toBe(2);
  });
});

describe('D-COL-2026-10-30-29 (b): an unaffordable ZG row keeps its disabled Buy, opens no strip, logs no event (spec L212, E11)', () => {
  it.each([[0], [1]])('confirm=%i: unaffordable ZG Collection and Hens: aria-disabled, no disclosure attrs, tap = no strip, no event, no buy', async (confirm) => {
    const B = mk(1, confirm);
    for (const [s, tab, k] of [[COLL_ZG(0), 'collection', 'COLL'], [{ ...FX.FLIP(), coinsCents: 0 }, 'farm', 'HENS']] as const) {
      t += 10000; const { g } = await mount(s, tab, B); expect(isZeroGain(g.state, B, k as any), `${k} precondition`).toBe(true);
      const b = buyOf(k); expect(row(k).matches('.zg')).toBe(true);
      expect(b.getAttribute('aria-disabled')).toBe('true'); expect(b.hasAttribute('aria-expanded')).toBe(false); expect(b.hasAttribute('aria-controls')).toBe(false);
      const n0 = g.telemetry.events().length, st0 = JSON.stringify(g.state);
      b.click(); b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); b.click();
      expect(document.querySelector('.zg-confirm:not([hidden])'), `${k} no strip`).toBeNull();
      expect(g.telemetry.events().length, `${k} no event`).toBe(n0); expect(JSON.stringify(g.state)).toBe(st0);
    }
  });
  it('confirm=1, stale markup (rendered affordable, live coins now short): the tap opens no strip and logs nothing (live state decides, S2-4a)', async () => {
    t += 10000; const { g } = await mount(COLL_ZG(), 'collection', mk(1, 1)); const b = buyOf('COLL'); expect(b.getAttribute('aria-controls')).toBe('zgc-coll');
    g.state = { ...g.state, coinsCents: 0 } as any; const n0 = g.telemetry.events().length;
    b.click(); expect(document.querySelector<HTMLElement>('#zgc-coll')!.hidden).toBe(true); expect(g.telemetry.events().length).toBe(n0); expect(g.state.collectionLevel).toBe(1);
  });
});
