// VER-1 step 4: load the built single-file html (dist-html/egg-farm.html) with the run's end state in headless Chromium,
// read the build label and save one 390x844 verify.png. Prints one JSON line on stdout and exits 0 (verify.ts decides);
// any failure, including a Chromium launch failure, is { ok: false, error } and no PNG is left behind.
// Determinism (CCR m1 on #71): the page clock is installed PAUSED at the save's savedAt, so game time only moves in the
// fixed clock.runFor() steps below. Real-time async work (IndexedDB open, font load) is allowed to finish while the
// clock is paused before any game time passes, and toasts are hidden for the shot.
// Usage: node scripts/verify/shot.mjs <egg-farm.html> <save.json> <out.png>    CHROME=/path/to/chrome overrides /usr/bin/google-chrome
import pw from 'playwright-core';
import { readFileSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [html, savePath, png] = process.argv.slice(2);
if (!html || !savePath || !png) { console.error('usage: node scripts/verify/shot.mjs <egg-farm.html> <save.json> <out.png>'); process.exit(2); }
const out = { ok: false, label: null, dataBuildId: null, metaBuildId: null, pageErrors: [] };
rmSync(png, { force: true }); // never leave a stale PNG from an earlier run
let br = null;
/** Advance game time in fixed 50 ms steps, giving real-time async work (IndexedDB, audio unlock, the tab lease) 100 ms of
 *  real time to finish before each step, until `ready()` holds. The boot's timeouts then never race real I/O, so the
 *  number of steps, and the game time, is the same every run. */
const stepUntil = async (p, ready, max = 300) => {
  for (let i = 0; i < max; i++) { if (await ready()) return i; await p.waitForTimeout(100); await p.clock.runFor(50); }
  throw new Error('page did not become ready');
};
const settle = async p => { // real time only: the fake clock is paused, so no game time passes here
  await p.evaluate(() => document.fonts?.ready.then(() => true));
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(500);
};
try {
  const raw = readFileSync(savePath, 'utf8'), savedAt = JSON.parse(raw).savedAt;
  const ui = JSON.stringify({ sfx: false, reducedMotion: true, seenSlots: 99, onboardingDone: true, workersIntroA: true, workersIntroB: true, sessions: 2, iosHomeShown: true });
  br = await pw.chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox', '--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'] });
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce', locale: 'en-US', timezoneId: 'UTC' });
  const p = await ctx.newPage();
  p.on('pageerror', e => out.pageErrors.push(String(e.message).slice(0, 200)));
  await p.clock.install({ time: savedAt }); await p.clock.pauseAt(savedAt);
  await p.addInitScript(([k, v, u]) => { if (!sessionStorage.getItem('verify-seeded')) { localStorage.setItem(k, v); localStorage.setItem('eggfarm.ui', u); sessionStorage.setItem('verify-seeded', '1'); } }, ['eggfarm.save', raw, ui]);
  await p.goto(pathToFileURL(html).href);
  await settle(p);
  await stepUntil(p, async () => (await p.getByText('Tap to start').count()) > 0);
  await p.getByText('Tap to start').click({ timeout: 15000 });
  await stepUntil(p, async () => (await p.locator('#collect').count()) > 0);
  await settle(p);
  for (let i = 0; i < 40; i++) { await p.clock.runFor(50); await p.waitForTimeout(20); } // 2 s of game time, in steps
  out.dataBuildId = await p.locator('#app').getAttribute('data-build-id');
  out.metaBuildId = await p.locator('meta[name="build-id"]').getAttribute('content');
  // The game's visible build label is the "Egg Farm <build id>" line in Settings (src/ui/app.ts); open Settings and show it.
  await p.locator('#settings').click({ force: true, timeout: 10000 });
  await settle(p);
  for (let i = 0; i < 20; i++) { await p.clock.runFor(50); await p.waitForTimeout(20); }
  const v = p.locator('.version', { hasText: /^Egg Farm / }).first();
  await v.scrollIntoViewIfNeeded({ timeout: 5000 });
  out.label = ((await v.textContent()) ?? '').trim();
  await p.addStyleTag({ content: '.toast{visibility:hidden !important}' }); // milestone / coop toasts are one-shot celebrations
  await settle(p);
  await p.screenshot({ path: png, animations: 'disabled', caret: 'hide' });
  out.ok = true;
} catch (e) { out.error = String(e?.message ?? e).split('\n')[0].slice(0, 300); rmSync(png, { force: true }); }
if (br) await br.close().catch(() => {});
console.log(JSON.stringify(out));
