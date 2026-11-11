// RC release-artifact open check: node rc-html-open.mjs <worktree> <engine> <shotsdir> <sha-under-test | legacy exact build id>
// M41-10: expectation via build-id-expect.mjs (BUILD_PREFIX at that SHA, fallback regex; hash==sha7; no suffix). A legacy exact id
// (contains '+') is still honoured as an extra exact match, with the SHA = <worktree> HEAD.
// Opens dist-html/egg-farm.html via file:// (no server, no port). Checks: runtime build-id == expect (DOM dataset/meta), 0 page/console errors,
// game renders (text > 50), no eggfarmPerf/debug globals. Exit 0 PASS / 1 FAIL.
import { mkdirSync } from 'node:fs'; import { expectFromEnv, collectSurfaces, surfaceIds } from '/workspace/egg-farm-studio/qa/m3-scripts/build-id-expect.mjs';
const [w, engine, shots, arg4] = process.argv.slice(2); mkdirSync(shots, { recursive: true });
const BX = expectFromEnv({ ...process.env, ...(arg4?.includes('+') ? { EXPECT_BUILD: arg4 } : arg4 ? { BUILD_SHA: arg4 } : {}) }, w), expect = BX.label;
const pw = await import(w + '/node_modules/playwright-core/index.mjs');
const b = await (engine === 'chromium' ? pw.chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : pw[engine].launch());
const p = await (await b.newContext()).newPage(); const errs = [];
p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto('file://' + w + '/dist-html/egg-farm.html'); await p.waitForTimeout(2500);
try { await p.getByText('Tap to start').click({ timeout: 4000 }); } catch {}
await p.waitForTimeout(2000);
const r = await p.evaluate(() => ({ ds: document.getElementById("app")?.dataset.buildId ?? null, meta: document.head.querySelector('meta[name="build-id"]')?.content ?? null,
  txt: document.body.innerText.length, perf: 'eggfarmPerf' in window, eggfarm: 'eggfarm' in window }));
const sf = await p.evaluate(collectSurfaces, BX.scan); // M41-10: + telemetry session_start.build when present
const bidIds = [r.ds, ...(r.meta === null ? [] : [r.meta]), ...(sf.telemetrySessionStart ?? [])], bc = BX.check(bidIds); r.telemetry = sf.telemetrySessionStart; r.bidCheck = bc.reason;
await p.screenshot({ path: `${shots}/html-open-${engine}.png` }); await b.close();
const ok = r.txt > 50 && errs.length === 0 && r.ds !== null && bc.ok && !r.perf && !r.eggfarm; // meta may be absent (as before); if present it must pass
console.log(`${ok ? 'PASS' : 'FAIL'} html-open ${engine} ${JSON.stringify({ ...r, expect, errors: errs.slice(0, 3) })}`);
process.exit(ok ? 0 : 1);
