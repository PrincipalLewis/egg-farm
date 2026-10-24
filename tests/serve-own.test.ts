// CCR #66 (reviews/pr66-f8ba53c.md) m1/n3: the browser-gate server guard. Pure parts only (no vite, no browser).
import { describe, it, expect } from 'vitest';
// @ts-expect-error plain .mjs helper without types
import { buildIdProblem, parsePort, isDirty as isDirtyJs } from '../scripts/serve-own.mjs';
import { isDirty as isDirtyTs } from '../scripts/build-id';
const HEAD = 'f8ba53c5d3766a1674e90c88a70721fc6fe179cd';

describe('m1: expectHeadBuild checks hash AND dirty state', () => {
  it('clean build on a clean tree at HEAD: ok', () => expect(buildIdProblem('m3-rc1-pre+f8ba53c', HEAD, false)).toBeNull());
  it("CCR R4: '+f8ba53c+dirty' served on a clean tree is refused (and on a dirty tree too) unless ALLOW_DIRTY", () => {
    expect(buildIdProblem('m3-rc1-pre+f8ba53c+dirty', HEAD, false)).toMatch(/\+dirty build/);
    expect(buildIdProblem('m3-rc1-pre+f8ba53c+dirty', HEAD, true)).toMatch(/\+dirty build/);
    expect(buildIdProblem('m3-rc1-pre+f8ba53c+dirty', HEAD, true, true)).toBeNull();
    expect(buildIdProblem('m3-rc1-pre+f8ba53c+dirty', HEAD, false, true)).toMatch(/tree .* is clean/); // delta n1: never current on a clean tree
  });
  it('a clean build-id on a dirty tree is refused (the build predates the edits), even with ALLOW_DIRTY', () => {
    expect(buildIdProblem('m3-rc1-pre+f8ba53c', HEAD, true)).toMatch(/tree .* is dirty/);
    expect(buildIdProblem('m3-rc1-pre+f8ba53c', HEAD, true, true)).toMatch(/tree .* is dirty/);
  });
  it('another commit, unknown or missing id: refused', () => {
    for (const id of ['m3-rc1-pre+dd223f5', 'm3-rc1-pre+dd223f5+dirty', 'm3-rc1-pre+unknown', '', undefined]) expect(buildIdProblem(id as any, HEAD, false, true)).toMatch(/is not HEAD f8ba53c/);
  });
  it('the JS isDirty used by the scripts equals scripts/build-id.ts isDirty', () => {
    for (const p of ['', ' M src/a.ts\n', '?? x.txt\n', '?? vite.config.ts.timestamp-123.mjs\n', ' M vite.config.ts\n', '?? "a b.txt"\n?? vite.config.mjs.timestamp-9-x.mjs\n'])
      expect(isDirtyJs(p)).toBe(isDirtyTs(p));
  });
});

describe('n3: PORT parsing', () => {
  it('unset or empty = 0 (free port); an integer 1..65535 as-is', () => {
    expect(parsePort(undefined)).toBe(0); expect(parsePort('')).toBe(0); expect(parsePort('4331')).toBe(4331); expect(parsePort('65535')).toBe(65535);
  });
  it('non-numeric or out of range: an error (callers exit 2)', () => {
    for (const v of ['abc', '43a', '-1', '0', '65536', '4.5', ' 4331']) expect(() => parsePort(v)).toThrow(/not a port number/);
  });
});

// ---- restored from main (CCR delta n3): no fixed default port ----
import net from 'node:net';
import { readFileSync, existsSync, mkdtempSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { spawnSync, spawn, execSync } from 'node:child_process';
import http from 'node:http';
// @ts-expect-error plain .mjs helper without types
import { freePort, expectHeadBuild } from '../scripts/serve-own.mjs';
it('freePort returns distinct bindable ports', async () => {
  const a = await freePort(), b = await freePort();
  expect(a).toBeGreaterThan(0);
  const s = net.createServer(); await new Promise<void>(r => s.listen(a, '127.0.0.1', () => r())); // still bindable
  const c = await freePort(); expect(c).not.toBe(a); s.close(); expect(typeof b).toBe('number');
});
it('an unset PORT gets a probed free port (rc0 and check-globals); an explicit PORT still overrides', () => {
  expect(parsePort(undefined)).toBe(0);
  for (const f of ['release-globals-browser.mjs', 'rc0-browser.mjs']) {
    const src = readFileSync(new URL(`../scripts/${f}`, import.meta.url), 'utf8');
    expect(src).not.toMatch(/\?\? *(4181|5100)|--port', String/); expect(src).toMatch(/serveForRun\('dist(-qa)?'/);
  }
  const so = readFileSync(new URL('../scripts/serve-own.mjs', import.meta.url), 'utf8');
  expect(so).toMatch(/if \(\+port\) return serveOnce/); expect(so).toMatch(/on port \$\{p\}/); expect(so).toMatch(/serveOwn\(outDir, parsePort\(\)\)/);
});

// ---- CCR delta n3: wiring (kills M11 dirty=false, M12 git failure passes, M13 exit 0 on failure) ----
const git = (cwd: string, a: string) => execSync(`git ${a}`, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
async function served(id: string) {
  const s = http.createServer((_q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(`<meta name="build-id" content="${id}"><title>t</title>`); });
  await new Promise<void>(r => s.listen(0, '127.0.0.1', () => r()));
  return { s, url: `http://127.0.0.1:${(s.address() as net.AddressInfo).port}/` };
}
describe('expectHeadBuild wiring (a real git tree + a served page)', () => {
  it('uses the tree\'s REAL dirty state: clean id passes on a clean tree, is refused once an untracked file appears', async () => {
    const d = mkdtempSync(join(tmpdir(), 'so-git-'));
    git(d, 'init -q'); writeFileSync(join(d, 'a.txt'), 'a'); git(d, 'add a.txt'); git(d, '-c user.name=t -c user.email=t@t commit -qm a');
    const h = git(d, 'rev-parse HEAD'), { s, url } = await served(`m3-rc1-pre+${h.slice(0, 7)}`);
    try {
      await expect(expectHeadBuild({ url, cwd: d }, { allowDirty: false, allowNoGit: false })).resolves.toBe(`m3-rc1-pre+${h.slice(0, 7)}`);
      writeFileSync(join(d, 'untracked.txt'), 'x');
      await expect(expectHeadBuild({ url, cwd: d }, { allowDirty: true, allowNoGit: false })).rejects.toThrow(/is clean but the tree .* is dirty .*untracked/);
    } finally { s.close(); }
  });
  it('git unavailable (not a repo) is an error, also with ALLOW_DIRTY; only ALLOW_NO_GIT skips it', async () => {
    const d = mkdtempSync(join(tmpdir(), 'so-nogit-')), { s, url } = await served('m3-rc1-pre+abcdef1');
    try {
      await expect(expectHeadBuild({ url, cwd: d }, { allowDirty: true, allowNoGit: false })).rejects.toThrow(/git unavailable .*ALLOW_NO_GIT=1/);
      await expect(expectHeadBuild({ url, cwd: d }, { allowDirty: false, allowNoGit: true })).resolves.toBe('m3-rc1-pre+abcdef1');
    } finally { s.close(); }
  });
});
describe('serveForRun wiring: one line, exit 2', () => {
  const run = (script: string, env: Record<string, string>) => spawnSync(process.execPath, [`scripts/${script}`, 'chromium'], { encoding: 'utf8', env: { ...process.env, ...env }, timeout: 60000 });
  it.each(['rc0-browser.mjs', 'release-globals-browser.mjs'])('%s: PORT=abc -> exit 2, one stderr line, no stack', script => {
    const r = run(script, { PORT: 'abc' });
    expect(r.status).toBe(2); const err = r.stderr.trim().split('\n'); expect(err).toHaveLength(1); expect(err[0]).toMatch(/PORT="abc" is not a port number/); expect(r.stderr).not.toMatch(/\n\s+at /);
  });
  it('n5: vite cannot be spawned (no npx on PATH) -> exit 2, one line', () => {
    const bin = mkdtempSync(join(tmpdir(), 'so-path-')); symlinkSync(process.execPath, join(bin, 'node'));
    const r = run('release-globals-browser.mjs', { PATH: bin, PORT: '' });
    expect(r.status).toBe(2); expect(r.stderr).toMatch(/cannot start vite preview \(ENOENT/); expect(r.stderr).not.toMatch(/\n\s+at /);
  });
});
describe('CCR delta m1: SIGTERM during server startup leaves nothing listening', () => {
  it.skipIf(!existsSync('dist-qa/assets'))('rc0 on an explicit free port, TERM as soon as vite listens (serveOwn not resolved yet): port free afterwards', async () => {
    const port = await freePort(), up = () => new Promise<boolean>(r => { const c = net.connect(port, '127.0.0.1', () => { c.destroy(); r(true); }); c.on('error', () => r(false)); });
    const p = spawn(process.execPath, ['scripts/rc0-browser.mjs', 'chromium'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
    const exited = new Promise<number | null>(r => p.on('exit', (c, sig) => r(c ?? (sig ? 128 + 15 : null))));
    for (let i = 0; i < 200 && !(await up()); i++) await new Promise(r => setTimeout(r, 25));
    p.kill('SIGTERM'); expect(await exited).toBe(143);
    let open = true; for (let i = 0; i < 40 && open; i++) { await new Promise(r => setTimeout(r, 100)); open = await up(); }
    expect(open).toBe(false);
  }, 60000);
});
