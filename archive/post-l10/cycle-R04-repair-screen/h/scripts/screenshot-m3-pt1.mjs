// m3-pt1 screenshots: 390 + 1280, next-goal strip Ready / countdown / dash, FTUE (pointer hand), Workers intro, Settings Export log.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
const OUT = new URL('../../engineering/screenshots/', import.meta.url).pathname;
const port = 4178, base = `http://127.0.0.1:${port}/`;
const srv = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
const kill = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch {} };
setTimeout(() => { kill(); process.exit(2); }, 120000).unref();
await new Promise(r => setTimeout(r, 2000));
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const mk = st => ({ version: 5, savedAt: Date.now(), state: { coinsCents: 0, coop: 4, basket: 0, collectionLevel: 4, farmLevel: 6, customers: [], nextCustomerInS: 30, nextCustomerId: 1, rng: 99, pendingOfflineEggs: 0, celebratedTier: 1, workers: { market_hand: { energy: 90, cdS: 0 } }, graderTier: 0, manageCdS: 0, coopFullS: 0, ...st } });
const report = [];
async function shot(name, save, after, { desktop = false, ui = { seenSlots: 5, onboardingDone: true, workersIntroA: true, workersIntroB: true } } = {}) {
  const ctx = await browser.newContext(desktop ? { viewport: { width: 1280, height: 800 } } : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(([s, u]) => { if (!sessionStorage.getItem('seeded')) { if (s) localStorage.setItem('eggfarm.save', JSON.stringify(s)); if (u) localStorage.setItem('eggfarm.ui', JSON.stringify(u)); sessionStorage.setItem('seeded', '1'); } }, [save, ui]);
  await page.goto(base); await page.getByText('Tap to start').click(); await page.waitForTimeout(500);
  await after(page); await page.screenshot({ path: `${OUT}m3-pt1-${name}.png` });
  report.push([name, await page.evaluate(() => { const g = document.querySelector('#goal'); return g && !g.hidden ? `${g.querySelector('.goal-label').textContent} | ${g.querySelector('.goal-status').textContent} | ${g.dataset.state}` : '(strip hidden)'; })]);
  if (errs.length) { console.log(name, errs); process.exitCode = 1; } await ctx.close();
}
// income: a few sales feed the rolling 60 s rate, then coins set below the target cost
const earn = async (p, coins) => { await p.evaluate(c => { const g = window.eggfarm; g.state = { ...g.state, basket: 200, customers: [{ id: 900, demand: 60, filled: 0, waitedS: 0 }] }; g.dispatch({ type: 'sell', customerId: 900 }); g.state = { ...g.state, coinsCents: c }; }, coins); await p.waitForTimeout(3300); };
await shot('390', mk({ coinsCents: 2000 }), p => earn(p, 2000));
await shot('1280', mk({ coinsCents: 2000 }), p => earn(p, 2000), { desktop: true });
await shot('goal-ready', mk({ coinsCents: 50_000 }), p => p.waitForTimeout(300));
await shot('goal-countdown', mk({ coinsCents: 2000 }), p => earn(p, 2000));
await shot('goal-dash', mk({ coinsCents: 0 }), p => p.waitForTimeout(300));
await shot('goal-tap', mk({ coinsCents: 2000 }), async p => { await earn(p, 2000); await p.locator('#goal').click(); await p.waitForTimeout(250); });
await shot('ftue', null, p => p.waitForTimeout(300), { ui: null });
await shot('ftue-1280', null, p => p.waitForTimeout(300), { desktop: true, ui: null });
await shot('workers-intro-a', mk({ farmLevel: 3, coinsCents: 10_000, workers: {} }), p => p.waitForTimeout(300), { ui: { seenSlots: 5, onboardingDone: true } });
await shot('workers-intro-b', mk({ farmLevel: 3, coinsCents: 10_000, workers: {} }), async p => { await p.locator('#iaOpen').click(); await p.waitForTimeout(200); await p.locator('[data-act=hire][data-w=market_hand]').click(); await p.waitForTimeout(700); }, { ui: { seenSlots: 5, onboardingDone: true } });
await shot('settings-export', mk({}), async p => { await p.locator('#settings').click(); await p.waitForTimeout(200); });
console.log(report.map(r => r.join(': ')).join('\n'));
await browser.close(); kill();
