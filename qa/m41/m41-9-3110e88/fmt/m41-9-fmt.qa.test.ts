// QA formatter property harness for PR #64 (M41-9 big numbers). PREP: runs against whatever SHA the worktree is at.
// Copied into <worktree>/tests/ by run-prep.sh; OLD formatter = clean main dd223f5 (env QA_OLD_FMT). Writes QA_OUT json.
import { describe, it, expect } from 'vitest';
import { writeFileSync, readFileSync } from 'node:fs';
import * as N from '../src/ui/format';
import * as F from '../src/config/formulas';
const OLD: any = await import(/* @vite-ignore */ process.env.QA_OLD_FMT ?? '/tmp/qa-m41-9-base-dd223f5/src/ui/format.ts');
const bal: any = JSON.parse(readFileSync(new URL('../src/config/balance.json', import.meta.url), 'utf8'));
const out: any = { sha: process.env.QA_SHA, checks: {}, fails: [] as string[] };
const fail = (m: string) => { out.fails.push(m); };
const SFX: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12, Qa: 1e15, Qi: 1e18, Sx: 1e21, Sp: 1e24, Oc: 1e27, No: 1e30, Dc: 1e33 };
const NAMES: Record<string, string> = { Qa: 'quadrillion', Qi: 'quintillion', Sx: 'sextillion', Sp: 'septillion', Oc: 'octillion', No: 'nonillion', Dc: 'decillion' };
/** parse a visible string back to a number (for monotonic / floor checks) */
const parse = (s: string): number => { const t = s.replace(/^\$/, '').replace(/,/g, ''); const sci = /^(\d+(?:\.\d+)?)e(\d+)$/.exec(t); if (sci) return +sci[1] * 10 ** +sci[2];
  const m = /^(\d+(?:\.\d+)?)([A-Za-z]*)$/.exec(t); if (!m) return NaN; return +m[1] * (m[2] ? SFX[m[2]] ?? NaN : 1); };
// visible formatters: [name, fn, input unit -> value in "units" (eggs or dollars)]
const VIS: [string, (x: number) => string, number][] = [['fmtCount', x => N.fmtCount(x), 1], ['fmtCountFloor', x => N.fmtCountFloor(x), 1], ['fmtMoney', x => N.fmtMoney(x), 100],
  ['fmtMoneyFloor', x => N.fmtMoneyFloor(x), 100], ['fmtMoneyShort', x => N.fmtMoneyShort(x), 100], ['fmtMoneyPreview', x => N.fmtMoneyPreview(x), 100], ['fmtMoneyExact', x => N.fmtMoneyExact(x), 100]];
const okShape = (s: string) => !/NaN|Infinity|e\+|undefined|[a-z]{3,}/.test(s) && (!/e/.test(s) || /^\$?\d\.\d\de\d+$/.test(s));
let seed = 0x9e3779b9; const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1e9) / 1e9; };
describe('M41-9 formatter properties (QA)', () => {
  it('largest reachable values from economy data', () => {
    const b = bal, L = b.maxLevel; const lv = [...Array(L + 1).keys()];
    const maxCost = Math.max(...lv.map(i => F.farmCost(i, b)), ...lv.map(i => F.collectionCost(i, b)), ...(b.m4 ? [...b.m4.hens.costs, ...b.m4.eggValue.costs] : []));
    const maxPrice = Math.max(...lv.map(i => b.m4?.enabled ? F.trackPriceCents(L, L, i, b) : F.eggPriceCents(i, L, b)));
    const maxEps = Math.max(...lv.map(i => F.eggsPerSec(i, b))); const maxDemand = Math.max(...lv.map(i => F.demandRange(i, b)[1]));
    const graderMax = Math.max(1, ...(JSON.stringify(b).match(/"(?:grader[^"]*|mult[^"]*)":\s*([\d.]+)/gi) ?? []).map(s => +s.split(':')[1]).filter(x => x < 100));
    const incomeCentsPerSec = maxEps * maxPrice * graderMax; const year = 365 * 24 * 3600;
    const r = { maxLevel: L, maxUpgradeCostCents: maxCost, maxEggPriceCents: maxPrice, graderMultUpperBound: graderMax, maxEggsPerSec: maxEps, maxOrderDemandEggs: maxDemand,
      maxOrderValueCents: maxDemand * maxPrice * graderMax, maxIncomeCentsPerSec: incomeCentsPerSec, coins10yCents: incomeCentsPerSec * 10 * year, eggs10y: maxEps * 10 * year,
      note: 'costs/prices/demand are bounded by balance.json (maxLevel, costTable/costs, price formula). Coins and basket are accumulators with no cap: bound = max income or lay rate x 10 years of play (upper bound; grader mult taken as the largest multiplier <100 found in balance.json).' };
    out.checks.reach = r; out.checks.reachTierCoins = N.fmtMoney(r.coins10yCents); out.checks.reachTierEggs = N.fmtCount(r.eggs10y);
    expect(r.maxLevel).toBeGreaterThan(0);
  });
  it('boundaries 999/1000, 9999/10000, 999.9K/1M, every suffix transition incl. 999.95 / 999.995 / 9.995 roll-ups', () => {
    const exp: [string, string, string][] = [];
    const chk = (name: string, got: string, want: string) => { exp.push([name, got, want]); if (got !== want) fail(`boundary ${name}: "${got}" != "${want}"`); };
    chk('count 999', N.fmtCount(999), '999'); chk('count 1000', N.fmtCount(1000), '1,000'); chk('count 9999', N.fmtCount(9999), '9,999'); chk('count 10000', N.fmtCount(10000), '10K');
    chk('count 999949', N.fmtCount(999_949), '999.9K'); chk('count 999950', N.fmtCount(999_950), '1M'); chk('count 999999', N.fmtCount(999_999), '1M');
    chk('money $999.99', N.fmtMoney(99_999), '$999.99'); chk('money $1,000.00', N.fmtMoney(100_000), '$1,000.00'); chk('money $9,999.99', N.fmtMoney(999_999), '$9,999.99'); chk('money $10K', N.fmtMoney(1_000_000), '$10K');
    chk('short $999.99', N.fmtMoneyShort(99_999), '$999.99'); chk('short $1K', N.fmtMoneyShort(100_000), '$1K'); chk('short $999.9K', N.fmtMoneyShort(99_994_999), '$999.9K'); chk('short $1M', N.fmtMoneyShort(99_995_000), '$1M');
    const syms = Object.keys(SFX);
    for (let i = 1; i < syms.length; i++) { const s = syms[i], base = SFX[s], next = syms[i + 1];
      const up = next ? `1${next}` : '1.00e36';
      chk(`count 999.94${s}`, N.fmtCount(999.94 * base), `999.9${s}`); chk(`count 999.95${s}`, N.fmtCount(999.95 * base), up); chk(`count 999.995${s}`, N.fmtCount(999.995 * base), up);
      chk(`count 9.994${s}`, N.fmtCount(9.994 * base), `9.99${s}`); chk(`count 9.995${s}`, N.fmtCount(9.995 * base), `10${s}`); chk(`count 1${s}`, N.fmtCount(base), `1${s}`);
      chk(`short 999.94${s}`, N.fmtMoneyShort(999.94 * base * 100), `$999.9${s}`); chk(`short 999.95${s}`, N.fmtMoneyShort(999.95 * base * 100), next ? `$1${next}` : '$1.00e36');
      chk(`short 999.995${s}`, N.fmtMoneyShort(999.995 * base * 100), next ? `$1${next}` : '$1.00e36');
      chk(`floor 999.99${s}`, N.fmtCountFloor(999.99 * base), `999.9${s}`); chk(`preview 999.99${s}`, N.fmtMoneyPreview(999.99 * base * 100), `$999.9${s}`); }
    chk('count 1e33', N.fmtCount(1e33), '1Dc'); chk('money 1e33', N.fmtMoney(1e35), '$1Dc'); chk('count 1e36', N.fmtCount(1e36), '1.00e36'); chk('money 1e36', N.fmtMoney(1e38), '$1.00e36');
    chk('short 1e36', N.fmtMoneyShort(1e38), '$1.00e36'); chk('preview 1e36', N.fmtMoneyPreview(1e38), '$1.00e36'); chk('exact 1e36', N.fmtMoneyExact(1e38), '$1.00e36');
    chk('count 1.234e36', N.fmtCount(1.234e36), '1.23e36'); chk('count 9.995e36 (half-up)', N.fmtCount(9.995e36), '1.00e37'); chk('count 1.235e36 (half-up)', N.fmtCount(1.235e36), '1.24e36'); chk('count 1.005e36 (half-up)', N.fmtCount(1.005e36), '1.01e36'); chk('count 1.2345e36', N.fmtCount(1.2345e36), '1.23e36');
    chk('count max-safe', N.fmtCount(Number.MAX_SAFE_INTEGER), '9.01Qa'); chk('money max-safe cents', N.fmtMoney(Number.MAX_SAFE_INTEGER), '$90.1T');
    chk('count NaN', N.fmtCount(NaN), '—'); chk('money Infinity', N.fmtMoney(Infinity), '—'); chk('short -Infinity', N.fmtMoneyShort(-Infinity), '—');
    out.checks.boundaries = exp; expect(true).toBe(true);
  });
  it('every suffix reachable is produced; no NaN / Infinity / e+ / words in visible text; sci only >= 1e36 as d.dde<n>', () => {
    const seen = new Set<string>(); let n = 0;
    for (let e = 0; e <= 40; e += 0.05) for (const [nm, f, u] of VIS) { const x = 10 ** e * (nm.startsWith('fmtCount') ? 1 : 1); const s = f(x * (u === 100 ? 100 : 1)); n++;
      if (!okShape(s)) fail(`${nm}(${x}) shape "${s}"`); const m = /([A-Za-z]+)$/.exec(s.replace(/e\d+$/, '')); if (m) seen.add(m[1]);
      if (/e/.test(s) && x < 1e36 * 0.99995) fail(`${nm}(${x}) scientific below 1e36: "${s}"`); if (x >= 1e36 && !/e/.test(s)) fail(`${nm}(${x}) not scientific at >=1e36: "${s}"`); }
    for (const x of [Number.MAX_SAFE_INTEGER, 1e33, 1e36, 1e300, Number.MAX_VALUE]) for (const [nm, f] of VIS) { const s = f(x); if (!okShape(s)) fail(`${nm}(${x}) shape "${s}"`); }
    out.checks.suffixesSeen = [...seen]; out.checks.shapeSamples = n;
    for (const s of Object.keys(SFX)) if (!seen.has(s)) fail(`suffix ${s} never produced`);
  });
  it('monotonic (non-decreasing parsed value) and floor variants never exceed the input', () => {
    const xs = [...Array(6000)].map(() => 10 ** (rnd() * 39)).concat(Object.values(SFX).flatMap(b => [b * 0.99995, b, b * 9.995, b * 999.95, b * 999.995])).sort((a, b) => a - b);
    let bad = 0;
    for (const [nm, f, u] of VIS) { let prev = -1; for (const x of xs) { const s = f(x * u); const v = parse(s);
      if (!(v >= prev - 1e-9 * Math.abs(prev))) { if (bad++ < 20) fail(`monotonic ${nm}: ${x} -> "${s}" < previous ${prev}`); } prev = Math.max(prev, v);
      if ((nm.includes('Floor') || nm === 'fmtMoneyPreview') && v > Math.floor(x) * (1 + 1e-12) + 1e-9 && x >= 1e4) { if (bad++ < 40) fail(`floor ${nm}: "${s}" > ${x}`); } } }
    out.checks.monotonicSamples = xs.length * VIS.length;
  });
  it('500+ random K..T values byte-identical to dd223f5 where the spec says unchanged', () => {
    const diffs: any[] = []; let n = 0;
    for (let i = 0; i < 700; i++) { const e = 3 + rnd() * 12; const x = Math.floor(10 ** e); const cents = Math.floor(10 ** (5 + rnd() * 12)); n++;
      const pairs: [string, string, string][] = [['fmtCount', N.fmtCount(x), OLD.fmtCount(x)], ['fmtMoney', N.fmtMoney(cents), OLD.fmtMoney(cents)], ['fmtMoneyShort', N.fmtMoneyShort(cents), OLD.fmtMoneyShort(cents)],
        ['fmtMoneyPreview', N.fmtMoneyPreview(cents), OLD.fmtMoneyPreview(cents)], ['fmtMoneyExact', N.fmtMoneyExact(cents), OLD.fmtMoneyExact(cents)],
        ['liveText', N.liveText(cents, x), `${OLD.fmtMoney(cents)}, ${OLD.fmtCount(x)} eggs`], ['fmtCountAria', N.fmtCountAria(x), OLD.fmtCount(x)], ['fmtMoneyAria', N.fmtMoneyAria(cents), OLD.fmtMoneyExact(cents)]];
      for (const [nm, a, b] of pairs) if (a !== b) diffs.push({ nm, x, cents, new: a, old: b }); }
    // edges inside K..T
    for (const x of [1e4, 99_999, 999_949, 999_950, 9_995_000, 999_950_000_000, 999_949_999_999_999]) { if (N.fmtCount(x) !== OLD.fmtCount(x)) diffs.push({ nm: 'fmtCount-edge', x, new: N.fmtCount(x), old: OLD.fmtCount(x) }); }
    // intended change (Art ruling 2, 999.95T -> 1Qa; main had no tier above T): recorded, not scored
    out.checks.intendedKTChanges = [999_950_000_000_000, 1e15 - 1].map(x => ({ x, new: N.fmtCount(x), old: OLD.fmtCount(x) }));
    out.checks.identityKT = { samples: n, comparisonsPerSample: 8, diffs: diffs.slice(0, 50), diffCount: diffs.length };
    if (diffs.length) fail(`K..T identity: ${diffs.length} diffs (first ${JSON.stringify(diffs[0])})`);
  });
  it('aria spelling: Qa+ spelled with the table names, sci read out, K..T untouched, visible never spelled', () => {
    const rows: any[] = [];
    for (const [s, name] of Object.entries(NAMES)) { const b = SFX[s];
      const c = N.fmtCountAria(1.25 * b), m = N.fmtMoneyAria(1.25 * b * 100), l = N.liveText(1.25 * b * 100, 1.25 * b); rows.push({ s, c, m, l });
      if (c !== `1.25 ${name}`) fail(`fmtCountAria ${s}: "${c}"`); if (m !== `$1.25 ${name}`) fail(`fmtMoneyAria ${s}: "${m}"`); if (l !== `$1.25 ${name}, 1.25 ${name} eggs`) fail(`liveText ${s}: "${l}"`);
      for (const [nm, f, u] of VIS) { const v = f(1.25 * b * u); if (/[a-z]{3,}/.test(v)) fail(`visible ${nm} spelled: "${v}"`); } }
    const sc = N.fmtCountAria(1.234e36), sm = N.fmtMoneyAria(1e38); rows.push({ sc, sm });
    if (sc !== '1.23 times 10 to the 36') fail(`sci aria "${sc}"`); if (sm !== '$1.00 times 10 to the 36') fail(`sci money aria "${sm}"`);
    for (const x of [1e3, 1.2e4, 3.4e7, 5.6e10, 7.8e13]) if (/illion|thousand/.test(N.fmtCountAria(x))) fail(`K..T aria spelled ${x}`);
    out.checks.aria = rows;
  });
  it('3110e88: author claims, half-up at half-way values on every tier and in scientific (P-1), floor never rounds up', () => {
    const rows: any[] = []; const chk = (name: string, got: string, want: string) => { rows.push([name, got, want]); if (got !== want) fail(`claim ${name}: "${got}" != "${want}"`); };
    chk('pop exact 1.2e17c', N.fmtMoneyExact(1.2e17), '$1.2Qa'); chk('pop exact 1.2345e17c', N.fmtMoneyExact(1.2345e17), '$1.2Qa'); chk('pop exact 1.25e17c (half-up)', N.fmtMoneyExact(1.25e17), '$1.3Qa');
    chk('count 1e36', N.fmtCount(1e36), '1.00e36'); chk('short 1e36$', N.fmtMoneyShort(1e38), '$1.00e36'); chk('exact 1e36$', N.fmtMoneyExact(1e38), '$1.00e36');
    chk('short $999.9Dc', N.fmtMoneyShort(999.9e35), '$999.9Dc'); chk('money $999.9Dc', N.fmtMoney(999.9e35), '$999.9Dc'); chk('preview $999.94Dc', N.fmtMoneyPreview(999.94e35), '$999.9Dc');
    chk('count 999.9Dc', N.fmtCount(999.9e33), '999.9Dc'); chk('count 999.95Dc', N.fmtCount(999.95e33), '1.00e36'); chk('short 999.95Dc', N.fmtMoneyShort(999.95e35), '$1.00e36');
    chk('count 999.995K', N.fmtCount(999_995), '1M'); chk('count 999.995M', N.fmtCount(999_995_000), '1B'); chk('count 999.995B', N.fmtCount(999_995_000_000), '1T'); chk('count 999.995T', N.fmtCount(999_995_000_000_000), '1Qa');
    chk('money 999.995K$', N.fmtMoney(99_999_500), '$1M'); chk('money 999.995T$', N.fmtMoney(99_999_500_000_000_000), '$1Qa'); chk('money 99.9995T$ (harness self-check)', N.fmtMoney(99_999_500_000_000_00), '$100T');
    chk('sci 9.995e36', N.fmtCount(9.995e36), '1.00e37'); chk('sci money 9.995e36$', N.fmtMoney(9.995e38), '$1.00e37'); chk('sci floor 9.995e36', N.fmtCountFloor(9.995e36), '9.99e36');
    chk('count max-safe', N.fmtCount(Number.MAX_SAFE_INTEGER), '9.01Qa'); chk('floor max-safe', N.fmtCountFloor(Number.MAX_SAFE_INTEGER), '9Qa');
    chk('aria 1.00e36', N.fmtCountAria(1e36), '1.00 times 10 to the 36'); chk('aria $999.9Dc', N.fmtMoneyAria(999.9e35), '$999.9 decillion');
    // half-up sweep: every k.5 at the 2-dp band (1..9.99 x base) and the 1-dp band (10..999.9 x base), each tier K..Dc; scientific e36..e120
    const miss: any = {}; const floorUp: any[] = []; let n = 0;
    for (const [s, base] of Object.entries(SFX)) { miss[s] = { dp2: 0, dp1: 0, samples: 0, ex: [] as any[] };
      for (let k = 100; k < 1000; k++) { if (s === 'K') break; const x = Number(`${k}5e${Math.log10(base) - 3}`); const got = N.fmtCount(x); const want = (k + 1) / 100; n++; miss[s].samples++;
        if (Math.abs(parse(got) / base - want) > 1e-9 && !(k === 999 && got === `10${s}`)) { miss[s].dp2++; if (miss[s].ex.length < 3) miss[s].ex.push([x, got, want]); }
        const fl = N.fmtCountFloor(x); if (parse(fl) > x * (1 + 1e-12)) floorUp.push([x, fl]); }
      for (let j = 100; j < 10000; j += 37) { const x = Number(`${j}5e${Math.log10(base) - 2}`); if (x < 1e4) continue; const got = N.fmtCount(x); const want = (j + 1) / 10; n++; miss[s].samples++;
        if (Math.abs(parse(got) / base - want) > 1e-9 && !(want >= 1000)) { miss[s].dp1++; if (miss[s].ex.length < 3) miss[s].ex.push([x, got, want]); }
        const fl = N.fmtCountFloor(x); if (parse(fl) > x * (1 + 1e-12)) floorUp.push([x, fl]); } }
    let sciMiss = 0; const sciEx: any[] = [];
    for (let ex = 36; ex <= 120; ex++) for (let k = 100; k < 1000; k++) { const x = Number(`${k}5e${ex - 3}`); const got = N.fmtCount(x); n++;
      const want = k + 1 >= 1000 ? `1.00e${ex + 1}` : `${((k + 1) / 100).toFixed(2)}e${ex}`; if (got !== want) { sciMiss++; if (sciEx.length < 5) sciEx.push([x, got, want]); }
      const fl = N.fmtCountFloor(x); if (fl !== `${(k / 100).toFixed(2)}e${ex}`) floorUp.push([x, fl]); }
    // old (dd223f5) half-up misses on the same K..T half-way points, to tell pre-existing from new
    const oldMiss: any = {}; for (const s of ['M', 'B', 'T']) { const base = SFX[s]; oldMiss[s] = 0; for (let k = 100; k < 1000; k++) { const x = Number(`${k}5e${Math.log10(base) - 3}`); if (OLD.fmtCount(x) !== N.fmtCount(x)) oldMiss[s]++; } }
    out.checks.claims = rows; out.checks.halfUp = { samples: n, miss, sciMiss, sciEx, floorUp: floorUp.slice(0, 10), floorUpCount: floorUp.length, ktNewVsOldDiffsAtHalfway: oldMiss };
    if (sciMiss) fail(`sci half-up misses ${sciMiss}`); if (floorUp.length) fail(`floor rounded up ${floorUp.length}`);
    for (const s of ['Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']) if (miss[s].dp2 + miss[s].dp1) fail(`half-up misses in ${s}: ${JSON.stringify(miss[s])}`);
  });
  it('report', () => { writeFileSync(process.env.QA_OUT ?? '/tmp/m41-9-fmt-out.json', JSON.stringify(out, null, 1)); expect(out.fails).toEqual([]); });
});
