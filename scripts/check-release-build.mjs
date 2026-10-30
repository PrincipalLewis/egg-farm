// Release gate. Usage: node scripts/check-release-build.mjs <dist-dir | single-file-release.html> [--build-id <id>]
// - build id must not carry "+dirty" (built from uncommitted changes) or "+unknown". Run after `vite build` / build:html.
// - single-file .html: the one embedded build id must equal --build-id / EXPECT_BUILD_ID, else <BUILD_PREFIX>+<HEAD short>.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'; import { execSync } from 'node:child_process';
import { ALLOWED_GLOBALS, findGlobalWrites, findExternalRefs, findBuildIds, extractScripts, findUnresolvedRefs, findBuildIdMarkup } from './release-scan.mjs';
const fail = msg => { console.error(`check-release-build: ${msg}`); process.exit(1); };
const args = process.argv.slice(2); let expectId = process.env.EXPECT_BUILD_ID; const rest = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--build-id') { const v = args[++i]; if (!v || v.startsWith('--')) fail('--build-id needs a value (--build-id <id> or --build-id=<id>)'); expectId = v; }
  else if (a.startsWith('--build-id=')) { expectId = a.slice(11); if (!expectId) fail('--build-id= needs a value'); }
  else if (a.startsWith('--')) fail(`unknown option ${a}`);
  else rest.push(a);
}
if (rest.length > 1) fail(`expected one path, got ${rest.length}: ${rest.join(' ')} (scan one build per run)`);
const target = rest[0] || 'dist';
if (!existsSync(target)) fail(`${target} does not exist`);
const single = statSync(target).isFile();
const dir = target;
if (!single && !existsSync(`${dir}/index.html`)) fail(`${dir}/index.html missing - not a release build dir`);
const html = readFileSync(single ? target : `${dir}/index.html`, 'utf8');
const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const all = single ? [] : walk(dir);
const files = single ? [] : readdirSync(`${dir}/assets`);
// single file: JS = inline <script> bodies (inlined CSS may legitimately name classes like perf-ov); fails closed on ambiguous markup.
const js = single ? (() => { try { return extractScripts(html).join('\n'); } catch (e) { fail(e.message); } })() : files.filter(f => f.endsWith('.js')).map(f => readFileSync(`${dir}/assets/${f}`, 'utf8')).join('\n');
const css = single ? '' : all.filter(f => f.endsWith('.css')).map(f => readFileSync(f, 'utf8')).join('\n');
const maps = all.filter(f => f.endsWith('.map'));
if (single) console.log(`check-release-build: single-file ${target} (${html.length} bytes)`);
const head = process.env.HEAD_COMMIT ?? (() => { try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return ''; } })();
const ids = findBuildIds(js);
if (!ids.length) fail('no build id found in bundle');
const unknown = ids.filter(i => i.includes('+unknown')); if (unknown.length) fail(`build id ${unknown.join(', ')} - built outside git, no commit hash`);
const dirty = ids.filter(i => i.includes('+dirty'));
if (dirty.length) { console.error(`check-release-build: build id ${dirty.join(', ')} - commit or stash your changes before a release build (git status --porcelain must be empty)`); process.exit(1); }
console.log(`check-release-build: ${ids.join(', ')} ok`);
// M41-10: the build id carries the release name. Every embedded id (and --build-id) must use the one release-prefix constant
// BUILD_PREFIX in scripts/build-id.ts; the m3-rc0 tag build is the only legacy exception (its own HEAD check is below).
const prefix = /BUILD_PREFIX\s*=\s*'([^']+)'/.exec(readFileSync(new URL('./build-id.ts', import.meta.url), 'utf8'))?.[1];
if (!prefix) fail('cannot read BUILD_PREFIX from scripts/build-id.ts');
const pre = id => id.slice(0, id.indexOf('+'));
const offPrefix = ids.filter(i => pre(i) !== prefix && !i.startsWith('m3-rc0+'));
if (offPrefix.length) fail(`build id ${offPrefix.join(', ')} does not carry the release prefix ${prefix} (scripts/build-id.ts BUILD_PREFIX)`);
if (expectId && pre(expectId) !== prefix) fail(`--build-id ${expectId} does not carry the release prefix ${prefix} (scripts/build-id.ts BUILD_PREFIX)`);
console.log(`check-release-build: release prefix ${prefix} ok`);
if (single || expectId) {
  if (ids.length !== 1) fail(`expected exactly one build id, found ${ids.join(', ')}`);
  if (expectId) { if (ids[0] !== expectId) fail(`build id ${ids[0]} != expected ${expectId}`); }
  else {
    const m = /^(.*)\+([0-9a-f]{7,40})$/.exec(ids[0]);
    if (!m || m[1] !== prefix || !head || !head.startsWith(m[2])) fail(`build id ${ids[0]} does not match ${prefix}+${head.slice(0, 7) || 'unknown HEAD'} (pass --build-id to check another commit)`);
  }
  console.log(`check-release-build: build id ${ids[0]} matches ${expectId ? 'expected' : 'HEAD'} ok`);
}
// F-META: single file carries exactly one <meta name="build-id"> and one data-build-id, both = the script id (and --build-id).
if (single) {
  const { metas, attrs, appAttrs } = findBuildIdMarkup(html);
  if (metas.length !== 1) fail(`expected exactly one <meta name="build-id">, found ${metas.length}`);
  if (attrs.length !== 1) fail(`expected exactly one data-build-id attribute, found ${attrs.length}`);
  if (appAttrs.length !== 1) fail('data-build-id must be on the #app element (id="app"), not another element');
  if (metas[0] !== ids[0]) fail(`<meta name="build-id"> content "${metas[0]}" != script build id ${ids[0]}`);
  if (attrs[0] !== ids[0]) fail(`data-build-id "${attrs[0]}" != script build id ${ids[0]}`);
  console.log(`check-release-build: build-id meta + data-build-id = ${ids[0]} ok`);
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
const hooks = [/\.eggfarm\s*=/.test(js) ? 'window.eggfarm' : '', 'eggfarmOnb', 'eggfarmQaRecovery', 'qaPicker', 'eggfarmPerf', 'perf-ov', 'dbgInfo', 'get("debug")', 'get("perf")', 'get("ios")'].filter(h => h && (h === 'window.eggfarm' || js.includes(h)));
if (chunks.length || hooks.length) { console.error(`check-release-build: debug/QA code in release bundle: ${[...chunks, ...hooks].join(', ')}`); process.exit(1); }
console.log('check-release-build: no ?debug/?perf/?ios/QA hooks ok');
// Window globals allowlist: the release may assign exactly these own properties on window, incl. computed keys
// (h['eggfarm'+'Dbg'], window[`eggfarm${x}`]) and aliases. Static heuristic; the runtime gate is npm run check-globals <engine>.
const extra = findGlobalWrites(js);
if (extra.length) fail(`window globals not on the allowlist: ${[...new Set(extra.map(e => `${e.key} (${e.src})`))].join(', ')} (allowed: ${ALLOWED_GLOBALS.join(', ')})`);
console.log('check-release-build: window global writes only ' + ALLOWED_GLOBALS.join(', ') + ' ok');
// No external references: the release (esp. the offline single file) loads nothing from other hosts.
if (single) { const un = findUnresolvedRefs(html, js.split('\n')); if (un.length) fail(`unresolved (not inlined) asset/font URLs in single file: ${[...new Set(un.map(u => `${u.kind} ${u.url}`))].slice(0, 20).join(', ')}`);
  console.log('check-release-build: every asset/font URL inlined (data:) ok'); }
if (maps.length) fail(`source maps in release: ${maps.join(', ')}`);
const ext = findExternalRefs(single ? html : [js, css, html].join('\n'));
if (ext.length) fail(`external references: ${[...new Set(ext.map(e => `${e.kind} ${e.url}`))].join(', ')}`);
console.log('check-release-build: no external src/href/srcset/url()/@import/import/fetch/XHR/ws/sourcemap ok');
// QA B-4: aliased writes (const w = window; w.eggfarmPerf = ...) slip past the assignment regex above. Any eggfarm*
// identifier in the release bundle must be on this list. eggfarmRecovery/eggfarmTabGuard are history.state keys only.
const ALLOWED_IDENTS = [...ALLOWED_GLOBALS, 'eggfarmRecovery', 'eggfarmTabGuard'];
const idents = [...new Set(js.match(/\beggfarm[A-Za-z_$][\w$]*/g) ?? [])];
const badIdents = idents.filter(k => !ALLOWED_IDENTS.includes(k));
if (badIdents.length) { console.error(`check-release-build: non-allowlisted eggfarm* identifiers in release bundle: ${badIdents.join(', ')} (allowed: ${ALLOWED_IDENTS.join(', ')})`); process.exit(1); }
console.log(`check-release-build: eggfarm* identifiers ${idents.join(', ') || '(none)'} ok`);
