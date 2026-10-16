// Release gate: the shipped build id must not carry "+dirty" (built from uncommitted changes). Run after `vite build`.
import { readdirSync, readFileSync } from 'node:fs'; import { execSync } from 'node:child_process';
const dir = process.argv[2] || 'dist';
const js = readdirSync(`${dir}/assets`).filter(f => f.endsWith('.js')).map(f => readFileSync(`${dir}/assets/${f}`, 'utf8')).join('\n');
const ids = [...new Set(js.match(/m\d+-rc\d[a-z0-9-]*\+[0-9a-f]{7,40}(?:\+dirty)?/g) ?? [])];
if (!ids.length) { console.error('check-release-build: no build id found in bundle'); process.exit(1); }
const dirty = ids.filter(i => i.includes('+dirty'));
if (dirty.length) { console.error(`check-release-build: build id ${dirty.join(', ')} - commit or stash your changes before a release build (git status --porcelain must be empty)`); process.exit(1); }
console.log(`check-release-build: ${ids.join(', ')} ok`);
// The m3-rc0 name belongs to the m3-rc0 tag only (16176a3): any other HEAD must not ship as m3-rc0.
const RC0_TAG_COMMIT = process.env.RC0_TAG_COMMIT ?? '16176a3';
const head = process.env.HEAD_COMMIT ?? (() => { try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return ''; } })();
const rc0 = ids.filter(i => i.startsWith('m3-rc0+'));
if (rc0.length && !(head && (head.startsWith(RC0_TAG_COMMIT) || RC0_TAG_COMMIT.startsWith(head)))) { console.error(`check-release-build: release name m3-rc0 but HEAD is ${head.slice(0, 7) || 'unknown'}, not the m3-rc0 tag commit ${RC0_TAG_COMMIT}`); process.exit(1); }
// CEO ruling (Oct 16): debug globals stay out of release. eggfarmUi is dev/QA-only (behind __IOS_FLAG__).
for (const g of ['eggfarmUi']) if (js.includes(g)) { console.error(`check-release-build: debug global "${g}" found in the release bundle`); process.exit(1); }
console.log('check-release-build: no eggfarmUi in release ok');
// D3/D4 + AC14g: QA/debug hooks are compiled out of release (same __IOS_FLAG__ flag): no sampler/panel chunk, no hook names.
const files = readdirSync(`${dir}/assets`);
const chunks = files.filter(f => /^(frame-sampler|panel)-.*\.js$/.test(f));
const hooks = [/\.eggfarm\s*=/.test(js) ? 'window.eggfarm' : '', 'eggfarmOnb', 'eggfarmQaRecovery', 'eggfarmPerf', 'perf-ov', 'dbgInfo', 'get("debug")', 'get("perf")', 'get("ios")'].filter(h => h && (h === 'window.eggfarm' || js.includes(h)));
if (chunks.length || hooks.length) { console.error(`check-release-build: debug/QA code in release bundle: ${[...chunks, ...hooks].join(', ')}`); process.exit(1); }
console.log('check-release-build: no ?debug/?perf/?ios/QA hooks ok');
