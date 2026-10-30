// BBV2-AC16 [B] §8 events on the event sink (spec v1.0.3 27e753d8 §8; source of record: telemetry errata v5 rev 12 0cfe168a
// rows #19–22 + V-2d; D-HOE-20261030-31/-32/-35: meaningful_eta_s non-null float >= 0, no farm_eta_s; payback_s/eta_s float|null).
import { describe, it, expect } from 'vitest';
import { Bbv2Tel, bbv2TelCfg, buyKeyOf, f1, meaningfulEtaS } from '../src/telemetry/bbv2';
import { isPinned, Telemetry } from '../src/telemetry/telemetry';
import { meaningfulKeys, BUY_ORDER } from '../src/econ/best-buy';
import { Game } from '../src/game';
import { balance } from '../src/config/balance';
import { ON, OFF, bal, L17, fx } from './bbv2-fixtures';

type Ev = { type: string; d: Record<string, unknown> };
const mk = (b = ON) => { const ev: Ev[] = []; const tel = new Bbv2Tel((type, d) => ev.push({ type, d }), b); return { ev, tel }; };
const kvm = () => { const m = new Map<string, string>(); return { m, getItem: (k: string) => m.get(k) ?? null, removeItem: (k: string) => void m.delete(k), setItem: (k: string, v: string) => void m.set(k, v) }; };
const KEYS = new RegExp(`^(${BUY_ORDER.join('|')})$`);
const ctx = (o: Partial<{ t: number; mark: any; markSinceT: number; rateCentsPerS: number }> = {}) => ({ t: 10_000, mark: null, markSinceT: 0, rateCentsPerS: 0, ...o });

describe('BBV2-AC16 [B] config + registration', () => {
  it('tunables come from balance.json telemetry.bbv2 (G-17/M-2): 5 / 60 / 30 / 50', () => {
    expect(balance.telemetry.bbv2).toMatchObject({ shown_min_gap_s: 5, zero_gain_eta_max_s: 60, dead_zone_min_s: 30, zero_gain_purchase_cap: 50 });
    expect(bbv2TelCfg(ON)).toEqual({ shown_min_gap_s: 5, zero_gain_eta_max_s: 60, dead_zone_min_s: 30, zero_gain_purchase_cap: 50 });
  });
  it('pins (D-HOE-31): zero_gain_purchase + dead_zone pinned; best_buy_shown + best_buy_followed ring', () => {
    expect(isPinned('zero_gain_purchase')).toBe(true); expect(isPinned('dead_zone')).toBe(true);
    expect(isPinned('best_buy_shown')).toBe(false); expect(isPinned('best_buy_followed')).toBe(false);
  });
  it('f1: 1 dp, Infinity/NaN -> null (no "Infinity" string)', () => {
    expect(f1(12.345)).toBe(12.3); expect(f1(Infinity)).toBeNull(); expect(f1(NaN)).toBeNull(); expect(f1(0)).toBe(0);
  });
  it('buyKeyOf maps every row purchase to its BuyKey', () => {
    expect(buyKeyOf({ type: 'buyFarm' })).toBe('FARM'); expect(buyKeyOf({ type: 'buyCollection' })).toBe('COLL');
    expect(buyKeyOf({ type: 'buyTrack', track: 'hens' } as any)).toBe('HENS'); expect(buyKeyOf({ type: 'buyTrack', track: 'eggValue' } as any)).toBe('VALUE');
    expect(buyKeyOf({ type: 'hire', worker: 'market_hand' })).toBe('W1'); expect(buyKeyOf({ type: 'hire', worker: 'coop_hand' })).toBe('W2');
    expect(buyKeyOf({ type: 'hire', worker: 'hawker' })).toBe('W3'); expect(buyKeyOf({ type: 'hire', worker: 'grader' })).toBe('W4');
    expect(buyKeyOf({ type: 'buyGraderTier' })).toBe('W4'); expect(buyKeyOf({ type: 'collect' } as any)).toBeNull();
  });
});

describe('BBV2-AC16 [B] #19 best_buy_shown', () => {
  it('fields and types; eta_s = 0 when affordable; payback ∞ -> null', () => {
    const { ev, tel } = mk(); const s = L17(600_000);
    tel.shown(0, s, { key: 'HENS', affordable: true, payback: 123.456, costCents: 526_200 }, 1000);
    expect(ev).toEqual([{ type: 'best_buy_shown', d: { key: 'HENS', meaningful: true, affordable: true, payback_s: 123.5, farm: 17, eta_s: 0 } }]);
    expect(ev[0].d.key).toMatch(KEYS);
    tel.shown(6000, L17(0), { key: 'FARM', affordable: false, payback: Infinity, costCents: 1_018_500 }, 1000);
    expect(ev[1].d).toEqual({ key: 'FARM', meaningful: true, affordable: false, payback_s: null, farm: 17, eta_s: 1018.5 });
    tel.shown(12_000, L17(0), { key: 'HENS', affordable: false, payback: 50, costCents: 526_200 }, 0);
    expect(ev[2].d.eta_s).toBeNull(); // not reachable at rate 0
  });
  it('no pick -> no event; unchanged key+affordable -> no event; change inside 5 s waits for the gap', () => {
    const { ev, tel } = mk(); const s = L17(0), p = { key: 'HENS' as const, affordable: false, payback: 9, costCents: 526_200 };
    tel.shown(0, s, null, 1); expect(ev).toHaveLength(0);
    tel.shown(0, s, p, 1); tel.shown(1000, s, p, 1); tel.shown(9000, s, p, 1); expect(ev).toHaveLength(1);
    tel.shown(10_000, s, { ...p, affordable: true }, 1); expect(ev).toHaveLength(2);
    tel.shown(11_000, s, { ...p, key: 'FARM' }, 1); tel.shown(14_999, s, { ...p, key: 'FARM' }, 1); expect(ev).toHaveLength(2); // rate limit
    tel.shown(15_000, s, { ...p, key: 'FARM' }, 1); expect(ev).toHaveLength(3); expect(ev[2].d.key).toBe('FARM');
  });
  it('meaningful is false only when no meaningful row is offered (key not in meaningfulKeys)', () => {
    const { ev, tel } = mk(); const s = L17(0); expect(meaningfulKeys(s, ON).has('COLL')).toBe(false);
    tel.shown(0, s, { key: 'COLL', affordable: false, payback: Infinity, costCents: 109_900 }, 1); expect(ev[0].d.meaningful).toBe(false);
  });
});

describe('BBV2-AC16 [B] #20 best_buy_followed', () => {
  it('fires when the purchased key equals the ★ shown; ms_since_shown from the last ★ switch (picker clock)', () => {
    const { ev, tel } = mk(); tel.purchase(L17(600_000), 'HENS', ctx({ t: 12_345, mark: 'HENS', markSinceT: 2_000 }));
    expect(ev).toEqual([{ type: 'best_buy_followed', d: { key: 'HENS', ms_since_shown: 10_345 } }]);
  });
  it('no event when ★ is null or another key', () => {
    const { ev, tel } = mk(); tel.purchase(L17(600_000), 'HENS', ctx({ mark: null })); tel.purchase(L17(600_000), 'HENS', ctx({ mark: 'FARM' }));
    expect(ev).toHaveLength(0);
  });
});

describe('BBV2-AC16 [B] #21 zero_gain_purchase', () => {
  const s = L17(500_000); // COLL ($1,099) zero-gain at FX-L17; nearest meaningful HENS $5,262 needs 26,200 cents
  it('precondition: COLL zero-gain, HENS/VALUE/FARM meaningful', () => { expect([...meaningfulKeys(s, ON)].sort()).toEqual(['FARM', 'HENS', 'VALUE']); });
  it('fires with key, farm, level (before), meaningful_eta_s (non-null float, 1 dp) while a meaningful row is <= 60 s away', () => {
    const { ev, tel } = mk(); tel.purchase(s, 'COLL', ctx({ rateCentsPerS: 1000 }));
    expect(ev).toEqual([{ type: 'zero_gain_purchase', d: { key: 'COLL', farm: 17, level: 10, meaningful_eta_s: 26.2 } }]);
    expect(Object.keys(ev[0].d)).not.toContain('farm_eta_s');
    expect(meaningfulEtaS(s, ON, 1000)).toBeCloseTo(26.2, 9);
  });
  it('affordable meaningful row -> meaningful_eta_s 0; > 60 s or unreachable -> no event; meaningful purchases never fire', () => {
    const a = mk(); a.tel.purchase(L17(600_000), 'COLL', ctx()); expect(a.ev[0].d.meaningful_eta_s).toBe(0);
    const b = mk(); b.tel.purchase(s, 'COLL', ctx({ rateCentsPerS: 26_200 / 60.5 })); b.tel.purchase(s, 'COLL', ctx({ rateCentsPerS: 0 }));
    b.tel.purchase(s, 'HENS', ctx({ rateCentsPerS: 1e6 })); b.tel.purchase(s, 'FARM', ctx({ rateCentsPerS: 1e6 })); expect(b.ev).toHaveLength(0);
    const c = mk(); c.tel.purchase(s, 'COLL', ctx({ rateCentsPerS: 26_200 / 60 })); expect(c.ev[0].d.meaningful_eta_s).toBe(60);
  });
  it('cap 50 per session; over the cap nothing is emitted and session_end.zero_gain_purchase_dropped counts them', () => {
    const { ev, tel } = mk(); for (let i = 0; i < 53; i++) tel.purchase(L17(600_000), 'COLL', ctx());
    expect(ev.filter(e => e.type === 'zero_gain_purchase')).toHaveLength(50); expect(tel.sessionEndFields()).toEqual({ zero_gain_purchase_dropped: 3 });
  });
});

describe('BBV2-AC16 [B] #22 dead_zone (V-2d)', () => {
  const dry = L17(0), wet = L17(600_000);
  it('emitted once at stretch end with farm at start, s = end − start (sim s, 1 dp), reason none_affordable, no open', () => {
    const { ev, tel } = mk(); for (let t = 100; t < 140; t++) tel.sample(t, dry); expect(ev).toHaveLength(0);
    tel.sample(140, wet); expect(ev).toEqual([{ type: 'dead_zone', d: { farm: 17, s: 40, reason: 'none_affordable' } }]);
    tel.sample(141, wet); expect(ev).toHaveLength(1);
  });
  it('stretches under 30 s are not emitted; exactly 30 s is', () => {
    const { ev, tel } = mk(); for (let t = 0; t < 29; t++) tel.sample(t, dry); tel.sample(29, wet); expect(ev).toHaveLength(0);
    for (let t = 30; t < 60; t++) tel.sample(t, dry); tel.sample(60, wet); expect(ev.map(e => e.d.s)).toEqual([30]);
  });
  it('scope 10 <= farm < 30: no stretch below F10; reaching max ends the stretch', () => {
    const lo = mk(); for (let t = 0; t < 100; t++) lo.tel.sample(t, fx(9, 9, 9, 9)); lo.tel.flushOpen(100); expect(lo.ev).toHaveLength(0);
    const hi = mk(); for (let t = 0; t < 45; t++) hi.tel.sample(t, dry); hi.tel.sample(45, fx(30, 30, 30, 21)); expect(hi.ev[0].d).toEqual({ farm: 17, s: 45, reason: 'none_affordable' });
  });
  it('unload/background flush: open:true only if s >= 30; sampling then starts fresh', () => {
    const a = mk(); for (let t = 0; t < 31; t++) a.tel.sample(t, dry); a.tel.flushOpen(31);
    expect(a.ev).toEqual([{ type: 'dead_zone', d: { farm: 17, s: 31, reason: 'none_affordable', open: true } }]);
    const b = mk(); for (let t = 0; t < 20; t++) b.tel.sample(t, dry); b.tel.flushOpen(20); expect(b.ev).toHaveLength(0);
    for (let t = 20; t < 40; t++) b.tel.sample(t, dry); b.tel.sample(40, wet); expect(b.ev).toHaveLength(0); // fresh: 20 s, not 40
  });
});

describe('BBV2-AC16 [B] Game wiring; flag 0 emits nothing (spec §5)', () => {
  const types = (g: Game) => g.telemetry.events().map(e => e.type);
  it('flag 0: no Bbv2Tel, no BBv2 event, session_end has no BBv2 field', () => {
    const g = new Game(OFF, kvm(), () => 1_000, 1, 'x'); expect(g.bbTel).toBeNull();
    g.state = L17(600_000); g.dispatch({ type: 'buyCollection' }); g.endSession();
    expect(types(g).filter(t => /best_buy|zero_gain|dead_zone/.test(t))).toEqual([]);
    expect(g.telemetry.events().find(e => e.type === 'session_end')).not.toHaveProperty('zero_gain_purchase_dropped');
  });
  it('m4 off with bestBuyV2 = 1: nothing either', () => { expect(new Game(bal(1, { enabled: 0 }), kvm(), () => 1_000, 1, 'x').bbTel).toBeNull(); });
  it('flag 1: a zero-gain buy emits zero_gain_purchase (pinned in the Telemetry ring) and session_end carries the dropped count', () => {
    const g = new Game(ON, kvm(), () => 1_000, 1, 'x'); expect(g.bbTel).not.toBeNull();
    g.state = L17(600_000); g.dispatch({ type: 'buyCollection' }); g.dispatch({ type: 'buyFarm' }); g.endSession();
    const zg = g.telemetry.events().filter(e => e.type === 'zero_gain_purchase'); expect(zg).toHaveLength(1);
    expect(zg[0]).toMatchObject({ key: 'COLL', farm: 17, level: 10, meaningful_eta_s: 0 });
    expect(g.telemetry.events().find(e => e.type === 'session_end')).toMatchObject({ zero_gain_purchase_dropped: 0 });
  });
  it('flag 1: an unaffordable buy (no state change) emits nothing', () => {
    const g = new Game(ON, kvm(), () => 1_000, 1, 'x'); g.state = L17(0); g.dispatch({ type: 'buyCollection' });
    expect(types(g).filter(t => /zero_gain|best_buy/.test(t))).toEqual([]);
  });
  it('flag 1: frame() samples integer sim seconds; onHidden flushes an open stretch with open:true', () => {
    let t = 0; const g = new Game(ON, kvm(), () => t, 1, 'x'); g.state = L17(0);
    const freeze = { ...g.state }; for (let i = 0; i < 40; i++) { t += 1000; g.state = { ...freeze }; g.frame(); }
    g.state = { ...freeze }; g.onHidden();
    const dz = g.telemetry.events().filter(e => e.type === 'dead_zone'); expect(dz).toHaveLength(1);
    expect(dz[0]).toMatchObject({ farm: 17, reason: 'none_affordable', open: true }); expect(dz[0].s as number).toBeGreaterThanOrEqual(30);
  });
});
