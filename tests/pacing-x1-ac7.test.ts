// pacing-x1-stack row 904 + recorded-run plumbing (HoQA QA-D-1030-PR93-1 R2, R3, R4, R7, HoE (b)). Runs the real scripts.
import { describe, it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..'), FX = join(ROOT, 'tests/fixtures/x1/ac7'), H = join(ROOT, 'scripts/pacing-x1-ac7.py');
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
const tmp = () => mkdtempSync(join(tmpdir(), 'x1-ac7-'));
const helper = (...a: string[]) => { const r = spawnSync('python3', [H, ...a], { encoding: 'utf8' }); return { rc: r.status, j: JSON.parse(r.stdout || '{}'), err: r.stderr }; };
const SHIP = join(FX, 'shipped.csv'), SHIP_SHA = sha(readFileSync(SHIP));
const git = (cwd: string, ...a: string[]) => execFileSync('git', ['-C', cwd, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { encoding: 'utf8' }).trim();

describe('R2: AC7 --csv is judged by behaviour (CSV-RECORD sha256 == shipped), not by a static source check', () => {
  it('the fixtures are the real scripts except the one sys.path line (a7dd71b 3ba1909d, studio 03d8e825)', () => {
    const back = (f: string) => readFileSync(join(FX, f), 'utf8').replace(/^sys\.path\.insert\(0, __import__.*# FIXTURE: only changed line$/m, "sys.path.insert(0, '/workspace/egg-farm-studio/product/sim/m4')");
    expect(sha(back('a7dd71b-ac7-active-idle-gate.py'))).toBe('3ba1909db39a1385696275f3d1bee2c30cd20fb85ed9d907744909f8850272f6');
    expect(sha(back('studio-03d8e825-ac7-active-idle-gate.py'))).toBe('03d8e825d0aebcf01c88760015587d99513942684365c10c10c1bc651656f38f');
  });
  it("Econ's a7dd71b script ('--csv' in args / args.index form) PASSES: CSV-RECORD names the realpath and the shipped sha256", () => {
    const d = tmp(), { rc, j } = helper('run', join(FX, 'a7dd71b-ac7-active-idle-gate.py'), SHIP, SHIP_SHA, join(d, 'ac7.log'));
    expect(rc).toBe(0); expect(j).toMatchObject({ status: 'PASS', csvRecordOk: true, csvNamed: true, exitCode: 0 });
    expect(j.csvRecord).toBe(`CSV-RECORD path=${SHIP} sha256=${SHIP_SHA}`);
  });
  it("the studio's 03d8e825 script (argv[1] only) FAILS even though it exits 0 with RESULT: PASS on its built-in CSV", () => {
    const d = tmp(), { rc, j } = helper('run', join(FX, 'studio-03d8e825-ac7-active-idle-gate.py'), SHIP, SHIP_SHA, join(d, 'ac7.log'));
    expect(j.exitCode).toBe(0); expect(j.result).toMatch(/^RESULT: PASS/);
    expect(rc).toBe(1); expect(j.status).toBe('FAIL'); expect(j.csvRecordOk).toBe(false); expect(j.why).toMatch(/CSV-RECORD missing/);
  });
  it('a shipped sha256 that does not match the CSV on disk FAILS before the gate runs; a missing script FAILS', () => {
    const d = tmp();
    expect(helper('run', join(FX, 'a7dd71b-ac7-active-idle-gate.py'), SHIP, '0'.repeat(64), join(d, 'a.log')).j.status).toBe('FAIL');
    expect(helper('run', join(d, 'nope.py'), SHIP, SHIP_SHA, join(d, 'b.log')).j.why).toMatch(/script missing/);
  });
});

describe('R4: the studio files the AC7 gate imports are hashed', () => {
  const rels = ['product/sim/m4/m4_active.py', 'product/sim/economy_sim.py', 'product/economy.f1.csv', 'product/economy.f1-m4cols.csv'];
  it('m4_active.py, economy_sim.py, economy.f1.csv and economy.f1-m4cols.csv each get a sha256; a missing one exits 1', () => {
    const s = tmp(); for (const r of rels) { mkdirSync(join(s, r, '..'), { recursive: true }); writeFileSync(join(s, r), `x ${r}\n`); }
    const ok = helper('inputs', s); expect(ok.rc).toBe(0);
    expect(ok.j.inputs).toEqual(rels.map(r => ({ path: join(s, r), sha256: sha(`x ${r}\n`) })));
    writeFileSync(join(s, rels[1]), ''); const bad = helper('inputs', s); expect(bad.rc).toBe(1); expect(bad.j.missing).toEqual([join(s, rels[1])]);
  });
});

describe('HoE (b): with --ac7-from, m4_active.py sha256 and its source commit are recorded and compared', () => {
  it('MATCH / MISMATCH (exit 1) / not-in-commit against the studio copy the gate imports', () => {
    const s = tmp(), r = tmp(); mkdirSync(join(s, 'product/sim/m4'), { recursive: true }); writeFileSync(join(s, 'product/sim/m4/m4_active.py'), 'A\n');
    git(r, 'init', '-q'); writeFileSync(join(r, 'f'), '1'); git(r, 'add', 'f'); git(r, 'commit', '-qm', 'no sim'); const c0 = git(r, 'rev-parse', 'HEAD');
    mkdirSync(join(r, 'product/sim/m4'), { recursive: true }); writeFileSync(join(r, 'product/sim/m4/m4_active.py'), 'A\n'); git(r, 'add', '.'); git(r, 'commit', '-qm', 'same'); const c1 = git(r, 'rev-parse', 'HEAD');
    writeFileSync(join(r, 'product/sim/m4/m4_active.py'), 'B\n'); git(r, 'commit', '-qam', 'diff'); const c2 = git(r, 'rev-parse', 'HEAD');
    const o = tmp(), m = helper('sim', r, c1, s, o);
    expect(m.rc).toBe(0); expect(m.j).toMatchObject({ source: 'studio', sha256: sha('A\n'), commit: c1, commitSha256: sha('A\n'), match: 'MATCH' }); expect(existsSync(join(o, 'm4_active.py'))).toBe(true);
    const x = helper('sim', r, c2, s); expect(x.rc).toBe(1); expect(x.j).toMatchObject({ commit: c2, commitSha256: sha('B\n'), match: 'MISMATCH' });
    expect(helper('sim', r, c0, s).j).toMatchObject({ commit: c0, commitSha256: null, match: 'not-in-commit', sha256: sha('A\n') });
  });
});

describe('R3: --ac7-from must be <commit>:<path> that resolves; anything else is a hard stop before results exist', () => {
  const run = (v: string) => { const out = join(tmp(), 'res'); const r = spawnSync('bash', [join(ROOT, 'scripts/pacing-x1-run.sh'), 'HEAD', out, '--ac7-from', v], { encoding: 'utf8' }); return { rc: r.status, err: r.stderr, made: existsSync(out) }; };
  it.each([['a7dd71b', /not <commit>:<path>/], ['0000000000000000000000000000000000000bad:qa/x.py', /does not resolve/], ['HEAD:no/such/ac7.py', /not in [0-9a-f]{40} \(hard stop\)/], [':qa/x.py', /not <commit>:<path>/]])
    ('%s is REFUSED (exit 2), no results dir', (v, re) => { const r = run(v); expect(r.rc).toBe(2); expect(r.err).toMatch(re); expect(r.made).toBe(false); });
});

describe('R7: trees-check gives RC gate: yes only when tested_sha == rc_sha', () => {
  const setup = (tested: string, tree: string) => {
    const d = tmp(); writeFileSync(join(d, 'trees.txt'), `tested_sha=${tested}\ntested_tree=${tree}\nrc_sha=\nrc_tree=\nrc_checked_at=\n`);
    writeFileSync(join(d, 'conditions.txt'), 'conditions_failed=0\n'); execFileSync('bash', ['-c', 'sha256sum trees.txt conditions.txt > SHA256SUMS'], { cwd: d }); return d;
  };
  it('same SHA: RC gate yes; same tree from another commit: TREE-ONLY, not RC gate', () => {
    const r = tmp(); git(r, 'init', '-q'); writeFileSync(join(r, 'f'), '1'); git(r, 'add', 'f'); git(r, 'commit', '-qm', 'a'); const a = git(r, 'rev-parse', 'HEAD'), t = git(r, 'rev-parse', 'HEAD^{tree}');
    git(r, 'commit', '-q', '--allow-empty', '-m', 'b'); const b = git(r, 'rev-parse', 'HEAD');
    const tc = (d: string, rc: string) => spawnSync('bash', [join(ROOT, 'scripts/pacing-x1-trees-check.sh'), d, rc], { encoding: 'utf8', env: { ...process.env, X1_REPO: r } });
    const d1 = setup(b, t), y = tc(d1, b); expect(y.status).toBe(0); expect(readFileSync(join(d1, 'rc-gate.txt'), 'utf8')).toMatch(/^RC gate: yes \(tested sha/);
    const d2 = setup(a, t), n = tc(d2, b); expect(n.status).toBe(1); expect(n.stdout).toMatch(/^TREE-ONLY/); expect(readFileSync(join(d2, 'rc-gate.txt'), 'utf8')).toMatch(/^not RC gate/);
  });
});
