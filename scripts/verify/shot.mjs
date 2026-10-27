// VER-1 step 4: load the built single-file html (dist-html/egg-farm.html) with the run's end state in headless Chromium,
// read the build label and save one 390x844 verify.png. The page clock is frozen at the save's savedAt, so there is no
// offline gap and no wall clock in the picture. Prints one JSON line on stdout; exit 0 even on a missing label (verify.ts decides).
// Usage: node scripts/verify/shot.mjs <egg-farm.html> <save.json> <out.png>    CHROME=/path/to/chrome overrides /usr/bin/google-chrome
import pw from 'playwright-core';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [html, savePath, png] = process.argv.slice(2);
if (!html || !savePath || !png) { console.error('usage: node scripts/verify/shot.mjs <egg-farm.html> <save.json> <out.png>'); process.exit(2); }
const raw = readFileSync(savePath, 'utf8'), savedAt = JSON.parse(raw).savedAt;
const ui = JSON.stringify({ sfx: false, reducedMotion: true, seenSlots: 99, onboardingDone: true, workersIntroA: true, workersIntroB: true, sessions: 2, iosHomeShown: true });
const br = await pw.chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const out = { ok: false, label: null, dataBuildId: null, metaBuildId: null, pageErrors: [] };
try {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce', locale: 'en-US', timezoneId: 'UTC' });
  const p = await ctx.newPage();
  p.on('pageerror', e => out.pageErrors.push(String(e.message).slice(0, 200)));
  await p.clock.install({ time: savedAt }); await p.clock.pauseAt(savedAt);
  await p.addInitScript(([k, v, u]) => { if (!sessionStorage.getItem('verify-seeded')) { localStorage.setItem(k, v); localStorage.setItem('eggfarm.ui', u); sessionStorage.setItem('verify-seeded', '1'); } }, ['eggfarm.save', raw, ui]);
  await p.goto(pathToFileURL(html).href);
  await p.getByText('Tap to start').click({ timeout: 15000 });
  await p.clock.runFor(1500);
  out.dataBuildId = await p.locator('#app').getAttribute('data-build-id');
  out.metaBuildId = await p.locator('meta[name="build-id"]').getAttribute('content');
  // The game's visible build label is the "Egg Farm <build id>" line in Settings (src/ui/app.ts); open Settings and show it.
  await p.locator('#settings').click({ force: true, timeout: 10000 });
  await p.clock.runFor(800);
  const v = p.locator('.version', { hasText: /^Egg Farm / }).first();
  await v.scrollIntoViewIfNeeded({ timeout: 5000 });
  out.label = ((await v.textContent()) ?? '').trim();
  await p.screenshot({ path: png, animations: 'disabled', caret: 'hide' });
  out.ok = true;
} catch (e) { out.error = String(e?.message ?? e).split('\n')[0].slice(0, 300); }
await br.close();
console.log(JSON.stringify(out));
