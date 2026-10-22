/** M41-9: Art rulings on #56 (Art & UX, Oct 19 10:06), one test block per ruling, so each is pinned by name.
 *  R1 compact money 1 decimal; counts + plain money 2 decimals under 10x the tier base.  R2 exactly 1e36 -> '1.00e36'.
 *  R3 spell out only Qa+ and only in aria/live; K–T aria/live byte-identical to main ('$1M').  R4 visible pops/floaters never
 *  spelled ('$1.2Qa').  R5 Sell floor approved (previews never above the credit). */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as F from '../src/ui/format';
import * as OLD from './fixtures/format-dd223f5';
import { orderView } from '../src/ui/orders';
const { fmtCount, fmtMoney, fmtMoneyShort, fmtMoneyPreview, fmtMoneyExact, fmtMoneyAria, fmtCountFloor, fmtMoneyFloor, fmtCountAria, liveText, SUFFIXES } = F;
const QA_UP = SUFFIXES.filter(t => t.base >= 1e15);
const SPELLED = /illion|times 10/;

describe('R1: compact money keeps 1 decimal; counts and plain money use 2 decimals under 10x', () => {
  it('compact (fmtMoneyShort / preview) is 1 decimal at every tier K..Dc', () => {
    for (const t of SUFFIXES) {
      expect(fmtMoneyShort(1.234 * t.base * 100)).toBe(`$1.2${t.sym}`);
      expect(fmtMoneyPreview(1.299 * t.base * 100)).toBe(`$1.2${t.sym}`);
      expect(fmtMoneyShort(12.34 * t.base * 100)).toBe(`$12.3${t.sym}`);
    }
  });
  it('counts and plain money: 2 decimals under 10x the base (M and up; K starts at 10K), 1 decimal from 10x', () => {
    for (const t of SUFFIXES.filter(x => x.base >= 1e6)) {
      expect(fmtCount(1.234 * t.base)).toBe(`1.23${t.sym}`);
      expect(fmtMoney(1.234 * t.base * 100)).toBe(`$1.23${t.sym}`);
      expect(fmtCount(12.34 * t.base)).toBe(`12.3${t.sym}`);
      expect(fmtMoney(12.34 * t.base * 100)).toBe(`$12.3${t.sym}`);
    }
    expect(fmtCount(12_345)).toBe('12.3K'); expect(fmtMoney(1_234_567)).toBe('$12.3K');
    expect(fmtMoneyShort(999.9e33 * 100)).toBe('$999.9Dc'); expect(fmtMoney(999.9e33 * 100)).toBe('$999.9Dc');
  });
  it('K–T unchanged vs main for the same inputs', () => {
    for (const n of [12_345, 1_234_567, 9_994_999, 1.234e9, 4.567e12]) {
      expect(fmtCount(n)).toBe(OLD.fmtCount(n)); expect(fmtMoney(n * 100)).toBe(OLD.fmtMoney(n * 100)); expect(fmtMoneyShort(n * 100)).toBe(OLD.fmtMoneyShort(n * 100));
    }
  });
});

describe("R2: exactly 1e36 shows '1.00e36'", () => {
  it('every formatter', () => {
    expect(fmtCount(1e36)).toBe('1.00e36'); expect(fmtCountFloor(1e36)).toBe('1.00e36');
    expect(fmtMoney(1e38)).toBe('$1.00e36'); expect(fmtMoneyFloor(1e38)).toBe('$1.00e36');
    expect(fmtMoneyShort(1e38)).toBe('$1.00e36'); expect(fmtMoneyPreview(1e38)).toBe('$1.00e36'); expect(fmtMoneyExact(1e38)).toBe('$1.00e36');
    expect(fmtMoneyShort(999.95e33 * 100)).toBe('$1.00e36'); // Dc that rounds to 1000 rolls up to scientific
    expect(fmtCount(1.234e36)).toBe('1.23e36');
  });
});

describe('R3: spell out only Qa and above, only in aria/live; K–T byte-identical to main', () => {
  it("K–T aria and live text stay compact ('$1M', '13K')", () => {
    expect(liveText(1e8, 13_000)).toBe('$1M, 13K eggs');
    for (const t of SUFFIXES.filter(x => x.base < 1e15)) { expect(fmtCountAria(2 * t.base * (t.base === 1e3 ? 10 : 1))).not.toMatch(SPELLED); expect(fmtMoneyAria(2 * t.base * 100)).not.toMatch(SPELLED); }
    expect(fmtMoneyAria(1e8)).toBe(fmtMoneyExact(1e8));
  });
  it('Qa..Dc and scientific are spelled in aria', () => {
    for (const t of QA_UP) expect(fmtCountAria(1.2 * t.base)).toBe(`1.2 ${t.name}`);
    expect(fmtMoneyAria(1.25e15 * 100)).toBe('$1.25 quadrillion');
    expect(fmtMoneyAria(1e38)).toBe('$1.00 times 10 to the 36');
    expect(liveText(1.2e17, 1.2e15)).toBe('$1.2 quadrillion, 1.2 quadrillion eggs');
  });
  it('order-row aria spells only from Qa', () => {
    const v = orderView({ id: 1, demand: 2e15, filled: 0 } as any, 1e30, 100) as any;
    expect(JSON.stringify(v)).toMatch(/quadrillion/);
    const k = orderView({ id: 1, demand: 2e6, filled: 0 } as any, 1e30, 100) as any;
    expect(JSON.stringify(k)).not.toMatch(SPELLED);
  });
});

describe("R4: visible coin pops and +$ floaters never spell words ('$1.2Qa')", () => {
  it('fmtMoneyExact is compact from $1e15, never spelled, 1e15..1e40', () => {
    expect(fmtMoneyExact(1.2e15 * 100)).toBe('$1.2Qa'); expect(fmtMoneyExact(999.9e33 * 100)).toBe('$999.9Dc');
    for (let e = 15; e <= 40; e += 0.25) expect(fmtMoneyExact(10 ** e * 100)).not.toMatch(SPELLED);
    expect(fmtMoneyExact(123_456)).toBe('$1,234.56'); // below $1e15 byte-identical to main
  });
  it('app.ts pop / floater / served chip use fmtMoneyExact (visible), never the aria formatter', () => {
    const app = readFileSync('src/ui/app.ts', 'utf8');
    expect(app).toMatch(/qpop num[^\n]*\+\$\{fmtMoneyExact\(cents\)\}/);
    expect(app).toMatch(/floatText\(`\+\$\{fmtMoneyExact\(e\.value\)\}`/);
    expect(app).not.toMatch(/fmtMoneyAria|fmtCountAria|spellShort/);
  });
});

describe('R5: Sell floor (approved): previews never show more than the credit', () => {
  it('floored money / counts never exceed the value', () => {
    const parse = (s: string) => { const m = /^\$?([\d.,]+)(?:e(\d+)|([A-Za-z]+))?$/.exec(s)!; const v = parseFloat(m[1].replace(/,/g, ''));
      return m[2] ? v * 10 ** +m[2] : m[3] ? v * SUFFIXES.find(t => t.sym === m[3])!.base : v; };
    for (let e = 3; e <= 38; e += 0.13) { const n = Math.floor(10 ** e * 1.9999);
      expect(parse(fmtCountFloor(n))).toBeLessThanOrEqual(n * (1 + 1e-12));
      expect(parse(fmtMoneyPreview(n * 100))).toBeLessThanOrEqual(n * (1 + 1e-12));
      expect(parse(fmtMoneyFloor(n * 100))).toBeLessThanOrEqual(n * (1 + 1e-12)); }
    expect(fmtMoneyPreview(1.999e15 * 100)).toBe('$1.9Qa'); expect(fmtCountFloor(9.999e36)).toBe('9.99e36');
  });
});
