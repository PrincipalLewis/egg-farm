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

describe('accountHiddenPeriod: one entry point, exactly once per hidden period (keyed by startAt)', () => {
  it('671 s: offline-grant result, listener fires once; replay is a no-op returning null', () => {
    const { g, clock, got, off } = setup(); const s = clock.t; g.onHidden(s); clock.t += 671_000; g.frame();
    const r = accountHiddenPeriod(g, { startAt: s, endAt: clock.t })!;
    expect(r).toMatchObject({ startAt: s, endAt: clock.t, elapsedMs: 671_000, mode: 'offline-grant', grantedMs: 671_000, eggsGranted: expOffline(671, 15), coinsGranted: 0, capped: false });
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
    expect(r).toMatchObject({ mode: 'online', simulatedMs: 50_000, grantedMs: 50_000, eggsGranted: 0, capped: false }); off();
  });
  it('offline cap: a hide longer than offlineCapSeconds is capped', () => {
    const { g, clock, got, off } = setup(); const s = clock.t; g.onHidden(s); clock.t += (b.offline.offlineCapSeconds + 600) * 1000;
    const r = accountHiddenPeriod(g, { startAt: s, endAt: clock.t })!;
    expect(r.capped).toBe(true); expect(r.grantedMs).toBe(b.offline.offlineCapSeconds * 1000); expect(got).toHaveLength(1); off();
  });
  it('unsubscribe stops the listener', () => {
    const { g, clock, got, off } = setup(); off(); g.onHidden(clock.t); clock.t += 671_000; g.onShown(clock.t); expect(got).toHaveLength(0);
  });
});
