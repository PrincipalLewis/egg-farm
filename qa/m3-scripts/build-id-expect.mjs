// M41-10 shared build-id expectation helper (Saves & Release QA). Node >=18, no deps.
// Expected id = <BUILD_PREFIX>+<sha7>, BUILD_PREFIX read from `git show <sha>:scripts/build-id.ts` AT THE SHA UNDER TEST.
// If the file or the exported constant is missing at that SHA: fallback regex ^(m3-rc1-pre|m4\.1)\+[0-9a-f]{7}.
// Hash part must equal the SHA's sha7 exactly; any suffix after the hash (+dirty, +unknown, +x) FAILS unless dirty='require'
// (only rc-pass.sh's deliberate dist-qa-m4 build, which must be exactly <id>+dirty, as before).
// CLI (exit 0 PASS / 1 FAIL / 2 usage or git error):
//   node build-id-expect.mjs prefix <repo> <sha>                    -> prints prefix or FALLBACK, plus source
//   node build-id-expect.mjs expect <repo> <sha>                    -> prints the human expectation (for logs)
//   node build-id-expect.mjs check  <repo> <sha> [--dirty=require] <id>...   (>=1 id; every id must pass)
//   node build-id-expect.mjs scan   <repo> <sha> [--dirty=require] <file>... (ids found in files; >=1; every id must pass)
//   node build-id-expect.mjs scan-re <repo> <sha>                   -> prints the scan regex source
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const FALLBACK_RE = /^(m3-rc1-pre|m4\.1)\+[0-9a-f]{7}/;
const FALLBACK_PREFIXES = ['m3-rc1-pre', 'm4.1'];
export const esc = t => t.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
// constant as written in scripts/build-id.ts: export const BUILD_PREFIX = 'm4.1';  (optional `: string`, any quote)
export const PREFIX_DECL_RE = /^\s*export\s+const\s+BUILD_PREFIX\s*(?::\s*string\s*)?=\s*(['"`])([^'"`\s]+)\1\s*;?/m;

export function parsePrefix(src) { const m = PREFIX_DECL_RE.exec(src ?? ''); return m ? m[2] : null; }

/** Resolve the expectation for <sha> in <repo>. `buildIdTs` (string|null) overrides git show, for unit cases. */
export function resolveExpect(repo, sha, { buildIdTs } = {}) {
  const git = (...a) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const full = git('rev-parse', '--verify', `${sha}^{commit}`);
  let src = buildIdTs, why = 'override';
  if (src === undefined) { try { src = git('show', `${full}:scripts/build-id.ts`); why = `scripts/build-id.ts@${full.slice(0, 7)}`; } catch { src = null; why = `scripts/build-id.ts missing @${full.slice(0, 7)}`; } }
  const prefix = src == null ? null : parsePrefix(src);
  const source = prefix ? `BUILD_PREFIX='${prefix}' from ${why}` : `FALLBACK ${FALLBACK_RE.source} (${src == null ? why : 'BUILD_PREFIX not found in ' + why})`;
  return { full, sha7: full.slice(0, 7), prefix, fallback: !prefix, source };
}

/** Regex source that finds candidate build ids of ANY release prefix (so a wrong prefix is seen and failed, not missed). */
export function scanSource(exp) {
  const alts = ['m\\d+-rc\\d[a-z0-9-]*', 'm\\d+(?:\\.\\d+)+', ...(exp?.prefix ? [esc(exp.prefix)] : [])];
  return `(?:${alts.join('|')})\\+[0-9a-z]+(?:\\+[0-9a-z]+)*`;
}
export const scanIds = (text, exp) => [...new Set((text ?? '').match(new RegExp(scanSource(exp), 'g')) ?? [])];

export function describe(exp, dirty = 'forbid') {
  const base = exp.prefix ? `${exp.prefix}+${exp.sha7}` : `(${FALLBACK_PREFIXES.join('|')})+${exp.sha7}`;
  return `${base}${dirty === 'require' ? '+dirty' : ''} [${exp.source}; ${dirty === 'require' ? '+dirty required' : 'no suffix allowed'}]`;
}

/** Check one id. dirty: 'forbid' (default; any suffix fails) | 'require' (exactly +dirty). */
export function checkBuildId(id, exp, { dirty = 'forbid' } = {}) {
  if (typeof id !== 'string' || !id) return { ok: false, id, reason: 'missing build id' };
  const i = id.indexOf('+'); if (i < 1) return { ok: false, id, reason: 'not <prefix>+<hash>' };
  const pre = id.slice(0, i), [hash, ...suffix] = id.slice(i + 1).split('+');
  if (exp.prefix) { if (pre !== exp.prefix) return { ok: false, id, reason: `prefix '${pre}' != BUILD_PREFIX '${exp.prefix}' at ${exp.sha7}` }; }
  else if (!FALLBACK_RE.test(id)) return { ok: false, id, reason: `fallback: does not match ${FALLBACK_RE.source}` };
  if (hash !== exp.sha7) return { ok: false, id, reason: `hash '${hash}' != sha under test ${exp.sha7}` };
  const sfx = suffix.join('+');
  if (dirty === 'require') { if (sfx !== 'dirty') return { ok: false, id, reason: `expected +dirty suffix, got '${sfx ? '+' + sfx : ''}'` }; }
  else if (suffix.length) return { ok: false, id, reason: `suffix '+${sfx}' present (dirty/unknown build not allowed)` };
  return { ok: true, id, reason: 'ok' };
}
/** Every id in `ids` must pass and there must be at least one. Nulls/empties count as missing surfaces -> fail. */
export function checkAll(ids, exp, opt) {
  const list = [...ids]; if (!list.length) return { ok: false, results: [], reason: 'no build id found' };
  const results = list.map(id => checkBuildId(id, exp, opt)); return { ok: results.every(r => r.ok), results, reason: results.filter(r => !r.ok).map(r => `${r.id}: ${r.reason}`).join('; ') || 'ok' };
}

/** For browser scripts: expectation from env. BUILD_SHA (default: HEAD of BUILD_REPO or cwd), BUILD_REPO (default cwd),
 *  BUILD_DIRTY=require for a deliberate +dirty build. Legacy EXPECT_BUILD, if set, must ALSO match exactly. */
export function expectFromEnv(env = process.env, cwd = process.cwd()) {
  const repo = env.BUILD_REPO || cwd;
  const sha = env.BUILD_SHA || execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const exp = resolveExpect(repo, sha); const dirty = env.BUILD_DIRTY === 'require' ? 'require' : 'forbid'; const exact = env.EXPECT_BUILD || null;
  const check = ids => { const r = checkAll(ids, exp, { dirty }); if (r.ok && exact && ids.some(x => x !== exact)) return { ok: false, results: r.results, reason: `legacy EXPECT_BUILD=${exact} != ${[...new Set(ids)].join(',')}` }; return r; };
  return { exp, dirty, exact, scan: scanSource(exp), label: describe(exp, dirty) + (exact ? ` +exact ${exact}` : ''), check };
}

/** page.evaluate(collectSurfaces, scanSrc): meta build-id, #app[data-build-id], telemetry session_start.build, plus a scan of
 *  outerHTML + body text + every localStorage value. Self-contained (serialised into the page). */
export function collectSurfaces(scanSrc) {
  const re = new RegExp(scanSrc, 'g'); const metas = [...document.querySelectorAll('meta[name="build-id"]')].map(m => m.content);
  const app = document.getElementById('app'); let telemetry = null;
  try { const t = JSON.parse(localStorage.getItem('eggfarm.telemetry') || 'null'); if (Array.isArray(t)) telemetry = [...new Set(t.filter(e => e && (e.type ?? e.name ?? e.event) === 'session_start').map(e => e.build ?? e.props?.build ?? e.data?.build ?? null))]; } catch {}
  const s = new Set(); const vals = []; try { for (let i = 0; i < localStorage.length; i++) vals.push(localStorage.getItem(localStorage.key(i))); } catch {}
  for (const t of [document.documentElement.outerHTML, document.body?.innerText, ...vals]) for (const m of (t || '').matchAll(re)) s.add(m[0]);
  return { meta: metas.length ? metas : null, dataBuildId: app?.dataset.buildId ?? null, telemetrySessionStart: telemetry, scanned: [...s] };
}
/** page.evaluate(collectBundleIds, scanSrc): all ids found in the page's <script src> bundles (dist builds). */
export async function collectBundleIds(scanSrc) {
  const re = new RegExp(scanSrc, 'g'); const s = new Set();
  for (const sc of document.querySelectorAll('script[src]')) { const t = await (await fetch(sc.src)).text(); for (const m of t.matchAll(re)) s.add(m[0]); }
  return [...s];
}
/** Flatten collectSurfaces output into the id list to check. A surface that is present-but-null counts as a failure. */
export function surfaceIds(r, { requireTelemetry = false } = {}) {
  const ids = [...(r.meta ?? [null]), r.dataBuildId, ...(r.scanned ?? [])];
  if (requireTelemetry || (r.telemetrySessionStart && r.telemetrySessionStart.length)) ids.push(...(r.telemetrySessionStart?.length ? r.telemetrySessionStart : [null]));
  return ids;
}

// ---------- CLI ----------
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [cmd, repo, sha, ...rest] = process.argv.slice(2);
  if (!cmd || !repo || !sha) { console.error('usage: build-id-expect.mjs prefix|expect|check|scan|scan-re <repo> <sha> [--dirty=require] [ids|files...]'); process.exit(2); }
  let exp; try { exp = resolveExpect(repo, sha); } catch (e) { console.error(`build-id-expect: cannot resolve ${sha} in ${repo}: ${String(e.message).split('\n')[0]}`); process.exit(2); }
  const dirty = rest.includes('--dirty=require') ? 'require' : 'forbid'; const args = rest.filter(a => !a.startsWith('--'));
  if (cmd === 'prefix') { console.log(exp.prefix ?? 'FALLBACK', '|', exp.source); process.exit(0); }
  if (cmd === 'expect') { console.log(describe(exp, dirty)); process.exit(0); }
  if (cmd === 'scan-re') { console.log(scanSource(exp)); process.exit(0); }
  let ids;
  if (cmd === 'check') ids = args;
  else if (cmd === 'scan') { ids = []; for (const f of args) { let t; try { t = readFileSync(f, 'utf8'); } catch { console.log(`MISSING ${f}`); ids.push(null); continue; } const found = scanIds(t, exp); console.log(`${f}: ${JSON.stringify(found)}`); ids.push(...(found.length ? found : [null])); } }
  else { console.error(`unknown command ${cmd}`); process.exit(2); }
  const r = checkAll(ids, exp, { dirty });
  console.log(`${r.ok ? 'PASS' : 'FAIL'} build-id ${JSON.stringify([...new Set(ids)])} want ${describe(exp, dirty)}${r.ok ? '' : ' :: ' + r.reason}`);
  process.exit(r.ok ? 0 : 1);
}
