// QA probe (not part of the PR): rest_recovery_mult boundary behaviour at 2facc3f, via validateM5 and validateBalance.
import { describe, it, expect } from 'vitest';
import { balance, validateBalance } from '../src/config/balance';
import { validateM5 } from '../src/config/m5-rules';
const m4 = (v: number) => ({ ...structuredClone(balance.m4!), tc: { ...balance.m4!.tc, rest_recovery_mult: v } });
const wb = (v: number) => ({ ...structuredClone(balance), m4: m4(v) }) as typeof balance;
const ok = (f: () => unknown) => { try { f(); return 'pass'; } catch (e: any) { return 'FAIL: ' + String(e.message).slice(0, 90); } };
describe('QA probe rest_recovery_mult', () => {
  it('boundaries', () => {
    const vals: [string, number][] = [['0', 0], ['-0', -0], ['MIN_VALUE', Number.MIN_VALUE], ['-MIN_VALUE', -Number.MIN_VALUE], ['0.25', 0.25], ['0.35', 0.35], ['0.3500001', 0.3500001], ['0.35+EPS', 0.35 + Number.EPSILON], ['0.36', 0.36], ['0.4', 0.4], ['-0.25', -0.25], ['NaN', NaN], ['Infinity', Infinity], ['-Infinity', -Infinity]];
    const rows = vals.map(([k, v]) => `${k.padEnd(10)} validateM5=${ok(() => validateM5(m4(v), balance.workers))} | validateBalance=${ok(() => validateBalance(wb(v), false))}`);
    console.log('PROBE\n' + rows.join('\n'));
    expect(rows.length).toBe(vals.length);
  });
});
