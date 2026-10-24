// @vitest-environment jsdom
// M4.1 patch 1 (HoQA via HoE): #scene counts any click as a Collect (app.ts `scene.addEventListener('click', collect)`; #scene has no
// pointerdown / touchstart listener). The ported asleep/unpaid banner, the Refill controls (nav + Workers-tab) and the asleep count
// badges must never credit a Collect, while each control still does its own action.
// Finding: none of them is a DOM descendant of #scene (nav + #panel-layer are siblings of main.farm), and none is pointer-events:none,
// so a tap on one never bubbles to #scene and a hit test never falls through to it -> no extra stopPropagation is needed (the nav
// Refill already stops click propagation, pre-existing B8 code). These tests pin that.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { balance as live, type Balance } from '../src/config/balance';
import { Game } from '../src/game';
import { mem } from './helpers';

const b: Balance = { ...live, m4: { ...live.m4!, enabled: 1 } };
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (globalThis as any).cancelAnimationFrame ??= (i: number) => clearTimeout(i);
  (Element.prototype as any).animate ??= () => ({ finished: Promise.resolve(), cancel() {}, onfinish: null, addEventListener() {} });
});
afterEach(() => { document.body.innerHTML = ''; localStorage.clear(); });

const mount = async () => {
  localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false }));
  const g = new Game(b, mem() as any, () => 1760000000000, 1, 'test');
  // 4 hired: Market Hand asleep, Coop Hand unpaid, Hawker tired (refillable), Grader asleep -> banners, badge 3, Refill visible
  g.state = { ...g.state, farmLevel: 20, collectionLevel: 10, coinsCents: 1e9, coop: 40, basket: 7, customers: [], nextCustomerInS: 1e9, manageCdS: 0, graderTier: 1,
    workers: { market_hand: { energy: 0, cdS: 0 }, coop_hand: { energy: 50, cdS: 0, unpaid: true }, hawker: { energy: 20, cdS: 0 }, grader: { energy: 0, cdS: 0 } } } as any;
  const acts: string[] = []; const d = g.dispatch.bind(g); g.dispatch = (a: any) => { acts.push(a.type); return d(a); };
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  document.getElementById('modal-layer')?.classList.remove('open');
  ui.render();
  return { g, ui, acts, scene: document.getElementById('scene')! };
};
const eggs = (g: Game) => ({ coop: g.state.coop, basket: g.state.basket, coins: g.state.coinsCents });
/** A full real-ish tap sequence on el: pointerdown, touchstart, pointerup, click (all bubbling). */
const tap = (el: Element) => {
  for (const t of ['pointerdown', 'pointerup']) el.dispatchEvent(new Event(t, { bubbles: true, cancelable: true }));
  try { el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true })); } catch { el.dispatchEvent(new Event('touchstart', { bubbles: true })); }
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
};

describe('#scene tap guard: banners, Refill, badges never credit a Collect', () => {
  it('control: a tap on #scene IS a Collect (the spy sees it)', async () => {
    const { g, acts, scene } = await mount(); const e0 = eggs(g);
    tap(scene);
    expect(acts).toContain('collect'); expect(g.state.coop).toBeLessThan(e0.coop); expect(g.state.basket).toBeGreaterThan(e0.basket);
  });
  it('asleep/unpaid banners (box, icon, text, sr): no Collect, eggs and coins unchanged; not inside #scene', async () => {
    const { g, ui, acts, scene } = await mount();
    ui.openPanel('upgrades'); (document.querySelector('[data-tab=workers]') as HTMLElement).click(); ui.render(); acts.length = 0;
    const banners = [...document.querySelectorAll('.wk-banner')];
    expect(banners.length).toBe(3); // MH asleep, CH unpaid, Grader asleep
    const e0 = eggs(g);
    for (const bn of banners) { expect(scene.contains(bn)).toBe(false); for (const el of [bn, ...bn.querySelectorAll('*')]) tap(el); }
    expect(acts).not.toContain('collect'); expect(eggs(g)).toEqual(e0);
  });
  it('asleep count badges (Upgrades nav icon, Workers tab): no Collect; the badge tap still does its host button\'s action', async () => {
    const { g, ui, acts, scene } = await mount();
    const nb = document.querySelector('[data-nav=upgrades] .asleep-badge') as HTMLElement;
    expect(nb && !nb.hidden && nb.textContent).toBe('3'); expect(scene.contains(nb)).toBe(false);
    const e0 = eggs(g); acts.length = 0;
    tap(nb);
    expect(acts).not.toContain('collect'); expect(eggs(g)).toEqual(e0);
    expect((document.getElementById('p-upgrades') as HTMLElement).hidden).toBe(false); // own action: opens Upgrades
    ui.render();
    const tb = document.querySelector('.tabs [data-tab=workers] .asleep-badge') as HTMLElement;
    expect(tb && !tb.hidden && tb.textContent).toBe('3'); expect(scene.contains(tb)).toBe(false);
    tap(tb); ui.render();
    expect(acts).not.toContain('collect'); expect(eggs(g)).toEqual(e0);
    expect(document.querySelector('.wk-banner')).not.toBeNull(); // own action: Workers tab selected
  });
  it('nav Refill: no Collect, eggs unchanged, still refills (manageAll) - incl. a tap on its icon / label / count badge', async () => {
    const { g, ui, acts, scene } = await mount();
    const btn = document.querySelector('nav [data-act=manageAll]') as HTMLButtonElement;
    expect(btn.hidden).toBe(false); expect(scene.contains(btn)).toBe(false);
    const e0 = eggs(g); acts.length = 0;
    tap(btn.querySelector('.nav-lbl')!);
    expect(acts).toEqual(['manageAll']); expect(acts).not.toContain('collect');
    expect(g.state.workers.hawker!.energy).toBe(100); // own action: Refill refilled the tired Hawker
    expect({ coop: g.state.coop, basket: g.state.basket }).toEqual({ coop: e0.coop, basket: e0.basket });
    ui.render();
    for (const el of [btn, ...btn.querySelectorAll('*')]) tap(el); // during cooldown: still nothing reaches #scene
    expect(acts).not.toContain('collect'); expect({ coop: g.state.coop, basket: g.state.basket }).toEqual({ coop: e0.coop, basket: e0.basket });
  });
  it('Workers-tab Refill (refill-wrap) and card Refill: no Collect, still refill', async () => {
    const { g, ui, acts, scene } = await mount();
    ui.openPanel('upgrades'); (document.querySelector('[data-tab=workers]') as HTMLElement).click(); ui.render();
    const ma = document.querySelector('#uRow .refill-wrap .manage-all') as HTMLButtonElement;
    expect(ma).not.toBeNull(); expect(scene.contains(ma)).toBe(false);
    const e0 = eggs(g); acts.length = 0;
    tap(ma);
    expect(acts).not.toContain('collect'); expect(acts).toContain('manageAll'); expect(g.state.workers.hawker!.energy).toBe(100);
    expect({ coop: g.state.coop, basket: g.state.basket }).toEqual({ coop: e0.coop, basket: e0.basket });
  });
  it('none of the guarded elements is pointer-events:none in the CSS (a hit test never falls through to #scene)', async () => {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync(`${process.cwd()}/src/ui/styles.css`, 'utf8');
    for (const sel of ['.wk-banner', '.asleep-badge', '.count-badge', '.nav-manage', '.refill-wrap', '.manage-all'])
      for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) if (m[1].split(',').some(s => s.trim().endsWith(sel))) expect(m[2], `${sel}: ${m[1].trim()}`).not.toMatch(/pointer-events:\s*none/);
  });
});
