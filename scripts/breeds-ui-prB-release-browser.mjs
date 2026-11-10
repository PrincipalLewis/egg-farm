// Breeds UI PR-B — author check of a built single-file release html (AUTHOR EVIDENCE ONLY, not QA evidence).
// Usage (always under the shared lock): flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 \
//   node scripts/breeds-ui-prB-release-browser.mjs <egg-farm.html> <label> [expectChip=0|1]
// Opens the file at 360×640, taps "Tap to start", lets the game render, and reports page errors, the HUD, the Flock entry and
// the PR-B chip/row (present only with the flag on and a settled Present breed; this check only asserts no load-time error and
// whether PR-B's extender is registered + mounted).
import pw from 'playwright-core';
const [file, label = 'build', expect = ''] = process.argv.slice(2);
const br = await pw.chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await br.newPage({ viewport: { width: 360, height: 640 } });
const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
// Paused fixed clock (same instant every run) so the rendered #app DOM is comparable across builds (flag-off byte identity).
await page.clock.install({ time: new Date('2026-11-10T00:00:00Z') }); await page.clock.pauseAt(new Date('2026-11-10T00:00:00Z'));
await page.goto('file://' + file); await page.clock.runFor(1000);
await page.getByText('Tap to start').click({ timeout: 15000 }).catch(e => errs.push('start: ' + e.message));
await page.clock.runFor(2500);
const r = await page.evaluate(() => ({ hud: !!document.querySelector('.hud'), rate: !!document.getElementById('rate'),
  entry: !!document.querySelector('[data-testid="breeds-entry"], #breeds-entry'), prbRow: !!document.querySelector('.breeds-hud-row'),
  chip: !!document.querySelector('[data-testid="breeds-hud-chip"]'), start: !!document.getElementById('start'),
  html: (document.getElementById('app')?.outerHTML ?? '').replace(/ style="[^"]*"/g, '') }));
const appHash = (await import('node:crypto')).createHash('sha256').update(r.html).digest('hex'); if (process.env.DUMP) (await import('node:fs')).writeFileSync(process.env.DUMP, r.html); delete r.html; r.appHash = appHash;
const pass = errs.length === 0 && r.hud && r.rate && !r.start && (expect === '' || String(+r.chip) === expect);
console.log(`${pass ? 'PASS' : 'FAIL'} [chromium] release-load ${label} — ${JSON.stringify({ ...r, errors: errs })}`);
await br.close(); process.exit(pass ? 0 : 1);
