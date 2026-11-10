// @vitest-environment jsdom
// #11 Rule 2 HUD fatigue cue (sales-stopped-spec cfff3817 §4.8; Art fatigue-ux v1.3.1 ffb13c19 FC-SV1-16). Sim state = local stub.
// jsdom has no layout: the 739/740 variant is CSS-only (asserted on the emitted query); DOM, names, popover semantics and behaviour are tested here.
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { Game } from '../src/game';
import { mem } from './helpers';
import { stallStub, type FatigueCueView } from '../src/ui/stall-sim-stub';
import { cueCopy, FATIGUE_SUBLINE_MIN_H, shortViewportQuery } from '../src/ui/fatigue-cue';

const shift = vi.hoisted(() => ({ calls: [] as unknown[][] }));
vi.mock('../src/ui/shift-sheet', () => ({ openShiftSheet: (...a: unknown[]) => { shift.calls.push(a); } }));
const mqs: { q: string; matches: boolean; fire: () => void }[] = [];
beforeAll(() => {
  window.matchMedia = ((q: string) => { const l: (() => void)[] = []; const m = { matches: false, media: q, addEventListener: (_: string, f: () => void) => l.push(f), removeEventListener() {}, addListener() {}, removeListener() {}, fire: () => l.forEach(f => f()) };
    mqs.push({ q, get matches() { return m.matches; }, set matches(v: boolean) { m.matches = v; }, fire: m.fire } as any); return m; }) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  vi.spyOn(performance, 'now').mockImplementation(() => 5000);
});
beforeEach(() => { stallStub.reset(); shift.calls = []; localStorage.clear(); mqs.length = 0; document.head.querySelectorAll('#fc-mq').forEach(e => e.remove()); });
const fl = (f: Record<string, number>): Balance => ({ ...balance, m4: { ...balance.m4!, enabled: 1, flags: { ...balance.m4!.flags, ...f } } } as Balance);
const FC = fl({ salesStopped: 1, fatigueCue: 1 }), SS_ONLY = fl({ salesStopped: 1 }), FC_ONLY = fl({ fatigueCue: 1 });
const W = (energy: number) => ({ energy, cdS: 0 });
const st = (workers: GameState['workers']): GameState => ({ ...initialState(balance, 1), farmLevel: 6, collectionLevel: 3, hensLevel: 6, tracksV7: 1, coinsCents: 5000, basket: 3, coop: 2, customers: [], workers } as GameState);
const cue = (shown: boolean, extra: Partial<FatigueCueView> = {}): FatigueCueView => ({ share: 0.2, shown, episodeId: 'e1', suppressedByStall: false, ...extra });
async function mount(bal: Balance, s = st({ market_hand: W(10), coop_hand: W(10) })) {
  localStorage.setItem('eggfarm.ui', JSON.stringify({ reducedMotion: true, onboardingDone: true }));
  const g = new Game(bal, mem() as any, () => 1760000000000, 1, 'test'); g.state = { ...g.state, ...s } as any;
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, bal, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  ui.render();
  const $ = <T extends HTMLElement>(q: string) => document.querySelector(q) as T;
  return { g, ui, chip: () => $<HTMLButtonElement>('.hud .fchip'), pop: () => $('#fpop'), sub: () => $<HTMLButtonElement>('.fslot .fsub'), slot: () => $('.fslot') };
}
describe('#11 copy (pure, FC-SV14)', () => {
  it('Tired / Asleep names and descriptions; U+2212 minus; floored compact money', () => {
    expect(cueCopy(129_99, false)).toMatchObject({ short: 'Tired \u2212$129.99/s', chipName: 'Tired workers are costing $129.99 per second. Show details.', subDesc: 'Tired workers are costing $129.99 per second. Open workers.' });
    expect(cueCopy(12_999_999, true)).toMatchObject({ x: '$129.9K', chipName: 'Asleep and tired workers are costing $129.9K per second. Show details.' });
  });
  it('one breakpoint constant drives the emitted query', () => {
    expect(FATIGUE_SUBLINE_MIN_H).toBe(740); expect(shortViewportQuery()).toBe('(max-height: 739px)');
  });
});
describe('#11 flag guard (SS-23 / SS-23f)', () => {
  it('fatigueCue = 0 (salesStopped = 1): no slot, no chip; fatigueCue = 1 with salesStopped = 0: no effect', async () => {
    for (const bal of [SS_ONLY, FC_ONLY, balance]) {
      stallStub.cue = cue(true); const m = await mount(bal);
      expect(m.slot()).toBeNull(); expect(m.chip()).toBeNull(); expect(document.querySelector('.farm')!.classList.contains('fc-on')).toBe(false);
    }
  });
});
describe('#11 DOM (flag on)', () => {
  it('slot reserved at all times; chip after the basket, popover its next sibling; media query emitted once', async () => {
    const m = await mount(FC);
    expect(m.slot()).not.toBeNull(); expect(m.sub().hidden).toBe(true); expect(m.chip().hidden).toBe(true);
    expect(m.chip().previousElementSibling!.classList.contains('basket')).toBe(true);
    expect(m.chip().nextElementSibling).toBe(m.pop());
    expect(document.getElementById('fc-mq')!.textContent).toContain('@media (max-height: 739px)');
    expect(document.getElementById('fc-mq')!.textContent).toContain('@media (min-height: 740px)');
    expect(document.getElementById('fc-mq')!.textContent).toContain('@media (max-height: 739px){.fslot{display:none}'); // FC-AC9 recount: no .fslot below 740
    expect(document.getElementById('fc-mq')!.textContent).not.toMatch(/fb-on/); // the Rule 3 banner is out of flow (no grid row)
    expect(document.querySelectorAll('.pill.coins[tabindex], .pill.basket[tabindex], .pill.coins[role], .pill.basket[role]').length).toBe(0); // FC-SV16
  });
  it('shows only when shown && !suppressedByStall; noteFatigueCueShown(hud_chip) once per episode', async () => {
    const m = await mount(FC);
    stallStub.cue = cue(true, { suppressedByStall: true }); m.ui.render(); expect(m.chip().hidden).toBe(true); expect(m.sub().hidden).toBe(true);
    stallStub.cue = cue(true); m.ui.render(); m.ui.render(); m.ui.render();
    expect(m.chip().hidden).toBe(false); expect(m.sub().hidden).toBe(false);
    expect(stallStub.notes.filter(n => n.fn === 'noteFatigueCueShown' && n.arg === 'hud_chip').length).toBe(1);
  });
  it('a11y: chip name = .sr sentence (no aria-label), describedby = `Tired −$X/s`, aria-expanded/controls; sub-line name = visible text', async () => {
    const m = await mount(FC); stallStub.atRisk = { market_hand: 1.25 }; stallStub.cue = cue(true); m.ui.render();
    const c = m.chip();
    expect(c.hasAttribute('aria-label')).toBe(false); expect(c.textContent).toBe('Tired workers are costing $1.25 per second. Show details.');
    expect(document.getElementById(c.getAttribute('aria-describedby')!)!.textContent).toBe('Tired \u2212$1.25/s');
    expect(c.getAttribute('aria-expanded')).toBe('false'); expect(c.getAttribute('aria-controls')).toBe('fpop');
    const s = m.sub(); expect(s.hasAttribute('aria-label')).toBe(false);
    expect(s.textContent).toBe('Tired workers \u2212$1.25/s'); // the " workers" span is display:none below 400 px (CSS), so the name is the visible text
    expect(document.getElementById(s.getAttribute('aria-describedby')!)!.textContent).toBe('Tired workers are costing $1.25 per second. Open workers.');
    const p = m.pop(); expect(p.getAttribute('role')).toBe('group'); expect(document.getElementById(p.getAttribute('aria-labelledby')!)!.textContent).toBe('Tired \u2212$1.25/s');
    expect(document.querySelectorAll('[role=dialog]#fpop').length).toBe(0);
  });
  it('Asleep state: zzz icon + asleep sentences; Tired: sweat icon (placeholders until Art assets land)', async () => {
    let m = await mount(FC); stallStub.cue = cue(true); m.ui.render();
    expect(m.chip().querySelector('.fc-ic')!.getAttribute('src')).toMatch(/ico_fatigue_sweat\.svg$/);
    stallStub.reset(); m = await mount(FC, st({ market_hand: W(0) })); stallStub.cue = cue(true); m.ui.render();
    expect(m.chip().querySelector('.fc-ic')!.getAttribute('src')).toMatch(/ico_fatigue_zzz\.svg$/); expect(m.chip().dataset.tone).toBe('asleep');
    expect(m.chip().textContent).toMatch(/^Asleep and tired workers are costing/);
  });
  it('chip tap toggles the non-modal popover (focus stays on the chip); every chip tap logs; Esc closes + refocuses; outside tap closes and passes through', async () => {
    const m = await mount(FC); stallStub.cue = cue(true); m.ui.render();
    m.chip().focus(); m.chip().click();
    expect(m.pop().hidden).toBe(false); expect(m.chip().getAttribute('aria-expanded')).toBe('true'); expect(document.activeElement).toBe(m.chip());
    m.chip().click(); expect(m.pop().hidden).toBe(true);
    expect(stallStub.notes.filter(n => n.fn === 'noteFatigueCueTap').length).toBe(2);
    m.chip().click(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(m.pop().hidden).toBe(true); expect(document.activeElement).toBe(m.chip());
    m.chip().click(); let reached = false; const col = document.getElementById('collect')!; col.addEventListener('pointerdown', () => { reached = true; });
    col.dispatchEvent(new Event('pointerdown', { bubbles: true })); expect(m.pop().hidden).toBe(true); expect(reached).toBe(true);
    expect(stallStub.notes.filter(n => n.fn === 'noteFatigueCueTap').length).toBe(4); // Esc / outside tap log nothing
  });
  it('Manage opens the Shift sheet at the costliest at-risk worker (entry fatigue_chip) and spends nothing', async () => {
    const m = await mount(FC); stallStub.atRisk = { market_hand: 1, coop_hand: 3 }; stallStub.cue = cue(true); m.ui.render();
    m.chip().click(); const before = JSON.stringify(m.g.state); const mg = m.pop().querySelector<HTMLButtonElement>('.fpop-m')!;
    expect(mg.textContent).toBe('Manage'); mg.click();
    expect(shift.calls).toEqual([['coop_hand', mg, 'fatigue_chip']]); expect(JSON.stringify(m.g.state)).toBe(before);
  });
  it('sub-line tap opens Upgrades > Workers and logs one tap', async () => {
    const m = await mount(FC); stallStub.cue = cue(true); m.ui.render(); m.sub().click();
    expect((document.getElementById('p-upgrades') as HTMLElement).hidden).toBe(false);
    expect(stallStub.notes.filter(n => n.fn === 'noteFatigueCueTap')).toEqual([{ fn: 'noteFatigueCueTap', arg: 'hud_chip' }]);
  });
  it('cue resolving closes the popover; stall chip suppression closes it and moves focus to the stall chip (SS-47); crossing 739/740 closes it', async () => {
    const m = await mount(FC, st({ market_hand: W(0) })); stallStub.cue = cue(true); m.ui.render();
    m.chip().click(); stallStub.cue = cue(false); m.ui.render(); expect(m.pop().hidden).toBe(true); expect(m.chip().hidden).toBe(true);
    stallStub.cue = cue(true); m.ui.render(); m.chip().focus(); m.chip().click();
    stallStub.stall = { shown: true, trigger: 'sell', cause: 'mh_asleep', stallId: 1, noSaleS: 9, noCollectS: 0 }; m.ui.render(); m.ui.render();
    expect(m.pop().hidden).toBe(true); expect(m.chip().hidden).toBe(true); expect(document.activeElement).toBe(document.getElementById('stallChip'));
    stallStub.stall = null; m.ui.render(); m.ui.render(); m.chip().focus(); m.chip().click(); expect(m.pop().hidden).toBe(false);
    const q = mqs.find(x => x.q === '(max-height: 739px)')!; q.matches = false; q.fire();
    expect(m.pop().hidden).toBe(true); expect(document.activeElement).toBe(m.sub()); // focus follows to the >= 740 counterpart
  });
});
describe('#11 stacking with the Rule 3 banner (CSS)', () => {
  it('popover stacks above the banner; no banner grid row', async () => {
    const { readFileSync } = await import('node:fs'); const css = readFileSync('src/ui/styles.css', 'utf8');
    const z = (sel: string) => Number(css.match(new RegExp(`\\n${sel.replace('.', '\\.')}\\{[^}]*z-index:(\\d+)`))![1]);
    expect(z('.fpop')).toBeGreaterThan(z('.farm-banner'));
    expect(css).not.toMatch(/fb-on\{grid-template-rows/);
  });
});
describe('#11 appear pop + Workers sorted by costliest', () => {
  it('appear: .fc-in on show (150 ms fade + 1.05 pop), removed on hide; reduced motion = fade only (CSS)', async () => {
    const m = await mount(FC); stallStub.cue = cue(true); m.ui.render();
    expect(m.chip().classList.contains('fc-in')).toBe(true); expect(m.sub().classList.contains('fc-in')).toBe(true);
    stallStub.cue = cue(false); m.ui.render(); expect(m.chip().classList.contains('fc-in')).toBe(false);
    const { readFileSync } = await import('node:fs'); const css = readFileSync('src/ui/styles.css', 'utf8');
    expect(css).toMatch(/@keyframes fcIn\{from\{opacity:0;transform:scale\(1\.05\)\}\}/);
    expect(css).toMatch(/\.rm \.fchip\.fc-in \.fchip-pill,\.rm \.fsub\.fc-in\{animation:fcFade 150ms ease\}@keyframes fcFade\{from\{opacity:0\}\}/);
    expect(css).toMatch(/@media \(prefers-reduced-motion:reduce\)\{\.fchip\.fc-in \.fchip-pill,\.fsub\.fc-in\{animation:fcFade 150ms ease\}\}/);
  });
  it('sub-line tap opens Workers sorted by costliest ($/s at risk desc, ties code order); the order resets on leaving', async () => {
    const m = await mount(FC); stallStub.atRisk = { market_hand: 1, coop_hand: 3 }; stallStub.cue = cue(true); m.ui.render();
    const rows = () => [...document.querySelectorAll<HTMLElement>('#uRow .wk[data-w]')].map(e => e.dataset.w);
    m.sub().click(); m.ui.render(); expect(rows().slice(0, 2)).toEqual(['coop_hand', 'market_hand']);
    m.ui.openPanel(null); m.ui.render(); m.ui.openPanel('upgrades'); (document.querySelector('.tabs [data-tab=workers]') as HTMLElement).click(); m.ui.render();
    expect(rows().slice(0, 2)).toEqual(['market_hand', 'coop_hand']); // plain Workers tab = code order
  });
});
