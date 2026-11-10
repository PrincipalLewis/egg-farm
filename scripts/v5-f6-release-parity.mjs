// F6 flag-0 release parity: #app DOM of two built single-file release htmls must be byte-identical (build-id normalised).
// AUTHOR EVIDENCE ONLY. Usage (always under the shared lock):
//   flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node scripts/v5-f6-release-parity.mjs <base.html> <head.html> [outDir]
// Exit 0 = identical, 1 = differ (first differing line printed), 2 = harness error (boot never completed).
//
// Determinism (step-9 flake fix, 2026-11-10): the old dump (scripts/breeds-ui-prB-release-browser.mjs) did `click; runFor(2500)`
// in ONE fake-clock call. Boot after "Tap to start" awaits REAL IndexedDB / storage-lease work, so the Game was constructed at
// whatever fake instant the clock had reached when that real I/O resolved, anywhere in [~310, 2500] ms. The first egg lands ~700 ms
// of sim after construction, so under CPU load (slower runFor, earlier construction) the dump caught "1 / 50" and the hash differed.
// Now: the clock stays paused while we tap, then advances in BOOT_STEP_MS slices until the HUD exists (#meterText), and the dump is
// taken exactly SETTLE_MS fake ms after boot is observed. Sim progress at capture is therefore SETTLE_MS..SETTLE_MS+BOOT_STEP_MS,
// far below the first lay (~700 ms), on every run and every load. Same idea as zg-flagoff-dom / #111: capture at a fixed sim point,
// compare the full markup. Nothing is masked except the build id, so any real DOM difference still fails.
import pw from 'playwright-core'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const [baseFile, headFile, outDir] = process.argv.slice(2);
if (!baseFile || !headFile) { console.error('usage: v5-f6-release-parity.mjs <base.html> <head.html> [outDir]'); process.exit(2); }
const T0 = '2026-11-10T00:00:00Z', BOOT_STEP_MS = 10, BOOT_MAX_MS = 15000, SETTLE_MS = 100;
const BUILD_ID = /m4\.1\+[0-9a-f]+(\+dirty)?/g;
const br = await pw.chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
async function dump(file, label) {
  const page = await br.newPage({ viewport: { width: 360, height: 640 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.clock.install({ time: new Date(T0) }); await page.clock.pauseAt(new Date(T0));
  await page.goto('file://' + path.resolve(file));
  await page.getByText('Tap to start').click({ timeout: 15000 });          // clock paused: no sim time passes while we wait
  let booted = 0; while (!(await page.$('#meterText'))) { if (booted >= BOOT_MAX_MS) break; await page.clock.runFor(BOOT_STEP_MS); booted += BOOT_STEP_MS; }
  if (!(await page.$('#meterText'))) { await page.close(); return { label, error: `no HUD after ${booted} fake ms`, errs }; }
  await page.clock.runFor(SETTLE_MS);
  const html = (await page.evaluate(() => document.getElementById('app')?.outerHTML ?? '')).replace(/ style="[^"]*"/g, '').replace(BUILD_ID, 'BUILDID');
  await page.close();
  return { label, bootFakeMs: booted, html, sha: crypto.createHash('sha256').update(html).digest('hex'), errs };
}
const a = await dump(baseFile, 'base'), b = await dump(headFile, 'head'); await br.close();
for (const r of [a, b]) console.log(`${r.label}: ${r.error ?? r.sha} bootFakeMs=${r.bootFakeMs ?? '-'} errors=${JSON.stringify(r.errs)}`);
if (a.error || b.error) process.exit(2);
if (outDir) { fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(path.join(outDir, 'app-base.html'), a.html); fs.writeFileSync(path.join(outDir, 'app-head.html'), b.html); }
if (a.sha === b.sha && !a.errs.length && !b.errs.length) { console.log(`PARITY OK ${a.sha}`); process.exit(0); }
const la = a.html.split('><'), lb = b.html.split('><'); const i = la.findIndex((x, k) => x !== lb[k]);
console.log(`PARITY FAIL at node ${i}:\n  base: <${(la[i] ?? '').slice(0, 300)}>\n  head: <${(lb[i] ?? '').slice(0, 300)}>`); process.exit(1);
