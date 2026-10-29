// @vitest-environment jsdom
// v5 / M4.1 patch 2: DOM checks on the mounted app (jsdom). Layout/contrast/animation numbers are browser-measured in scripts/m41-p2-browser.mjs.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { serialize, SAVE_KEY } from '../src/save/save';
import { Game } from '../src/game';
import { mem } from './helpers';
import { WARN_SVG } from '../src/ui/icons';

const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
const kvOf = () => { const kv = mem() as any; kv.removeItem = (k: string) => kv.m.delete(k); return kv; };
let n = 0; const id = () => (++n).toString(16).padStart(16, '0');
export async function mount(o: Record<string, unknown>, b: Balance = on) {
  const kv = kvOf();
  kv.setItem(SAVE_KEY, serialize({ ...initialState(b), tracksV7: 1, seenTracksExplainer: true, ...o } as any, 1760000000000));
  kv.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false }));
  const g = new Game(b, kv, () => 1760000000500 + n * 1000, undefined, 'dev', null, null, { idbBoot: 'absent', newId: id });
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  ui.render();
  return { g, ui };
}
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (globalThis as any).cancelAnimationFrame ??= (i: number) => clearTimeout(i);
});
afterEach(() => { document.body.innerHTML = ''; });
const W = (e: number, unpaid = false) => ({ energy: e, cdS: 5, ...(unpaid ? { unpaid: true } : {}) });

describe('m6 HUD #rate: static WARN_SVG + aria-hidden ▼ (UI-M6-1/5/6/8)', () => {
  const rate = () => { const e = document.getElementById('rate')!; return { e, text: e.textContent, tri: e.querySelector('.tri')!, rt: e.querySelector('.rt')!, svgs: e.querySelectorAll('svg.wi'), warn: e.classList.contains('warn'), aria: e.getAttribute('aria-label') }; };
  it('neg (Market Hand asleep, nothing else): no U+26A0 text, ▼ in .tri[aria-hidden], money in .rt, one svg.wi from WARN_SVG, aria unchanged', async () => {
    await mount({ farmLevel: 6, coinsCents: 1e6, customers: [], nextCustomerInS: 1e9, workers: { market_hand: W(0) } });
    const r = rate();
    expect(r.text).not.toContain('\u26A0'); expect(r.text!.startsWith('\u25BC')).toBe(true);
    expect(r.tri.getAttribute('aria-hidden')).toBe('true'); expect(r.tri.textContent).toBe('\u25BC '); expect(r.rt.textContent).toMatch(/^(\u2212)?\$\d+\.\d\d\/s$/);
    expect(r.svgs.length).toBe(1); expect(r.svgs[0].outerHTML.replace(/ xmlns="[^"]*"/, '')).toBe(WARN_SVG.replace(/ xmlns="[^"]*"/, '').replace(/\/>/g, '></path>').replace(/<circle([^>]*)><\/path>/, '<circle$1></circle>'));
    expect(r.svgs[0].getAttribute('aria-hidden')).toBe('true'); expect(r.svgs[0].getAttribute('focusable')).toBe('false');
    expect(r.warn).toBe(true); expect(r.aria).toMatch(/^Net income .* per second, sales stopped$/); // D-HOP-32 (a) suffix kept, byte form unchanged
  });
  it('pos: no .warn (icon hidden by CSS), .tri empty, text "+$X/s"', async () => {
    await mount({ farmLevel: 6, coinsCents: 1e6, collectionLevel: 5, workers: { market_hand: W(90), coop_hand: W(90) } });
    const r = rate(); expect(r.warn).toBe(false); expect(r.tri.textContent).toBe(''); expect(r.text).toMatch(/^\+\$/); expect(r.svgs.length).toBe(1);
  });
});

describe('m1 yard: keyed per-slot diff (UI-M1-1/3/4/5/6)', () => {
  const hens = () => [...document.querySelectorAll<HTMLImageElement>('#yard img.hen')];
  it('first render: no .pop; Hens buys keep every existing node, add only new hens with .pop + "0s, <stagger>", cap 12 = 0 mutations', async () => {
    const { g, ui } = await mount({ farmLevel: 10, hensLevel: 0, coinsCents: 1e15 });
    const yard = document.getElementById('yard')!;
    expect(yard.children.length).toBe(12); const h0 = hens(); expect(h0.length).toBe(5);
    expect(h0.every(h => !h.classList.contains('pop'))).toBe(true); // UI-M1-6
    // UI-M1-6: slot order [2,3,1,4,0,5,8,9,7,10,6,11] and flip on i%3 = 2
    const slotOf = (h: Element) => [...yard.children].indexOf(h.parentElement!);
    expect(h0.map(slotOf).sort((a, c) => a - c)).toEqual([0, 1, 2, 3, 4]);
    for (const h of h0) expect(h.classList.contains('flip')).toBe(slotOf(h) % 3 === 2);
    const created: Node[] = [], removed: Node[] = [];
    const mo = new MutationObserver(ms => { for (const m of ms) { created.push(...m.addedNodes); removed.push(...m.removedNodes); } }); mo.observe(yard, { childList: true, subtree: true });
    for (let k = 0; k < 5; k++) { g.dispatch({ type: 'buyTrack', track: 'hens' } as any); ui.render(); }
    await Promise.resolve(); mo.disconnect();
    expect(g.state.hensLevel).toBe(5);
    const h1 = hens(); expect(h1.length).toBe(12);
    for (const h of h0) expect(h1).toContain(h); // UI-M1-1: same objects
    expect(created.length).toBe(7); expect(removed.length).toBe(0); // 5 -> 10 -> 12 (cap): 7 created, 0 discarded
    const fresh = h1.filter(h => !h0.includes(h));
    for (const h of fresh) { expect(h.classList.contains('pop')).toBe(true); expect(h.style.animationDelay).toBe(`0s, ${(slotOf(h) * .15).toFixed(2)}s`); }
    for (const h of h0) expect(h.style.animationDelay).toBe(`${(slotOf(h) * .15).toFixed(2)}s`);
    // UI-M1-5: at the cap a further buy is 0 child mutations
    let muts = 0; const mo2 = new MutationObserver(ms => { muts += ms.length; }); mo2.observe(yard, { childList: true, subtree: true, attributes: true });
    g.dispatch({ type: 'buyTrack', track: 'hens' } as any); ui.render(); await Promise.resolve(); mo2.disconnect();
    expect(g.state.hensLevel).toBe(6); expect(muts).toBe(0);
  });
});

describe('P2b AC-R11 / TP1-U2: a Refill tap on an Unpaid worker dispatches nothing', () => {
  it('MH Unpaid at 30% (<= T), cooldown 0: tap -> no manage dispatch, energy/cooldown unchanged; a Tired worker still refills', async () => {
    const { g, ui } = await mount({ farmLevel: 10, coinsCents: 100, manageCdS: 0, customers: [], nextCustomerInS: 1e9, workers: { market_hand: { energy: 30, cdS: 5, unpaid: true }, coop_hand: { energy: 30, cdS: 5 } } });
    ui.openPanel('upgrades'); (document.querySelector('.tabs button[data-tab="workers"]') as HTMLElement).click(); ui.render();
    const sent: any[] = []; const orig = g.dispatch.bind(g); (g as any).dispatch = (a: any) => { sent.push(a); return orig(a); };
    const btn = (id: string) => document.querySelector<HTMLElement>(`#uRow button[data-act="manage"][data-w="${id}"]`)!;
    expect(btn('market_hand').getAttribute('aria-disabled')).toBe('true');
    expect(btn('market_hand').getAttribute('aria-label')).toBe('Refill Market Hand');
    btn('market_hand').click();
    expect(sent.filter(a => a.type === 'manage')).toEqual([]); expect(g.state.workers.market_hand!.energy).toBe(30); expect(g.state.manageCdS).toBe(0);
    btn('coop_hand').click(); expect(sent.filter(a => a.type === 'manage')).toEqual([{ type: 'manage', worker: 'coop_hand' }]); expect(g.state.workers.coop_hand!.energy).toBe(100);
  });
});

describe('P2a AC-R17 (m-P1-1, WCAG 2.5.3): name starts with the visible text in DOM order, count announced', () => {
  // Visible text the way axe's label-content-name-mismatch reads it (text nodes in DOM order joined with '', [hidden] skipped).
  const visible = (el: Element): string => [...el.childNodes].map(n => n.nodeType === 3 ? n.nodeValue ?? '' : n.nodeType === 1 && !(n as HTMLElement).hidden ? visible(n as Element) : '').join('');
  const norm = (t: string) => t.replace(/\s+/g, ' ').trim();
  const startsWithVisible = (el: Element) => { const v = norm(visible(el)), name = el.getAttribute('aria-label') ?? ''; return { v, name, ok: name.startsWith(v) }; };
  const scenes: [string, Record<string, unknown>, number][] = [
    ['MH asleep', { market_hand: { energy: 0, cdS: 5 } }, 1], ['CH asleep', { coop_hand: { energy: 0, cdS: 5 } }, 1],
    ['MH + CH asleep', { market_hand: { energy: 0, cdS: 5 }, coop_hand: { energy: 0, cdS: 5 } }, 2],
    ['MH unpaid', { market_hand: { energy: 60, cdS: 5, unpaid: true } }, 1], ['CH unpaid', { coop_hand: { energy: 60, cdS: 5, unpaid: true } }, 1],
    ['MH + CH unpaid', { market_hand: { energy: 60, cdS: 5, unpaid: true }, coop_hand: { energy: 60, cdS: 5, unpaid: true } }, 2],
    ['MH asleep + CH unpaid', { market_hand: { energy: 0, cdS: 5 }, coop_hand: { energy: 60, cdS: 5, unpaid: true } }, 2],
    ['none (N = 0)', { market_hand: { energy: 90, cdS: 5 }, coop_hand: { energy: 90, cdS: 5 } }, 0]];
  for (const [name, workers, n] of scenes) it(`${name}: Upgrades nav, Workers tab, Refill nav`, async () => {
    const { ui } = await mount({ farmLevel: 12, coinsCents: 0, manageCdS: 0, customers: [], nextCustomerInS: 1e9, workers: { market_hand: { energy: 90, cdS: 5 }, coop_hand: { energy: 90, cdS: 5 }, hawker: { energy: 30, cdS: 0 }, ...workers } }); // 3 hired: nav Refill shown
    ui.openPanel('upgrades'); (document.querySelector('.tabs button[data-tab="workers"]') as HTMLElement).click(); ui.render();
    const up = startsWithVisible(document.querySelector('nav [data-nav=upgrades]')!), wt = startsWithVisible(document.querySelector('.tabs [data-tab=workers]')!);
    expect(up.ok, JSON.stringify(up)).toBe(true); expect(wt.ok, JSON.stringify(wt)).toBe(true);
    if (n > 0) {
      expect(up.v).toBe(`${n} Upgrades`); expect(up.name).toBe(`${n} Upgrades, ${n} worker${n > 1 ? 's' : ''} asleep or unpaid`);
      expect(wt.v).toBe(`Workers ${n}`); expect(wt.name).toBe(`Workers ${n}, ${n} asleep or unpaid`); // count announced, never bare "Workers"
    } else { expect(up.name).toBe('Upgrades'); expect(wt.name).toBe('Workers'); expect(wt.v).toBe('Workers'); }
    const rf = document.querySelector('nav .nav-manage')! as HTMLElement; // the hawker at 30% is tired: N >= 1 (Unpaid never counted)
    expect(rf.hidden).toBe(false); const r = startsWithVisible(rf);
    expect(r.ok, JSON.stringify(r)).toBe(true); expect(r.v).toMatch(/^Refill \d+$/); expect(r.name).toMatch(/^Refill (1 tired worker|\d+ tired workers)$/);
    expect(document.getElementById('rate')!.getAttribute('aria-label')).toMatch(/^Net income /); // frozen suffix form (TP1-R17d)
  });
});
