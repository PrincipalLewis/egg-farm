// QA early-signal probes: M5S-STK-* (4) and M5S-VER-6 from qa/v5-saves/m5-save-cases-DRAFT.md (G1 + G3), run at rc/v5 3f582db.
// Fixtures only (no browser, no ports). Runs from <tree>/tests/qa-m5/ with qa/v5-saves/probes/m5/vitest.probe.config.ts.
// Spec: streak spec v1.3.2 product/collection/m5-streak-tap-coins-spec.md sha1 acb4cdbb (R11/K9, L136). SAVE_VERSION: D-HOE-20261030-19.
// SCOPE: the STK cases cover GAME-WRITTEN saves only. Hand-added streakBest/streak/tapCoins keys are OQ-1 (MINOR): the HAND cases
// RECORD whether such keys are kept or dropped (line "OBSERVED OQ-1 ..."); they assert only "not corrupt, no effect, no event".
// SESS-1..4 (m5-save.probe.test.ts) already cover the 8 F1a session keys + streakRun; STK adds the literal names no code declares.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { balance as SHIP } from '../../src/config/balance';
import { initialState, type GameState } from '../../src/sim/state';
import { serialize, save, validate, newerSaveVersion, SAVE_KEY, SAVE_VERSION, CORRUPT_PREFIX, type KV } from '../../src/save/save';
import { m5Load } from '../../src/save/m5-fields';
import { M5_SAVED_FIELDS, M5_SESSION_FIELDS } from '../../src/sim/m5-state';
import { Game } from '../../src/game';
import type { SimEvent } from '../../src/sim/events';
import { ON as ON0 } from '../v5-f2-helpers';

const ROOT = resolve(__dirname, '../..');
const fl = (b: any, f: Record<string, number>) => ({ ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, ...f } } }) as typeof ON0;
const ON = fl(ON0, { pause: 1, tapCoins: 1 });          // golden+streak+tapCoins+broody+abilities+pause
const OFF_ST = fl(ON0, { pause: 1, streak: 0, tapCoins: 0 }); // same, streak+tapCoins OFF
const NOW = Date.UTC(2026, 9, 30, 12), MID = '0123456789abcdef';
const BANNED = ['streakBest', 'streak', 'tapCoins'];
const SESS2 = [...M5_SESSION_FIELDS, 'streakRun'];
type KVM = KV & { m: Map<string, string> };
const kv = (): KVM => { const m = new Map<string, string>(); return { m, getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: k => { m.delete(k); } }; };
/** every key name at any depth */
const deepKeys = (o: any, out = new Set<string>()): Set<string> => { if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (!Array.isArray(o)) out.add(k); deepKeys(v, out); } return out; };
/** A marked (tracksV7) farm, so M4's own tracks migration never runs: any save_migrated would be M5's. */
const farm = (b = ON): GameState => ({ ...initialState(b, 7), farmLevel: 12, coop: 50, tracksV7: 1, v6BackupId: MID } as any);
const W = (x: any = {}) => ({ energy: 80, cdS: 0, ...x });
/** every M5 saved field (F-M5-ALL) on a marked farm */
const m5Farm = (b = ON): any => ({ ...farm(b), evRngState: 123456789, nextSpawnRemainingS: 87, frenzyRemainingS: 12, broodyNestCents: 4321, broodyHenIdx: 3,
  abilitiesUnlocked: true, abilitiesCoachSeen: true, abilities: { market_hand: { readyAt: NOW + 120_000 } },
  workers: { market_hand: W({ paused: true, callLockoutS: 20 }), coop_hand: W() } });
const events = (g: Game): any[] => ((g.telemetry as any).buf as any[]).filter(e => !['session_start', 'session_end'].includes(e.type));
const strip = (e: any) => { const { ts, sessionMs, ...r } = e; return r; };
const boot = (b: any, raw: string, now = NOW) => { const k = kv(); k.m.set(SAVE_KEY, raw); const g = new Game(b, k, () => now, 7); return { k, g }; };
const stored = (k: KVM) => JSON.parse(k.m.get(SAVE_KEY)!);

describe('M5S-STK: a game-written v5 save has no streakBest / streak / tapCoins state keys (ST v1.3.2 R11/K9, L136; game-written saves only)', () => {
  it('[M5S-STK-NOKEY-SIM] flags ON, a played streak run (credited taps, s > 0, cd > 0, streakRun) -> Game.save()/serialize()/save(): no banned key at any depth, no SESS-2 key', () => {
    const { k, g } = boot(ON, serialize(farm(), NOW, 1)); let t = NOW; (g as any).now = () => t;
    for (let i = 0; i < 6; i++) { t += 1100; g.frame(); g.dispatch({ type: 'collect' }); }
    const s: any = g.state;
    expect(s.streakS).toBeGreaterThan(0); expect(s.tapCreditCdS).toBeGreaterThan(0); expect(s.streakRun?.creditedTaps).toBeGreaterThanOrEqual(2); expect(s.streakHoldS).toBeGreaterThan(0);
    // I_ref ring: no writer exists at 3f582db (no src reference outside m5-state.ts); inject it so the scan also covers it.
    const live = { ...s, irefRingCents: [1, 2, 3], refWarmS: 9 };
    g.save(); const k2 = kv(); save(k2, live, t, ON);
    for (const raw of [k.m.get(SAVE_KEY)!, serialize(live, t, 3), k2.m.get(SAVE_KEY)!]) {
      const d = JSON.parse(raw); const keys = deepKeys(d.state);
      for (const x of BANNED) expect(keys.has(x), `${x} in saved state`).toBe(false);
      for (const x of SESS2) expect(x in d.state, `${x} in saved state`).toBe(false);
      for (const x of BANNED) expect(x in d, `${x} at file level`).toBe(false);
    }
  });
  it('[M5S-STK-NOKEY-SRC] static: no "streakBest" anywhere in src/; GameState/M5Fields declare no streak / tapCoins / streakBest field; saved list has none', () => {
    const files: string[] = []; const walk = (d: string) => { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : files.push(p); } }; walk(join(ROOT, 'src'));
    const hits = files.filter(f => /streakbest/i.test(readFileSync(f, 'utf8'))); expect(hits).toEqual([]);
    for (const f of ['src/sim/state.ts', 'src/sim/m5-state.ts']) {
      const src = readFileSync(join(ROOT, f), 'utf8'); expect(src).not.toMatch(/^\s*(?:readonly\s+)?(streak|tapCoins|streakBest)\??\s*:/m);
    }
    for (const x of BANNED) { expect((M5_SAVED_FIELDS as readonly string[]).includes(x)).toBe(false); expect(x in initialState(ON, 1)).toBe(false); }
    // flag names only: config/flags.ts L9, m5-fields.ts L23
    expect(readFileSync(join(ROOT, 'src/config/flags.ts'), 'utf8')).toMatch(/'streak', 'tapCoins'/);
  });
});

/** OQ-1 fixture: stored v6 save hand-edited with the three names. NaN-as-null = JSON.stringify(NaN) -> null. */
const HAND: [string, any][] = [['objects/numbers', { streakBest: 12, streak: { s: 9 }, tapCoins: 500 }], ['strings', { streakBest: 'x', streak: 'x', tapCoins: 'x' }],
  ['null', { streakBest: null, streak: null, tapCoins: null }], ['NaN-as-null', { streakBest: NaN, streak: { s: NaN }, tapCoins: NaN }]];
const observed: Record<string, string> = {};
const handCase = (label: 'ON' | 'OFF', b: any) => {
  for (const [name, extra] of HAND) it(`[M5S-STK-HAND-${label}] ${name}: loads (not corrupt), no effect vs the same save without the keys, no extra event; disposition recorded`, () => {
    const base = farm(b), raw = serialize({ ...base, ...extra } as any, NOW, 1), ctl = serialize(base, NOW, 1);
    const h = boot(b, raw), c = boot(b, ctl);
    expect(h.g.recovery).toBeFalsy(); expect([...h.k.m.keys()].some(x => x.startsWith(CORRUPT_PREFIX))).toBe(false); expect(h.g.readOnly).toBe(false);
    const drop = (o: any) => { const r = { ...o }; for (const x of BANNED) delete r[x]; return r; };
    expect(drop(h.g.state)).toEqual(c.g.state);                                  // nothing else differs after load
    expect(events(h.g).map(strip)).toEqual(events(c.g).map(strip));              // no event caused by the keys
    // first tick + a credited tap: s starts from 0 (R11/K9), coins identical to the control (no bonus from tapCoins)
    let t = NOW; for (const x of [h, c]) (x.g as any).now = () => t;
    t += 1100; h.g.frame(); c.g.frame(); expect((h.g.state as any).streakS ?? 0).toBe(0);
    h.g.dispatch({ type: 'collect' }); c.g.dispatch({ type: 'collect' });
    expect(drop(h.g.state)).toEqual(c.g.state); expect(h.g.state.coinsCents).toBe(c.g.state.coinsCents);
    if (label === 'ON') expect((h.g.state as any).streakS).toBe(ON.m4!.tc!.streak_per_tap);
    expect(events(h.g).map(strip)).toEqual(events(c.g).map(strip));
    h.g.save(); const st = stored(h.k).state;
    const inMem = BANNED.filter(x => x in h.g.state), reSaved = BANNED.filter(x => x in st);
    const disp = inMem.length === 0 && reSaved.length === 0 ? 'DROPPED' : inMem.length === 3 && reSaved.length === 3 ? 'KEPT (ignored, re-saved as unknown keys)' : `PARTIAL mem=${inMem} saved=${reSaved}`;
    observed[`${label}/${name}`] = `${disp}; re-saved values=${JSON.stringify(Object.fromEntries(reSaved.map(x => [x, st[x]])))}`;
    console.log(`OBSERVED OQ-1 HAND-${label} ${name}: ${observed[`${label}/${name}`]}`);
    expect(['DROPPED', 'KEPT (ignored, re-saved as unknown keys)']).toContain(disp); // PASS = ignored or dropped (case text); which one is recorded
  });
};
describe('M5S-STK-HAND-ON: hand-added keys, flags ON (OQ-1: record, do not assert drop)', () => handCase('ON', ON));
describe('M5S-STK-HAND-OFF: hand-added keys, streak+tapCoins OFF (flag isolation; nothing read)', () => {
  handCase('OFF', OFF_ST);
  it('[M5S-STK-HAND-OFF] direct m5Load with streak+tapCoins OFF: output = input minus nothing for the three keys (untouched), no event', () => {
    const ev: SimEvent[] = []; const inp = { ...m5Farm(OFF_ST), streakBest: 12, streak: { s: 9 }, tapCoins: 500 };
    const out: any = m5Load(inp, OFF_ST, NOW, ev); expect(ev).toEqual([]); for (const x of BANNED) expect(out[x]).toEqual((inp as any)[x]);
  });
});

describe('M5S-VER-6: SAVE_VERSION stays 6, no M5 migration (D-HOE-20261030-19; save.ts:7)', () => {
  it('[M5S-VER-6a] SAVE_VERSION === 6; migrations has keys 1..5 only (static, save.ts:74-85); a v5 save still migrates to 6', () => {
    expect(SAVE_VERSION).toBe(6);
    const src = readFileSync(join(ROOT, 'src/save/save.ts'), 'utf8'); expect(src).toMatch(/^export const SAVE_VERSION = 6;$/m);
    const at = src.indexOf('const migrations'), blk = src.slice(at, at + src.slice(at).search(/^};/m)); // block ends at the column-0 '};' (probe fix P1)
    expect([...blk.matchAll(/^\s*(\d+):/gm)].map(m => +m[1])).toEqual([1, 2, 3, 4, 5]);
    const v5 = JSON.parse(serialize(farm(), NOW)); v5.version = 5; delete v5.sum; const r = validate(JSON.stringify(v5), ON); expect(r.ok && r.file.version).toBe(6);
  });
  it('[M5S-VER-6b] a flags-on save with every M5 saved field is written as "version":6 (serialize, save(), Game.save())', () => {
    const { k, g } = boot(ON, serialize(m5Farm(), NOW, 1)); g.save();
    const k2 = kv(); save(k2, m5Farm(), NOW, ON);
    for (const raw of [serialize(m5Farm(), NOW), k2.m.get(SAVE_KEY)!, k.m.get(SAVE_KEY)!]) { expect(JSON.parse(raw).version).toBe(6); expect(raw.startsWith('{"version":6,')).toBe(true); }
    for (const f of M5_SAVED_FIELDS) expect(f in stored(k).state).toBe(true);
  });
  it('[M5S-VER-6c] an M4.1 flag-off build (shipping balance, every M5 flag 0) loads that save as not-newer, writable; unknown keys (incl. a fixture `breeds`) round-trip byte-identical', () => {
    const raw = serialize({ ...m5Farm(), breeds: { stars: 1, slots: ['leghorn', null, null], freeHatchUsed: 0 } }, NOW, 1);
    expect(newerSaveVersion(raw)).toBeNull();
    const { k, g } = boot(SHIP, raw); expect(g.newerSave ?? null).toBeNull(); expect(g.readOnly).toBe(false); expect(g.recovery).toBeFalsy(); g.save();
    const a = JSON.parse(raw).state, b = stored(k).state; expect(stored(k).version).toBe(6);
    for (const f of [...M5_SAVED_FIELDS, 'breeds']) expect(JSON.stringify(b[f])).toBe(JSON.stringify(a[f]));
    expect(events(g).some(e => e.type === 'save_migrated')).toBe(false);
  });
  it('[M5S-VER-6d] a pre-M5 v6 save (no M5 fields) under flags ON: validate = {...initialState, ...d.state}, version 6, no tracksMigrated, no breeds key; m5Load adds nothing, no event', () => {
    const pre = farm(); const raw = serialize(pre, NOW, 1); const r = validate(raw, ON, NOW); expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.file.version).toBe(6); expect(r.file.tracksMigrated).toBeUndefined();
    expect(r.file.state).toEqual({ ...initialState(ON), ...JSON.parse(raw).state }); expect('breeds' in r.file.state).toBe(false);
    const ev: SimEvent[] = []; const out: any = m5Load(r.file.state, ON, NOW, ev); expect(ev).toEqual([]);
    for (const f of [...M5_SAVED_FIELDS, ...M5_SESSION_FIELDS]) expect(f in out).toBe(false);
  });
  it('[M5S-VER-6e] Game boot of that pre-M5 v6 save, flags ON: no version bump in storage, no save_migrated, same telemetry as an M5-off M4 build', () => {
    const raw = serialize(farm(), NOW, 1);
    const on = boot(ON, raw), off = boot(fl(ON0, { golden: 0, streak: 0, broody: 0, abilities: 0, pause: 0, tapCoins: 0 }), raw);
    for (const x of [on, off]) { expect(x.g.readOnly).toBe(false); expect(stored(x.k).version).toBe(6); x.g.endSession(); }
    const types = (g: Game) => ((g.telemetry as any).buf as any[]).map(e => e.type);
    expect(types(on.g)).not.toContain('save_migrated'); expect(types(on.g)).not.toContain('save_migration_aborted');
    expect(types(on.g)).toEqual(types(off.g));
    const tk = JSON.parse(on.k.m.get('eggfarm.telemetry') ?? '[]') as any[]; expect(tk.some(e => e.type === 'save_migrated')).toBe(false);
    // the stored state is the input plus nothing M5 (re-stamped savedAt / saveSeq only)
    const st = stored(on.k).state; for (const f of [...M5_SAVED_FIELDS, ...M5_SESSION_FIELDS]) expect(f in st).toBe(false);
  });
});
