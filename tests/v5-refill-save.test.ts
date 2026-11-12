// HoE/v5-refill-sim G1 (engineering/tasks/v5-refill-sim/G0-API.md rev 9 sha256 bcc52937, §1, §5, §6; Architect review M1, m2, m3, m5):
// additive OPTIONAL keys, SAVE_VERSION stays 6, no migration. Red-first: round-trip, flags-0 write-back, sanitiser matrix.
import { describe, it, expect } from 'vitest';
import { balance as b, type Balance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { serialize, loadSafe, SAVE_VERSION, SAVE_KEY, BAK_KEY, type KV } from '../src/save/save';
import { m5Load, m5Offline, m5ShortGap, m5Persist } from '../src/save/m5-fields';
import { M5_SAVED_FIELDS, M5_SESSION_FIELDS } from '../src/sim/m5-state';
import { chargesOf, chargesView } from '../src/sim/refill';
import { validateBalance } from '../src/config/balance';
import type { SimEvent } from '../src/sim/events';

const NOW = Date.UTC(2026, 10, 10, 3);
const fl = (f: Record<string, number>, tc: Record<string, number> = {}) =>
  ({ ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, ...f }, tc: { ...b.m4!.tc!, ...tc } } }) as Balance;
const R = fl({ rc2Refill: 1, pause: 1 }), RA = fl({ rc2Refill: 1, autoRefill: 1, pause: 1 });
const R_ONLY = fl({ rc2Refill: 1 }), A_ONLY = fl({ autoRefill: 1 });
const TC = b.m4!.tc!, REGEN = TC.charge_regen_s * 1000, CAP = TC.charge_cap;
const base = (): GameState => ({ ...initialState(b, 7), farmLevel: 12, tracksV7: 1, workers: { market_hand: { energy: 40, cdS: 0 }, coop_hand: { energy: 80, cdS: 0 } } }); // tracksV7: already-migrated v6 farm, so loadSafe is a no-op (G-4 byte identity)
const mem = (): KV & { m: Map<string, string> } => { const m = new Map<string, string>(); return { m, getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: k => void m.delete(k) }; };
const load = (s: any, bb: Balance) => { const ev: SimEvent[] = []; return { s: m5Load(s, bb, NOW, ev) as any, ev }; };
/** The Game boot path (game.ts:104): loadSafe, then m5Load. */
const boot = (kv: KV, bb: Balance) => { const r = loadSafe(kv, bb, NOW); expect(r.file).not.toBeNull(); const ev: SimEvent[] = []; return { s: m5Load(r.file!.state, bb, NOW, ev) as any, ev, r }; };
const JUNK = (): any => ({ ...base(), refillCharges: -3.5, chargeNextMs: 'soon',
  workers: { market_hand: { energy: 40, cdS: 0, restAuto: 7, autoRefill: 'yes' }, coop_hand: { energy: 80, cdS: 0, paused: true, restAuto: true, autoRefill: true } } });

describe('[G0 §1][m5] keys: optional, top-level saved, worker keys on Worker, session keys stripped; no bump', () => {
  it('SAVE_VERSION stays 6; refillCharges/chargeNextMs saved, refillAgoMs/refillSession session-only', () => {
    expect(SAVE_VERSION).toBe(6);
    expect(M5_SAVED_FIELDS).toContain('refillCharges'); expect(M5_SAVED_FIELDS).toContain('chargeNextMs');
    for (const k of ['restAuto', 'autoRefill']) expect(M5_SAVED_FIELDS as readonly string[]).not.toContain(k); // m5: Worker keys
    expect(M5_SESSION_FIELDS).toContain('refillAgoMs'); expect(M5_SESSION_FIELDS).toContain('refillSession');
    const s: any = { ...base(), refillCharges: 1, chargeNextMs: 9000, refillAgoMs: { market_hand: 5 }, refillSession: { sheetSeq: 1 } };
    const st = JSON.parse(serialize(s, NOW)).state; expect(st.refillCharges).toBe(1); expect(st.chargeNextMs).toBe(9000);
    expect('refillAgoMs' in st).toBe(false); expect('refillSession' in st).toBe(false);
    expect('refillCharges' in initialState(R, 7)).toBe(false); // G-3 / m3: never materialised at new game
  });
  it('[M1] rc2 columns land in m4.tc under their own names (no alias); validateBalance requires them while rc2Refill is on', () => {
    expect([TC.charge_regen_s, TC.charge_cap, TC.refill_threshold_pct, TC.start_charges]).toEqual([150, 2, 50, 2]);
    expect('combo_window_s' in TC || 'combo_boost_s' in TC).toBe(false); // combo_* stay unmapped until Econ renames (D-HOE-57)
    const { charge_cap: _c, ...noCap } = TC as any;
    expect(() => validateBalance({ ...R, m4: { ...R.m4!, tc: noCap } } as any)).toThrow(/charge_cap/);
    expect(() => validateBalance({ ...b, m4: { ...b.m4!, tc: noCap } } as any)).not.toThrow(); // flag off: not required
    expect(() => validateBalance(fl({ rc2Refill: 1 }, { start_charges: 3 }) as any)).toThrow(/start_charges/);
    expect(() => validateBalance(fl({ rc2Refill: 1 }, { charge_cap: 1.5 }) as any)).toThrow(/charge_cap/);
    expect(() => validateBalance(fl({ rc2Refill: 1 }, { refill_threshold_pct: 0 }) as any)).toThrow(/refill_threshold_pct/);
    expect(() => validateBalance(fl({ rc2Refill: 1 }, { charge_regen_s: 0 }) as any)).toThrow(/charge_regen_s/);
  });
});

describe('[G0 §6.1] red-first round-trip and flags-0 write-back', () => {
  it('v5->v6: a pre-refill v6 save (no keys) loads with the flags on to the defaults, saves and reloads to the same state and bytes', () => {
    for (const bb of [R, RA, R_ONLY]) {
      const kv = mem(), s0 = base(); kv.setItem(SAVE_KEY, serialize(s0, NOW));
      const a = boot(kv, bb); expect(a.ev).toEqual([]);
      for (const k of ['refillCharges', 'chargeNextMs']) expect(k in a.s).toBe(false); // m3 lazy: untouched save stays stable
      expect(chargesOf(a.s, bb)).toBe(TC.start_charges); expect(chargesView(a.s, bb)).toEqual({ charges: CAP, cap: CAP, nextChargeMs: null }); // §12 (b)
      const bytes = serialize(a.s, NOW); expect(bytes).toBe(serialize(s0, NOW));
      kv.setItem(SAVE_KEY, bytes); const c = boot(kv, bb); expect(c.s).toEqual(a.s); expect(serialize(c.s, NOW)).toBe(bytes);
    }
  });
  it('flags 0 (G-4): hand-inserted keys, even junk, are never read and come back byte-identical; m5Load returns the same object', () => {
    for (const bb of [b, A_ONLY, fl({ pause: 1 })]) {
      const kv = mem(), s0 = JUNK(), bytes = serialize(s0, NOW); kv.setItem(SAVE_KEY, bytes);
      const r = loadSafe(kv, bb, NOW); const ev: SimEvent[] = [];
      const out = m5Load(r.file!.state, bb, NOW, ev); if (bb === b) expect(out).toBe(r.file!.state);
      expect(ev).toEqual([]); expect(serialize(out, NOW)).toBe(bytes);
      expect(chargesView(out, bb)).toEqual({ charges: 0, cap: 0, nextChargeMs: null }); // flag_off view: empty
    }
  });
  it('a valid flag-on save round-trips unchanged (keys written back as-is)', () => {
    const s: any = { ...base(), refillCharges: 1, chargeNextMs: 42_000,
      workers: { market_hand: { energy: 30, cdS: 0, paused: true, restAuto: true, autoRefill: true }, coop_hand: { energy: 80, cdS: 0 } } };
    const kv = mem(); kv.setItem(SAVE_KEY, serialize(s, NOW)); const a = boot(kv, RA);
    expect(serialize(a.s, NOW)).toBe(serialize(s, NOW));
  });
});

describe('[G0 §1][F-4/F-5a/F-5b/F-8a/AC-LR16] load sanitiser matrix (rc2Refill=1, after pauseLoad)', () => {
  it('F-5b refillCharges: NaN, negative, non-integer, non-number -> 0; over the cap -> cap; valid kept; absent stays absent', () => {
    for (const [v, want] of [[NaN, 0], [-1, 0], [1.5, 0], ['2', 0], [null, 0], [Infinity, 0], [3, CAP], [99, CAP], [0, 0], [1, 1], [2, 2]] as const)
      expect(load({ ...base(), refillCharges: v }, R).s.refillCharges, String(v)).toBe(want);
    expect('refillCharges' in load(base(), R).s).toBe(false);
  });
  it('F-4 chargeNextMs at the cap is dropped (also when the cap comes from a clamp or the lazy default)', () => {
    expect('chargeNextMs' in load({ ...base(), refillCharges: 2, chargeNextMs: 5000 }, R).s).toBe(false);
    expect('chargeNextMs' in load({ ...base(), refillCharges: 7, chargeNextMs: 5000 }, R).s).toBe(false);
    expect('chargeNextMs' in load({ ...base(), chargeNextMs: 5000 }, R).s).toBe(false);
  });
  it('F-5a below the cap: missing, bad or non-integer -> full regen; valid -> clamp [1, regen]', () => {
    for (const [v, want] of [[undefined, REGEN], [NaN, REGEN], ['x', REGEN], [12.5, REGEN], [-5, 1], [0, 1], [1, 1], [7000, 7000], [REGEN, REGEN], [REGEN + 1, REGEN], [1e12, REGEN]] as const) {
      const s: any = { ...base(), refillCharges: 1 }; if (v !== undefined) s.chargeNextMs = v;
      expect(load(s, R).s.chargeNextMs, String(v)).toBe(want);
    }
    expect(load({ ...base(), refillCharges: -4, chargeNextMs: 3000 }, R).s).toMatchObject({ refillCharges: 0, chargeNextMs: 3000 });
  });
  it('F-8a restAuto: anything but true, or no paused:true (after pauseLoad), is dropped; pause=0 keeps both verbatim', () => {
    const w = (x: any) => load({ ...base(), workers: { market_hand: { energy: 40, cdS: 0, ...x } } }, R).s.workers.market_hand;
    expect(w({ paused: true, restAuto: true })).toEqual({ energy: 40, cdS: 0, paused: true, restAuto: true });
    for (const x of [{ paused: true, restAuto: 1 }, { paused: true, restAuto: 'true' }, { restAuto: true }, { paused: false, restAuto: true }, { paused: 'yes', restAuto: true }])
      expect('restAuto' in w(x), JSON.stringify(x)).toBe(false);
    // pauseLoad: below tc_pause_unlock_farm nothing is paused, so the restAuto next to it goes too
    const low = load({ ...base(), farmLevel: 1, workers: { market_hand: { energy: 40, cdS: 0, paused: true, restAuto: true } } }, R).s.workers.market_hand;
    expect(low).toEqual({ energy: 40, cdS: 0 });
    const s = { ...base(), workers: { market_hand: { energy: 40, cdS: 0, paused: 'x', restAuto: 3 } } } as any;
    expect(load(s, R_ONLY).s.workers).toBe(s.workers); // m2: pause=0 -> paused and restAuto verbatim
  });
  it('AC-LR16 autoRefill: rc2Refill=1 && autoRefill=1 drops anything but true; either flag 0 preserves verbatim', () => {
    const mk = (): any => ({ ...base(), workers: { market_hand: { energy: 40, cdS: 0, autoRefill: 'yes' }, coop_hand: { energy: 80, cdS: 0, autoRefill: true } } });
    const on = load(mk(), RA).s.workers; expect('autoRefill' in on.market_hand).toBe(false); expect(on.coop_hand.autoRefill).toBe(true);
    for (const bb of [R, R_ONLY, A_ONLY]) expect(load(mk(), bb).s.workers.market_hand.autoRefill).toBe('yes');
  });
  it('[m2] rc2Refill-only config (all six flags and breeds off) still sanitises; autoRefill-only touches nothing (same object)', () => {
    expect(load({ ...base(), refillCharges: 9 }, R_ONLY).s.refillCharges).toBe(CAP);
    const s = JUNK(); expect(load(s, A_ONLY).s).toBe(s);
    const clean = base(); expect(load(clean, R_ONLY).s).toBe(clean); // nothing to fix -> same object
  });
  it('the sanitiser does not mutate its input and emits no events', () => {
    const s = JUNK(), before = JSON.stringify(s), r = load(s, RA); expect(JSON.stringify(s)).toBe(before); expect(r.ev).toEqual([]);
  });
});

describe('[G-14] .bak restore and offline / hidden freeze', () => {
  it('a bad main restores .bak; the restored copy goes through the same sanitiser (flag on) or comes back verbatim (flag off)', () => {
    const kv = mem(), bad = JUNK(); kv.setItem(SAVE_KEY, '{"version":6,"garbage'); kv.setItem(BAK_KEY, serialize(bad, NOW));
    const on = boot(kv, RA); expect(on.r.recovery?.source ?? on.r.recovery).toBeTruthy();
    expect(on.s.refillCharges).toBe(0); expect(on.s.chargeNextMs).toBe(REGEN);
    expect('restAuto' in on.s.workers.market_hand).toBe(false); expect('autoRefill' in on.s.workers.market_hand).toBe(false);
    expect(on.s.workers.coop_hand).toMatchObject({ paused: true, restAuto: true, autoRefill: true });
    const kv2 = mem(); kv2.setItem(SAVE_KEY, '{"version":6,"garbage'); kv2.setItem(BAK_KEY, serialize(bad, NOW));
    expect(serialize(boot(kv2, b).s, NOW)).toBe(serialize(bad, NOW));
  });
  it('offline (>= 60 s gap) and short hidden gaps freeze the charge clock: refill keys untouched', () => {
    const s: any = { ...base(), refillCharges: 1, chargeNextMs: 33_000, workers: { market_hand: { energy: 30, cdS: 0, paused: true, restAuto: true, autoRefill: true } } };
    for (const bb of [R, RA, R_ONLY]) {
      const ev: SimEvent[] = [], o: any = m5Offline(s, bb, ev), g: any = m5ShortGap(s, bb);
      for (const x of [o, g]) { expect(x.refillCharges).toBe(1); expect(x.chargeNextMs).toBe(33_000); expect(x.workers.market_hand).toEqual(s.workers.market_hand); }
      expect(m5Persist(s, bb)).toBe(s);
    }
  });
});
