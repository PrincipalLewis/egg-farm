/** M41-9 QA4-1/2/3 (art-ux/number-format-big.md, Art & UX 2026-10-19 09:45): suffixes Qa..Dc from one table, scientific
 *  from 1e36, '—' for NaN/Infinity, K–T byte-identical, NBSP before unit words, spelled aria, QA4-2 floored Sell labels. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as NEW from '../src/ui/format';
import * as OLD from './fixtures/format-dd223f5';
import { orderView, sellAllLabel, slotPreview } from '../src/ui/orders';
const { fmtCount, fmtMoney, fmtMoneyShort, fmtMoneyPreview, fmtMoneyExact, fmtCountFloor, fmtMoneyFloor, fmtCountAria, spellShort, SUFFIXES } = NEW;
const NB = '\u00a0';
const cust = (demand: number, filled = 0) => ({ id: 1, demand, filled }) as any;

/** Dense sample 0..1e15: every integer to 20,000, ~400 log-spaced points per decade, and ±2 around each x.xx5 / x.x5 /
 *  999.95 rounding edge of every K..T tier. */
function sample(): number[] {
  const out = new Set<number>();
  for (let i = 0; i <= 20_000; i++) out.add(i);
  for (let e = 4; e < 15; e++) for (let k = 0; k < 400; k++) out.add(Math.floor(10 ** (e + k / 400)));
  for (const base of [1e3, 1e6, 1e9, 1e12]) for (const m of [1, 1.005, 1.25, 9.95, 9.995, 9.999, 10, 12.35, 99.95, 125.45, 999.4, 999.5, 999.94, 999.95, 999.96, 999.995]) {
    const c = Math.round(m * base); for (let d = -2; d <= 2; d++) if (c + d >= 0 && c + d < 1e15) out.add(c + d);
  }
  return [...out].filter(n => n < 1e15).sort((a, b) => a - b);
}
const ROLL = /^\$?[\d,]+,\d{3}T$/; // old "1,000T" family: the only K–T outputs the ruling changes (rolls up to 1Qa)

describe('K–T golden byte-identity (old dd223f5 vs new, 0..1e15)', () => {
  const xs = sample();
  it(`fmtCount over ${xs.length} values`, () => {
    let rolled = 0;
    for (const n of xs) { const o = OLD.fmtCount(n), v = fmtCount(n); if (ROLL.test(o)) { rolled++; expect(v).toBe('1Qa'); } else if (v !== o) expect(`${n}: ${v}`).toBe(`${n}: ${o}`); }
    expect(rolled).toBeGreaterThan(0); // only n in [999.95T, 1e15)
    for (const n of xs) if (n < 999.95e12) expect(fmtCount(n)).toBe(OLD.fmtCount(n));
  });
  it('fmtMoney / fmtMoneyShort / fmtMoneyPreview / fmtMoneyExact over the same values as dollars (cents < 1e17)', () => {
    for (const n of xs) for (const cents of [n, n * 100 + 49, n * 100 + 50]) {
      if (cents >= 1e17) continue;
      for (const [o, v] of [[OLD.fmtMoney(cents), fmtMoney(cents)], [OLD.fmtMoneyShort(cents), fmtMoneyShort(cents)], [OLD.fmtMoneyPreview(cents), fmtMoneyPreview(cents)], [OLD.fmtMoneyExact(cents), fmtMoneyExact(cents)]])
        if (ROLL.test(o)) expect(v).toBe('$1Qa'); else if (v !== o) expect(`${cents}: ${v}`).toBe(`${cents}: ${o}`);
    }
  });
});

describe('suffix table (data-driven, case exact)', () => {
  it('K..Dc in order; one entry drives symbol and spoken name', () => {
    expect(SUFFIXES.map(s => s.sym)).toEqual(['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']);
    expect(SUFFIXES.slice(4).map(s => s.name)).toEqual(['quadrillion', 'quintillion', 'sextillion', 'septillion', 'octillion', 'nonillion', 'decillion']);
    SUFFIXES.forEach((s, i) => { expect(s.base).toBe(10 ** (3 * (i + 1))); if (i) expect(fmtCount(s.base)).toBe('1' + s.sym); expect(spellShort('1.2' + s.sym)).toBe('1.2 ' + s.name); });
  });
});

describe('new tier boundaries (2 dp under 10x base, 1 dp from 10x, zeros stripped, roll-up at 1000)', () => {
  const tiers = SUFFIXES.slice(4);
  it.each(tiers.map((t, i) => [t.sym, t.base, tiers[i + 1]?.sym ?? null] as const))('%s', (sym, base, next) => {
    const at = (m: number) => fmtCount(m * base);
    expect(at(1)).toBe(`1${sym}`); expect(at(1.25)).toBe(`1.25${sym}`); expect(at(1.2)).toBe(`1.2${sym}`); expect(at(9.99)).toBe(`9.99${sym}`);
    expect(at(9.995)).toBe(`10${sym}`); expect(at(10)).toBe(`10${sym}`); expect(at(12.5)).toBe(`12.5${sym}`); expect(at(12.54)).toBe(`12.5${sym}`);
    expect(at(125.4)).toBe(`125.4${sym}`); expect(at(999.9)).toBe(`999.9${sym}`); expect(at(999.94)).toBe(`999.9${sym}`);
    for (const m of [999.95, 999.96, 999.995]) expect(at(m)).toBe(next ? `1${next}` : '1.00e36');
    expect(fmtMoney(base * 100 * 999.9)).toBe(`$999.9${sym}`); expect(fmtMoney(base * 100 * 1.25)).toBe(`$1.25${sym}`);
    expect(fmtMoneyShort(base * 100 * 1.25)).toBe(`$1.3${sym}`); expect(fmtMoneyPreview(base * 100 * 1.29)).toBe(`$1.2${sym}`);
    expect(fmtMoneyShort(base * 100 * 999.95)).toBe(next ? `$1${next}` : '$1.00e36'); expect(fmtMoneyPreview(base * 100 * 999.99)).toBe(`$999.9${sym}`);
  });
  it('T -> Qa: 999.95T rolls up; 999.94T stays', () => {
    expect(fmtCount(999.95e12)).toBe('1Qa'); expect(fmtCount(999.94e12)).toBe('999.9T'); expect(fmtMoneyShort(999.95e14)).toBe('$1Qa'); expect(fmtMoneyPreview(999.95e14)).toBe('$999.9T');
  });
});

describe('scientific from 1e36 (3 significant figures, no "+")', () => {
  it('count and money', () => {
    expect(fmtCount(1e36)).toBe('1.00e36'); expect(fmtCount(1.234e36)).toBe('1.23e36'); expect(fmtCount(1.235e37)).toBe('1.24e37'); expect(fmtCount(9.996e40)).toBe('1.00e41');
    expect(fmtMoney(1.234e38)).toBe('$1.23e36'); expect(fmtMoneyShort(1.234e38)).toBe('$1.23e36'); expect(fmtMoneyShort(1.236e38)).toBe('$1.24e36');
    expect(fmtMoneyPreview(1.239e38)).toBe('$1.23e36'); expect(fmtMoneyFloor(1.239e38)).toBe('$1.23e36'); expect(fmtCountFloor(1.239e36)).toBe('1.23e36');
    for (const v of [1e36, 3.3e50, 1e300]) { expect(fmtCount(v)).not.toContain('+'); expect(fmtMoneyShort(v * 100)).toMatch(/^\$\d\.\d\de\d+$/); }
  });
});

describe('NaN / Infinity -> em dash', () => {
  it.each([NaN, Infinity, -Infinity])('%s', v => {
    for (const f of [fmtCount, fmtMoney, fmtMoneyShort, fmtMoneyPreview, fmtMoneyExact, fmtCountFloor, fmtMoneyFloor]) expect(f(v)).toBe('—');
  });
});

describe('QA4-1: no thousands separator in a suffixed value, widest strings are 8 chars', () => {
  it('log-spaced 1e4..1e40', () => {
    const SFX = /^\$?\d{1,3}(\.\d{1,2})?(K|M|B|T|Qa|Qi|Sx|Sp|Oc|No|Dc)$|^\$?\d\.\d\de\d+$/;
    for (let e = 4; e < 40; e += 0.01) {
      const n = 10 ** e;
      expect(fmtCount(n)).toMatch(SFX); expect(fmtCountFloor(n)).toMatch(SFX);
      if (n >= 1e4) for (const s of [fmtMoney(n * 100), fmtMoneyShort(n * 100), fmtMoneyPreview(n * 100)]) { expect(s).toMatch(SFX); expect(s.length).toBeLessThanOrEqual(8); }
    }
    expect(fmtMoney(999.94e35)).toBe('$999.9Dc');
  });
  it('the 1,000,000T order card is now 1Qi; the card line keeps count, NBSP and eggs', () => {
    const v = orderView(cust(1e18), 0, 1);
    expect(v.line).toBe(`0/1Qi${NB}eggs · $10Qa`); expect(v.button).toBe('Need 1Qi');
  });
});

describe('QA4-2: one rounding rule on a Sell (never more eggs than are sold)', () => {
  it('basket 12,960, demand 20,000 (QA repro): card and Sell all both read 12.9K / $12.9K', () => {
    const v = orderView(cust(20_000), 12_960, 100);
    expect(v.button).toBe(`Sell 12.9K${NB}· +$12.9K`);
    expect(v.buttonAria).toBe(`Sell 12.9 thousand${NB}· +$12,960.00`);
    expect(sellAllLabel(12_960, 1_296_000, fmtCountFloor, fmtMoneyFloor)).toBe(`Sell all (12.9K${NB}eggs${NB}· $12.9K)`);
  });
  it('floored count never exceeds the real count', () => {
    for (let e = 4; e < 30; e += 0.037) {
      const n = Math.floor(10 ** e), s = fmtCountFloor(n), m = /^([\d.]+)(\D+)$/.exec(s)!;
      expect(Number(m[1]) * SUFFIXES.find(x => x.sym === m[2])!.base).toBeLessThanOrEqual(n * (1 + 1e-12));
    }
  });
});

describe('NBSP (U+00A0) before unit words', () => {
  it('order line, Sell all, slot preview', () => {
    expect(orderView(cust(2e15, 1.2e15), 1e15, 1).line).toBe(`1.2Qa/2Qa${NB}eggs · $20T`);
    expect(sellAllLabel(1.2e15, 1.2e17, fmtCountFloor, fmtMoneyFloor)).toBe(`Sell all (1.2Qa${NB}eggs${NB}· $1.2Qa)`);
    expect(slotPreview(6, 7, [1200, 2400], [1300, 2600], 'i')).toContain(`→ 1.3K–2.6K${NB}eggs`);
  });
  it('app.ts: welcome-back eggs and hen pill use NBSP; Sell all uses the floored formatters', () => {
    const src = readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
    expect(src).toContain('+${fmtCount(eggs)}\\u00a0eggs</div>'); expect(src).toContain('`×${fmtCount(S.hens(F, b))}\\u00a0hens`');
    expect(src).toContain('sellAllLabel(eggs, cents, fmtCountFloor, fmtMoneyFloor)');
    expect(src).not.toMatch(/\$\{fmtCount\([^)]*\)\} (eggs|hens)</);
  });
});

describe('aria / spoken: suffix spelled out, never a full digit string above 1e15', () => {
  it('spellShort / fmtCountAria / fmtMoneyExact', () => {
    expect(spellShort('$12.3K')).toBe('$12.3 thousand'); expect(spellShort('1.2Qa')).toBe('1.2 quadrillion'); expect(spellShort('$999.9Dc')).toBe('$999.9 decillion');
    expect(spellShort('$1.23e36')).toBe('$1.23 times 10 to the 36'); expect(spellShort('1,234')).toBe('1,234'); expect(spellShort('—')).toBe('—');
    expect(fmtCountAria(1.2e18)).toBe('1.2 quintillion'); expect(fmtCountAria(1.234e36)).toBe('1.23 times 10 to the 36');
    expect(fmtMoneyExact(1.25e17)).toBe('$1.25 quadrillion'); expect(fmtMoneyExact(4.56e25)).toBe('$456 sextillion');
    expect(fmtMoneyExact(9.999e31)).toBe('$999.9 octillion'); expect(fmtMoneyExact(9.999e34)).toBe('$999.9 nonillion'); expect(fmtMoneyExact(1.234e38)).toBe('$1.23 times 10 to the 36');
    expect(fmtMoneyExact(123_456_789_012_345)).toBe('$1,234,567,890,123.45'); // < 1e15 dollars: exact digit string kept
    expect(fmtMoneyExact(1e17)).toBe('$1 quadrillion');
  });
  it('order aria at Qa+ spells the suffix, no 16+ digit run', () => {
    const v = orderView(cust(3e21, 1e21), 2e21, 1e3);
    expect(v.lineAria).toBe('1 sextillion of 3 sextillion eggs delivered, order worth $30 sextillion');
    expect(v.buttonAria).toBe(`Sell 2 sextillion${NB}· +$20 sextillion`);
    expect(v.lineAria + v.buttonAria).not.toMatch(/\d{16}/);
  });
});
