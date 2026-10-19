// M4-ON golden (shipped balance, m4.enabled = 1): storage bytes + sim trace, generated on rc/m4-on-tests-2 from 90a9c84 (D-CEO-20261019-01). Node only, no browser.
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { balance as shipped } from '../../src/config/balance';
// M4 ships ON (D-CEO-20261019-01, rc 90a9c84). This harness is the explicit forced-flag-off golden: pins below are unchanged
// and hold on the shipped data with m4.enabled forced to 0. The M4-on golden is m4on-golden.90a9c84.test.ts.
const balance = shipped; if (!balance.m4?.enabled) throw new Error('M4-on golden needs the shipped flag on');
// Determinism: Game is not used (no random v6BackupId); loadSafe/save/step/runBot are seeded. Regenerate: GOLDEN_PRINT=1, run twice, same hashes.
import { loadSafe, save, SAVE_KEY, type KV } from '../../src/save/save';
import { step } from '../../src/sim/tick';
import { initialState } from '../../src/sim/state';
import { apply } from '../../src/sim/actions';
import { applyOffline } from '../../src/sim/offline';
import { runBot } from '../../tests/bot';
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const PINS: Record<string, string> = {
  'm1-rc2-v4-12min': 'b1e07c13a21b6059ececdc898a4ddfe03b5286ea9133a4def6ae25992ec139dc',
  'm2-rc1-v5-12min': 'a425f0135a78b44615468a81fc99f955032e046a6003a9c180b973d51d346297',
  'm2-rc1-v5-40min': '48b1fa43497a912c700461ddd4a2cf0abe59ba685977e7841c012ce8f7e6f1ef',
  'm2-rc1-v5-40min-edge': '78b97634d0bbc3b4a174751917ad573889ec57bc22cc3163deb4c6fec0e4a4bc',
};
// Generated 2026-10-19 on 90a9c84 + this branch, two runs, identical. Re-pinned for the D-HOP-2026-10-19-02 bot (game pick over all purchasables): history 403ca889bb02121e764c402cb2c408b0aebf0bed43ca14d187ea62bbeafa7974 (no bot change) -> 9173492e41ac06cbe3c077bcbadc464ad5ce681646eb4b9619b640ff40a31f6b (-01 bot) -> 723b91ab311be9bf403e7bd5a8f7363bc85234287354c4dedf94a45613faa817 (-02 bot) -> a54c9cf9 (T3 data b48be8a4, D-CEO-20261019-04). Storage pins unchanged (no bot). A retune or any M4 sim change moves these: re-pin with HoE OK.
const GOLDEN_M4ON = 'a54c9cf9d6a4c967ef8fc9d2cb741ba2deab042b8cad5097b38d5c192339fda5';
const FIX = ['m1-rc2-v4-12min', 'm2-rc1-v5-12min', 'm2-rc1-v5-40min', 'm2-rc1-v5-40min-edge'];
const mem = (): KV => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: k => { m.delete(k); } }; };
describe('golden', () => {
  it('storage bytes', () => {
    const out: Record<string, string> = {};
    for (const f of FIX) {
      const raw = readFileSync(new URL(`../../tests/fixtures/saves/${f}.json`, import.meta.url), 'utf8');
      const now = JSON.parse(raw).savedAt as number; const kv = mem(); kv.setItem(SAVE_KEY, raw);
      const r = loadSafe(kv, balance, now); let s = r.file!.state;
      for (let i = 0; i < 600; i++) s = step(s, 0.1, balance, []);
      save(kv, s, now, balance);
      out[f] = sha(kv.getItem(SAVE_KEY)!);
    }
    console.log('GOLDEN2 ' + JSON.stringify(out));
    for (const f of FIX) expect(out[f], f).toBe(PINS[f]);
  });
  it('sim trace', () => {
    const b = balance; const out: unknown[] = [];
    for (const model of ['seller15', 'cheapest']) for (let seed = 1; seed <= 6; seed++) {
      const r = runBot(b, seed, model as any, 1800); out.push([model, seed, r.firstUpgradeS, Array.from({ length: 31 }, (_, i) => [r.farmAt(i * 60), r.upgradesAt(i * 60)])]);
    }
    let s: any = { ...initialState(b, 7), coinsCents: 5_000_000 }; const ev: any[] = [];
    for (let i = 0; i < 6000; i++) {
      s = step(s, 0.1, b, ev);
      if (i % 3 === 0) s = apply(s, { type: 'collect' }, b, ev);
      if (i % 50 === 0) s = apply(s, { type: 'sellAll' }, b, ev);
      if (i % 97 === 0) s = apply(s, { type: 'buyFarm' }, b, ev);
      if (i % 131 === 0) s = apply(s, { type: 'buyCollection' }, b, ev);
      if (i % 400 === 0) for (const w of ['market_hand', 'coop_hand', 'hawker', 'grader'] as const) s = apply(s, { type: 'hire', worker: w }, b, ev);
      if (i % 700 === 0) s = apply(s, { type: 'buyGraderTier' }, b, ev);
      if (i % 113 === 0) s = apply(s, { type: 'buyTrack', track: 'hens' }, b, ev);
      if (i % 151 === 0) s = apply(s, { type: 'buyTrack', track: 'eggValue' }, b, ev);
    }
    const off = applyOffline(s, 5_400_000, b);
    out.push(s, ev, off.eggs); // M4 on: track levels + milestones are part of the trace
    const h = sha(JSON.stringify(out)); console.log('GOLDEN1 ' + h);
    expect(h).toBe(GOLDEN_M4ON);
  }, 120_000);
});
