// K10 breeds offset test (engineering/decisions.md 2026-10-25 03:52 item (6), D-HOP-2026-10-24-47): `npm run test:k10`.
// REVIEW DRAFT r2 (QA-D-1105-K10ASSERT): D-HOP-52 replaces the legacy <= assertion; K10_REF_CSV is mandatory.
// F20-29 median active premium (optimal, seeds 1-200, T 12000, windows every 300 s): hard pass = margin > same-CSV
// median paired-path noise AND margin > 1 paired-bootstrap SD; Present-only legacy protection kept. >=2x noise is a
// recorded TARGET (flag "PASS (below 2x target)" when hard bar clears but target misses). Slow (~10-15 min on 2 cores).
// Env: K10_CSV, K10_REF_CSV (required), K10_SEEDS (200), K10_S0 (1), K10_OUT=<file>. Forced-settle is not a cut gate.
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from '../scripts/sync-economy';
import { validateBalance, type Balance } from '../src/config/balance';
import { loadTargets } from './pacing-guards';
import { k10 } from './k10-breeds-offset';

const E = process.env, csvPath = E.K10_CSV ?? new URL('../data/economy.csv', import.meta.url).pathname;
describe('K10 breeds offset (B4)', () => {
  it(`D-HOP-52 margin exceeds same-CSV noise and one paired-bootstrap SD (${csvPath})`, () => {
    const raw = readFileSync(csvPath), csv = raw.toString('utf8'), sha = createHash('sha256').update(raw).digest('hex');
    const b = validateBalance(buildBalance(parseEconomyCsv(csv), JSON.parse(readFileSync(new URL('../src/config/balance.json', import.meta.url), 'utf8')), readEconomyConfig() as any) as Balance, false);
    if (!E.K10_REF_CSV || E.K10_SETTLE === '1') throw new Error('K10 requires K10_REF_CSV; forced-settle is informational, not a cut gate');
    const referenceRaw = readFileSync(E.K10_REF_CSV), referenceCsv = referenceRaw.toString('utf8'), referenceCsvSha256 = createHash('sha256').update(referenceRaw).digest('hex');
    const r = k10(b, csv, sha, { seeds: +(E.K10_SEEDS ?? 200), s0: +(E.K10_S0 ?? 1), T: 12000, step: 300, targets: loadTargets() }, { referenceCsv, referenceCsvSha256 });
    const e = r.evidence;
    const line = `K10 csv=${sha.slice(0, 8)} bc=${r.bcSource} seeds=${r.seeds.join('-')} settle=${E.K10_SETTLE === '1' ? 1 : 0} F20-29 median premium: g1max ${r.premium.g1max.toFixed(2)} | no-breeds ${r.premium.noBreeds.toFixed(2)} | Present-only ${r.premium.presentOnly.toFixed(2)} -> ${e.verdict} (decisionTargetPp=${e.decisionTargetPp}, targetTwoNoisePp=${e.targetTwoNoisePp})`;
    console.log(line, JSON.stringify(e), `reference=${r.referenceCsvSha256}`);
    if (E.K10_OUT) writeFileSync(E.K10_OUT, JSON.stringify({ csv: csvPath, settle: E.K10_SETTLE === '1', ...r }) + '\n');
    expect(e.marginPp, line).toBeGreaterThan(e.medianNoisePp);
    expect(e.marginPp, line).toBeGreaterThan(e.bootstrapSdPp);
    expect(r.pass, line).toBe(true);
    expect(e.marginal, `${line} — MARGINAL requires HoQA review before counting`).toBe(false);
    expect(r.premium.g1max, line).toBeLessThanOrEqual(r.premium.presentOnly);
  }, 3_600_000);
});
