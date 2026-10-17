// Golden 2 (storage bytes) + golden 1 (sim trace) harness for "flag-off = main", run at a01faea. Node only, no browser.
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { balance } from '../../src/config/balance';
import { loadSafe, save, SAVE_KEY, type KV } from '../../src/save/save';
import { step } from '../../src/sim/tick';
import { initialState } from '../../src/sim/state';
import { apply } from '../../src/sim/actions';
import { applyOffline } from '../../src/sim/offline';
import { runBot } from '../../tests/bot';
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const PINS: Record<string, string> = {
  'm1-rc2-v4-12min': 'b69c5783ba5b54dd663b56b898e2595cca59c6e03fc692b515af993634224ee9',
  'm2-rc1-v5-12min': '2ac7070d0c5e7ea2d8fcdd1642732cf44871fe9c5b126d1b5873fcd8244f3a00',
  'm2-rc1-v5-40min': '4fd4675956da96efa92f5eb48d979f132ad628c1e76e616076eb041ae311b431',
  'm2-rc1-v5-40min-edge': '652d1b266de55a11ecc4faef9816eca0cfb803da3c7a7c14af85f88e4bb9f0bb',
};
// Re-pinned (HoE approved 01:49 UTC+2, Oct 17). Previous pin, kept for audit:
//   50a87ddbf89c44751ef33a008541022e146c48c0fed8e16d5114e6d787809de0
// Bisect: c75b6dc (just before the data switch) still gives 50a87ddb; only the approved F1 shipping-data switch
// (data/economy.csv = m4cols 86f0e80e) moves it to f90d1678. No code changes. Storage-bytes pins (PINS) unchanged.
// Re-pinned again (feat/market-hand-min-wait, off main 8e6d53e): HoE ruling 2026-10-17 -- market_hand_min_wait_s = 2 is a
// missing implementation that must match Economy's AC7 model (economy_sim.py:309/:316, hold_until_servable). Previous pin:
//   f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544  (main acaceee and 8e6d53e, no min wait)
// Only src/sim/tick.ts (Market Hand min wait) + balance.json workers.market_hand.min_wait_s change; the CSV is unchanged
// (6dca24cd after #36; #36 itself left f90d1678 unchanged). Storage-bytes pins (PINS) unchanged.
// Re-pinned a third time (HoP MK-59 ruling 2026-10-17): wages unchanged vs main (no unpaid hold; only serving is gated by
// min_wait_s; = vendored sim 0ee6433c). Superseded pin, kept for audit: e7dad04063a4fdbba7d8b2edc3e18ed7de9ff46296210565de677b371d16225e (c05c83a, unpaid hold).
const GOLDEN_MAIN_A01FAEA = '9089892aaf9c16076caeee332e0b5ef0f7f9d066c4cf731f1e2ad2b77680a258';
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
    }
    const off = applyOffline(s, 5_400_000, b);
    const { hensLevel, eggValueLevel, celebratedMilestones, ...core } = s;
    out.push(core, ev, off.eggs);
    const h = sha(JSON.stringify(out)); console.log('GOLDEN1 ' + h);
    expect(h).toBe(GOLDEN_MAIN_A01FAEA);
  }, 120_000);
});
