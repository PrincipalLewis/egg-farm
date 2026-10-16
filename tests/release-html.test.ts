// check-release-build on the single-file release .html (and dist dir edge cases): build id, window-global writes
// (computed keys, aliases, operators, Reflect/defineProperty/assign), external refs, sourcemaps, QA hooks.
import { it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
// @ts-expect-error plain .mjs helper without types
import { findGlobalWrites, findExternalRefs, constKey, extractScripts } from '../scripts/release-scan.mjs';
const script = new URL('../scripts/check-release-build.mjs', import.meta.url).pathname;
const fx = (n: string) => new URL(`./fixtures/release-html/${n}.html`, import.meta.url).pathname;
const exec = (...a: string[]) => spawnSync('node', [script, ...a], { env: { ...process.env, HEAD_COMMIT: 'abc1234deadbeef' }, encoding: 'utf8' });
const run = (n: string, ...a: string[]) => exec(fx(n), ...a);
const keys = (js: string) => findGlobalWrites(js).map((h: { key: string }) => h.key);
it.each(['pass', 'pass-assign-allowed'])('%s passes', n => { const r = run(n); expect(r.stderr).toBe(''); expect(r.status).toBe(0); });
it('--build-id <id> and --build-id=<id>', () => {
  expect(run('pass', '--build-id', 'm3-rc1-pre+abc1234').status).toBe(0); expect(run('pass', '--build-id=m3-rc1-pre+abc1234').status).toBe(0);
  expect(run('pass', '--build-id', 'm3-rc1-pre+0000000').status).toBe(1); expect(run('pass', '--build-id=m3-rc1-pre+0000000').status).toBe(1);
  const r = run('pass', '--build-id'); expect(r.status).toBe(1); expect(r.stderr).toMatch(/needs a value/);
  expect(run('pass', '--build-id=').status).toBe(1);
});
it.each([
  ['fail-computed-key', /eggfarmDbg/], ['fail-template-key', /computed `eggfarm\$\{x\}`/],
  ['fail-define-property', /eggfarmDbg/], ['fail-assign', /eggfarmDbg/], ['fail-alias-compound', /eggfarmDbg/],
  ['fail-external-fetch', /fetch https:\/\/evil/], ['fail-external-import', /import\(\) https:\/\/cdn/], ['fail-external-src', /attr https:\/\/cdn/],
  ['fail-srcset', /srcset https:\/\/cdn/], ['fail-websocket', /wss:\/\/evil/], ['fail-xhr', /XHR open https:\/\/evil/],
  ['fail-object-data', /object data https:\/\/evil/], ['fail-meta-refresh', /meta refresh https:\/\/evil/], ['fail-sourcemap', /sourceMappingURL/],
  ['fail-css-url', /css url\(\) https:\/\/cdn/], ['fail-css-import', /@import https:\/\/fonts/],
  ['fail-wrong-build-id', /does not match m3-rc1-pre\+abc1234/], ['fail-dirty-build-id', /\+dirty/],
  ['fail-unknown-build-id', /\+unknown/], ['fail-multiple-build-ids', /exactly one build id/],
  ['fail-qa-hook', /debug\/QA code.*eggfarmPerf/], ['fail-debug-global-ui', /eggfarmUi/], ['fail-script-close', /unbalanced <script>/],
])('%s fails', (n, msg) => { const r = run(n); expect(r.status).toBe(1); expect(r.stderr).toMatch(msg); });
const dist = (files: Record<string, string>) => { const d = mkdtempSync(join(tmpdir(), 'rbd-')); mkdirSync(join(d, 'assets'));
  for (const [f, s] of Object.entries(files)) writeFileSync(join(d, f), s); return d; };
const okJs = { 'assets/i.js': 'const B="m3-rc1-pre+abc1234";' };
it('dist mode: CSS url()/@import, .map files and a missing index.html fail', () => {
  const html = { 'index.html': '<!doctype html><script type="module" src="/assets/i.js"></script>' };
  expect(exec(dist({ ...okJs, ...html, 'assets/i.css': 'a{color:red}' })).status).toBe(0);
  expect(exec(dist({ ...okJs, ...html, 'assets/i.css': '@import url(https://fonts.googleapis.com/x);' })).stderr).toMatch(/@import https/);
  expect(exec(dist({ ...okJs, ...html, 'assets/i.css': 'a{background:url("//cdn.example.com/a.png")}' })).stderr).toMatch(/css url\(\)/);
  expect(exec(dist({ ...okJs, ...html, 'assets/i.js.map': '{}' })).stderr).toMatch(/source maps in release/);
  const r = exec(dist(okJs)); expect(r.status).toBe(1); expect(r.stderr).toMatch(/index\.html missing/);
});
it('global-write shapes (Code Reviewer M3 probe)', () => {
  for (const s of ['window[a[0]]=1', 'window.eggfarmDbg||={}', 'window.eggfarmDbg??=1', 'window.eggfarmDbg+=1', 'window.eggfarmDbg++',
    'Reflect.set(window,"eggfarmDbg",1)', 'const h=window;Object.defineProperty(h,"eggfarmDbg",{value:1})', 'top.eggfarmDbg=1', 'parent.eggfarmDbg=1',
    'frames.eggfarmDbg=1', '(0,window).eggfarmDbg=1', 'window . eggfarmDbg=1', 'globalThis.window.eggfarmDbg=1', 'var k="x";window[k]=1',
    'var h=typeof window<"u"?window:globalThis;h.eggfarmX=1', 'Function("return this")().eggfarmX=1', 'globalThis[`eggfarmX`]=1',
    'Object.assign(window,{eggfarmDbg:1})', 'Object.defineProperties(self,{eggfarmA:{value:1}})', 'self.foo=1'])
    expect(keys(s), s).not.toEqual([]);
  // allowed / not the global / accepted alias gap (non-eggfarm keys through an alias; runtime check-globals covers it)
  for (const s of ['globalThis.eggfarmExportTelemetry=f;window["eggfarmExportTelemetry"]=f', 'Object.assign(window,{eggfarmExportTelemetry})',
    'Object.assign(window,{eggfarmExportTelemetry:f})', 'function F(){var self=this;self.x=1}', 'window.a==1;w.x=1;o[k]=2', 'window.x===y',
    't=window;t.onclick=f;t[i]=1;t.innerHTML=s;t["a-b"]=1', 'var h=window;h.dbg=1'])
    expect(keys(s), s).toEqual([]);
  expect(constKey(`'eggfarm'+"Dbg"`)).toBe('eggfarmDbg'); expect(constKey('a+"b"')).toBeNull();
});
it('external-ref shapes', () => {
  for (const s of ['<img srcset="https://cdn.x/a.png 1x">', 'new WebSocket("ws://x")', 'x.open("GET","https://evil.x")', '<object data="https://x">',
    '<meta http-equiv="refresh" content="0;url=https://x">', '//# sourceMappingURL=a.js.map', 'fetch("https://"+h)', 'fetch(new URL("https://x"))',
    'i.src="https://evil.x/p.gif"', 'import x from "https://h/m.js"'])
    expect(findExternalRefs(s), s).not.toEqual([]);
  expect(findExternalRefs('<svg xmlns="http://www.w3.org/2000/svg"></svg><a href="./x"><img srcset="./a.png 2x">fetch("./d.json")')).toEqual([]);
});
it('script extraction fails closed on a stray </script>', () => {
  expect(extractScripts('<script>a</script><script type="module">b</script>')).toEqual(['a', 'b']);
  expect(() => extractScripts('<script>const s="</script>";</script>')).toThrow(/unbalanced/);
});
