// M41-10 unit-style cases for build-id-expect.mjs. node build-id-expect.cases.mjs  (exit 0 iff every case behaves as expected)
import { resolveExpect, checkBuildId, checkAll, scanIds, describe } from '/workspace/egg-farm-studio/qa/m3-scripts/build-id-expect.mjs';
import { execFileSync } from 'node:child_process';
const G = '/workspace/egg-farm-studio/game', H = '/workspace/egg-farm-studio/qa/m3-scripts/build-id-expect.mjs'; let bad = 0, n = 0;
const E = { old: resolveExpect(G, '246de09'), oldNone: resolveExpect(G, '246de09', { buildIdTs: null }), pr53: resolveExpect(G, '4e1252d'),
  fbMissing: resolveExpect(G, 'd72008a'), fbNoConst: resolveExpect(G, '4e1252d', { buildIdTs: "export const OTHER = 'x';" }) };
console.log('expectations:'); for (const [k, v] of Object.entries(E)) console.log(`  ${k}: ${describe(v)}`);
const C = (id, name, ids, exp, want, opt) => { n++; const r = Array.isArray(ids) ? checkAll(ids, exp, opt) : checkBuildId(ids, exp, opt); const ok = r.ok === (want === 'PASS');
  if (!ok) bad++; console.log(`${ok ? 'OK ' : 'BAD'} ${id} ${name}: got ${r.ok ? 'PASS' : 'FAIL'} (expected ${want}) :: ${r.reason}`); };
C('U1a', "m3-rc1-pre+246de09 @246de09, old build-id.ts (BUILD_PREFIX='m3-rc1-pre')", 'm3-rc1-pre+246de09', E.old, 'PASS');
C('U1b', 'm3-rc1-pre+246de09 @246de09, build-id.ts treated as absent (fallback)', 'm3-rc1-pre+246de09', E.oldNone, 'PASS');
C('U2', "m4.1+4e1252d @4e1252d (BUILD_PREFIX='m4.1')", 'm4.1+4e1252d', E.pr53, 'PASS');
C('U3', 'm4.1+1234567 @4e1252d hash mismatch', 'm4.1+1234567', E.pr53, 'FAIL');
C('U4a', 'm4.1+4e1252d+dirty @4e1252d', 'm4.1+4e1252d+dirty', E.pr53, 'FAIL');
C('U4b', 'm4.1+4e1252d+unknownsuffix @4e1252d', 'm4.1+4e1252d+rc', E.pr53, 'FAIL');
C('U4c', 'm4.1+unknown @4e1252d', 'm4.1+unknown', E.pr53, 'FAIL');
C('U4d', "m4.1+4e1252d+dirty with dirty='require' (rc-pass dist-qa-m4 only)", 'm4.1+4e1252d+dirty', E.pr53, 'PASS', { dirty: 'require' });
C('U4e', "clean m4.1+4e1252d with dirty='require' must FAIL", 'm4.1+4e1252d', E.pr53, 'FAIL', { dirty: 'require' });
C('U5', "wrong prefix m3-rc1-pre+4e1252d @4e1252d (BUILD_PREFIX m4.1)", 'm3-rc1-pre+4e1252d', E.pr53, 'FAIL');
C('U5b', "wrong prefix m4.1+246de09 @246de09 (BUILD_PREFIX m3-rc1-pre)", 'm4.1+246de09', E.old, 'FAIL');
C('U6a', 'fallback (build-id.ts missing @d72008a): m3-rc1-pre+d72008a', 'm3-rc1-pre+d72008a', E.fbMissing, 'PASS');
C('U6b', 'fallback (missing): m4.1+d72008a', 'm4.1+d72008a', E.fbMissing, 'PASS');
C('U6c', 'fallback (missing): m5+d72008a wrong prefix', 'm5+d72008a', E.fbMissing, 'FAIL');
C('U6d', 'fallback (missing): m4.1+1234567 hash mismatch', 'm4.1+1234567', E.fbMissing, 'FAIL');
C('U6e', 'fallback (missing): m3-rc1-pre+d72008a+dirty', 'm3-rc1-pre+d72008a+dirty', E.fbMissing, 'FAIL');
C('U6f', 'fallback (file present, constant absent) @4e1252d: m4.1+4e1252d', 'm4.1+4e1252d', E.fbNoConst, 'PASS');
C('U6g', 'fallback (file present, constant absent) @4e1252d: m3-rc0+4e1252d', 'm3-rc0+4e1252d', E.fbNoConst, 'FAIL');
C('U7a', 'surfaces all agree', ['m4.1+4e1252d', 'm4.1+4e1252d', 'm4.1+4e1252d'], E.pr53, 'PASS');
C('U7b', 'one surface (telemetry) disagrees', ['m4.1+4e1252d', 'm4.1+4e1252d', 'm4.1+1234567'], E.pr53, 'FAIL');
C('U7c', 'a surface missing (null)', ['m4.1+4e1252d', null], E.pr53, 'FAIL');
C('U7d', 'no surface at all', [], E.pr53, 'FAIL');
C('U7e', 'hash longer than sha7 (strict, as before)', 'm4.1+4e1252d6', E.pr53, 'FAIL');
{ n++; const f = scanIds('<meta name="build-id" content="m3-rc1-pre+4e1252d"> x="m4.1+4e1252d+dirty"', E.pr53); const ok = f.length === 2 && f.includes('m3-rc1-pre+4e1252d') && f.includes('m4.1+4e1252d+dirty');
  if (!ok) bad++; console.log(`${ok ? 'OK ' : 'BAD'} U8 scan finds wrong-prefix and suffixed ids (so they fail, not vanish): ${JSON.stringify(f)}`); }
for (const [id, args, wantExit] of [['CLI1', ['check', G, '246de09', 'm3-rc1-pre+246de09'], 0], ['CLI2', ['check', G, '4e1252d', 'm4.1+4e1252d'], 0], ['CLI3', ['check', G, '4e1252d', 'm4.1+4e1252d+dirty'], 1],
  ['CLI4', ['check', G, '4e1252d', 'm3-rc1-pre+4e1252d'], 1], ['CLI5', ['check', G, '4e1252d', 'm4.1+1234567'], 1], ['CLI6', ['check', G, 'd72008a', 'm4.1+d72008a'], 0], ['CLI7', ['check', G, 'nosuchsha0', 'm4.1+x'], 2]]) {
  n++; let code = 0, out = ''; try { out = execFileSync('node', [H, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { code = e.status; out = (e.stdout || '') + (e.stderr || ''); }
  const ok = code === wantExit; if (!ok) bad++; console.log(`${ok ? 'OK ' : 'BAD'} ${id} exit ${code} (want ${wantExit}) :: ${out.trim().split('\n').pop()}`); }
console.log(`${bad ? 'FAIL' : 'PASS'} ${n - bad}/${n} cases behaved as expected`); process.exit(bad ? 1 : 0);
