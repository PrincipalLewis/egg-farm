// Golden 2 (storage bytes) + golden 1 (sim trace) harness for "flag-off = main", run at a01faea. Node only, no browser.
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { balance } from '../src/config/balance';
import { loadSafe, save, SAVE_KEY, type KV } from '../src/save/save';
import { step } from '../src/sim/tick';
import { initialState } from '../src/sim/state';
import { apply } from '../src/sim/actions';
import { applyOffline } from '../src/sim/offline';
import { runBot } from '../tests/bot';
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const FIX = ['m1-rc2-v4-12min', 'm2-rc1-v5-12min', 'm2-rc1-v5-40min', 'm2-rc1-v5-40min-edge'];
const mem = (): KV => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: k => { m.delete(k); } }; };
describe('golden', () => {
  it('storage bytes', () => {
    const out: Record<string, string> = {};
    for (const f of FIX) {
      const raw = readFileSync(new URL(`../tests/fixtures/saves/${f}.json`, import.meta.url), 'utf8');
      const now = JSON.parse(raw).savedAt as number; const kv = mem(); kv.setItem(SAVE_KEY, raw);
      const r = loadSafe(kv, balance, now); let s = r.file!.state;
      for (let i = 0; i < 600; i++) s = step(s, 0.1, balance, []);
      save(kv, s, now, balance);
      out[f] = sha(kv.getItem(SAVE_KEY)!);
    }
    console.log('GOLDEN2 ' + JSON.stringify(out));
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
    console.log('GOLDEN1 ' + sha(JSON.stringify(out)));
  }, 120_000);
});
