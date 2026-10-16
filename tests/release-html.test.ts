// check-release-build on the single-file release .html: build id, window-global writes (incl. computed keys), external refs.
import { it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
// @ts-expect-error plain .mjs helper without types
import { findGlobalWrites, findExternalRefs, constKey } from '../scripts/release-scan.mjs';
const script = new URL('../scripts/check-release-build.mjs', import.meta.url).pathname;
const fx = (n: string) => new URL(`./fixtures/release-html/${n}.html`, import.meta.url).pathname;
const run = (n: string, ...a: string[]) => spawnSync('node', [script, fx(n), ...a], { env: { ...process.env, HEAD_COMMIT: 'abc1234deadbeef' }, encoding: 'utf8' });
it('passing fixture: id matches HEAD, only eggfarmExportTelemetry, no external refs', () => {
  const r = run('pass'); expect(r.stderr).toBe(''); expect(r.status).toBe(0);
  expect(run('pass', '--build-id', 'm3-rc1-pre+abc1234').status).toBe(0);
});
it.each([
  ['fail-computed-key', /eggfarmDbg/], ['fail-template-key', /computed `eggfarm\$\{x\}`/],
  ['fail-external-fetch', /fetch https:\/\/evil/], ['fail-external-import', /import\(\) https:\/\/cdn/], ['fail-external-src', /attr https:\/\/cdn/],
  ['fail-wrong-build-id', /does not match m3-rc1-pre\+abc1234/], ['fail-dirty-build-id', /\+dirty/],
])('%s fails', (n, msg) => { const r = run(n); expect(r.status).toBe(1); expect(r.stderr).toMatch(msg); });
it('--build-id mismatch fails', () => { expect(run('pass', '--build-id', 'm3-rc1-pre+0000000').status).toBe(1); });
it('scanner units', () => {
  expect(constKey(`'eggfarm'+"Dbg"`)).toBe('eggfarmDbg'); expect(constKey('a+"b"')).toBeNull();
  expect(findGlobalWrites('globalThis.eggfarmExportTelemetry=f;window["eggfarmExportTelemetry"]=f')).toEqual([]);
  expect(findGlobalWrites('self.foo=1').map((h: { key: string }) => h.key)).toEqual(['foo']);
  expect(findGlobalWrites('Object.defineProperty(window,"eggfarmDbg",{})').map((h: { key: string }) => h.key)).toEqual(['eggfarmDbg']);
  expect(findGlobalWrites('window.a==1;w.x=1;o[k]=2')).toEqual([]);
  expect(findExternalRefs('<svg xmlns="http://www.w3.org/2000/svg"></svg><a href="./x">')).toEqual([]);
  expect(findExternalRefs('import x from "https://h/m.js"').length).toBe(1);
});
