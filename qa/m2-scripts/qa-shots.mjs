// M2 placeholder screenshots: Workers tab (F24 with all workers, one Tired, one Asleep) + QA-RC2-2 welcome-back with ?debug=1.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
const OUT = '/workspace/egg-farm-studio/qa/m2-shots/';
const port = 4186, base = `http://127.0.0.1:${port}/`;
const srv = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
const kill = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch {} };
setTimeout(() => { kill(); process.exit(2); }, 60000).unref();
await new Promise(r => setTimeout(r, 2000));
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const mk = (savedAt, st) => ({ version: 5, savedAt, state: { coinsCents: 5_000_000, coop: 0, basket: 50, collectionLevel: 12, farmLevel: 24, customers: [], nextCustomerInS: 5, nextCustomerId: 1, rng: 99, pendingOfflineEggs: 0, celebratedTier: 3, workers: {}, graderTier: 0, manageCdS: 0, coopFullS: 0, ...st } });
async function shot(name, save, q, after) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(([s]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('eggfarm.save', JSON.stringify(s)); localStorage.setItem('eggfarm.ui', JSON.stringify({ seenSlots: 5, onboardingDone: true })); sessionStorage.setItem('seeded', '1'); } }, [save]);
  await page.goto(base + q); await page.getByText('Tap to start').click(); await page.waitForTimeout(500);
  await after(page); await page.screenshot({ path: `${OUT}${name}.png` }); if (errs.length) console.log(name, errs); await ctx.close();
}
const W = { market_hand: { energy: 80, cdS: 0 }, coop_hand: { energy: 38, cdS: 0 }, hawker: { energy: 70, cdS: 0 }, grader: { energy: 90, cdS: 0 } };
const info = async (p, tag) => console.log(tag, JSON.stringify(await p.evaluate(() => {
  const f = document.querySelector('.farm-manage-all'); const r = f && f.getBoundingClientRect();
  const ring = [...document.querySelectorAll('.ring-cooldown')].map(x => getComputedStyle(x).display);
  const ma = [...document.querySelectorAll('.manage-all')].filter(x => !x.classList.contains('farm-manage-all')).map(x => ({ t: x.textContent, dis: x.getAttribute('aria-disabled'), vis: x.getBoundingClientRect().width > 0 }));
  return { farmMA: f && { hidden: f.hidden, w: r.width, h: r.height, vis: r.width > 0 && getComputedStyle(f).display !== 'none' }, ringDisplays: ring, manageAll: ma, nestEggs: document.querySelector('#nestEggs')?.childElementCount, nestSrc: document.querySelector('img.nest')?.getAttribute('src') };
})));
const shot2 = async (name, save, vp, after) => {
  const ctx = await browser.newContext(vp); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(([s]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('eggfarm.save', JSON.stringify(s)); localStorage.setItem('eggfarm.ui', JSON.stringify({ seenSlots: 5, onboardingDone: true })); sessionStorage.setItem('seeded', '1'); } }, [save]);
  await page.goto(base); await page.getByText('Tap to start').click(); await page.waitForTimeout(600);
  await after(page); await info(page, name); await page.screenshot({ path: `${OUT}${name}.png` }); if (errs.length) console.log(name, 'ERR', errs); await ctx.close();
};
const M = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, D = { viewport: { width: 1280, height: 800 } };
const tab = async p => { await p.locator('[data-nav=upgrades]').click(); await p.locator('[data-tab=workers]').click(); await p.waitForTimeout(400); };
await shot2('qa-390-farm-manage-all', mk(Date.now(), { workers: W, graderTier: 4 }), M, async () => {});
await shot2('qa-390-farm-no-yawn', mk(Date.now(), { workers: { ...W, coop_hand: { energy: 60, cdS: 0 } }, graderTier: 4 }), M, async () => {});
await shot2('qa-390-workers-cooldown', mk(Date.now(), { workers: W, graderTier: 4, manageCdS: 16 }), M, tab);
await shot2('qa-390-workers-all-rested', mk(Date.now(), { workers: { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 }, hawker: { energy: 100, cdS: 0 } } }), M, tab);
await shot2('qa-390-empty-nest', mk(Date.now(), { coop: 0 }), M, async () => {});
await shot2('qa-desktop-workers-tab', mk(Date.now(), { workers: W, graderTier: 4 }), D, async p => { const t = p.locator('[data-tab=workers]'); await t.click(); await p.waitForTimeout(400); });
await browser.close(); kill(); process.exit(0);
