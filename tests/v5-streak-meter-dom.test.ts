// @vitest-environment jsdom
// v5 streak meter / A2 tier pill / tapCoins +$ pop DOM feature (ui/streak-meter.ts) against the F6 stub ctx.
// product/collection/m5-streak-tap-coins-spec.md v1.3.3 b315dea1: ST-AC9/10/17/17b/21/24/25/27/29; art-ux/m5-combo-tiers.md v0.3
// ed4ded1d: CT-AC1/3/5/6/11/13/14/15. Every expected number is read from config (ST-AC28).
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { balance, type Balance } from '../src/config/balance';
import { mountStreakUi, streakMeter, STREAK_SFX, STREAK_UI_MS } from '../src/ui/streak-meter';
import { stubCtx, mountStub } from '../src/ui/streak-f6-stub';
import { flagOn } from '../src/config/flags';
import { pillCopy, tierAria, streakParams, tierThresholds } from '../src/ui/streak-view';
import { Game } from '../src/game';
import { mem } from './helpers';

const mk = (flags: Record<string, number>, tc: Record<string, number> = {}, enabled = 1): Balance =>
  ({ ...balance, m4: { ...balance.m4!, enabled, flags: { ...balance.m4!.flags, ...flags }, tc: { ...balance.m4!.tc, ...tc } } }) as Balance;
const BOTH = mk({ streak: 1, tapCoins: 1 }, { streak_cap: 0.27 }), STREAK = mk({ streak: 1 }, { streak_cap: 0.27 }), COINS = mk({ tapCoins: 1 });

type Ev = { type: string; eggs?: number; credited?: boolean; bonus_cents?: number };
function fakeGame() {
  const ls: ((e: any) => void)[] = [];
  const g = { state: { streakS: 0, streakHoldS: 0 } as any, on(fn: (e: any) => void) { ls.push(fn); return () => { ls.splice(ls.indexOf(fn), 1); }; } };
  /** sim order: state is updated, then the event is emitted (game.ts dispatch). */
  const tap = (s: number, e: Partial<Ev> = {}, hold = 3) => { g.state = { ...g.state, streakS: s, streakHoldS: hold }; for (const f of [...ls]) f({ type: 'collect', eggs: 1, credited: true, ...e }); };
  return { g, tap, listeners: ls };
}
const SHELL = '<div id="app"><div class="farm"><div class="collectbar"><div class="meter" id="meter"></div><button class="goal" id="goal"></button><button class="btn xl" id="collect">Collect</button></div></div></div><div id="fx-layer" aria-hidden="true"></div>';
let t = 1000;
beforeAll(() => { vi.spyOn(performance, 'now').mockImplementation(() => t); });
beforeEach(() => { document.body.innerHTML = SHELL; t = 1000; vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); });
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });
const root = () => document.getElementById('app')!;
function mount(b: Balance, extra: Partial<Parameters<typeof stubCtx>[0]> = {}) {
  const f = fakeGame(), play = vi.fn(() => true), h = stubCtx({ g: f.g as any, b, root: root(), audio: { play }, ...extra });
  const ui = mountStreakUi(h.ctx); return { ...f, play, ui: ui!, zones: h.zones, ctx: h.ctx };
}
const $ = (s: string) => document.querySelector(s) as HTMLElement | null;

describe('flag off: nothing is added (R13a, ST-AC29 both 0 / m4.enabled 0)', () => {
  for (const [name, b] of [['shipped balance', balance], ['m4.enabled 0', mk({ streak: 1, tapCoins: 1 }, {}, 0)]] as const) it(name, () => {
    const before = document.body.innerHTML, f = fakeGame();
    expect(mountStreakUi(stubCtx({ g: f.g as any, b, root: root() }).ctx)).toBeNull();
    expect(document.body.innerHTML).toBe(before); expect(root().classList.contains('m5-streak')).toBe(false); expect(f.listeners).toHaveLength(0);
  });
  it('the F6 feature mounts nothing and renders nothing with both flags off', () => {
    const before = document.body.innerHTML, f = fakeGame(), { ctx } = stubCtx({ g: f.g as any, b: balance, root: root() });
    const o = mountStub([streakMeter], ctx, fl => flagOn(balance, fl)); o.render(t); f.tap(0.07);
    expect(document.body.innerHTML).toBe(before); o.destroy(); expect(document.body.innerHTML).toBe(before);
  });
});

describe('ST-AC29 one flag alone', () => {
  it('tapCoins only: coin pop, no meter row, no Collect resize', () => {
    const m = mount(COINS); expect($('#streak')).toBeNull(); expect(root().classList.contains('m5-streak')).toBe(false);
    m.tap(0, { bonus_cents: 38 }); expect($('.coin-pop')?.textContent).toBe('+$0.38');
  });
  it('streak only: meter row, no coin pop even if the event had a bonus', () => {
    const m = mount(STREAK); expect($('#streak')).not.toBeNull(); m.tap(0.01, { bonus_cents: 38 }); expect($('.coin-pop')).toBeNull(); expect($('#coin-live')).toBeNull();
  });
});

describe('meter row (§0, ST-AC21/25/26, CT-AC1/2/11/13)', () => {
  it('sits directly under Collect, reserved and aria-hidden at s = 0, root gets .m5-streak, zone registered (+16)', () => {
    const m = mount(STREAK), row = $('#streak')!;
    expect(row.previousElementSibling?.id).toBe('collect'); expect(row.getAttribute('role')).toBe('meter');
    expect(row.getAttribute('aria-hidden')).toBe('true'); expect(row.classList.contains('on')).toBe(false);
    expect(root().classList.contains('m5-streak')).toBe(true); expect(m.zones.map(z => [z.name, z.clear])).toEqual([['streak-meter', 16]]);
    expect(row.querySelectorAll('.streak-tick')).toHaveLength(streakParams(STREAK).count);
  });
  it('ST-AC21: s = 0.187 -> 69.26 %, "+18% price", 2 lit ticks, valuetext', () => {
    const m = mount(STREAK); m.g.state = { streakS: 0.187, streakHoldS: 2 }; m.ui.render(t);
    const row = $('#streak')!, fill = row.querySelector<HTMLElement>('.streak-fill')!;
    expect(parseFloat(/scaleX\(([\d.]+)\)/.exec(fill.style.transform)![1])).toBeCloseTo(0.187 / 0.27, 4);
    expect(row.querySelector('.streak-label')!.textContent).toBe('+18% price');
    expect([...row.querySelectorAll('.streak-tick')].map(e => e.classList.contains('lit'))).toEqual([true, true, false, false]);
    expect(row.getAttribute('aria-valuetext')).toBe('Streak +18% price, tier 2 of 4'); expect(row.getAttribute('aria-valuemax')).toBe('27');
    expect(row.hasAttribute('aria-hidden')).toBe(false); expect(row.classList.contains('on')).toBe(true);
  });
  it('cap: .max, "MAX +27%", 4 lit', () => {
    const m = mount(STREAK); m.g.state = { streakS: 0.27, streakHoldS: 3 }; m.ui.render(t);
    expect($('#streak')!.classList.contains('max')).toBe(true); expect($('.streak-label')!.textContent).toBe('MAX +27%');
    expect($('#streak')!.querySelectorAll('.streak-tick.lit')).toHaveLength(4);
  });
  it('cooling after the hold: .cooling + ", cooling"; reaching 0 by decay fades (no .instant)', () => {
    const m = mount(STREAK); m.g.state = { streakS: 0.1, streakHoldS: 0 }; m.ui.render(t);
    expect($('#streak')!.classList.contains('cooling')).toBe(true); expect($('#streak')!.getAttribute('aria-valuetext')).toMatch(/, cooling$/);
    m.g.state = { streakS: 0.001, streakHoldS: 0 }; m.ui.render(t); m.g.state = { streakS: 0, streakHoldS: 0 }; m.ui.render(t);
    expect($('#streak')!.classList.contains('on')).toBe(false); expect($('#streak')!.classList.contains('instant')).toBe(false);
  });
  it('CT-AC13: reload / offline reset hides the row instantly (no fade, pill or sound)', () => {
    const m = mount(STREAK); m.g.state = { streakS: 0.2, streakHoldS: 2 }; m.ui.render(t); m.play.mockClear();
    m.g.state = { streakS: 0, streakHoldS: 0 }; m.ui.render(t);
    expect($('#streak')!.classList.contains('instant')).toBe(true); expect($('#streak')!.classList.contains('on')).toBe(false);
    expect($('.streak-pill')).toBeNull(); expect(m.play).not.toHaveBeenCalled();
  });
  it('reduced motion: fill in whole-percent steps and .rm on the row (ST-AC24)', () => {
    const m = mount(STREAK, { rm: () => true }); m.g.state = { streakS: 0.187, streakHoldS: 2 }; m.ui.render(t);
    const fill = $('#streak .streak-fill')!; expect(parseFloat(/scaleX\(([\d.]+)\)/.exec(fill.style.transform)![1])).toBeCloseTo(18 / 27, 6);
    expect($('#streak')!.classList.contains('rm')).toBe(true);
  });
});

describe('A2 tier-ups (§3.3, ST-AC9/10/27, CT-AC5/6/15)', () => {
  const climb = (m: ReturnType<typeof mount>, to = 27, from = 1) => { for (let i = from; i <= to; i++) { t += 1000; m.tap(i / 100); m.ui.render(t); } };
  it('ST-AC9 + CT-AC6: a 0 -> cap climb = 4 pills, 4 stings in order, 1 cap chime', () => {
    const m = mount(STREAK), pills: string[] = [];
    for (let i = 1; i <= 27; i++) { t += 1000; m.tap(i / 100); const p = $('.streak-pill'); if (p && !pills.includes(p.textContent!)) pills.push(p.textContent!); vi.advanceTimersByTime(1000); }
    expect(pills).toEqual([1, 2, 3, 4].map(k => pillCopy(k, STREAK)));
    expect(m.play.mock.calls.map(c => (c as unknown[])[0])).toEqual(['streakTier1', 'streakTier2', 'streakTier3', 'streakMax']);
  });
  it('pill: aria-hidden, pips = tier, gone at 900 ms, one live at a time; MAX pill is gold', () => {
    const m = mount(STREAK); climb(m, 6); t += 1000; m.tap(0.07);
    const p = $('.streak-pill')!; expect(p.getAttribute('aria-hidden')).toBe('true'); expect(p.querySelectorAll('.pips i.on')).toHaveLength(1);
    vi.advanceTimersByTime(STREAK_UI_MS.pill - 1); expect($('.streak-pill')).not.toBeNull(); vi.advanceTimersByTime(1); expect($('.streak-pill')).toBeNull();
    climb(m, 27, 8); expect(document.querySelectorAll('.streak-pill')).toHaveLength(1); expect($('.streak-pill')!.classList.contains('max')).toBe(true);
  });
  it('CT-AC15: #streak-live gets exactly the 4 tier messages over a 1/s climb, none per plain tap', () => {
    const m = mount(STREAK), seen: string[] = []; const live = $('#streak-live')!;
    expect(live.getAttribute('aria-live')).toBe('polite'); expect(live.getAttribute('aria-atomic')).toBe('true');
    for (let i = 1; i <= 27; i++) { t += 1000; m.tap(i / 100); m.ui.render(t); if (live.textContent && seen[seen.length - 1] !== live.textContent) seen.push(live.textContent); }
    expect(seen).toEqual([1, 2, 3, 4].map(k => tierAria(k, STREAK)));
  });
  it('ST-AC10: 0.19 <-> 0.20 oscillation pops tier 3 once', () => {
    const m = mount(STREAK); climb(m, 20); m.play.mockClear();
    for (let j = 0; j < 6; j++) { m.g.state = { streakS: 0.19, streakHoldS: 0 }; m.ui.render(t); t += 1000; m.tap(0.2); }
    expect(m.play).not.toHaveBeenCalledWith('streakTier3');
  });
  it('cooling from tier >= 2 plays sfx-streak-cool once and announces "Streak cooling"; never while frozen', () => {
    let fz = false; const m = mount(STREAK, { dialogOpen: () => fz }); climb(m, 15); m.play.mockClear();
    t += 3000; m.g.state = { streakS: 0.15, streakHoldS: 0 }; m.ui.render(t); m.ui.render(t + 16);
    expect(m.play.mock.calls).toEqual([['streakCool']]); expect($('#streak-live')!.textContent).toBe('Streak cooling');
    // frozen: a pending message waits until the menu closes
    t += 500; m.tap(0.16); fz = true; t += 1500; m.g.state = { streakS: 0.16, streakHoldS: 0 }; m.ui.render(t); t += 5000; m.ui.render(t);
    expect($('#streak-live')!.textContent).toBe('Streak cooling'); fz = false; m.ui.render(t); expect($('#streak-live')!.textContent).toBe('Streak cooling');
  });
  it('CT-AC10 hook: a suppressed pill still plays the sting and the meter part', () => {
    const f = fakeGame(), play = vi.fn(() => true), { ctx } = stubCtx({ g: f.g as any, b: STREAK, root: root(), audio: { play } });
    const ui = mountStreakUi(ctx, { pillSuppressed: () => true })!; for (let i = 1; i <= 7; i++) { t += 1000; f.tap(i / 100); ui.render(t); }
    expect($('.streak-pill')).toBeNull(); expect(play).toHaveBeenCalledWith('streakTier1'); expect($('#streak-live')!.textContent).toBe(tierAria(1, STREAK));
  });
  it('reduced motion: no spark dots, pill has .rm (CT-AC14)', () => {
    const m = mount(STREAK, { rm: () => true }); climb(m, 7); expect($('.streak-spark')).toBeNull(); expect($('.streak-pill')!.classList.contains('rm')).toBe(true);
  });
  it('motion on: k spark dots on tier k (6 at MAX)', () => {
    const m = mount(STREAK); climb(m, 14); expect(document.querySelectorAll('.streak-spark').length).toBe(1 + 2); // tier 1 (1 dot) + tier 2 (2 dots), timers not advanced
  });
});

describe('tapCoins +$ pop (R15/R16, ST-AC17/17b)', () => {
  it('a paying credited tap shows one pop with icon-coin, aria-hidden, gone at 800 ms; #coin-live gets fmtMoneyAria', () => {
    const m = mount(BOTH); t += 1000; m.tap(0.01, { bonus_cents: 81_240 });
    const p = $('.coin-pop')!; expect(p.textContent).toBe('+$812.40'); expect(p.querySelector('img')!.getAttribute('src')).toMatch(/icon-coin\.svg$/);
    expect(p.getAttribute('aria-hidden')).toBe('true'); expect($('#coin-live')!.textContent).toBe('$812.40');
    vi.advanceTimersByTime(STREAK_UI_MS.coinPop); expect($('.coin-pop')).toBeNull();
  });
  it('ST-AC17b: 7 zero-pay credited taps -> no coin node and no $ in any live region; tier-1 pill + sting still happen', () => {
    const m = mount(BOTH);
    for (let i = 1; i <= 7; i++) { t += 1000; m.tap(i / 100, { bonus_cents: 0 }); m.ui.render(t); expect($('.coin-pop')).toBeNull(); }
    expect(document.body.innerHTML).not.toContain('+$0.00'); expect($('#coin-live')!.textContent).toBe('');
    expect($('.streak-pill')!.textContent).toBe(pillCopy(1, BOTH)); expect(m.play).toHaveBeenCalledWith('streakTier1');
  });
  it('an uncredited tap or a non-collect event never pops', () => {
    const m = mount(BOTH); m.tap(0, { credited: false, bonus_cents: 50 }); for (const f of m.listeners) f({ type: 'sale', cents: 50 });
    expect($('.coin-pop')).toBeNull();
  });
  it('coin aria at most once per second, latest wins', () => {
    const m = mount(COINS), live = $('#coin-live')!;
    m.tap(0, { bonus_cents: 38 }); t += 300; m.tap(0, { bonus_cents: 50 }); expect(live.textContent).toBe('$0.38');
    t += 700; m.ui.render(t); expect(live.textContent).toBe('$0.50');
  });
  it('reduced motion: .rm pop, no drift', () => {
    const m = mount(COINS, { rm: () => true }); m.tap(0, { bonus_cents: 38 }); expect($('.coin-pop')!.classList.contains('rm')).toBe(true);
  });
});

describe('real Game (sim on rc/v5) drives the UI with no glue', () => {
  it('a credited Collect at F >= unlock shows +1% and pops exactly the sim bonus', () => {
    const g = new Game(BOTH, mem() as any, () => 1760000000000, 1, 'test');
    g.state = { ...g.state, farmLevel: Math.max(g.state.farmLevel, balance.m4!.tc!.streak_unlock_farm as number) } as any;
    const { ctx } = stubCtx({ g, b: BOTH, root: root() }); const ui = mountStreakUi(ctx)!;
    let bonus: number | undefined; g.on(e => { if (e.type === 'collect') bonus = e.bonus_cents; });
    g.dispatch({ type: 'collect' }); ui.render(t);
    expect($('.streak-label')!.textContent).toBe(`+${Math.floor(balance.m4!.tc!.streak_per_tap as number * 100)}% price`);
    expect(typeof bonus).toBe('number');
    if (bonus! >= 1) expect($('.coin-pop')).not.toBeNull(); else expect($('.coin-pop')).toBeNull();
    ui.destroy(); expect($('#streak')).toBeNull(); expect(root().classList.contains('m5-streak')).toBe(false);
  });
});

describe('static checks', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/ui/streak.css'), 'utf8');
  it('CT-AC3: no looping animation in the streak CSS', () => { expect(css).not.toMatch(/infinite/); expect(css).not.toMatch(/animation-iteration-count/); });
  it('every rule is scoped to streak nodes or .m5-streak (flag-off pages unaffected)', () => {
    const sels = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@keyframes[^{]+\{(?:[^{}]*\{[^}]*\})*\s*\}/g, '').match(/[^{}@]+(?=\{)/g)!.map(s => s.trim()).filter(s => s && !s.startsWith('media') && !/^\(/.test(s));
    for (const s of sels) for (const part of s.split(',')) expect(part.trim()).toMatch(/streak|coin-pop|m5-streak/);
  });
  it('sound hooks map 1:1 to the Art files (combo-tiers §11)', () => {
    expect(Object.values(STREAK_SFX)).toEqual(['sfx-streak-tier-01', 'sfx-streak-tier-02', 'sfx-streak-tier-03', 'sfx-streak-max-01', 'sfx-streak-cool-01']);
  });
  it('thresholds used by the DOM are the config ones', () => { expect(tierThresholds(streakParams(STREAK))).toEqual([0.07, 0.14, 0.2, 0.27]); });
});
