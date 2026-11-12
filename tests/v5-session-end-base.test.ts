// HoE/v5-session-end-base: pure session_end / session_start / session_summary builders.
// ACs: TEL-AC2/3 (m5-gate-acs L672-675), T-AC1/2/7/8/9/10 (telemetry-spec L143-152),
// D-HOP-2026-11-10-21 (session_index+1 on resume), T-AC9 session_end literal rule,
// schema.ts START_FIELDS / session_end / session_summary. Envelope wiring is pending #138.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateEvent, VIEWPORT_H_BUCKETS, VIEWPORT_W_BUCKETS, EVENT_SCHEMA } from '../src/telemetry/schema';
import {
  allocateSessionIndex,
  bucketViewportW,
  bucketViewportH,
  VIEWPORT_H_CHIP_MAX_PX,
  VIEWPORT_H_TALL_MIN_PX,
  VIEWPORT_W_NARROW_MAX_PX,
  VIEWPORT_W_WIDE_MIN_PX,
  eggsLostWhileFull,
  sessionEndBaseFields,
  sessionStartBaseFields,
  sessionSummaryPayload,
  createSessionEndBase,
  createSessionSummaryProducer,
  COOP_FULL_EPISODE_CAP,
  SESSION_END_BASE_KEYS,
  type SessionStartBaseInput,
  type SessionSummaryStart,
} from '../src/telemetry/session-base';

const SRC = new URL('../src/', import.meta.url).pathname;
const ev = (type: string, f: Record<string, unknown>) =>
  validateEvent({ type, ts: 1_761_830_000_000, sid: 'a1b2c3', fgMs: 1_000, ...f });
const fieldsOf = (t: string) => Object.keys(EVENT_SCHEMA[t]?.fields ?? {});

const START_IN: SessionStartBaseInput = {
  reason: 'load', session_index: 1, farm_level: 12, collection_level: 5,
  has_coop_hand: true, viewport_w_px: 390, viewport_h_px: 812, reduced_motion: false,
  session_id: 'a1b2c3', build: 'v5-rc0.abc1234', install_id: '0b7c3f8e-1d2a-4c5b-9e6f-7a8b9c0d1e2f',
};
const SUM_START: SessionSummaryStart = {
  reason: 'load', build: 'v5-rc0.abc1234', session_index: 1, farm_level: 12, collection_level: 5,
  has_coop_hand: true, viewport_w: '375–767', viewport_h: '740-899', reduced_motion: false,
};

describe('[TEL-AC3] viewport buckets (exact schema wire strings)', () => {
  it('viewport_h: 739 → <740, 740 and 899 → 740-899, 900 → >=900; 0 / non-finite → <740', () => {
    expect(VIEWPORT_H_CHIP_MAX_PX).toBe(740);
    expect(VIEWPORT_H_TALL_MIN_PX).toBe(900);
    expect(bucketViewportH(739)).toBe('<740');
    expect(bucketViewportH(740)).toBe('740-899');
    expect(bucketViewportH(899)).toBe('740-899');
    expect(bucketViewportH(900)).toBe('>=900');
    expect(bucketViewportH(0)).toBe('<740');
    expect(bucketViewportH(-1)).toBe('<740');
    expect(bucketViewportH(Number.NaN)).toBe('<740');
    expect([bucketViewportH(739), bucketViewportH(740), bucketViewportH(900)]).toEqual([
      VIEWPORT_H_BUCKETS[0], VIEWPORT_H_BUCKETS[1], VIEWPORT_H_BUCKETS[2],
    ]);
  });
  it('viewport_w: 374 → <375, 375 and 767 → 375–767 (en dash), 768 → ≥768', () => {
    expect(VIEWPORT_W_NARROW_MAX_PX).toBe(375);
    expect(VIEWPORT_W_WIDE_MIN_PX).toBe(768);
    expect(bucketViewportW(374)).toBe('<375');
    expect(bucketViewportW(375)).toBe(VIEWPORT_W_BUCKETS[1]);
    expect(bucketViewportW(767)).toBe(VIEWPORT_W_BUCKETS[1]);
    expect(bucketViewportW(768)).toBe(VIEWPORT_W_BUCKETS[2]);
    expect(bucketViewportW(375)).toBe('375–767'); // en dash, not hyphen
    expect(bucketViewportW(768)).toBe('≥768');
    expect(bucketViewportW(0)).toBe('<375');
  });
});

describe('[T8 / TEL-AC2] session_start base fields', () => {
  it('load: required TEL-AC2 keys, buckets, no prev_hidden_ms; schema-valid with envelope sid/ts/fgMs', () => {
    const f = sessionStartBaseFields(START_IN);
    expect(f).toMatchObject({
      reason: 'load', session_id: 'a1b2c3', session_index: 1, farm_level: 12, collection_level: 5,
      has_coop_hand: true, viewport_w: '375–767', viewport_h: '740-899', reduced_motion: false,
      build: 'v5-rc0.abc1234', install_id: START_IN.install_id,
    });
    expect(f).not.toHaveProperty('prev_hidden_ms');
    expect(ev('session_start', { ...f })).toEqual([]);
  });
  it('resume: prev_hidden_ms present; a load input that also has prev_hidden_ms drops it', () => {
    const r = sessionStartBaseFields({ ...START_IN, reason: 'resume', session_index: 2, prev_hidden_ms: 60_000 });
    expect(r).toMatchObject({ reason: 'resume', session_index: 2, prev_hidden_ms: 60_000 });
    expect(ev('session_start', { ...r })).toEqual([]);
    const load = sessionStartBaseFields({ ...START_IN, prev_hidden_ms: 60_000 });
    expect(load).not.toHaveProperty('prev_hidden_ms');
  });
  it('does not invent session_id (envelope clock, pending #138); optional keys omitted when unset', () => {
    const { session_id: _s, build: _b, install_id: _i, ...rest } = START_IN;
    const f = sessionStartBaseFields(rest);
    expect(f).not.toHaveProperty('session_id');
    expect(f).not.toHaveProperty('build');
    expect(f).not.toHaveProperty('install_id');
  });
  it('is pure: same input → deep-equal output; input is not mutated', () => {
    const src = { ...START_IN };
    const a = sessionStartBaseFields(src), b = sessionStartBaseFields(src);
    expect(a).toEqual(b); expect(src).toEqual(START_IN); expect(a).not.toBe(b);
  });
});

describe('[D-HOP-2026-11-10-21] allocateSessionIndex', () => {
  it('load from empty flags is 1; load from 3 is 4; resume is +1 of the persisted value', () => {
    expect(allocateSessionIndex({}, 'load')).toEqual({ session_index: 1, flags: { sessions: 1 } });
    expect(allocateSessionIndex({ sessions: 3 }, 'load')).toEqual({ session_index: 4, flags: { sessions: 4 } });
    expect(allocateSessionIndex({ sessions: 3 }, 'resume')).toEqual({ session_index: 4, flags: { sessions: 4 } });
  });
  it('never reuses a value when the caller persists flags: resume then resume again is 4 then 5', () => {
    const a = allocateSessionIndex({ sessions: 3 }, 'resume');
    const reused = allocateSessionIndex({ sessions: 3 }, 'resume'); // same prev — pure, same result
    expect(reused.session_index).toBe(a.session_index);
    const b = allocateSessionIndex(a.flags, 'resume');
    expect(b.session_index).toBe(a.session_index + 1);
    expect(b.session_index).toBe(5);
  });
  it('session_index is an int ≥ 1 (schema I(1)); fractional / negative prev is floored at 0 then +1', () => {
    expect(allocateSessionIndex({ sessions: -4 }, 'load').session_index).toBe(1);
    expect(allocateSessionIndex({ sessions: 2.9 }, 'resume').session_index).toBe(3);
  });
});

describe('[session_end base] required keys, no reason/fg_ms (envelope)', () => {
  const base = {
    taps_total: 50, taps_moved_eggs: 40, eggs_collected_manual: 120,
    coop_full_ms: 30_000, eggs_lost_while_full: 33.5, managed: true,
    farm_level: 12, collection_level: 5,
  };
  it('emits the required 10 keys with schema types; coop_full_flapping omitted when false', () => {
    const f = sessionEndBaseFields(base);
    for (const k of SESSION_END_BASE_KEYS) expect(f, k).toHaveProperty(k);
    expect(f).not.toHaveProperty('reason');
    expect(f).not.toHaveProperty('fg_ms');
    expect(f).not.toHaveProperty('coop_full_flapping');
    expect(f.eggs_lost_while_full).toBe(33.5);
    expect(ev('session_end', { ...f, reason: 'unload', fg_ms: 60_000 })).toEqual([]);
  });
  it('coop_full_flapping is present only when true (T-AC10, schema optional)', () => {
    const f = sessionEndBaseFields({ ...base, coop_full_flapping: true });
    expect(f.coop_full_flapping).toBe(true);
    expect(ev('session_end', { ...f, reason: 'hidden', fg_ms: 1_000 })).toEqual([]);
    expect(sessionEndBaseFields({ ...base, coop_full_flapping: false })).not.toHaveProperty('coop_full_flapping');
  });
  it('clamps counts to int ≥ 0 and eggs_lost to float ≥ 0; every key is a schema field', () => {
    const f = sessionEndBaseFields({
      taps_total: -3, taps_moved_eggs: 2.9, eggs_collected_manual: Number.NaN,
      coop_full_ms: 1500.4, eggs_lost_while_full: -8, managed: true,
      farm_level: 0, collection_level: -1,
    });
    expect(f).toMatchObject({
      taps_total: 0, taps_moved_eggs: 2, eggs_collected_manual: 0,
      coop_full_ms: 1500, eggs_lost_while_full: 0, farm_level: 0, collection_level: 0,
    });
    for (const k of Object.keys(f)) expect(fieldsOf('session_end')).toContain(k);
  });
  it('is pure: does not mutate the input', () => {
    const src = { ...base }; const a = sessionEndBaseFields(src), c = sessionEndBaseFields(src);
    expect(a).toEqual(c); expect(src).toEqual(base);
  });
});

describe('[T-AC7] coop_full_ms and eggs_lost_while_full', () => {
  it('two episodes of 10 s and 20 s: coop_full_ms = 30000 and eggs_lost = Σ episode eggs_lost', () => {
    const c = createSessionEndBase();
    c.recordCoopFullEnd(10_000, 11.25);
    c.recordCoopFullEnd(20_000, 22.5);
    const f = c.fields(30_000);
    expect(f.coop_full_ms).toBe(30_000);
    expect(f.eggs_lost_while_full).toBe(33.75);
    expect(c.counts(30_000).coop_full_episodes).toBe(2);
    expect(f).not.toHaveProperty('coop_full_flapping');
  });
  it('eggsLostWhileFull is uncapped − capped, ≥ 0, and 0 on non-finite', () => {
    expect(eggsLostWhileFull(40.5, 30)).toBe(10.5);
    expect(eggsLostWhileFull(30, 40)).toBe(0);
    expect(eggsLostWhileFull(Number.NaN, 10)).toBe(0);
  });
  it('closeOpenEpisode (A2 shape) adds the open hide interval and then fields() reads the final total', () => {
    const c = createSessionEndBase();
    c.recordCoopFullStart(1_000);
    c.closeOpenEpisode(4_000, 6); // 3000 ms
    expect(c.fields(4_000)).toMatchObject({ coop_full_ms: 3_000, eggs_lost_while_full: 6 });
    c.closeOpenEpisode(9_000, 99); // no open episode — no-op
    expect(c.fields(9_000).coop_full_ms).toBe(3_000);
  });
});

describe('[T-AC8] taps_total and eggs_collected_manual; fg_ms is not ours', () => {
  it('taps_total = Σ tap.count; taps_moved_eggs = count − empty; eggs_collected_manual = Σ collect.eggs', () => {
    const c = createSessionEndBase();
    c.recordTap({ count: 50, eggs: 90, empty: 8 });
    c.recordTap({ count: 1, eggs: 0 }); // empty defaults to count when eggs=0
    c.recordCollect(90);
    c.recordCollect(12);
    const f = c.fields(0);
    expect(f.taps_total).toBe(51);
    expect(f.taps_moved_eggs).toBe(42); // 50-8 + 0
    expect(f.eggs_collected_manual).toBe(102);
    expect(f).not.toHaveProperty('fg_ms'); // T-AC8 fg_ms is the envelope clock
  });
});

describe('[T-AC10] coop_full episode cap and flapping', () => {
  it('first 100 ends are emittable; 101st is not, takeCappedMarker is true once, totals include past the cap, flapping=true', () => {
    const c = createSessionEndBase();
    for (let i = 0; i < COOP_FULL_EPISODE_CAP; i++) {
      expect(c.shouldEmitCoopFullEnd()).toBe(true);
      c.recordCoopFullEnd(1_000, 2);
    }
    expect(c.shouldEmitCoopFullEnd()).toBe(false);
    expect(c.takeCappedMarker()).toBe(false); // cap reached, no 101st yet
    expect(c.fields(0)).not.toHaveProperty('coop_full_flapping');
    expect(c.counts(0).coop_full_episodes).toBe(100);
    expect(c.counts(0).coop_full_ms).toBe(100_000);

    c.recordCoopFullEnd(1_000, 2);
    expect(c.shouldEmitCoopFullEnd()).toBe(false);
    expect(c.takeCappedMarker()).toBe(true);
    expect(c.takeCappedMarker()).toBe(false); // once
    expect(c.fields(0).coop_full_flapping).toBe(true);
    expect(c.counts(0)).toMatchObject({ coop_full_episodes: 101, coop_full_ms: 101_000, eggs_lost_while_full: 202, coop_full_flapping: true });
  });
});

describe('managed (dashboard §5): hired worker (incl. pre-existing) ∧ ≥1 manage this session', () => {
  it('manage only, hire only, and neither are false; hire then manage, or pre-hired then manage, are true', () => {
    const a = createSessionEndBase();
    a.recordManage(); expect(a.fields(0).managed).toBe(false);
    a.recordHire(); expect(a.fields(0).managed).toBe(true);

    const b = createSessionEndBase();
    b.recordHire(); expect(b.fields(0).managed).toBe(false);

    const d = createSessionEndBase();
    d.setHasHiredWorker(true); d.recordManage(); expect(d.fields(0).managed).toBe(true);

    const e = createSessionEndBase({ hasHiredWorker: () => true });
    e.recordManage(); expect(e.fields(0).managed).toBe(true);
  });
});

describe('contributor: fields / counts / reset (envelope A1 shape)', () => {
  it('fields(at) and counts(at) are pure reads; reset() clears; A1 order works (counts before reset)', () => {
    const c = createSessionEndBase();
    c.setLevels(8, 3);
    c.recordTap({ count: 10, eggs: 20, empty: 1 });
    c.recordCollect(20);
    c.recordCoopFullEnd(5_000, 4);
    c.recordUpgrade({ fgMs: 12_000, upgrade: 'farm', newLevel: 1, cost: 9.5, taps_before: 4, is_first_upgrade: true });
    c.recordUpgrade({ fgMs: 20_000, upgrade: 'collection', newLevel: 2, cost: 15, taps_before: 10, is_first_upgrade: false });
    const log: string[] = [];
    log.push('fields'); const f = c.fields(99);
    log.push('counts'); const n = c.counts(99);
    log.push('reset'); c.reset();
    expect(log).toEqual(['fields', 'counts', 'reset']);
    expect(f).toMatchObject({ taps_total: 10, taps_moved_eggs: 9, eggs_collected_manual: 20, coop_full_ms: 5_000, farm_level: 8, collection_level: 3 });
    expect(n).toMatchObject({ upgrades: 2, coop_full_episodes: 1, first_upgrade: { fgMs: 12_000, upgrade: 'farm', newLevel: 1, cost: 9.5, taps_before: 4 } });
    expect(c.fields(99)).toMatchObject({ taps_total: 0, taps_moved_eggs: 0, eggs_collected_manual: 0, coop_full_ms: 0, farm_level: 0, managed: false });
    expect(c.counts(99).first_upgrade).toBeNull();
    expect(c.counts(99).upgrades).toBe(0);
  });
  it('levels getter is read at fields() time; counts().first_upgrade is a copy', () => {
    let farm = 1;
    const c = createSessionEndBase({ levels: () => ({ farm_level: farm, collection_level: 0 }) });
    farm = 9;
    expect(c.fields(0).farm_level).toBe(9);
    c.recordUpgrade({ fgMs: 1, upgrade: 'hens', newLevel: 2, cost: 1, taps_before: 0, is_first_upgrade: true });
    const a = c.counts(0).first_upgrade, b = c.counts(0).first_upgrade;
    expect(a).toEqual(b); expect(a).not.toBe(b);
  });
});

describe('[session_summary] §3.3 shape, TEL-AC11 viewport_h, ≤ 1 KB', () => {
  it('required keys, start.viewport_h, nullable end / first_upgrade, only present count types; schema-valid', () => {
    const p = sessionSummaryPayload({
      start: SUM_START, end: null, counts: { session_start: 1, upgrade: 2, tap: 0, 'Bad Key': 4, nope: 3 },
      coop_full_ms: 0, eggs_lost_while_full: 0, coop_full_episodes: 0, coop_full_flapping: false,
      first_upgrade: null, upgrades: 0,
    });
    expect(p.start).toMatchObject({ viewport_h: '740-899', viewport_w: '375–767', reason: 'load', session_index: 1 });
    expect((p.start as Record<string, unknown>)).not.toHaveProperty('install_id');
    expect((p.start as Record<string, unknown>)).not.toHaveProperty('session_id');
    expect(p.end).toBeNull();
    expect(p.first_upgrade).toBeNull();
    expect(p.counts).toEqual({ session_start: 1, upgrade: 2 }); // tap:0 and invalid keys dropped
    expect(p).not.toHaveProperty('sid');
    expect(p).not.toHaveProperty('ts');
    expect(p).not.toHaveProperty('fgMs');
    expect(ev('session_summary', p)).toEqual([]);
  });
  it('end present, first_upgrade present, resume prev_hidden_ms, flapping; schema-valid and ≤ 1 KB', () => {
    const p = sessionSummaryPayload({
      start: { ...SUM_START, reason: 'resume', prev_hidden_ms: 60_000 },
      end: { reason: 'hidden', fg_ms: 45_000, taps_total: 80, taps_moved_eggs: 70, eggs_collected_manual: 200 },
      counts: { session_start: 1, session_end: 1, upgrade: 3, coop_full: 10, worker_manage: 2 },
      coop_full_ms: 12_000, eggs_lost_while_full: 33.5, coop_full_episodes: 10, coop_full_flapping: false,
      first_upgrade: { fgMs: 11_000, upgrade: 'farm', newLevel: 1, cost: 4.25, taps_before: 8 },
      upgrades: 3,
    });
    expect((p.start as Record<string, unknown>).prev_hidden_ms).toBe(60_000);
    expect(p.end).toMatchObject({ reason: 'hidden', fg_ms: 45_000, taps_total: 80 });
    expect(ev('session_summary', p)).toEqual([]);
    const bytes = JSON.stringify({ type: 'session_summary', sid: 'a1b2c3', ts: 1, ...p }).length;
    expect(bytes).toBeLessThanOrEqual(1024);
  });
  it('createSessionSummaryProducer: null start → null; otherwise builds from counts.base + ctx (A1 hook shape)', () => {
    const c = createSessionEndBase();
    c.recordTap({ count: 7, eggs: 7 }); c.recordCollect(7); c.setLevels(2, 1);
    c.recordUpgrade({ fgMs: 5_000, upgrade: 'hens', newLevel: 1, cost: 3, taps_before: 2, is_first_upgrade: true });
    const ctx = {
      start: SUM_START as SessionSummaryStart | null,
      end: { reason: 'unload' as const, fg_ms: 8_000 },
      eventCounts: { session_start: 1, upgrade: 1 },
    };
    const prod = createSessionSummaryProducer(() => ctx);
    const p = prod(8_000, { base: { ...c.counts(8_000) } });
    expect(p).toMatchObject({
      end: { reason: 'unload', fg_ms: 8_000, taps_total: 7, eggs_collected_manual: 7 },
      counts: { session_start: 1, upgrade: 1 },
      upgrades: 1,
    });
    expect((p as Record<string, unknown>).first_upgrade).toMatchObject({ upgrade: 'hens', newLevel: 1 });
    expect(ev('session_summary', p!)).toEqual([]);
    ctx.start = null;
    expect(prod(8_000, { base: { ...c.counts(8_000) } })).toBeNull();
  });
});

describe('[T-AC9] session_end literal is plain keys or ...spreads only; this module does not import the envelope', () => {
  it('src/game.ts track(session_end, …) payload is a helper call or a literal of plain keys / spreads (no comma expressions)', () => {
    const src = readFileSync(join(SRC, 'game.ts'), 'utf8');
    const m = src.match(/track\(\s*'session_end'\s*,\s*([^;]+)\)/);
    expect(m, 'session_end track site').toBeTruthy();
    const arg = m![1].trim();
    if (arg.startsWith('{')) {
      // T-AC9 scan splits on commas: only `key: ident` or `...spread` allowed inside the literal.
      const inner = arg.slice(1, arg.lastIndexOf('}'));
      for (const part of inner.split(',').map(s => s.trim()).filter(Boolean)) {
        expect(part.startsWith('...') || /^\w+\s*:\s*[\w.]+$/.test(part), part).toBe(true);
      }
    } else {
      // A single helper call or identifier (today: sessionEndPresentFields(...)).
      expect(/^[A-Za-z_$][\w$]*(\s*\(.*\))?\s*$/.test(arg), arg).toBe(true);
    }
  });
  it('session-base.ts does not import session-clock or call track(); every emitted key is a schema field', () => {
    const src = readFileSync(join(SRC, 'telemetry/session-base.ts'), 'utf8');
    const imports = src.split('\n').filter(l => /^import\s/.test(l)).join('\n');
    expect(imports).not.toMatch(/session-clock/);
    expect(imports).not.toMatch(/from\s+['"][^'"]*game['"]/);
    expect(src).not.toMatch(/\.track\s*\(/);
    const f = sessionEndBaseFields({
      taps_total: 1, taps_moved_eggs: 1, eggs_collected_manual: 1,
      coop_full_ms: 0, eggs_lost_while_full: 0, managed: false,
      farm_level: 0, collection_level: 0, coop_full_flapping: true,
    });
    for (const k of Object.keys(f)) expect(fieldsOf('session_end')).toContain(k);
    const s = sessionStartBaseFields(START_IN);
    for (const k of Object.keys(s)) expect(fieldsOf('session_start')).toContain(k);
  });
});
