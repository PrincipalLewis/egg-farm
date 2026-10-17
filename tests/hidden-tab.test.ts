import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { Game, type GameEvent } from '../src/game';
import { watchVisibility, type HiddenSpan } from '../src/platform/visibility';
import { mem, expOffline } from './helpers';
const T0 = Date.UTC(2026, 9, 16, 12);
/** A played game at Farm L15 with Market Hand-free state, saved at T0 (bug-offline-overcredit.md repro setup). */
function setup(t0 = T0) {
  const kv = mem(); let t = t0; const clock = { get t() { return t; }, set t(v) { t = v; } };
  const g = new Game(b, kv, () => t, 7); g.state = { ...g.state, farmLevel: 15, coop: 51 };
  for (let i = 0; i < 30; i++) { t += 1000; g.frame(); } // some online play: customers queued, coins moved
  g.save();
  return { kv, g, clock };
}
const arrivals = (g: Game) => { const n = { v: 0 }; g.on((e: GameEvent) => { if (e.type === 'customer_arrive') n.v++; }); return n; };
const view = (g: Game) => JSON.parse(JSON.stringify(g.state));

describe('S2 hidden tab: cumulative hidden budget, then offline grant (bug-offline-overcredit.md)', () => {
  it('balance key is the 60 s budget', () => { expect(b.offline.hiddenSimMaxSeconds).toBe(60); });
  it('671 s repro, throttled 60 s frames: <= 60 s simulated while hidden, then frozen; full 671 s paid via offline', () => {
    const { g, clock } = setup(); const n = arrivals(g);
    const start = clock.t; g.onHidden(start);
    let simmed: any = null;
    for (let s = 0; s < 671; s += 60) { clock.t = start + Math.min(671, s + 60) * 1000; g.frame(); if (s === 60) simmed = view(g); }
    expect(view(g)).toEqual(simmed); // frozen after the budget
    expect(n.v).toBe(0); // provisional sim events are held while hidden (before: 215 arrivals)
    const pendingBefore = g.state.pendingOfflineEggs;
    const eggs = g.onShown(clock.t);
    expect(eggs).toBe(expOffline(671, 15)); expect(g.state.pendingOfflineEggs).toBe(pendingBefore + eggs);
    expect(g.offline.awayS).toBe(671); expect(n.v).toBe(0);
  });
  it('671 s repro with 1 s frames (timer not throttled) gives the same result', () => {
    const a = setup(), c = setup();
    a.g.onHidden(a.clock.t); for (let i = 0; i < 671; i++) { a.clock.t += 1000; a.g.frame(); } a.g.onShown(a.clock.t);
    c.g.onHidden(c.clock.t); c.clock.t += 671_000; c.g.frame(); c.g.onShown(c.clock.t);
    expect(view(a.g)).toEqual(view(c.g));
  });
  it('rc0 row regression: hide save is the hide snapshot (non-zero coins); awayS is the exact ms span, sub-second included', () => {
    const { g, kv, clock } = setup(); g.state = { ...g.state, coinsCents: 12345 };
    g.onHidden(clock.t); g.save();
    expect(JSON.parse(kv.getItem('eggfarm.save')!).state.coinsCents).toBe(12345);
    const start = clock.t; clock.t = start + 671_010; g.frame(); // a real clock leaks ~10 ms between the hide and the return
    g.onShown(clock.t);
    expect(g.offline.awayS).toBeCloseTo(671.01, 5); // the product reports the true span; a browser row must freeze its clock to assert 671
    expect(g.state.coinsCents).toBe(12345);
  });
  it('budget is cumulative across frame gaps (never more than 60 s total)', () => {
    const { g, clock } = setup(); const base = setup();
    g.onHidden(clock.t); for (let i = 0; i < 40; i++) { clock.t += 5000; g.frame(); } // 200 s hidden, 5 s frames
    for (let i = 0; i < 12; i++) { base.clock.t += 5000; base.g.frame(); } // exactly 60 s online
    expect(view(g)).toEqual(view(base.g));
  });
  for (const H of [60, 61, 671, 3600, 7200, 20_000]) it(`C-AC36: hidden ${H} s === close at hide + reload after ${H} s`, () => {
    const a = setup(), c = setup();
    // (a) tab stays open, hidden for H, throttled frames every 60 s
    a.g.onHidden(a.clock.t); const end = a.clock.t + H * 1000;
    while (a.clock.t < end) { a.clock.t = Math.min(end, a.clock.t + 60_000); a.g.frame(); }
    a.g.onShown(a.clock.t);
    // (b) closed at the hide (autosave saves on hide), reloaded H later
    c.g.save(); c.clock.t += H * 1000; const r = new Game(b, c.kv, () => c.clock.t, 7);
    expect(view(a.g)).toEqual(view(r));
    expect(a.g.offline).toEqual(r.offline); // same welcome popup (N, away time, cap line)
    expect(a.g.state.pendingOfflineEggs).toBe(expOffline(H, 15));
  });
  it('C-AC36 with a pending grant left open: settled into the Basket first, like a reload', () => {
    const a = setup(), c = setup();
    for (const x of [a, c]) x.g.state = { ...x.g.state, pendingOfflineEggs: 123 };
    a.g.onHidden(a.clock.t); a.clock.t += 900_000; a.g.frame(); a.g.onShown(a.clock.t);
    c.g.save(); c.clock.t += 900_000; const r = new Game(b, c.kv, () => c.clock.t, 7);
    expect(view(a.g)).toEqual(view(r));
  });
  it('a tab killed while hidden reloads exactly like one closed at the hide (hidden saves write the hide snapshot)', () => {
    const a = setup(), c = setup();
    a.g.onHidden(a.clock.t); a.clock.t += 60_000; a.g.frame(); a.g.save(); a.clock.t += 600_000; a.g.save(); a.g.endSession();
    const ra = new Game(b, a.kv, () => a.clock.t, 7);
    c.g.save(); c.clock.t += 660_000; const rc = new Game(b, c.kv, () => c.clock.t, 7);
    expect(view(ra)).toEqual(view(rc));
  });
  it('M1: 59 s hide with no frames === 59 s visible (no lost credit)', () => {
    const a = setup(), v = setup();
    a.g.onHidden(a.clock.t); a.clock.t += 59_000; expect(a.g.onShown(a.clock.t)).toBe(0);
    v.clock.t += 59_000; v.g.frame();
    expect(view(a.g)).toEqual(view(v.g));
  });
  it('hide < 60 s keeps the online sim (no grant), events released on return', () => {
    const a = setup(), c = setup(); const n = arrivals(a.g), m = arrivals(c.g);
    a.g.onHidden(a.clock.t); for (let i = 0; i < 45; i++) { a.clock.t += 1000; a.g.frame(); } expect(a.g.onShown(a.clock.t)).toBe(0);
    for (let i = 0; i < 45; i++) { c.clock.t += 1000; c.g.frame(); }
    expect(view(a.g)).toEqual(view(c.g)); expect(n.v).toBe(m.v);
  });
  it('clock tamper: clock set back while hidden -> no grant, nothing beyond the 60 s budget', () => {
    const { g, clock } = setup(); const p = g.state.pendingOfflineEggs;
    g.onHidden(clock.t); clock.t -= 3_600_000; g.frame(); expect(g.onShown(clock.t)).toBe(0); expect(g.state.pendingOfflineEggs).toBe(p);
  });
  it('offline cap applies (2h) like a reload', () => {
    const { g, clock } = setup(); g.onHidden(clock.t); clock.t += 50_000_000; expect(g.onShown(clock.t)).toBe(expOffline(b.offline.offlineCapSeconds, 15));
  });
  it('emits offline_grant on return', () => {
    const { g, clock } = setup(); const ev: GameEvent[] = []; g.on(e => { if (e.type === 'offline_grant') ev.push(e); });
    g.onHidden(clock.t); clock.t += 300_000; g.onShown(clock.t); expect(ev).toEqual([{ type: 'offline_grant', eggs: expOffline(300, 15), awayS: 300 }]);
  });
});

describe('platform/visibility hook', () => {
  it('reports hidden start, end and duration once per hidden period', () => {
    let state = 'visible', t = 1000; const fns: (() => void)[] = [];
    const doc = { get visibilityState() { return state; }, addEventListener: (_: string, f: () => void) => fns.push(f), removeEventListener: (_: string, f: () => void) => fns.splice(fns.indexOf(f), 1) };
    const hid: number[] = [], shown: HiddenSpan[] = [];
    const w = watchVisibility(doc, () => t, { onHidden: a => hid.push(a), onShown: s => shown.push(s) });
    const fire = () => fns.forEach(f => f());
    state = 'hidden'; fire(); fire(); expect(w.hidden).toBe(true); expect(w.hiddenSince).toBe(1000);
    t = 5000; state = 'visible'; fire(); fire();
    expect(hid).toEqual([1000]); expect(shown).toEqual([{ startAt: 1000, endAt: 5000, durationMs: 4000 }]); expect(w.hidden).toBe(false);
    w.stop(); expect(fns.length).toBe(0);
  });
  it('starts hidden when opened in a background tab', () => {
    const hid: number[] = []; watchVisibility({ visibilityState: 'hidden', addEventListener() {}, removeEventListener() {} }, () => 7, { onHidden: a => hid.push(a) });
    expect(hid).toEqual([7]);
  });
});
