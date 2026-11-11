/**
 * Independent F-2 probe at tip 560b4d4 (G8-12 / G8-13).
 * Lives under qa/scratch/f2-560b4d4/ (not inside wt) so check-release-build stays clean.
 * Run via: cd wt && vite-node ../qa-f2-probe.ts
 */
import { Telemetry, TELEMETRY_KEY } from './wt/src/telemetry/telemetry';
import { TELEMETRY_SCHEMA_VERSION } from './wt/src/telemetry/schema';

const CFG = { ring_size: 50, flush_interval_s: 5, tap_batch_ms: 1000 };
const OLD = { type: 'goal_tap', ts: 1, sessionMs: 5 };

function mem(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear() { m.clear(); },
    getItem(k: string) { return m.has(k) ? m.get(k)! : null; },
    setItem(k: string, v: string) { m.set(k, String(v)); },
    removeItem(k: string) { m.delete(k); },
    key(i: number) { return [...m.keys()][i] ?? null; },
  } as Storage;
}

const results: { id: string; ok: boolean; detail: string }[] = [];
function check(id: string, ok: boolean, detail: string) {
  results.push({ id, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id}: ${detail}`);
}

{
  const kv = mem();
  const t = new Telemetry(kv, CFG, () => 5);
  t.track('save_reset'); t.flush();
  const stored = JSON.parse(kv.getItem(TELEMETRY_KEY)!);
  const keys = Object.keys(stored).sort();
  check('ring-{v,events}',
    stored.v === TELEMETRY_SCHEMA_VERSION && keys.join(',') === 'events,v' && Array.isArray(stored.events),
    `v=${stored.v} keys=${keys.join(',')} eventsLen=${stored.events?.length}`);
}

{
  const kv = mem();
  kv.setItem(TELEMETRY_KEY, JSON.stringify([OLD]));
  let threw = false; let t: Telemetry | null = null;
  try { t = new Telemetry(kv, CFG, () => 10); } catch { threw = true; }
  const ev = t ? [...t.events()] : [];
  check('legacy-load-no-throw',
    !threw && ev.length === 1 && ev[0].legacy === true && ev[0].type === 'goal_tap',
    `threw=${threw} len=${ev.length} legacy=${ev[0]?.legacy}`);
}

{
  const kv = mem();
  kv.setItem(TELEMETRY_KEY, JSON.stringify({ events: [OLD] }));
  const t = new Telemetry(kv, CFG, () => 10);
  const ev = [...t.events()];
  check('legacy-vless-object', ev.length === 1 && ev[0].legacy === true, `legacy=${ev[0]?.legacy}`);
}

{
  const t = new Telemetry(mem(), CFG, () => 42);
  t.track('save_reset');
  const j = JSON.parse(t.exportJSON());
  const s = JSON.parse(t.snapshotJSON());
  check('export-schema_version',
    j.schema_version === TELEMETRY_SCHEMA_VERSION && s.schema_version === TELEMETRY_SCHEMA_VERSION && TELEMETRY_SCHEMA_VERSION === '0.6.2',
    `export=${j.schema_version} snap=${s.schema_version} const=${TELEMETRY_SCHEMA_VERSION}`);
}

{
  const kv = mem();
  kv.setItem(TELEMETRY_KEY, JSON.stringify([OLD, { type: 'not_an_event', ts: 2 }]));
  const t1 = new Telemetry(kv, CFG, () => 100);
  const loaded = [...t1.events()];
  t1.track('save_reset'); t1.flush();
  const newStored = JSON.parse(kv.getItem(TELEMETRY_KEY)!);
  const t2 = new Telemetry(kv, CFG, () => 200);
  const reloaded = [...t2.events()];
  const exported = JSON.parse(t2.exportJSON());
  const ok =
    newStored.v === TELEMETRY_SCHEMA_VERSION &&
    newStored.events[0].legacy === true &&
    newStored.events[1].legacy === true &&
    newStored.events[2].type === 'save_reset' &&
    !('legacy' in newStored.events[2]) &&
    reloaded.length === 3 &&
    reloaded[0].legacy === true &&
    exported.schema_version === TELEMETRY_SCHEMA_VERSION &&
    exported.events.length === 3 &&
    exported.events[0].legacy === true &&
    exported.events[2].type === 'save_reset' &&
    loaded.length === 2;
  check('old-new-export-roundtrip', ok,
    `stored.v=${newStored.v} reloaded=${reloaded.length} export.sv=${exported.schema_version} export.events=${exported.events.length} legacy0=${exported.events[0]?.legacy}`);
}

const failed = results.filter(r => !r.ok);
console.log('---');
console.log(`SUMMARY ${results.length - failed.length}/${results.length} PASS`);
if (failed.length) { console.log('FAILED: ' + failed.map(f => f.id).join(', ')); process.exit(1); }
process.exit(0);
