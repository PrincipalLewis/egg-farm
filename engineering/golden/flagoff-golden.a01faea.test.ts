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
const GOLDEN_MAIN_A01FAEA = 'f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544';
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
