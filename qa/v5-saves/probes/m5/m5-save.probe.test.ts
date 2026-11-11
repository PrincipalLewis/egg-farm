// QA DRAFT probes: M5 save fields already in code at rc/v5 3f582db (qa/v5-saves/m5-save-cases-DRAFT.md). Fixtures only, no browser.
// Runs from <tree>/tests/qa-m5/. Case ids M5S-<area>-<n> match the cases doc.
import { describe, it, expect } from 'vitest';
import { initialState, type GameState } from '../../src/sim/state';
import { serialize, save, validate, loadSafe, pickNewest, SAVE_KEY, BAK_KEY, SAVE_VERSION, type KV } from '../../src/save/save';
import { reconcile } from '../../src/save/idb-mirror';
import { m5Load, m5Persist, M5_SESSION_KEYS } from '../../src/save/m5-fields';
import { M5_SAVED_FIELDS, M5_SESSION_FIELDS } from '../../src/sim/m5-state';
import type { SimEvent } from '../../src/sim/events';
import { ON as ON0 } from '../v5-f2-helpers';
const ON = { ...ON0, m4: { ...ON0.m4!, flags: { ...ON0.m4!.flags, pause: 1 } } } as typeof ON0; // golden+streak+broody+abilities+pause
const tc = ON.m4!.tc! as any, NOW = Date.UTC(2026, 9, 30, 12), CD = tc.ability_cd_s * 1000;
const kv = (): KV & { m: Map<string, string> } => { const m = new Map<string, string>(); return { m, getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: k => { m.delete(k); } }; };
const base = (): GameState => ({ ...initialState(ON, 7), farmLevel: 12 });
const W = (x: any = {}) => ({ energy: 80, cdS: 0, ...x });
/** A saved M5 shape: every M5 saved field + pause keys (fixture F-M5-ALL). */
const M5 = (): any => ({ ...base(), evRngState: 123456789, nextSpawnRemainingS: 87, frenzyRemainingS: 12, broodyNestCents: 4321, broodyHenIdx: 3,
  abilitiesUnlocked: true, abilitiesCoachSeen: true, abilities: { market_hand: { readyAt: NOW + 120_000 }, hawker: { readyAt: NOW + 30_000 } },
  workers: { market_hand: W({ paused: true, callLockoutS: 20 }), coop_hand: W({ paused: false }), hawker: W() } });
const load = (s: any, now = NOW) => { const ev: SimEvent[] = []; return { s: m5Load(s, ON, now, ev) as any, ev }; };
const fromRaw = (raw: string, now = NOW) => { const v = validate(raw, ON, now); expect(v.ok).toBe(true); return load((v as any).file.state, now).s; };
/** field getters (dot paths) for the saved M5 fields covered here */
const FIELDS: [id: string, path: string][] = [
  ['GOLD-EVRNG', 'evRngState'], ['GOLD-SPAWN', 'nextSpawnRemainingS'], ['GOLD-FRENZY', 'frenzyRemainingS'],
  ['BROODY-NEST', 'broodyNestCents'], ['BROODY-HEN', 'broodyHenIdx'],
  ['ABIL-READY', 'abilities.market_hand.readyAt'], ['ABIL-UNLOCK', 'abilitiesUnlocked'], ['ABIL-COACH', 'abilitiesCoachSeen'],
  ['PAUSE-PAUSED', 'workers.market_hand.paused'], ['PAUSE-PAUSED-F', 'workers.coop_hand.paused'], ['PAUSE-LOCKOUT', 'workers.market_hand.callLockoutS']];
const get = (o: any, p: string) => p.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
const del = (o: any, p: string) => { const ks = p.split('.'), last = ks.pop()!; const t = ks.reduce((x, k) => x[k], o); delete t[last]; return o; };

describe('M5S-*-RT no-loss round-trip (serialize -> validate -> m5Load, flags on)', () => {
  for (const [id, p] of FIELDS) it(`[M5S-${id}-RT] ${p} survives a save/load unchanged`, () => {
    const s = M5(); expect(get(fromRaw(serialize(s, NOW, 5)), p)).toEqual(get(s, p));
  });
  it('[M5S-ALL-RT] the whole saved M5 shape round-trips; SAVE_VERSION stays 6 (no bump, F2)', () => {
    const s = M5(), out = fromRaw(serialize(s, NOW, 5)); expect(SAVE_VERSION).toBe(6);
    for (const k of M5_SAVED_FIELDS) expect(out[k]).toEqual(s[k]); expect(out.workers).toEqual(s.workers);
  });
});

describe('M5S-*-SAN m5Load sanitiser (clamp, wrong type, NaN, negative)', () => {
  const san = (patch: any) => load({ ...M5(), ...patch }).s;
  it('[M5S-GOLD-SPAWN-SAN] nextSpawnRemainingS: >max clamps to tc_egg_gap_max_s; negative/NaN/string dropped', () => {
    expect(san({ nextSpawnRemainingS: 9999 }).nextSpawnRemainingS).toBe(tc.egg_gap_max_s);
    for (const v of [-1, NaN, Infinity, '87', null]) expect('nextSpawnRemainingS' in san({ nextSpawnRemainingS: v })).toBe(false);
  });
  it('[M5S-GOLD-FRENZY-SAN] frenzyRemainingS clamps to tc_frenzy_s; bad dropped; legacy frenzyEndAt removed (R23)', () => {
    expect(san({ frenzyRemainingS: 999 }).frenzyRemainingS).toBe(tc.frenzy_s);
    for (const v of [-0.5, NaN, 'x']) expect('frenzyRemainingS' in san({ frenzyRemainingS: v })).toBe(false);
    expect('frenzyEndAt' in san({ frenzyEndAt: NOW + 5000 })).toBe(false);
  });
  it('[M5S-GOLD-EVRNG-SAN] evRngState must be a non-zero uint32, else dropped (re-derived, D-C2)', () => {
    for (const v of [0, -5, 1.5, 2 ** 32, NaN, '123']) expect('evRngState' in san({ evRngState: v })).toBe(false);
    expect(san({ evRngState: 0xffffffff }).evRngState).toBe(0xffffffff);
  });
  it('[M5S-BROODY-NEST-SAN] broodyNestCents floored, clamped to 1e15; negative/NaN/string dropped', () => {
    expect(san({ broodyNestCents: 12.7 }).broodyNestCents).toBe(12); expect(san({ broodyNestCents: 1e20 }).broodyNestCents).toBe(1e15);
    for (const v of [-1, NaN, '5']) expect('broodyNestCents' in san({ broodyNestCents: v })).toBe(false);
  });
  it('[M5S-BROODY-HEN-SAN] broodyHenIdx must be an integer 0..11, else dropped (re-pick R6)', () => {
    for (const v of [0, 11]) expect(san({ broodyHenIdx: v }).broodyHenIdx).toBe(v);
    for (const v of [-1, 12, 2.5, NaN, '3']) expect('broodyHenIdx' in san({ broodyHenIdx: v })).toBe(false);
  });
  it('[M5S-ABIL-READY-SAN] readyAt clamped to [now, now+cd]; non-finite readyAt removed, entry kept (E2 clock tamper)', () => {
    const r = (v: any) => san({ abilities: { market_hand: { readyAt: v } } }).abilities.market_hand;
    expect(r(NOW + 10 * CD).readyAt).toBe(NOW + CD); expect(r(NOW - 99_000).readyAt).toBe(NOW); expect(r(-5)).toEqual({}); // negative = invalid -> removed (absent readyAt = ready), not clamped
    for (const v of [NaN, 'soon', null, -1]) expect(r(v)).toEqual({});
  });
  it('[M5S-ABIL-MAP-SAN] abilities not an object / array -> dropped; a bad entry -> that entry dropped', () => {
    for (const v of [[], 5, 'x', null]) expect('abilities' in san({ abilities: v })).toBe(false);
    expect(san({ abilities: { market_hand: 7, hawker: { readyAt: NOW } } }).abilities).toEqual({ hawker: { readyAt: NOW } });
  });
  it('[M5S-ABIL-ACTIVE-SAN] activeS (a running call) ends once on load: removed + ability_ended{cause:offline} (AB-1)', () => {
    const { s, ev } = load({ ...M5(), abilities: { coop_hand: { readyAt: NOW + 1000, activeS: 18 } } });
    expect(s.abilities.coop_hand).toEqual({ readyAt: NOW + 1000 });
    expect(ev).toEqual([{ type: 'ability_ended', worker: 'coop_hand', cause: 'offline', effect_s: tc.ability_s - Math.min(18, tc.ability_s) }]);
  });
  it('[M5S-ABIL-BOOL-SAN] abilitiesUnlocked / abilitiesCoachSeen non-boolean -> dropped', () => {
    for (const v of [1, 'true', null]) { const s = san({ abilitiesUnlocked: v, abilitiesCoachSeen: v }); expect('abilitiesUnlocked' in s || 'abilitiesCoachSeen' in s).toBe(false); }
  });
  it('[M5S-PAUSE-PAUSED-SAN] paused non-boolean -> dropped (E9); below tc_pause_unlock_farm nothing stays paused (E12)', () => {
    for (const v of [1, 'true', null]) expect('paused' in san({ workers: { coop_hand: W({ paused: v }) } }).workers.coop_hand).toBe(false);
    const low = san({ farmLevel: tc.pause_unlock_farm - 1 }); expect('paused' in low.workers.market_hand).toBe(false); expect('callLockoutS' in low.workers.market_hand).toBe(false);
  });
  it('[M5S-PAUSE-LOCKOUT-SAN] callLockoutS: market_hand only; >cap -> cap; 0/negative/NaN/string -> dropped (B5)', () => {
    const lk = (v: any, id = 'market_hand') => san({ workers: { [id]: W({ callLockoutS: v }) } }).workers[id];
    expect(lk(999).callLockoutS).toBe(tc.pause_call_lockout_s); expect(lk(tc.pause_call_lockout_s + 1).callLockoutS).toBe(tc.pause_call_lockout_s); expect(lk(tc.pause_call_lockout_s).callLockoutS).toBe(tc.pause_call_lockout_s); expect(lk(10).callLockoutS).toBe(10);
    for (const v of [0, -3, NaN, '10']) expect('callLockoutS' in lk(v)).toBe(false);
    expect('callLockoutS' in lk(10, 'coop_hand')).toBe(false);
  });
});

describe('M5S-*-BAK / -IDB: .bak and the IndexedDB copy carry the M5 fields', () => {
  it('[M5S-ALL-BAK] rotate keeps the previous valid main (with M5 state) in .bak; a corrupt main restores it', () => {
    const k = kv(), s1 = M5(), s2 = { ...M5(), broodyNestCents: 99, nextSpawnRemainingS: 5 };
    save(k, s1, NOW - 60_000, ON); save(k, s2, NOW, ON, true);
    const bak = fromRaw(k.m.get(BAK_KEY)!); for (const [, p] of FIELDS) expect(get(bak, p)).toEqual(get(s1, p));
    k.m.set(SAVE_KEY, '{corrupt'); const r = loadSafe(k, ON, NOW, null); expect(r.file).not.toBeNull();
    const st = load(r.file!.state).s; for (const [, p] of FIELDS) expect(get(st, p)).toEqual(get(s1, p));
  });
  it('[M5S-ALL-IDB] a newer IndexedDB copy (higher saveSeq) wins reconcile and is written to main byte-for-byte, M5 fields intact', () => {
    const k = kv(), ls = serialize(M5(), NOW - 60_000, 3), idbS = { ...M5(), broodyHenIdx: 9, abilitiesCoachSeen: false, workers: { ...M5().workers, coop_hand: W({ paused: true }) } }, idb = serialize(idbS, NOW, 4);
    k.m.set(SAVE_KEY, ls); expect(reconcile(k, idb, ON, NOW)).toBe('idb'); expect(k.m.get(SAVE_KEY)).toBe(idb);
    const st = fromRaw(k.m.get(SAVE_KEY)!); expect(st.broodyHenIdx).toBe(9); expect(st.abilitiesCoachSeen).toBe(false); expect(st.workers.coop_hand.paused).toBe(true);
  });
});

describe('M5S-*-RECON: of two valid copies differing only in M5 state, the newer one is picked', () => {
  for (const [id, p] of FIELDS) it(`[M5S-${id}-RECON] newer copy's ${p} wins (saveSeq, then savedAt)`, () => {
    const old = M5(), neu = M5(); const v = get(neu, p); const alt = typeof v === 'boolean' ? !v : typeof v === 'number' ? (p.endsWith('readyAt') ? v + 1000 : p === 'evRngState' ? v + 1 : Math.max(1, v - 1)) : v;
    { const ks = p.split('.'), last = ks.pop()!; ks.reduce((x: any, k) => x[k], neu)[last] = alt; }
    const a = serialize(old, NOW - 1000, 7), b = serialize(neu, NOW, 8);
    expect(pickNewest(a, b, ON, NOW)).toBe('idb'); expect(pickNewest(b, a, ON, NOW)).toBe('ls');
    expect(get(fromRaw(b), p)).toEqual(alt);
    const a2 = serialize(old, NOW - 1000), b2 = serialize(neu, NOW); expect(pickNewest(a2, b2, ON, NOW)).toBe('idb'); // no saveSeq: savedAt tie-break
  });
});

describe('M5S-*-DEF: a v6 save without the M5 fields loads with defaults (no bump, no migration)', () => {
  it('[M5S-ALL-DEF] pre-M5 v6 save: validates, m5Load adds nothing, every M5 field absent (= default)', () => {
    const s = base(); s.workers = { market_hand: W(), coop_hand: W() } as any; const out = fromRaw(serialize(s, NOW));
    for (const k of [...M5_SAVED_FIELDS, ...M5_SESSION_FIELDS]) expect(k in out).toBe(false);
    for (const id of ['market_hand', 'coop_hand']) { expect('paused' in out.workers[id]).toBe(false); expect('callLockoutS' in out.workers[id]).toBe(false); }
  });
  for (const [id, p] of FIELDS) it(`[M5S-${id}-DEF] the save without only ${p} still loads; that field stays absent, others intact`, () => {
    const s = del(M5(), p), out = fromRaw(serialize(s, NOW)); expect(get(out, p)).toBeUndefined();
    for (const [, q] of FIELDS) if (q !== p) expect(get(out, q)).toEqual(get(M5(), q));
  });
});

describe('M5S-SESS: session-only keys never reach a serialised save', () => {
  const sess = { goldenEgg: { ageS: 12, slotId: 'S3', intervalS: 150 }, streakS: 0.2, streakHoldS: 1.5, tapCreditCdS: 0.5, irefRingCents: [1, 2, 3], refWarmS: 9, broodyNestScaled: 7, brRngState: 42, streakRun: { peak: 0.2, creditedTaps: 3, extraCents: 5 } };
  it('[M5S-SESS-1] the session key list is the 8 F1a keys (+ streakRun in m5-fields)', () => {
    expect([...M5_SESSION_KEYS].sort()).toEqual(['brRngState', 'broodyNestScaled', 'goldenEgg', 'irefRingCents', 'refWarmS', 'streakHoldS', 'streakS', 'tapCreditCdS']);
  });
  it('[M5S-SESS-2] serialize / save drop every session key (and streakRun); saved fields stay', () => {
    const k = kv(); save(k, { ...M5(), ...sess }, NOW, ON); for (const raw of [serialize({ ...M5(), ...sess }, NOW, 2), k.m.get(SAVE_KEY)!]) {
      const st = JSON.parse(raw).state; for (const key of Object.keys(sess)) expect(key in st).toBe(false); for (const f of M5_SAVED_FIELDS) expect(f in st).toBe(true); }
  });
  it('[M5S-SESS-3] hand-edited session keys in a stored save are dropped on load (m5Load -> m5Persist)', () => {
    const st = JSON.stringify({ ...M5(), ...sess }); const out = load(JSON.parse(st)).s; for (const key of Object.keys(sess)) expect(key in out).toBe(false);
  });
  it('[M5S-SESS-4] m5Persist returns the same object when no session key is present (byte-identical saves)', () => { const s = M5(); expect(m5Persist(s)).toBe(s); });
});
