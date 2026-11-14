// ARCH/pacing-honour-csv (D-HOP-2026-11-13-02 item 4): the REAL tree gate, not the a7dd71b / studio fixtures.
// Asserts CSV-RECORD path=<realpath> sha256=<sha> and exit 2 on a missing --csv (never a fallback).
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../../..');
const GATE = join(ROOT, 'scripts/pacing-x1-ac7-active-idle-gate.py');
const HELPER = join(ROOT, 'scripts/pacing-x1-ac7.py');
const SHIP = realpathSync(join(ROOT, 'data/economy.csv'));
const SHIP_SHA = createHash('sha256').update(readFileSync(SHIP)).digest('hex');
const OTHER = realpathSync(join(ROOT, 'vendor/economy-sim/economy.f1-m4cols.csv'));
const OTHER_SHA = createHash('sha256').update(readFileSync(OTHER)).digest('hex');
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');

const runGate = (...args: string[]) => {
  const r = spawnSync('python3', [GATE, ...args], { encoding: 'utf8' });
  return { rc: r.status, out: r.stdout, err: r.stderr, record: (r.stderr || '').split('\n').find(l => l.startsWith('CSV-RECORD ')) };
};

describe('real AC7 gate (scripts/pacing-x1-ac7-active-idle-gate.py), not the fixture', () => {
  it('emits CSV-RECORD path=<realpath> sha256=<sha> for the shipped data/economy.csv and exits 0 (PASS 5/5)', () => {
    const r = runGate('30', '--csv', SHIP);
    expect(r.record).toBe(`CSV-RECORD path=${SHIP} sha256=${SHIP_SHA}`);
    expect(r.rc).toBe(0);
    expect(r.out).toMatch(new RegExp(`^QA ac7-active-idle-gate \\| CSV ${SHIP.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\|`));
    expect(r.out).toMatch(/^RESULT: PASS \(5\/5 levels\)$/m);
  });

  it('reads the given --csv (not a default): a different readable CSV is named with its own realpath+sha256', () => {
    expect(OTHER_SHA).not.toBe(SHIP_SHA);
    // N=1 exits 2 after CSV-RECORD (need >=30) — enough to prove --csv was honoured, no 30-seed run.
    const r = runGate('1', '--csv', OTHER);
    expect(r.record).toBe(`CSV-RECORD path=${OTHER} sha256=${OTHER_SHA}`);
    expect(r.err).not.toContain(SHIP_SHA);
    expect(r.err).not.toMatch(new RegExp(`path=${SHIP.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  });

  it('exits 2 if --csv is missing/unreadable and never falls back (no RESULT, no default CSV-RECORD)', () => {
    const missing = join(mkdtempSync(join(tmpdir(), 'ac7-csv-')), 'no-such.csv');
    const r = runGate('30', '--csv', missing);
    expect(r.rc).toBe(2);
    expect(r.err).toMatch(/ERROR: --csv .*cannot read\/parse/);
    expect(r.err).toContain('no-such.csv');
    expect(r.record).toBeUndefined();
    expect(r.out).not.toMatch(/RESULT:/);
    const noPath = runGate('30', '--csv');
    expect(noPath.rc).toBe(2);
    expect(noPath.err).toMatch(/ERROR: --csv needs a path/);
    expect(noPath.record).toBeUndefined();
    expect(noPath.out).not.toMatch(/RESULT:/);
  });

  it('the helper run-path (what pacing-x1-run.sh and verdict use) PASSES with matching CSV-RECORD', () => {
    const log = join(mkdtempSync(join(tmpdir(), 'ac7-helper-')), 'ac7.log');
    const r = spawnSync('python3', [HELPER, 'run', GATE, SHIP, SHIP_SHA, log], { encoding: 'utf8' });
    const j = JSON.parse(r.stdout || '{}');
    expect(r.status).toBe(0);
    expect(j).toMatchObject({ status: 'PASS', csvRecordOk: true, csvNamed: true, exitCode: 0 });
    expect(j.csvRecord).toBe(`CSV-RECORD path=${SHIP} sha256=${SHIP_SHA}`);
    expect(sha(readFileSync(SHIP))).toBe(SHIP_SHA);
  });
});
