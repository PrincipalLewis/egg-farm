// v5-tel-envelope (engineering/tasks/v5-tel-envelope/HANDOFF.md + clock-api.md): TEL-AC1 envelope {type, ts, sid, fgMs} on every
// event, and the hidden >= session_hidden_end_s session rotate (telemetry-spec v0.6.2 L13-20, B3 L172, B4 L173, T-AC8, T-AC13).
import { describe, it, expect } from 'vitest';
import { balance as b, validateBalance } from '../src/config/balance';
import { Game } from '../src/game';
import { Telemetry, type TEvent } from '../src/telemetry/telemetry';
import { validateEvent } from '../src/telemetry/schema';
import { SAVE_KEY } from '../src/save/save';
import { coopCap } from '../src/sim/tracks';
import { mem } from './helpers';

const T0 = Date.UTC(2026, 10, 10, 12);
function setup() {
  const kv = mem(); let t = T0; const clock = { get t() { return t; }, set t(v) { t = v; } };
  const g = new Game(b, kv, () => t, 7); g.state = { ...g.state, farmLevel: 15, coop: 51 };
  for (let i = 0; i < 20; i++) { t += 1000; g.frame(); }
  g.save();
  return { kv, g, clock };
}
const evs = (g: Game, type?: string) => g.telemetry.events().filter(e => !e.legacy && (!type || e.type === type));
const play = (g: Game, clock: { t: number }, s: number) => { for (let i = 0; i < s; i++) { clock.t += 1000; g.frame(); } };
const hide = (g: Game, clock: { t: number }, ms: number) => { g.onHidden(clock.t); clock.t += ms; g.frame(); };
/** TEL-AC1 over a list of events: sid 6-char base36, ts number, fgMs integer >= 0 non-decreasing per sid, no sessionMs. */
function envelopeErrors(list: readonly TEvent[]): string[] {
  const out: string[] = [], last = new Map<string, number>();
  for (const [i, e] of list.entries()) {
    if (typeof e.type !== 'string') out.push(`${i}: type`);
    if (typeof e.ts !== 'number') out.push(`${i}: ts`);
    if (typeof e.sid !== 'string' || !/^[0-9a-z]{6}$/.test(e.sid)) out.push(`${i} ${e.type}: sid ${e.sid}`);
    if (!Number.isInteger(e.fgMs) || (e.fgMs as number) < 0) out.push(`${i} ${e.type}: fgMs ${e.fgMs}`);
    if ('sessionMs' in e) out.push(`${i} ${e.type}: sessionMs`);
    const p = last.get(e.sid as string); if (p !== undefined && (e.fgMs as number) < p) out.push(`${i} ${e.type}: fgMs ${e.fgMs} < ${p}`);
    last.set(e.sid as string, e.fgMs as number);
  }
  return out;
}

describe('[TEL-AC1] every exported event has type, ts, sid (6-char base36), fgMs (>= 0, non-decreasing per sid), no sessionMs', () => {
  it('[TEL-AC1] a scripted session (taps, short hide, long hide, pagehide): ring, export and console snapshot', () => {
    const { g, clock } = setup();
    for (let i = 0; i < 5; i++) g.dispatch({ type: 'collect' });
    play(g, clock, 3); hide(g, clock, 30_000); g.onShown(clock.t); play(g, clock, 2);
    hide(g, clock, 90_000); g.onShown(clock.t); for (let i = 0; i < 3; i++) g.dispatch({ type: 'collect' }); play(g, clock, 2); g.endSession();
    expect(envelopeErrors(evs(g))).toEqual([]);
    expect(envelopeErrors(JSON.parse(g.telemetry.exportJSON()).events)).toEqual([]);
    expect(envelopeErrors(JSON.parse(g.telemetry.snapshotJSON()).events)).toEqual([]);
    expect(new Set(evs(g).map(e => e.sid)).size).toBe(2);
    for (const e of evs(g, 'session_end')) expect(validateEvent(e).filter(m => /\.(reason|fg_ms|ts|sid|fgMs|sessionMs):/.test(m))).toEqual([]);
  });
  it('sid comes from crypto: the sim RNG state is identical with the clock present (determinism)', () => {
    const a = setup(), c = setup();
    a.g.telemetry.clock.nowFgMs(); hide(a.g, a.clock, 61_000); a.g.onShown(a.clock.t);
    hide(c.g, c.clock, 61_000); c.g.onShown(c.clock.t);
    expect(a.g.state.rng).toBe(c.g.state.rng); expect(evs(a.g)[0].sid).not.toBe(evs(c.g)[0].sid);
  });
});

describe('[B3] hidden split (R1/R2, T-AC8, T-AC13)', () => {
  it('R1: hide 59.9 s keeps the sid; fgMs excludes the hidden span', () => {
    const { g, clock } = setup(); const sid = g.telemetry.clock.sid, fg0 = g.telemetry.clock.nowFgMs();
    hide(g, clock, 59_900); g.onShown(clock.t); g.telemetry.track('save_reset');
    const e = evs(g).at(-1)!; expect(e.sid).toBe(sid); expect(e.fgMs).toBe(fg0);
    expect(evs(g, 'session_end')).toHaveLength(0); expect(evs(g, 'session_start')).toHaveLength(1);
  });
  it('R2 / T-AC13: hide 60 s -> back-dated session_end{hidden} (ts = hide, fg_ms = fg at hide = last fgMs), then session_start{resume} with a new sid and prev_hidden_ms, then offline_grant', () => {
    const { g, clock } = setup(); const sid0 = g.telemetry.clock.sid;
    const hideAt = clock.t, fgAtHide = g.telemetry.clock.nowFgMs(hideAt);
    hide(g, clock, 60_000); const showAt = clock.t; g.onShown(showAt);
    const list = evs(g), iEnd = list.findIndex(e => e.type === 'session_end'), end = list[iEnd];
    expect(end).toMatchObject({ reason: 'hidden', ts: hideAt, sid: sid0, fgMs: fgAtHide, fg_ms: fgAtHide });
    expect(Math.max(...list.filter(e => e.sid === sid0).map(e => e.fgMs as number))).toBe(end.fg_ms); // T-AC8 shared clock
    const start = list[iEnd + 1];
    expect(start).toMatchObject({ type: 'session_start', reason: 'resume', prev_hidden_ms: 60_000, ts: showAt, fgMs: 0 });
    expect(start.sid).not.toBe(sid0); expect(start.session_id).toBe(start.sid); expect(g.telemetry.clock.sid).toBe(start.sid);
    const grant = list.findIndex(e => e.type === 'offline_grant');
    expect(grant).toBeGreaterThan(iEnd + 1); expect(list[grant].sid).toBe(start.sid);
  });
  it('R3: pagehide after a hide >= 60 s that never returned emits exactly one session_end, reason hidden, back-dated', () => {
    const { g, clock } = setup(); const hideAt = clock.t; hide(g, clock, 120_000);
    g.endSession(); g.endSession();
    const ends = evs(g, 'session_end'); expect(ends).toHaveLength(1); expect(ends[0]).toMatchObject({ reason: 'hidden', ts: hideAt });
  });
  it('R3: pagehide after a short hide (or none) is session_end{unload} at the pagehide time', () => {
    const a = setup(); hide(a.g, a.clock, 10_000); a.g.endSession();
    expect(evs(a.g, 'session_end')).toEqual([expect.objectContaining({ reason: 'unload', ts: a.clock.t })]);
    const c = setup(); c.g.endSession(); expect(evs(c.g, 'session_end')).toEqual([expect.objectContaining({ reason: 'unload', ts: c.clock.t })]);
  });
  it('R7: an inactive (tab guard) or read-only tab never rotates on a long hide', () => {
    for (const freeze of [(g: Game) => { g.inactive = true; }, (g: Game) => { g.readOnly = true; }]) {
      const { g, clock } = setup(); const sid = g.telemetry.clock.sid; freeze(g);
      hide(g, clock, 120_000); g.onShown(clock.t);
      expect(g.telemetry.clock.sid).toBe(sid); expect(evs(g, 'session_end')).toHaveLength(0); expect(evs(g, 'session_start')).toHaveLength(1);
    }
  });
});

describe('[R5/R6] contributor reset and bfcache pageshow (fixes #127 m1)', () => {
  it('R6: pagehide then pageshow{persisted} opens a new sid once; the second session_end counts only the new session', () => {
    const { g, clock } = setup(); const sid0 = g.telemetry.clock.sid;
    for (let i = 0; i < 4; i++) g.dispatch({ type: 'collect' });
    g.onHidden(clock.t); g.endSession(); // bfcache: visibilitychange hidden, then pagehide
    clock.t += 5_000; g.onPageShow(clock.t); g.onShown(clock.t); // pageshow{persisted}, then visibilitychange visible
    expect(evs(g, 'session_start').filter(e => e.reason === 'resume')).toHaveLength(1);
    expect(g.telemetry.clock.sid).not.toBe(sid0);
    expect(evs(g, 'session_start').at(-1)).toMatchObject({ prev_hidden_ms: 5_000 });
    for (let i = 0; i < 2; i++) g.dispatch({ type: 'collect' });
    g.endSession(); const ends = evs(g, 'session_end');
    expect(ends.map(e => e.reason)).toEqual(['unload', 'unload']);
    expect(ends.map(e => e.taps_total)).toEqual([4, 2]);
  });
  it('A1 order: session_end, then session_summary, then every reset(); counts() read before reset; registration order kept', () => {
    let t = 1000; const tl = new Telemetry(mem(), b.telemetry, () => t); const log: string[] = []; let n = 3;
    tl.registerSessionEnd('base', { fields: () => { log.push('base.fields'); return { taps_total: 99, managed: false }; }, counts: () => { log.push('base.counts'); return { x: n }; }, reset: () => { log.push('base.reset'); n = 0; } });
    tl.registerSessionEnd('breeds', { fields: () => ({ breed_hatches: 1 }), reset: () => log.push('breeds.reset') });
    tl.sessionSummary = (_at, c) => { log.push(`summary ${JSON.stringify(c)}`); return { counts: {} }; };
    t += 500; tl.endSession('unload', t);
    expect(tl.events().map(e => e.type)).toEqual(['session_end', 'session_summary']);
    expect(tl.events()[0]).toMatchObject({ reason: 'unload', fg_ms: 500, taps_total: 99, breed_hatches: 1, ts: 1500, fgMs: 500 });
    expect(log).toEqual(['base.fields', 'base.counts', 'summary {"base":{"x":3}}', 'base.reset', 'breeds.reset']);
    expect(tl.clock.ended).toBe(true); tl.endSession('unload', t); expect(tl.events()).toHaveLength(2); // one end per sid
  });
});

describe('[R4/A2] an open coop_full episode closes at the split', () => {
  it('coop full at a long hide: coop_full end{exit_reason:hidden} at the hide in the old sid, before session_end; reopened in the new sid if still full', () => {
    const { g, clock } = setup(); g.state = { ...g.state, coop: coopCap(g.state, b) }; play(g, clock, 2);
    const sid0 = g.telemetry.clock.sid; expect(evs(g, 'coop_full').at(-1)).toMatchObject({ phase: 'start' });
    const hideAt = clock.t; hide(g, clock, 70_000); g.onShown(clock.t);
    const list = evs(g), iEnd = list.findIndex(e => e.type === 'session_end');
    const iSplit = list.findIndex(e => e.type === 'coop_full' && e.exit_reason === 'hidden');
    expect(iSplit).toBeGreaterThanOrEqual(0); expect(iSplit).toBeLessThan(iEnd);
    expect(list[iSplit]).toMatchObject({ phase: 'end', ts: hideAt, sid: sid0, durationMs: hideAt - (list.find(e => e.type === 'coop_full')!.ts as number) });
    if (g.state.coop >= coopCap(g.state, b)) expect(list.slice(iEnd).some(e => e.type === 'coop_full' && e.phase === 'start' && e.sid !== sid0)).toBe(true);
  });
});

describe('[B4/R8] telemetry.session_hidden_end_s', () => {
  it('balance.json has 60 = offline.offlineMinSeconds; a different value fails validateBalance; absent is allowed', () => {
    expect(b.telemetry.session_hidden_end_s).toBe(60); expect(b.telemetry.session_hidden_end_s).toBe(b.offline.offlineMinSeconds);
    const bad = structuredClone(b) as any; bad.telemetry.session_hidden_end_s = 30;
    expect(() => validateBalance(bad, false)).toThrow(/session_hidden_end_s must equal offline\.offlineMinSeconds/);
    const none = structuredClone(b) as any; delete none.telemetry.session_hidden_end_s; expect(() => validateBalance(none, false)).not.toThrow();
  });
});

describe('save never contains telemetry ids', () => {
  it('save JSON and .bak carry no sid / fgMs / session_id / fg_ms keys after a rotate', () => {
    const { g, kv, clock } = setup(); hide(g, clock, 61_000); g.onShown(clock.t); play(g, clock, 2); g.save(); g.endSession();
    for (const k of [SAVE_KEY, `${SAVE_KEY}.bak`]) { const raw = kv.getItem(k); if (raw) for (const f of ['"sid"', '"fgMs"', '"session_id"', '"fg_ms"']) expect(raw, `${k} ${f}`).not.toContain(f); }
  });
});
