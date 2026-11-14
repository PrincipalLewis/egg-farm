// EC-2 self-test (c): truncated / missing stream, bad footer, bad manifest => INVALID/UNASSESSED (exit 3), never MATCH_ALL (§13).
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { synthSide, refooter } from './synth';
import { compareSides, readSide, type SideData } from './compare';
import { validateManifest } from './manifest';
import { writeProfile, writeManifestSha } from './io';

const pair = () => [synthSide({ side: 'before' }), synthSide({ side: 'after' })] as const;
const withStream = (d: SideData, id: 's1' | 's2' | 's3' | 's4', t: string | undefined): SideData => ({ ...d, streams: { ...d.streams, [id]: t } });
const withManifest = (d: SideData, f: (m: any) => void): SideData => { const m = structuredClone(d.manifest) as any; f(m); return { ...d, manifest: m }; };
const dropFooter = (t: string) => t.slice(0, -1).split('\n').slice(0, -1).join('\n') + '\n';
const VARIANTS: [string, (a: SideData) => SideData][] = [
  ['delete s4', a => withStream(a, 's4', undefined)],
  ['drop the footer of s2', a => withStream(a, 's2', dropFooter(a.streams.s2!))],
  ['truncate s1 mid-file', a => withStream(a, 's1', a.streams.s1!.slice(0, Math.floor(a.streams.s1!.length / 2)))],
  ['truncate s1 at a line boundary (footer gone)', a => withStream(a, 's1', a.streams.s1!.split('\n').slice(0, 40).join('\n') + '\n')],
  ['footer count off by one', a => { const ls = a.streams.s3!.slice(0, -1).split('\n'); const f = JSON.parse(ls.pop()!); f[2]++; return withStream(a, 's3', [...ls, JSON.stringify(f)].join('\n') + '\n'); }],
  ['footer body hash wrong', a => withStream(a, 's3', a.streams.s3!.replace(/"[0-9a-f]{64}"\]\n$/, `"${'0'.repeat(64)}"]\n`))],
  ['one seed missing from s3', a => withStream(a, 's3', refooter(a.streams.s3!, b => b.filter(l => JSON.parse(l)[1] !== 2)))],
  ['manifest missing cfg.ship_tc_streak_cap', a => withManifest(a, m => { delete m.cfg.ship_tc_streak_cap; })],
  ['empty stream', a => withStream(a, 's2', '')],
  ['runtime.node = v24', a => withManifest(a, m => { m.runtime.node = 'v24.1.0'; })],
  ['src_flags_on non-empty', a => withManifest(a, m => { m.cfg.src_flags_on = ['golden']; })],
  ['card sha1 not the version of record', a => withManifest(a, m => { m.inputs.card_sha1 = '7891bfbc' + '0'.repeat(32); })],
  ['contract hash wrong', a => withManifest(a, m => { m.inputs.contract_sha256 = '0'.repeat(64); })],
  ['harness hashes differ between sides', a => withManifest(a, m => { m.harness.files['tests/bot-m5.ts'] = 'f'.repeat(64); })],
  ['side label wrong', a => withManifest(a, m => { m.side = 'before'; })],
  ['seed missing from per_seed', a => withManifest(a, m => { m.per_seed = m.per_seed.filter((x: any) => x.seed !== 3); })],
  ['extra manifest key', a => withManifest(a, m => { m.exclusions = ['s4']; })],
];

describe('EC-2 self-test (c): invalid inputs are never MATCH_ALL', () => {
  it.each(VARIANTS)('%s -> INVALID, exit 3', (_n, f) => {
    const [b, a] = pair(); const v = compareSides(b, f(a));
    expect(v.verdict).toBe('INVALID'); expect(v.exit).toBe(3); expect(v.invalid.length).toBeGreaterThan(0);
    expect(JSON.stringify(v)).not.toContain('MATCH_ALL');
  });
  it('the same variants on the BEFORE side are also INVALID', () => {
    for (const [, f] of VARIANTS.filter(([n]) => n !== 'side label wrong')) { const [b, a] = pair(); expect(compareSides(f(b), a).exit).toBe(3); }
  });
  it('a valid synthetic manifest passes the §8 validator', () => { expect(validateManifest(synthSide().manifest)).toEqual([]); });
});

describe('EC-2 (c) on disk + CLI exit codes', () => {
  const mk = () => { const d = mkdtempSync(join(tmpdir(), 'trace10-')); const [b, a] = pair();
    writeProfile(join(d, 'before'), 'optimal', b); writeManifestSha(join(d, 'before')); writeProfile(join(d, 'after'), 'optimal', a); writeManifestSha(join(d, 'after')); return d; };
  const cli = (d: string) => spawnSync(process.execPath, ['node_modules/vite-node/vite-node.mjs', 'scripts/trace10-compare.ts', join(d, 'before'), join(d, 'after'), join(d, 'cmp')], { encoding: 'utf8' });
  it('readSide: MANIFEST.sha256 tamper / missing file -> INVALID', () => {
    const d = mk(); try {
      expect(compareSides(readSide(join(d, 'before'), 'optimal'), readSide(join(d, 'after'), 'optimal')).verdict).toBe('MATCH_ALL');
      unlinkSync(join(d, 'after/optimal/s4-rng.jsonl'));
      const v = compareSides(readSide(join(d, 'before'), 'optimal'), readSide(join(d, 'after'), 'optimal'));
      expect(v.verdict).toBe('INVALID'); expect(v.invalid.join('\n')).toMatch(/MANIFEST.sha256 lists missing file optimal\/s4-rng.jsonl/);
    } finally { rmSync(d, { recursive: true, force: true }); }
  });
  it('CLI: identity exit 0 with synthetic label; deleted stream exit 3; usage exit 2', () => {
    const d = mk(); try {
      const ok = cli(d); expect(ok.status).toBe(0); expect(ok.stdout).toContain('SYNTHETIC/SELFTEST');
      expect(JSON.parse(readFileSync(join(d, 'cmp/verdict.json'), 'utf8')).verdict).toBe('MATCH_ALL');
      unlinkSync(join(d, 'after/optimal/s2-events.jsonl')); const bad = cli(d); expect(bad.status).toBe(3);
      expect(bad.stdout + bad.stderr).not.toMatch(/PL-AC5\(iii\) PASS/);
      const u = spawnSync(process.execPath, ['node_modules/vite-node/vite-node.mjs', 'scripts/trace10-compare.ts'], { encoding: 'utf8' }); expect(u.status).toBe(2);
    } finally { rmSync(d, { recursive: true, force: true }); }
  }, 60_000);
});
