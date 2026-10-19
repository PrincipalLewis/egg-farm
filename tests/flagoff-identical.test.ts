// D-CEO-20261019-05 (A): flag-off must be byte-identical to rc/m4-default-on 7fdb273. Three pins, all measured on 7fdb273:
//  1. engineering/golden/flagoff-golden.a01faea.test.ts sim trace f90d1678 (unchanged; that test fails if it moves),
//  2. FLAGOFF_BALANCE: sha256 of balance.json without the m4 block and _source (everything the flag-off game reads),
//  3. FLAGOFF_TRACE: sha256 of a flag-off sim trace (two bots x 3 seeds x 30 min).
// Run with the unit suite (npm test). A mismatch means the L30+ data/tooling changed the flag-off game: do not re-pin without HoE.
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { balance as shipped } from '../src/config/balance';
import { runBot } from './bot';
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const REF = '7fdb273560232590e9da7f4719809b933c0699fa';
const FLAGOFF_BALANCE = 'a3bc9f45af2de50b365c1f218a88b60c090801a948e36d90d6467012f656c562', FLAGOFF_TRACE = 'fefad60f4fca9ba0ebdce9ec7fb16956885023e4624826e9198e7785e978ae19';
const b: any = { ...shipped, m4: { ...shipped.m4!, enabled: 0 } };
describe(`flag-off byte-identical to rc/m4-default-on ${REF.slice(0, 7)}`, () => {
  it('balance.json minus m4/_source', () => {
    const { m4: _m4, _source: _s, ...rest } = JSON.parse(readFileSync(new URL('../src/config/balance.json', import.meta.url), 'utf8'));
    const h = sha(JSON.stringify(rest)); console.log('FLAGOFF_BALANCE ' + h); expect(h).toBe(FLAGOFF_BALANCE);
  });
  it('flag-off sim trace', () => {
    const out: unknown[] = [];
    for (const model of ['seller15', 'cheapest']) for (let seed = 1; seed <= 3; seed++) {
      const r = runBot(b, seed, model as any, 1800);
      out.push([model, seed, r.firstUpgradeS, Array.from({ length: 31 }, (_, i) => [r.farmAt(i * 60), r.upgradesAt(i * 60)])]);
    }
    const h = sha(JSON.stringify(out)); console.log('FLAGOFF_TRACE ' + h); expect(h).toBe(FLAGOFF_TRACE);
  });
});
