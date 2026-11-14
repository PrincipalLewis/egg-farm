// F-2 G8-12/G8-13 (errata rev 13 V-0 L42-43, D-HOE-20261030-19): stored ring {v, events},
// a ring with no v keeps its events tagged legacy:true, export header carries schema_version.
// T-AC9 still rejects an untagged pre-0.6.2 shape. SAVE_VERSION and balance stay put.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { SAVE_VERSION } from '../src/save/save';
import { Telemetry, TELEMETRY_KEY } from '../src/telemetry/telemetry';
import { TELEMETRY_SCHEMA_VERSION, validateEvent } from '../src/telemetry/schema';
import { mem } from './helpers';

const CFG = { ring_size: 50, flush_interval_s: 5, tap_batch_ms: 1000 };
/** Pre-0.6.2 shape: sessionMs, no sid/fgMs. validateEvent rejects it until legacy:true (V-0). */
const OLD = { type: 'goal_tap', ts: 1, sessionMs: 5 };

describe('[G8-12] stored ring {v, events} and export schema_version', () => {
  it('[G8-12] flush writes {v: TELEMETRY_SCHEMA_VERSION, events}; SAVE_VERSION stays 6; balance.telemetry is unchanged (+ B4 session_hidden_end_s)', () => {
    expect(SAVE_VERSION).toBe(6);
    expect(b.telemetry).toEqual({
      ring_size: 5000, flush_interval_s: 5, tap_batch_ms: 1000, worker_summary_s: 60, session_hidden_end_s: 60,
      bbv2: { shown_min_gap_s: 5, zero_gain_eta_max_s: 60, dead_zone_min_s: 30, zero_gain_purchase_cap: 50 },
    });
    const kv = mem(); const t = new Telemetry(kv, CFG, () => 5);
    t.track('save_reset'); t.flush();
    const stored = JSON.parse(kv.getItem(TELEMETRY_KEY)!);
    expect(stored.v).toBe(TELEMETRY_SCHEMA_VERSION); expect(TELEMETRY_SCHEMA_VERSION).toBe('0.6.2');
    expect(Object.keys(stored).sort()).toEqual(['events', 'v']);
    expect(stored.events).toEqual([{ type: 'save_reset', ts: 5, sid: expect.stringMatching(/^[0-9a-z]{6}$/), fgMs: 0 }]);
  });
  it('[G8-12] exportJSON and snapshotJSON headers carry schema_version', () => {
    const t = new Telemetry(mem(), CFG, () => 5); t.track('save_reset');
    for (const raw of [t.exportJSON(), t.snapshotJSON()]) {
      const j = JSON.parse(raw);
      expect(j.schema_version).toBe(TELEMETRY_SCHEMA_VERSION); expect(j.exportedAt).toBe(5);
      expect(j.events.map((e: { type: string }) => e.type)).toEqual(['save_reset']);
    }
  });
});

describe('[G8-13] v-less ring loads as legacy:true; T-AC9 still applies', () => {
  it.each([
    ['bare array', JSON.stringify([OLD, { type: 'not_an_event', ts: 2 }])],
    ['v-less object', JSON.stringify({ events: [OLD, { type: 'not_an_event', ts: 2 }] })],
  ])('[G8-13 / T-AC9] a %s keeps every event and tags legacy:true; the untagged shape still fails validation', (_label, raw) => {
    const kv = mem(); kv.setItem(TELEMETRY_KEY, raw);
    const t = new Telemetry(kv, CFG, () => 10);
    expect(t.writes).toBe(0);
    const ev = [...t.events()];
    expect(ev).toHaveLength(2); expect(ev.every(e => e.legacy === true)).toBe(true); expect(ev[0]).toMatchObject(OLD);
    expect(validateEvent(ev[0])).toEqual([]); expect(validateEvent(ev[1])).toEqual([]);
    expect(validateEvent(OLD).length).toBeGreaterThan(0);
    t.track('save_reset');
    expect(t.events().at(-1)).toEqual({ type: 'save_reset', ts: 10, sid: expect.stringMatching(/^[0-9a-z]{6}$/), fgMs: 0 });
    expect('legacy' in t.events().at(-1)!).toBe(false);
    t.flush();
    const stored = JSON.parse(kv.getItem(TELEMETRY_KEY)!);
    expect(stored.v).toBe(TELEMETRY_SCHEMA_VERSION);
    expect(stored.events[0].legacy).toBe(true); expect(stored.events[1].legacy).toBe(true);
    expect(stored.events[2]).toEqual({ type: 'save_reset', ts: 10, sid: expect.stringMatching(/^[0-9a-z]{6}$/), fgMs: 0 });
    expect('legacy' in stored.events[2]).toBe(false);
  });
  it('[G8-13 / T-AC9] a versioned ring loads events unchanged and does not drop a shape T-AC9 rejects', () => {
    const kept = { type: 'save_reset', ts: 3, sid: 'a1b2c3', fgMs: 0, legacy: true };
    const kv = mem(); kv.setItem(TELEMETRY_KEY, JSON.stringify({ v: TELEMETRY_SCHEMA_VERSION, events: [OLD, kept] }));
    const t = new Telemetry(kv, CFG, () => 0);
    expect(t.events()).toEqual([OLD, kept]);
    expect('legacy' in t.events()[0]).toBe(false);
    expect(validateEvent(t.events()[0]).length).toBeGreaterThan(0); expect(validateEvent(t.events()[1])).toEqual([]);
  });
  it('[G8-13] a ring whose events are not an array, and corrupt JSON, load as an empty buffer', () => {
    const bad = mem(); bad.setItem(TELEMETRY_KEY, JSON.stringify({ v: TELEMETRY_SCHEMA_VERSION, events: 'nope' }));
    expect(() => new Telemetry(bad, CFG, () => 0)).not.toThrow(); expect(new Telemetry(bad, CFG, () => 0).events()).toEqual([]);
    const corrupt = mem(); corrupt.setItem(TELEMETRY_KEY, '{not json');
    expect(new Telemetry(corrupt, CFG, () => 0).events()).toEqual([]);
    expect(new Telemetry(mem(), CFG, () => 0).events()).toEqual([]);
  });
});
