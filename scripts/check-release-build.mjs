// Release gate. Usage: node scripts/check-release-build.mjs <dist-dir | single-file-release.html> [--build-id <id>]
// - build id must not carry "+dirty" (built from uncommitted changes) or "+unknown". Run after `vite build` / build:html.
// - single-file .html: the one embedded build id must equal --build-id / EXPECT_BUILD_ID, else <BUILD_PREFIX>+<HEAD short>.
import { readdirSync, readFileSync, statSync } from 'node:fs'; import { execSync } from 'node:child_process';
import { ALLOWED_GLOBALS, findGlobalWrites, findExternalRefs, findBuildIds } from './release-scan.mjs';
const args = process.argv.slice(2); const bi = args.indexOf('--build-id');
const expectId = bi >= 0 ? args.splice(bi, 2)[1] : process.env.EXPECT_BUILD_ID;
const target = args[0] || 'dist';
const single = statSync(target).isFile();
const dir = target;
const fail = msg => { console.error(`check-release-build: ${msg}`); process.exit(1); };
const html = single ? readFileSync(target, 'utf8') : (() => { try { return readFileSync(`${dir}/index.html`, 'utf8'); } catch { return ''; } })();
const files = single ? [] : readdirSync(`${dir}/assets`);
// single file: JS = inline <script> bodies (inlined CSS may legitimately name classes like perf-ov)
const js = single ? [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).join('\n') : files.filter(f => f.endsWith('.js')).map(f => readFileSync(`${dir}/assets/${f}`, 'utf8')).join('\n');
if (single) console.log(`check-release-build: single-file ${target} (${html.length} bytes)`);
const head = process.env.HEAD_COMMIT ?? (() => { try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return ''; } })();
const ids = findBuildIds(js);
if (!ids.length) fail('no build id found in bundle');
const unknown = ids.filter(i => i.includes('+unknown')); if (unknown.length) fail(`build id ${unknown.join(', ')} - built outside git, no commit hash`);
const dirty = ids.filter(i => i.includes('+dirty'));
if (dirty.length) { console.error(`check-release-build: build id ${dirty.join(', ')} - commit or stash your changes before a release build (git status --porcelain must be empty)`); process.exit(1); }
console.log(`check-release-build: ${ids.join(', ')} ok`);
if (single || expectId) {
  if (ids.length !== 1) fail(`expected exactly one build id, found ${ids.join(', ')}`);
  if (expectId) { if (ids[0] !== expectId) fail(`build id ${ids[0]} != expected ${expectId}`); }
  else {
    const prefix = /BUILD_PREFIX\s*=\s*'([^']+)'/.exec(readFileSync(new URL('./build-id.ts', import.meta.url), 'utf8'))?.[1];
    const m = /^(.*)\+([0-9a-f]{7,40})$/.exec(ids[0]);
    if (!m || m[1] !== prefix || !head || !head.startsWith(m[2])) fail(`build id ${ids[0]} does not match ${prefix}+${head.slice(0, 7) || 'unknown HEAD'} (pass --build-id to check another commit)`);
  }
  console.log(`check-release-build: build id ${ids[0]} matches ${expectId ? 'expected' : 'HEAD'} ok`);
}
// The m3-rc0 name belongs to the m3-rc0 tag only (16176a3): any other HEAD must not ship as m3-rc0.
const RC0_TAG_COMMIT = process.env.RC0_TAG_COMMIT ?? '16176a3';
const rc0 = ids.filter(i => i.startsWith('m3-rc0+'));
if (rc0.length && !(head && (head.startsWith(RC0_TAG_COMMIT) || RC0_TAG_COMMIT.startsWith(head)))) { console.error(`check-release-build: release name m3-rc0 but HEAD is ${head.slice(0, 7) || 'unknown'}, not the m3-rc0 tag commit ${RC0_TAG_COMMIT}`); process.exit(1); }
// CEO ruling (Oct 16): debug globals stay out of release. eggfarmUi is dev/QA-only (behind __IOS_FLAG__).
for (const g of ['eggfarmUi']) if (js.includes(g)) { console.error(`check-release-build: debug global "${g}" found in the release bundle`); process.exit(1); }
console.log('check-release-build: no eggfarmUi in release ok');
// D3/D4 + AC14g: QA/debug hooks are compiled out of release (same __IOS_FLAG__ flag): no sampler/panel chunk, no hook names.
const chunks = files.filter(f => /^(frame-sampler|panel)-.*\.js$/.test(f));
const hooks = [/\.eggfarm\s*=/.test(js) ? 'window.eggfarm' : '', 'eggfarmOnb', 'eggfarmQaRecovery', 'eggfarmPerf', 'perf-ov', 'dbgInfo', 'get("debug")', 'get("perf")', 'get("ios")'].filter(h => h && (h === 'window.eggfarm' || js.includes(h)));
if (chunks.length || hooks.length) { console.error(`check-release-build: debug/QA code in release bundle: ${[...chunks, ...hooks].join(', ')}`); process.exit(1); }
console.log('check-release-build: no ?debug/?perf/?ios/QA hooks ok');
// Window globals allowlist: the release may assign exactly these own properties on window, incl. computed keys
// (h['eggfarm'+'Dbg'], window[`eggfarm${x}`]) and aliases. Static heuristic; the runtime gate is npm run check-globals <engine>.
const extra = findGlobalWrites(js);
if (extra.length) fail(`window globals not on the allowlist: ${[...new Set(extra.map(e => `${e.key} (${e.src})`))].join(', ')} (allowed: ${ALLOWED_GLOBALS.join(', ')})`);
console.log('check-release-build: window global writes only ' + ALLOWED_GLOBALS.join(', ') + ' ok');
// No external references: the release (esp. the offline single file) loads nothing from other hosts.
const ext = findExternalRefs(single ? html : js + '\n' + html);
if (ext.length) fail(`external references: ${[...new Set(ext.map(e => `${e.kind} ${e.url}`))].join(', ')}`);
console.log('check-release-build: no external src/href/import/fetch ok');
