// Release gate: scripts/check-release-build.mjs fails when the bundled build id has "+dirty".
import { it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path'; import { spawnSync } from 'node:child_process';
const run = (id: string, head = '19564ebaaaa') => { const d = mkdtempSync(join(tmpdir(), 'rb-')); mkdirSync(join(d, 'assets')); writeFileSync(join(d, 'assets', 'i.js'), `const B="${id}";`); writeFileSync(join(d, 'index.html'), '<!doctype html><script type="module" src="/assets/i.js"></script>');
  return spawnSync('node', [new URL('../scripts/check-release-build.mjs', import.meta.url).pathname, d], { env: { ...process.env, HEAD_COMMIT: head } }).status; };
it('clean id passes, +dirty fails', () => { expect(run('m3-rc1-pre+2fae4c4')).toBe(0); expect(run('m3-rc1-pre+2fae4c4+dirty')).toBe(1); });
it('m3-rc0 name only allowed when HEAD is the m3-rc0 tag commit 16176a3', () => { expect(run('m3-rc0+16176a3', '16176a3abcdef')).toBe(0); expect(run('m3-rc0+d0e4169', 'd0e4169abcdef')).toBe(1); });
const runJs = (body: string, head = '19564ebaaaa') => {
  const d = mkdtempSync(join(tmpdir(), 'rb-')); mkdirSync(join(d, 'assets'));
  writeFileSync(join(d, 'assets', 'i.js'), body); writeFileSync(join(d, 'index.html'), '<!doctype html><script type="module" src="/assets/i.js"></script>');
  return spawnSync('node', [new URL('../scripts/check-release-build.mjs', import.meta.url).pathname, d], { env: { ...process.env, HEAD_COMMIT: head }, encoding: 'utf8' });
};
it('S2-REL-1: window.eggfarmOrderList assignment fails the allowlist', () => {
  const ok = runJs('const B="m3-rc1-pre+abc1234"; window.eggfarmExportTelemetry=()=>{};');
  expect(ok.status).toBe(0);
  const bad = runJs('const B="m3-rc1-pre+abc1234"; window.eggfarmExportTelemetry=()=>{}; window.eggfarmOrderList={};');
  expect(bad.status).toBe(1);
  expect(bad.stderr + bad.stdout).toMatch(/eggfarmOrderList/);
});
it('S2-REL-1: window.eggfarm assignment also fails', () => {
  const bad = runJs('const B="m3-rc1-pre+abc1234"; window.eggfarmExportTelemetry=()=>{}; window.eggfarm={};');
  expect(bad.status).toBe(1);
  expect(bad.stderr + bad.stdout).toMatch(/eggfarm/);
});
it('QA B-4: aliased eggfarmPerf write (const w = window) fails; any non-allowlisted eggfarm* identifier fails', () => {
  const base = 'const B="m3-rc1-pre+abc1234"; window.eggfarmExportTelemetry=()=>{}; history.pushState({eggfarmRecovery:1},""); history.pushState({eggfarmTabGuard:1},"");';
  expect(runJs(base).status).toBe(0);
  const perf = runJs(base + ' const w=window; w.eggfarmPerf={done:false};');
  expect(perf.status).toBe(1); expect(perf.stderr + perf.stdout).toMatch(/eggfarmPerf/);
  const other = runJs(base + ' const x=self; x["eggfarmSecret"]=1;');
  expect(other.status).toBe(1); expect(other.stderr + other.stdout).toMatch(/eggfarmSecret/);
});
