// Architect probe (not committed): telemetry ring + BBv2 pinned events after the b6705124 conflict resolution.
import { Telemetry, TELEMETRY_KEY } from '/workspace/wt-arch-review100-b670512/src/telemetry/telemetry';
import { TELEMETRY_SCHEMA_VERSION } from '/workspace/wt-arch-review100-b670512/src/telemetry/schema';
import { balance } from '/workspace/wt-arch-review100-b670512/src/config/balance';
import { mem } from '/workspace/wt-arch-review100-b670512/tests/helpers';
const cfg = { ...balance.telemetry, ring_size: 5 } as any;
const r: any = { cfgHasBbv2: !!(balance.telemetry as any).bbv2, bbv2: (balance.telemetry as any).bbv2 };
let now = 1_000;
for (const [name, raw] of [['bare', JSON.stringify([{ type: 'upgrade', ts: 1, sessionMs: 0 }])], ['vless', JSON.stringify({ events: [{ type: 'upgrade', ts: 1, sessionMs: 0 }] })], ['versioned', JSON.stringify({ v: '0.6.2', events: [{ type: 'upgrade', ts: 1, sessionMs: 0 }] })], ['corrupt', '{x']] as const) {
  const kv = mem(); kv.setItem(TELEMETRY_KEY, raw); const t = new Telemetry(kv, cfg, () => now);
  r[name] = { loaded: t.events().length, legacy: t.events().map((e: any) => e.legacy ?? null) };
}
const kv = mem(); const t = new Telemetry(kv, cfg, () => now);
t.track('zero_gain_purchase', { key: 'HENS' }); t.track('dead_zone', { farm: 30, s: 31, reason: 'none_affordable' });
for (let i = 0; i < 20; i++) { now += 10; t.track('best_buy_shown', { i }); }
t.flush(true);
const stored = JSON.parse(kv.getItem(TELEMETRY_KEY)!);
r.stored = { v: stored.v, isObj: !Array.isArray(stored), n: stored.events.length, pinnedKept: stored.events.filter((e: any) => e.type === 'zero_gain_purchase' || e.type === 'dead_zone').length };
const t2 = new Telemetry(kv, cfg, () => now);
r.reload = { n: t2.events().length, anyLegacy: t2.events().some((e: any) => e.legacy) };
const ex = JSON.parse(t2.exportJSON()); r.export = { schema_version: ex.schema_version, matches: ex.schema_version === TELEMETRY_SCHEMA_VERSION, keys: Object.keys(ex) };
console.log(JSON.stringify(r, null, 1));
