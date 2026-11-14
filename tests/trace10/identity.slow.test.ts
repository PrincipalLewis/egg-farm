// EC-2 self-test (a) at harness level (design §13): two SEPARATE processes produce before and after from the same ship CSV
// (data/economy.csv), seeds 1-5 x 3 profiles, T = 4000, CFG none; comparator exit 0, every seed MATCH, trace hashes equal,
// input-diff empty + PASS. Card: a test fixture card with its sha1 passed as the re-pin override (the studio card is not in
// the repo); label stays SYNTHETIC/SELFTEST. Needs a clean git tree (tree_dirty must be false).
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { ROOT } from './producer';

export function fixtureCard(dir: string) { const p = join(dir, 'card-fixture.md'), t = 'trace10 self-test card fixture (not the card of record)\n'; writeFileSync(p, t); return { path: p, sha1: createHash('sha1').update(t).digest('hex') }; }
const vn = (args: string[], env: Record<string, string>) => spawnSync(process.execPath, [join(ROOT, 'node_modules/vite-node/vite-node.mjs'), ...args], { cwd: ROOT, encoding: 'utf8', env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', ...env } });

describe('EC-2 self-test (a): identity a8c4 <-> a8c4, harness level, two processes', () => {
  it('before and after from the same CSV -> MATCH_ALL exit 0, equal trace hashes, input_check PASS', () => {
    const d = mkdtempSync(join(tmpdir(), 'trace10-a-')); try {
      const card = fixtureCard(d), flags = [`--card=${card.path}`, `--card-sha1=${card.sha1}`, '--synthetic', '--selftest-id=EC-2a'];
      for (const side of ['before', 'after']) {
        const r = vn(['scripts/trace10.ts', '--', ...flags], { CSV: 'data/economy.csv', SIDE: side, SEEDS: '5', S0: '1', T: '4000', OUT: d });
        expect(r.status, r.stderr).toBe(0);
      }
      const c = vn(['scripts/trace10-compare.ts', '--', join(d, 'before'), join(d, 'after'), join(d, 'cmp'), `--card-sha1=${card.sha1}`], {});
      expect(c.status, c.stdout + c.stderr).toBe(0);
      const v = JSON.parse(readFileSync(join(d, 'cmp/verdict.json'), 'utf8'));
      expect(v.verdict).toBe('MATCH_ALL'); expect(v.label).toMatch(/SYNTHETIC\/SELFTEST/); expect(v.profiles.map((p: any) => p.profile)).toEqual(['casual', 'optimal', 'seller15']);
      for (const p of v.profiles) { expect(p.seeds.length).toBe(5); for (const s of p.seeds) { expect(s.verdict).toBe('MATCH'); expect(s.trace_sha256_after).toBe(s.trace_sha256_before); expect(s.C).toBeGreaterThan(0); } }
      const idf = JSON.parse(readFileSync(join(d, 'cmp/input-diff.json'), 'utf8'));
      expect(idf.input_check).toBe('PASS'); expect(idf.csv.cells).toEqual([]); expect(idf.csv.header_renames).toEqual([]); expect(idf.balance.leaves).toEqual([]);
      const m = JSON.parse(readFileSync(join(d, 'before/optimal/manifest.json'), 'utf8'));
      expect(m.inputs.csv_sha256).toBe('a8c4e26836bf7af98cb51f8e3e8a646750e82a4cdc18be450afe2f86eeeeb07f');
      expect(m.cfg.ship_tc_streak_cap).toBe(0.28); expect(m.cfg.runtime_streakCap).toBe(0.28); expect(m.cfg.src_flags_on).toEqual([]);
      expect(m.gaps_export.schema).toBe('EC-1-optionA-v1'); expect(Object.keys(m.producer.files)).toContain('scripts/trace10.ts'); // T-EC1d: producer attested
      for (const ps of m.per_seed) expect(ps.rng_end.runner_draws).toBe(0); // runner: measured explicit 0
    } finally { rmSync(d, { recursive: true, force: true }); }
  }, 900_000);
});
