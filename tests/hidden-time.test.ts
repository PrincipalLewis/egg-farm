import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { accountHiddenPeriod, onHiddenPeriodAccounted, type HiddenPeriodResult } from '../src/save/hidden-time';
import { watchVisibility } from '../src/platform/visibility';
import { mem, expOffline } from './helpers';
const T0 = Date.UTC(2026, 9, 16, 12);
function setup() {
  const kv = mem(); let t = T0; const clock = { get t() { return t; }, set t(v) { t = v; } };
  const g = new Game(b, kv, () => t, 7); g.state = { ...g.state, farmLevel: 15, coop: 51 };
  for (let i = 0; i < 30; i++) { t += 1000; g.frame(); } g.save();
  const got: HiddenPeriodResult[] = []; const off = onHiddenPeriodAccounted(r => got.push(r));
  return { kv, g, clock, got, off };
}
const view = (g: Game) => JSON.parse(JSON.stringify(g.state));

describe('accountHiddenPeriod: one entry point, exactly once per hidden period (keyed by periodId)', () => {
  it('671 s: offline-grant result, listener fires once; replay is a no-op returning null', () => {
    const { g, clock, got, off } = setup(); const s = clock.t; g.onHidden(s); clock.t += 671_000; g.frame();
    const r = accountHiddenPeriod(g, { startAt: s, endAt: clock.t })!;
    expect(r).toMatchObject({ startAt: s, endAt: clock.t, elapsedMs: 671_000, mode: 'offline-grant', grantedMs: 671_000, eggsGranted: expOffline(671, 15), coinsGranted: 0, capped: false });
    expect(typeof r.periodId).toBe('number'); expect(r.periodId).toBeGreaterThan(0);
    const after = view(g);
    expect(accountHiddenPeriod(g, { startAt: s, endAt: clock.t + 5000 })).toBeNull();
    expect(g.onShown(clock.t)).toBe(0); // double visible
    expect(view(g)).toEqual(after); expect(got).toHaveLength(1); off();
  });
  it('Game.onShown goes through the entry point (listener sees it) and returns its eggs', () => {
    const { g, clock, got, off } = setup(); g.onHidden(clock.t); clock.t += 671_000;
    expect(g.onShown(clock.t)).toBe(expOffline(671, 15)); expect(got).toHaveLength(1); expect(got[0].mode).toBe('offline-grant'); off();
  });
  it('shown with no hidden first, or an unknown startAt: null, nothing changes, no listener call', () => {
    const { g, clock, got, off } = setup(); const before = view(g);
    expect(accountHiddenPeriod(g, { startAt: clock.t - 10_000, endAt: clock.t })).toBeNull();
    expect(g.onShown(clock.t)).toBe(0); expect(view(g)).toEqual(before);
    g.onHidden(clock.t); expect(accountHiddenPeriod(g, { startAt: clock.t - 1, endAt: clock.t + 700_000 })).toBeNull();
    expect(got).toHaveLength(0); off();
  });
  it('double hidden keeps the first startAt; one period, one grant', () => {
    const { g, clock, got, off } = setup(); const s = clock.t; g.onHidden(s); clock.t += 5000; g.onHidden(clock.t);
    expect(g.hiddenSince).toBe(s); clock.t = s + 671_000; g.onShown(clock.t);
    expect(got).toHaveLength(1); expect(got[0].elapsedMs).toBe(671_000); off();
  });
  it('pagehide + visibilitychange together (repeated hidden events, then repeated visible): one result', () => {
    const { g, clock, got, off } = setup(); const doc = { visibilityState: 'visible', fns: [] as (() => void)[],
      addEventListener(_: string, f: () => void) { this.fns.push(f); }, removeEventListener() {} };
    const fire = () => doc.fns.forEach(f => f());
    watchVisibility(doc, () => clock.t, { onHidden: at => g.onHidden(at), onShown: sp => g.onShown(sp.endAt) });
    doc.visibilityState = 'hidden'; fire(); fire(); g.onHidden(clock.t); // pagehide path too
    clock.t += 671_000; doc.visibilityState = 'visible'; fire(); fire(); g.onShown(clock.t);
    expect(got).toHaveLength(1); expect(got[0].eggsGranted).toBe(expOffline(671, 15)); off();
  });
  it('short hide (< offlineMinSeconds): online mode keeps the hidden sim, not capped', () => {
    const { g, clock, off } = setup(); const s = clock.t; g.onHidden(s);
    for (let i = 0; i < 5; i++) { clock.t += 10_000; g.frame(); }
    const r = accountHiddenPeriod(g, { startAt: s, endAt: clock.t })!;
    expect(r).toMatchObject({ mode: 'online', simulatedMs: 50_000, grantedMs: 50_000, eggsGranted: 0, capped: false });
    expect(r.periodId).toBeGreaterThan(0); off();
  });
  it('offline cap: a hide longer than offlineCapSeconds is capped', () => {
    const { g, clock, got, off } = setup(); const s = clock.t; g.onHidden(s); clock.t += (b.offline.offlineCapSeconds + 600) * 1000;
    const r = accountHiddenPeriod(g, { startAt: s, endAt: clock.t })!;
    expect(r.capped).toBe(true); expect(r.grantedMs).toBe(b.offline.offlineCapSeconds * 1000); expect(got).toHaveLength(1); off();
  });
  it('unsubscribe stops the listener', () => {
    const { g, clock, got, off } = setup(); off(); g.onHidden(clock.t); clock.t += 671_000; g.onShown(clock.t); expect(got).toHaveLength(0);
  });

  // B1: periodId keying — same startAt ms must never leave the game stuck hidden
  it('B1: hide→show→hide in the same ms: second period accounts; never stuck hidden', () => {
    const { g, clock, got, off } = setup();
    const s = clock.t;
    g.onHidden(s); expect(g.isHidden).toBe(true);
    const id1 = g.openHiddenPeriod!.periodId;
    expect(g.onShown(s)).toBe(0); // zero-length span: online, no eggs
    expect(g.isHidden).toBe(false); expect(got).toHaveLength(1); expect(got[0].periodId).toBe(id1);
    g.onHidden(s); // same ms startAt as the first period
    expect(g.isHidden).toBe(true);
    const id2 = g.openHiddenPeriod!.periodId;
    expect(id2).toBeGreaterThan(id1);
    clock.t = s + 120_000;
    expect(g.onShown(clock.t)).toBe(expOffline(120, 15));
    expect(g.isHidden).toBe(false);
    expect(got).toHaveLength(2); expect(got[1].periodId).toBe(id2); expect(got[1].mode).toBe('offline-grant');
    // visible play still advances after the second show (not stuck on the hidden freeze branch)
    const cust0 = g.state.nextCustomerId;
    for (let i = 0; i < 30; i++) { clock.t += 1000; g.frame(); }
    expect(g.isHidden).toBe(false);
    expect(g.state.nextCustomerId).toBeGreaterThan(cust0);
    off();
  });
  it('B1: clock goes back onto a used startAt ms: new periodId, never stuck', () => {
    const { g, clock, got, off } = setup();
    const s = clock.t;
    g.onHidden(s); clock.t += 5000; g.onShown(clock.t);
    expect(g.isHidden).toBe(false); expect(got).toHaveLength(1);
    clock.t = s; // clock back onto the used startAt
    g.onHidden(clock.t);
    expect(g.isHidden).toBe(true);
    expect(g.openHiddenPeriod!.periodId).toBeGreaterThan(got[0].periodId);
    clock.t = s + 120_000;
    expect(g.onShown(clock.t)).toBe(expOffline(120, 15));
    expect(g.isHidden).toBe(false); expect(got).toHaveLength(2); off();
  });

  // M1: short hide with no frames must credit uncovered time up to 60 s
  it('M1: 59 s hide with no frames credits full online sim (matches 59 s visible)', () => {
    const a = setup(), v = setup(); a.off(); v.off();
    a.g.onHidden(a.clock.t); a.clock.t += 59_000; expect(a.g.onShown(a.clock.t)).toBe(0);
    expect(a.g.isHidden).toBe(false);
    v.clock.t += 59_000; v.g.frame();
    expect(view(a.g)).toEqual(view(v.g));
  });
  it('M1: partial frames then jump: uncover = gap - simMs up to budget', () => {
    const { g, clock, got, off } = setup();
    const s = clock.t; g.onHidden(s);
    for (let i = 0; i < 20; i++) { clock.t += 1000; g.frame(); } // 20 s simulated
    clock.t = s + 50_000; // jump to 50 s total, 30 s uncovered
    const before = view(g);
    const r = accountHiddenPeriod(g, { startAt: s, endAt: clock.t })!;
    expect(r).toMatchObject({ mode: 'online', simulatedMs: 50_000, grantedMs: 50_000, capped: false, eggsGranted: 0 });
    expect(view(g)).not.toEqual(before); // uncover advanced the sim
    off();
  });

  // n2: online capped is false while gap < offlineMin (== budget)
  it('n2: online mode capped is false when gap < offlineMinSeconds', () => {
    const { g, clock, off } = setup(); const s = clock.t; g.onHidden(s); clock.t += 59_999;
    const r = accountHiddenPeriod(g, { startAt: s, endAt: clock.t })!;
    expect(r.mode).toBe('online'); expect(r.capped).toBe(false); expect(r.simulatedMs).toBe(59_999); off();
  });
});

describe('m2: hidden online sim counts toward .bak playedMs', () => {
  it('60 s of kept hidden play enables .bak after a recovery that disabled it', () => {
    const kv = mem();
    kv.setItem('eggfarm.save', '{not-json');
    let t = T0; const g = new Game(b, kv, () => t, 7);
    expect(g.backupAllowed).toBe(false);
    g.state = { ...g.state, farmLevel: 15, coop: 51 };
    g.onHidden(t);
    for (let i = 0; i < 60; i++) { t += 1000; g.frame(); }
    // m2: bak enables from hidden steps alone (before show). Exact 60 s wall then grants offline.
    expect(g.backupAllowed).toBe(true);
    expect(g.isHidden).toBe(true);
    expect(g.onShown(t)).toBe(expOffline(60, 15));
  });
  it('M1 uncover also counts toward .bak enable', () => {
    const kv = mem(); kv.setItem('eggfarm.save', '{not-json');
    let t = T0; const g = new Game(b, kv, () => t, 7);
    expect(g.backupAllowed).toBe(false);
    g.state = { ...g.state, farmLevel: 15, coop: 51 };
    g.onHidden(t); t += 60_000; // no frames; uncover credits 60 s on show (online, gap == offlineMin goes to grant at exactly 60)
    // gap == 60_000 is NOT < offlineMin, so offline-grant path. Use 59_000.
    t = T0 + 59_000; g.onShown(t);
    expect(g.backupAllowed).toBe(false); // 59 s < 60 s threshold
    // Fresh game: another 1 s visible should tip it... but bak threshold is 60_000 playedMs and we only got 59k.
    // Do a second short hide of 1 s with no frames.
    const t2 = t; g.onHidden(t2); t += 1000; g.onShown(t);
    expect(g.backupAllowed).toBe(true);
  });
});

describe('CCR m1/n1/n2 follow-ups', () => {
  it('m1: tab guard freeze while hidden ends the hidden period (one none-mode result, never left open)', () => {
    const { g, clock, got, off } = setup(); g.onHidden(clock.t); clock.t += 5_000;
    g.deactivate();
    expect(g.isHidden).toBe(false); expect(got.length).toBe(1); expect(got[0].mode).toBe('none');
    clock.t += 1_000; expect(g.onShown(clock.t)).toBe(0); expect(got.length).toBe(1); off();
  });
  it('n1: 1000 periods stay exactly-once (accounted state bounded to the last id)', () => {
    const { g, clock, got, off } = setup();
    for (let i = 0; i < 1000; i++) {
      const s = clock.t; g.onHidden(s); clock.t += 10; accountHiddenPeriod(g, { startAt: s, endAt: clock.t });
      expect(accountHiddenPeriod(g, { startAt: s, endAt: clock.t })).toBeNull();
    }
    expect(got.length).toBe(1000); expect(new Set(got.map(r => r.periodId)).size).toBe(1000); off();
  });
  it('n2: offline-grant capped only beyond offlineCapSeconds', () => {
    const { g, clock, got, off } = setup(); g.onHidden(clock.t); clock.t += 600_000; g.onShown(clock.t);
    expect(got[0].mode).toBe('offline-grant'); expect(got[0].capped).toBe(false); off();
  });
});
