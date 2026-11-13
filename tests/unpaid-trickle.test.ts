// unpaid_trickle AC-T1..T13 (spec of record: product/workers/m5-unpaid-trickle-spec.md v1.0.2, sha1 9e2acfe985887ff3543745fd80c7066f313c5f2b).
// T-R9, legal k {0} ∪ [0.5, 1.0], Q3 incomePerSec, §5 E1–E6 / AC-T11 verbatim (Art f87c5ecd folded in).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { balance as shipped, validateBalance, type Balance } from '../src/config/balance';
import { isLegalUnpaidTrickle, M5_FLAGS } from '../src/config/flags';
import { incomePerSec } from '../src/econ/income';
import { Game } from '../src/game';
import { apply } from '../src/sim/actions';
import type { SimEvent } from '../src/sim/events';
import { applyOffline } from '../src/sim/offline';
import { initialState, type GameState } from '../src/sim/state';
import { advance, step } from '../src/sim/tick';
import {
  isContributing, unpaidTrickleOn, unpaidTrickleRateCentsPerSec, unpaidTrickleSessionEnd,
  resetUnpaidTrickleSession, shouldRunR9, trickleResumeInS,
} from '../src/sim/unpaid-trickle';
import { unpaidResumeAtCents } from '../src/sim/workers';
import { SAVE_VERSION, serialize, save, load, SAVE_KEY } from '../src/save/save';
import { isPinned, validateEvent, type TEvent } from '../src/telemetry/schema';
import {
  fmtTrickleEta, trickleAria, trickleLine, TRICKLE_FALLBACK, TRICKLE_NBSP_DOT, workersHtml,
} from '../src/ui/workers-ui';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from '../scripts/sync-economy';
import { x1Balance } from './pacing-x1/harness';
import { X1_DATA } from './pacing-x1/source';
import { mem } from './helpers';

type B = Balance;
const flags = (o: Record<string, number>, bb: B = shipped, k?: number): B => {
  const energy = k === undefined ? bb.workers.energy : { ...bb.workers.energy, unpaid_trickle: k };
  return validateBalance({ ...bb, m4: { ...bb.m4!, enabled: 1, flags: { ...bb.m4!.flags, ...o } }, workers: { ...bb.workers, energy } } as B, false);
};
const ON = (k: number) => flags({ unpaidTrickle: 1 }, shipped, k);
const OFF = flags({ unpaidTrickle: 0 }, shipped, 0);
const DT = 1 / shipped.tickHz;
const F18 = 18;
const both = { market_hand: { energy: 0, cdS: 0, unpaid: true }, coop_hand: { energy: 0, cdS: 0, unpaid: true } };
const st = (o: Partial<GameState> = {}, b: B = shipped): GameState =>
  ({ ...initialState(b, 1), customers: [], nextCustomerInS: 1e9, farmLevel: F18, coinsCents: 0, coop: 0, basket: 0, ...o }) as GameState;
const snap = (s: GameState) => JSON.parse(JSON.stringify(s));
const run = (s: GameState, n: number, b: B, ev: SimEvent[] = []) => { for (let i = 0; i < n; i++) s = step(s, DT, b, ev); return s; };
const csvText = () => readFileSync(new URL('../data/economy.csv', import.meta.url), 'utf8');
const csvSha = () => createHash('sha256').update(readFileSync(new URL('../data/economy.csv', import.meta.url))).digest('hex');
const NEW_SHA = 'dc592848f00990696ebfc547a4ba48aedf84980160569d5b70a57bbc059c051b';
const schemaOk = (e: SimEvent) => {
  const te = { ts: 1_761_830_000_000, sid: 'a1b2c3', fgMs: 0, ...e } as TEvent;
  const errs = validateEvent(te);
  expect(errs, JSON.stringify(e) + ' ' + errs.join('; ')).toEqual([]);
  expect(isPinned(te)).toBe(true);
};

describe('unpaid_trickle legal k and load (AC-T12)', () => {
  // AC-T12
  it('isLegalUnpaidTrickle is {0} ∪ [0.5, 1.0]; 0, 0.5, 1.0 load; (0, 0.5) and > 1.0 reject', () => {
    expect(isLegalUnpaidTrickle(0)).toBe(true);
    expect(isLegalUnpaidTrickle(0.5)).toBe(true);
    expect(isLegalUnpaidTrickle(0.75)).toBe(true);
    expect(isLegalUnpaidTrickle(1)).toBe(true);
    for (const v of [0.49, 0.4999, 0.1, 1.01, 1.0001, 2, -0.1, -1, NaN, Infinity, -Infinity, Number.POSITIVE_INFINITY])
      expect(isLegalUnpaidTrickle(v), String(v)).toBe(false);
    expect(() => flags({ unpaidTrickle: 1 }, shipped, 0)).not.toThrow();
    expect(() => flags({ unpaidTrickle: 1 }, shipped, 0.5)).not.toThrow();
    expect(() => flags({ unpaidTrickle: 1 }, shipped, 1)).not.toThrow();
    const raw = (k: number) => ({ ...shipped, workers: { ...shipped.workers, energy: { ...shipped.workers.energy, unpaid_trickle: k } } } as B);
    expect(() => validateBalance(raw(0.49), false)).toThrow(/\{0\} ∪ \[0\.5, 1\.0\]/);
    expect(() => validateBalance(raw(1.01), false)).toThrow(/\{0\} ∪ \[0\.5, 1\.0\]/);
    expect(() => validateBalance(raw(-0.1), false)).toThrow(); // rejected (generic energy invalid, or legal-k)
  });

  // AC-T12
  it('sync-economy rejects k in (0, 0.5) and k > 1.0; accepts 0, 0.5, 1.0; missing column defaults to 0', () => {
    const bj = JSON.parse(readFileSync(new URL('../src/config/balance.json', import.meta.url), 'utf8'));
    const cfg = readEconomyConfig() as any;
    const setK = (k: string) => {
      const lines = csvText().trimEnd().split('\n');
      const h = lines[0].split(',');
      const i = h.indexOf('unpaid_trickle');
      expect(i).toBe(h.length - 1);
      return [lines[0], ...lines.slice(1).map(l => { const c = l.split(','); c[i] = k; return c.join(','); })].join('\n') + '\n';
    };
    const build = (csv: string) => buildBalance(parseEconomyCsv(csv), structuredClone(bj), cfg);
    expect((build(csvText()) as B).workers.energy.unpaid_trickle).toBe(0);
    expect((build(setK('0.5')) as B).workers.energy.unpaid_trickle).toBe(0.5);
    expect((build(setK('1')) as B).workers.energy.unpaid_trickle).toBe(1);
    expect(() => build(setK('0.49'))).toThrow(/unpaid_trickle must be in \{0\} ∪ \[0\.5, 1\.0\]/);
    expect(() => build(setK('1.01'))).toThrow(/unpaid_trickle must be in \{0\} ∪ \[0\.5, 1\.0\]/);
    // Historical: drop the column, default 0.
    const drop = () => {
      const lines = csvText().trimEnd().split('\n');
      const h = lines[0].split(',');
      const i = h.indexOf('unpaid_trickle');
      return [h.filter((_, j) => j !== i).join(','), ...lines.slice(1).map(l => l.split(',').filter((_, j) => j !== i).join(','))].join('\n') + '\n';
    };
    expect((build(drop()) as B).workers.energy.unpaid_trickle).toBe(0);
  });
});

describe('unpaid_trickle identity (AC-T1, AC-T4, AC-T7)', () => {
  // AC-T1
  it('flag off, and k = 0 with the flag on, are byte-identical to each other and to shipping (no credit, no events, no new fields)', () => {
    const s0 = st({ workers: both, coinsCents: 100, hensLevel: 5, collectionLevel: 3 });
    const evOff: SimEvent[] = [], evK0: SimEvent[] = [], evShip: SimEvent[] = [];
    const a = run(structuredClone(s0), 200, OFF, evOff);
    const b = run(structuredClone(s0), 200, ON(0), evK0);
    const c = run(structuredClone(s0), 200, shipped, evShip);
    expect(snap(a)).toEqual(snap(c));
    expect(snap(b)).toEqual(snap(c));
    expect(evOff.map(e => e.type)).toEqual(evShip.map(e => e.type));
    expect(evK0.map(e => e.type)).toEqual(evShip.map(e => e.type));
    expect(evK0.some(e => e.type.startsWith('unpaid_trickle'))).toBe(false);
    expect(a.coinsCents).toBe(s0.coinsCents);
    expect('unpaidTrickleFrac' in b).toBe(false);
    expect('unpaidTrickleWasOn' in b).toBe(false);
  });

  // AC-T4
  it('shipping economy.csv sha256 is the unpaid_trickle=0 pin; only the last column is new', () => {
    expect(csvSha()).toBe(NEW_SHA);
    expect(M5_FLAGS[M5_FLAGS.length - 1]).toBe('unpaidTrickle');
    const lines = csvText().trimEnd().split('\n');
    const h = lines[0].split(',');
    expect(h[h.length - 1]).toBe('unpaid_trickle');
    expect(h[h.length - 2]).toBe('tc_autorefill_reserve');
    for (const l of lines.slice(1)) {
      const c = l.split(',');
      expect(c[c.length - 1]).toBe('0');
    }
  });

  // AC-T7
  it('no new save fields and no SAVE_VERSION bump; session carry is dropped on serialize / reload', () => {
    expect(SAVE_VERSION).toBe(6);
    const b = ON(1);
    const ev: SimEvent[] = [];
    let s = run(st({ workers: both }, b), 50, b, ev);
    expect(s.unpaidTrickleSessionCents).toBeGreaterThan(0);
    const ser = serialize(s, 1, undefined, b);
    const parsed = JSON.parse(ser);
    expect(parsed.version).toBe(6);
    const stt = parsed.state;
    for (const k of ['unpaidTrickleFrac', 'unpaidTrickleWasOn', 'unpaidTrickleEp', 'unpaidTrickleSessionMs', 'unpaidTrickleSessionCents'])
      expect(k in stt, k).toBe(false);
    const kv = mem();
    save(kv, s, 1_700_000_000_000, b);
    const loaded = load(kv, b)!;
    expect(loaded.version).toBe(6);
    for (const k of ['unpaidTrickleFrac', 'unpaidTrickleWasOn', 'unpaidTrickleEp', 'unpaidTrickleSessionMs', 'unpaidTrickleSessionCents'])
      expect(k in loaded.state, k).toBe(false);
    const kvA = mem(), kvB = mem();
    const s0 = st({ workers: both, coinsCents: 50 });
    const a = run(structuredClone(s0), 80, OFF);
    const c = run(structuredClone(s0), 80, ON(0));
    save(kvA, a, 1_700_000_000_000, OFF);
    save(kvB, c, 1_700_000_000_000, ON(0));
    expect(kvA.getItem(SAVE_KEY)).toBe(kvB.getItem(SAVE_KEY));
  });
});

describe('unpaid_trickle live rate, T-R9, both-resume (AC-T2, AC-T8, AC-T9)', () => {
  const rateBoth = (k: number) => k * (0.25 * F18 + 0.5 * F18) * 100 / 60; // 22.5 k ¢/s

  // AC-T2
  it('F18 both unpaid from $0, k = 1: both resume in 60 s; k = 0.5: in 120 s; trickle is not a sale', () => {
    const need = unpaidResumeAtCents(both, F18, ON(1), 'coop_hand')!;
    expect(need).toBe(1350);
    expect(rateBoth(1)).toBe(22.5);
    expect(need / rateBoth(1)).toBe(60);
    expect(need / rateBoth(0.5)).toBe(120);
    for (const [k, sec] of [[1, 60], [0.5, 120]] as const) {
      const b = ON(k);
      const ev: SimEvent[] = [];
      const under = run(st({ workers: both }, b), Math.round((sec * shipped.tickHz) - 1), b, ev);
      expect(under.workers.market_hand!.unpaid, `k=${k} under`).toBe(true);
      expect(under.workers.coop_hand!.unpaid).toBe(true);
      expect(ev.some(e => e.type === 'sell')).toBe(false);
      const ev2: SimEvent[] = [];
      const done = run(st({ workers: both }, b), Math.round(sec * shipped.tickHz), b, ev2);
      expect(done.workers.market_hand!.unpaid, `k=${k} at ${sec}s`).toBe(false);
      expect(done.workers.coop_hand!.unpaid).toBe(false);
      expect(ev2.some(e => e.type === 'sell')).toBe(false);
      const started = ev2.filter(e => e.type === 'unpaid_trickle_started');
      const ended = ev2.filter(e => e.type === 'unpaid_trickle_ended');
      expect(started).toHaveLength(1);
      expect(started[0]).toMatchObject({ farm: F18, hands: 2, rate_cents_per_s: Math.floor(rateBoth(k)) });
      expect(ended).toHaveLength(1);
      expect(ended[0]).toMatchObject({ farm: F18, cause: 'resumed' });
      schemaOk(started[0]!); schemaOk(ended[0]!);
    }
  });

  // AC-T8
  it('contributing = hired MH/CH, unpaid, not paused, not Asleep; Unpaid at energy 0 counts; paused and Asleep do not; partial unpaid still trickles', () => {
    const b = ON(1);
    const s = st({
      workers: {
        market_hand: { energy: 0, cdS: 0, unpaid: true },
        coop_hand: { energy: 50, cdS: 0, unpaid: true, paused: true },
      },
    }, b);
    expect(isContributing(s.workers.market_hand, b)).toBe(true);
    expect(isContributing(s.workers.coop_hand, flags({ unpaidTrickle: 1, pause: 1 }, shipped, 1))).toBe(false);
    expect(isContributing({ energy: 0, cdS: 0 }, b)).toBe(false); // Asleep, not Unpaid
    const bp = flags({ unpaidTrickle: 1, pause: 1 }, shipped, 1);
    const pausedOnly = st({ workers: { market_hand: { energy: 40, cdS: 0, unpaid: true, paused: true }, coop_hand: { energy: 40, cdS: 0, unpaid: true, paused: true } } }, bp);
    expect(unpaidTrickleRateCentsPerSec(pausedOnly.workers, F18, bp)).toBe(0);
    const partial = st({ workers: { market_hand: { energy: 80, cdS: 1e9 }, coop_hand: { energy: 0, cdS: 0, unpaid: true } }, coinsCents: 0 }, b);
    expect(unpaidTrickleRateCentsPerSec(partial.workers, F18, b)).toBe(15);
    expect(isContributing(partial.workers.coop_hand, b)).toBe(true);
  });

  // AC-T9
  it('T-R9: a sale covering W1 alone leaves both Unpaid; a sale covering the combined need resumes both on that tick', () => {
    const b = ON(1);
    const ev: SimEvent[] = [];
    let s = st({ workers: both }, b);
    s = step(s, DT, b, ev); // start episode
    expect(s.workers.market_hand!.unpaid).toBe(true);
    // "sale" covering W1 only ($4.50 = 450¢), not the set ($13.50)
    s = step({ ...s, coinsCents: 450 }, DT, b, ev);
    expect(s.workers.market_hand!.unpaid).toBe(true);
    expect(s.workers.coop_hand!.unpaid).toBe(true);
    expect(shouldRunR9({ ...s, coinsCents: 450, workers: both }, b)).toBe(false);
    expect(shouldRunR9({ ...s, coinsCents: 1350, workers: both }, b)).toBe(true);
    const evS: SimEvent[] = [];
    const resumed = step({ ...s, coinsCents: 1350, workers: both }, DT, b, evS);
    expect(resumed.workers.market_hand!.unpaid).toBe(false);
    expect(resumed.workers.coop_hand!.unpaid).toBe(false);
    expect(evS.some(e => e.type === 'unpaid_trickle_ended' && e.cause === 'resumed')).toBe(true);
    // a real sell that covers the set
    const evSell: SimEvent[] = [];
    let live = st({ workers: both, basket: 10_000, customers: [{ id: 1, demand: 10_000, filled: 0, waitedS: 0 }] }, b);
    live = apply(live, { type: 'sellAll' }, b, evSell);
    expect(evSell.some(e => e.type === 'sell')).toBe(true);
    expect(live.coinsCents).toBeGreaterThanOrEqual(1350);
    live = step(live, DT, b, evSell);
    expect(live.workers.market_hand!.unpaid).toBe(false);
    expect(live.workers.coop_hand!.unpaid).toBe(false);
  });
});

describe('unpaid_trickle offline (AC-T3)', () => {
  // AC-T3
  it('away 2 h credits only up to the T-R9 instant; hands stay Unpaid; eggs match flag-off; short / negative / non-finite credit 0', () => {
    const b = ON(1);
    const s0 = st({ workers: both, hensLevel: 8, collectionLevel: 3 }, b);
    const twoH = 7200 * 1000;
    const on = applyOffline(structuredClone(s0), twoH, b);
    const off = applyOffline(structuredClone(s0), twoH, OFF);
    expect(on.eggs).toBe(off.eggs);
    expect(on.state.pendingOfflineEggs).toBe(off.state.pendingOfflineEggs);
    expect(on.state.workers.market_hand!.unpaid).toBe(true);
    expect(on.state.workers.coop_hand!.unpaid).toBe(true);
    expect(on.state.coinsCents).toBe(1350); // T-R9 instant at k=1, F18 both
    expect(off.state.coinsCents).toBe(0);
    expect(applyOffline(s0, 59_000, b).state.coinsCents).toBe(0); // < 60 s
    expect(applyOffline(s0, -5000, b).state.coinsCents).toBe(0);
    expect(applyOffline(s0, Number.NaN, b).state.coinsCents).toBe(0);
    expect(applyOffline(s0, Infinity, b).state.coinsCents).toBe(0);
    // cap: 3 h is the same credit as 2 h (both hit the T-R9 instant)
    expect(applyOffline(s0, 3 * 3600 * 1000, b).state.coinsCents).toBe(on.state.coinsCents);
  });
});

describe('unpaid_trickle incomePerSec (Q3) and telemetry (AC-T10)', () => {
  // Q3 / AC HUD (E6)
  it('live incomePerSec includes the trickle when the flag is on and rate > 0; assumeWorking does not; flag off is unchanged', () => {
    const s = st({ workers: both, hensLevel: 5 });
    const on = ON(1), off = OFF;
    expect(incomePerSec(s, on) - incomePerSec(s, off)).toBeCloseTo(0.225, 9);
    expect(incomePerSec(s, on, { assumeWorking: true })).toBe(incomePerSec(s, off, { assumeWorking: true }));
    expect(incomePerSec(s, ON(0))).toBe(incomePerSec(s, off));
  });

  // AC-T10
  it('session_end unpaid_trickle_s / unpaid_trickle_coins only with the flag on; duration is floor(ms/1000); flag off emits no new names', () => {
    const b = ON(1);
    const ev: SimEvent[] = [];
    const s = run(st({ workers: both }, b), 30, b, ev); // 3 s
    const fields = unpaidTrickleSessionEnd(s, b);
    expect(fields.unpaid_trickle_s).toBe(Math.floor((s.unpaidTrickleSessionMs ?? 0) / 1000));
    expect(fields.unpaid_trickle_coins).toBe(s.unpaidTrickleSessionCents);
    expect(unpaidTrickleSessionEnd(s, OFF)).toEqual({});
    expect(unpaidTrickleSessionEnd(s, ON(0))).toEqual({ unpaid_trickle_s: fields.unpaid_trickle_s, unpaid_trickle_coins: fields.unpaid_trickle_coins }); // flag on, k = 0 still reports if accumulators exist
    // Game session_end path
    const kv = mem();
    let t = Date.UTC(2026, 10, 14, 9);
    const g = new Game(b, kv, () => t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
    g.state = st({ workers: both }, b);
    t += 3500; g.frame();
    g.endSession();
    const ends = g.telemetry.events().filter(e => e.type === 'session_end');
    const e = ends.at(-1)!;
    expect('unpaid_trickle_s' in e).toBe(true);
    expect('unpaid_trickle_coins' in e).toBe(true);
    expect((e as any).unpaid_trickle_s).toBeGreaterThanOrEqual(0);
    const kvOff = mem();
    const gOff = new Game(OFF, kvOff, () => t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
    gOff.state = st({ workers: both }, OFF);
    t += 3500; gOff.frame();
    gOff.endSession();
    const eOff = gOff.telemetry.events().filter(ee => ee.type === 'session_end').at(-1)!;
    expect('unpaid_trickle_s' in eOff).toBe(false);
    expect('unpaid_trickle_coins' in eOff).toBe(false);
    expect(gOff.telemetry.events().some(ee => String(ee.type).startsWith('unpaid_trickle'))).toBe(false);
    const cleared = resetUnpaidTrickleSession(structuredClone(s));
    expect('unpaidTrickleSessionMs' in cleared).toBe(false);
  });

  it('zero_sum and flag_off causes emit a valid unpaid_trickle_ended', () => {
    const b = ON(1);
    const ev: SimEvent[] = [];
    let s = run(st({ workers: both }, b), 20, b, ev);
    // drop both from the sum (hire-fire: un-hire by deleting — treated as not contributing)
    s = step({ ...s, workers: {} }, DT, b, ev);
    const zs = ev.filter(e => e.type === 'unpaid_trickle_ended' && e.cause === 'zero_sum');
    expect(zs.length).toBeGreaterThanOrEqual(1);
    schemaOk(zs[0]!);
    const ev2: SimEvent[] = [];
    let s2 = run(st({ workers: both }, b), 20, b, ev2);
    s2 = step(s2, DT, OFF, ev2);
    const fo = ev2.filter(e => e.type === 'unpaid_trickle_ended' && e.cause === 'flag_off');
    expect(fo.length).toBeGreaterThanOrEqual(1);
    schemaOk(fo[0]!);
  });
});

describe('unpaid_trickle UI §5 E1–E6 (AC-T11, spec v1.0.2 9e2acfe9)', () => {
  // AC-T11
  it('E2 fmtTrickleEta: ~m:ss below 1 h, ~h:mm:ss from 1 h, ceil, never ~0:00, minutes unpadded, seconds always 2 digits', () => {
    expect(fmtTrickleEta(0)).toBe('~0:01');
    expect(fmtTrickleEta(0.001)).toBe('~0:01');
    expect(fmtTrickleEta(0.9)).toBe('~0:01');
    expect(fmtTrickleEta(1)).toBe('~0:01');
    expect(fmtTrickleEta(59)).toBe('~0:59');
    expect(fmtTrickleEta(59.1)).toBe('~1:00');
    expect(fmtTrickleEta(90)).toBe('~1:30');
    expect(fmtTrickleEta(605)).toBe('~10:05');
    expect(fmtTrickleEta(3600)).toBe('~1:00:00');
    expect(fmtTrickleEta(3900)).toBe('~1:05:00');
    expect(fmtTrickleEta(3661)).toBe('~1:01:01');
    expect(fmtTrickleEta(10 * 3600 + 5)).toBe('~10:00:05');
    for (const s of [0, 0.1, 0.99, 1, 59, 60, 3600]) expect(fmtTrickleEta(s)).not.toBe('~0:00');
  });

  // AC-T11
  it('E1/E3/E4/E6: verbatim copy with NBSP around ·, icon-coin.svg 12 px aria-hidden, aria is not live; no DOM when flag off or k = 0', () => {
    expect(TRICKLE_NBSP_DOT).toBe('\u00A0·\u00A0');
    expect(trickleLine('~1:00')).toBe('Trickle\u00A0·\u00A0resumes in ~1:00');
    expect(trickleAria('Market Hand', '1:00')).toBe('Market Hand: wage trickle on, resumes in about 1:00');
    expect(trickleAria('Coop Hand', '1:05:00')).toBe('Coop Hand: wage trickle on, resumes in about 1:05:00');
    expect(TRICKLE_FALLBACK).toBe('Trickle on');
    const b = ON(1);
    const s = st({ workers: both, coinsCents: 0 }, b);
    const eta = fmtTrickleEta(trickleResumeInS(s, b, 'market_hand')!);
    expect(eta).toBe('~1:00'); // 60 s at k=1
    const html = workersHtml(s, b);
    expect(html).toContain(trickleLine(eta));
    expect(html).toContain('\u00A0·\u00A0');
    expect(html).toContain('Trickle\u00A0·\u00A0resumes in ~1:00');
    expect(html).toContain('Market Hand: wage trickle on, resumes in about 1:00');
    expect(html).toContain('Coop Hand: wage trickle on, resumes in about 1:00'); // T-R9: same combined time
    expect(html).toMatch(/<img class="wk-trickle-ico" src="[^"]*icon-coin\.svg" width="12" height="12" alt="" aria-hidden="true">/);
    expect(html).not.toMatch(/wk-trickle[^>]*aria-live/);
    expect(html).toContain('data-short="Trickle on"');
    expect(html).toContain('class="wk-trickle"');
    expect(workersHtml(s, OFF)).not.toContain('wk-trickle');
    expect(workersHtml(s, OFF)).not.toContain('Trickle');
    expect(workersHtml(s, OFF)).not.toContain('icon-coin.svg');
    expect(workersHtml(s, ON(0))).not.toContain('wk-trickle');
    expect(workersHtml(s, ON(0))).not.toContain('Trickle');
  });
});

describe('unpaid_trickle partial unpaid 90/k at F18 (AC-T13)', () => {
  // AC-T13
  it('W1 paid (energy > 0, wages frozen) + W2 unpaid: resumes in 90/k s at F18', () => {
    for (const [k, sec] of [[1, 90], [0.5, 180]] as const) {
      const b = ON(k);
      const ws = { market_hand: { energy: 100, cdS: 1e9 }, coop_hand: { energy: 0, cdS: 0, unpaid: true } };
      expect(unpaidResumeAtCents(ws, F18, b, 'coop_hand')).toBe(1350);
      expect(unpaidTrickleRateCentsPerSec(ws, F18, b)).toBe(15 * k);
      const ev: SimEvent[] = [];
      const under = run(st({ workers: ws }, b), Math.round(sec * shipped.tickHz) - 1, b, ev);
      expect(under.workers.coop_hand!.unpaid, `k=${k} under`).toBe(true);
      expect(under.workers.market_hand!.unpaid).toBeFalsy();
      expect(under.workers.market_hand!.energy).toBeGreaterThan(0);
      const done = run(st({ workers: ws }, b), Math.round(sec * shipped.tickHz), b);
      expect(done.workers.coop_hand!.unpaid, `k=${k} at ${sec}s`).toBe(false);
      expect(done.workers.market_hand!.unpaid).toBeFalsy();
    }
  });
});

describe('pacing harness --unpaid-trickle switch', () => {
  it('x1Balance({ unpaidTrickle: true }) turns the flag on in memory and leaves the CSV k; default is off', () => {
    const off = x1Balance(X1_DATA);
    expect(off.b.m4!.flags.unpaidTrickle ?? 0).toBe(0);
    expect(unpaidTrickleOn(off.b)).toBe(false);
    const on = x1Balance(X1_DATA, undefined, { unpaidTrickle: true });
    expect(on.b.m4!.flags.unpaidTrickle).toBe(1);
    expect(on.b.workers.energy.unpaid_trickle).toBe(off.b.workers.energy.unpaid_trickle);
    expect(on.b.workers.energy.unpaid_trickle).toBe(0); // shipping k
    expect(on.csvSha256).toBe(off.csvSha256);
    expect(on.balanceSha256).toBe(off.balanceSha256); // tree file unchanged
    expect(on.balance.flagsOn).toContain('unpaidTrickle');
    expect(off.balance.flagsOn).not.toContain('unpaidTrickle');
  });
});
