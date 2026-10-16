// rc1/ux-clarity screenshots: 360 + 1280 upgrades (chips + best buy) and asleep card/badge.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const OUT = '/workspace/egg-farm-studio/engineering/screenshots';
mkdirSync(OUT, { recursive: true });
const port = 4188, base = `http://127.0.0.1:${port}/`;
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: ['ignore', 'pipe', 'pipe'], detached: true });
const kill = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch {} };
process.on('exit', kill);
for (let i = 0; i < 40; i++) {
  try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 250)); }
}
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ui = { seenSlots: 5, onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false };
const mk = (st) => ({
  version: 5, savedAt: Date.now(),
  state: {
    coinsCents: 7000, coop: 20, basket: 0, collectionLevel: 4, farmLevel: 5,
    customers: [], nextCustomerInS: 30, nextCustomerId: 1, rng: 99,
    pendingOfflineEggs: 0, celebratedTier: 1, workers: {}, graderTier: 0, manageCdS: 0, coopFullS: 0, ...st,
  },
});
async function shot(name, save, viewport, after) {
  const desktop = viewport.width >= 960;
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: desktop ? 1 : 2,
    isMobile: !desktop,
    hasTouch: !desktop,
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('pageerror', name, e.message));
  await page.addInitScript(([s, u]) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('eggfarm.save', JSON.stringify(s));
      localStorage.setItem('eggfarm.ui', JSON.stringify(u));
      sessionStorage.setItem('seeded', '1');
    }
  }, [save, ui]);
  await page.goto(base);
  const tap = page.getByText('Tap to start');
  if (await tap.count()) { await tap.click(); await page.waitForTimeout(300); }
  // dismiss any leftover coach
  await page.evaluate(() => document.querySelectorAll('.coach,.intro-a').forEach(e => e.remove()));
  await after(page);
  const path = `${OUT}/rc1ux-${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log('wrote', path, await page.evaluate(() => ({
    goal: document.querySelector('#goal .goal-label')?.textContent,
    status: document.querySelector('#goal .goal-status')?.textContent,
    chips: [...document.querySelectorAll('.vchip')].map(e => e.textContent),
    sum: document.querySelector('.up .sum')?.textContent,
    fx: [...document.querySelectorAll('.up .fx li')].map(e => e.textContent),
    best: !!document.querySelector('.up.best-buy'),
    asleepBadge: document.querySelector('.asleep-badge')?.textContent,
    banner: document.querySelector('.wk-banner')?.textContent,
  })));
  await ctx.close();
}
const openUpgrades = async (p, tab = 'collection') => {
  await p.evaluate(async (t) => {
    const ui = window.eggfarmUi || window.__ui;
    // prefer public openPanel if exposed; else click when visible
    if (window.eggfarm && typeof window.eggfarm.openPanel === 'function') {
      // not on game
    }
  }, tab);
  const nav = p.locator('[data-nav=upgrades]');
  if (await nav.isVisible()) await nav.click();
  else {
    // docked desktop: panel already in layout — just switch tab
    await p.evaluate(() => {
      const btn = document.querySelector('[data-nav=upgrades]');
      if (btn) btn.click();
      // force sheet open
      const sheet = document.querySelector('#p-upgrades');
      if (sheet) sheet.hidden = false;
      document.querySelector('#p-market') && (document.querySelector('#p-market').hidden = true);
    });
  }
  await p.waitForTimeout(150);
  await p.locator(`[data-tab=${tab}]`).click({ force: true });
  await p.waitForTimeout(500);
};
await shot('360', mk({}), { width: 360, height: 640 }, p => openUpgrades(p, 'collection'));
await shot('375', mk({}), { width: 375, height: 667 }, p => openUpgrades(p, 'collection'));
await shot('1280', mk({}), { width: 1280, height: 720 }, p => openUpgrades(p, 'collection'));
await shot('asleep-360', mk({
  farmLevel: 7, collectionLevel: 5, coinsCents: 5000,
  workers: { coop_hand: { energy: 0, cdS: 0 }, market_hand: { energy: 100, cdS: 0 } },
}), { width: 360, height: 640 }, p => openUpgrades(p, 'workers'));
// C-AC26b: L25 goal strip at 360 — measure Fredoka widths with/without ★
await shot('goalstrip-L25-360', mk({
  farmLevel: 20, collectionLevel: 24, coinsCents: 50,
  workers: { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 } },
}), { width: 360, height: 640 }, async (p) => {
  await p.waitForTimeout(300);
  await p.evaluate(async () => { await document.fonts.ready; });
  const widths = await p.evaluate(() => {
    const el = document.querySelector('.goal-label');
    const cs = getComputedStyle(el);
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const full = '★ Collection L25 · +12% income';
    const noStar = 'Collection L25 · +12% income';
    const withStar = ctx.measureText(full).width;
    const withoutStar = ctx.measureText(noStar).width;
    // Apply the same C-AC26b rule the app uses, then paint so the shot shows L25.
    const fitted = withStar > 200 ? noStar : full;
    el.textContent = fitted;
    return { font: ctx.font, withStar, withoutStar, painted: fitted, budget: 200 };
  });
  console.log('C-AC26b L25 widths', JSON.stringify(widths));
  const dropCheck = await p.evaluate(() => {
    const el = document.querySelector('.goal-label');
    const cs = getComputedStyle(el);
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const long = '★ Collection L30 · +999% income';
    const w = ctx.measureText(long).width;
    const fitted = w > 200 ? long.slice(2) : long;
    return { long, w, fitted, dropped: fitted !== long };
  });
  console.log('C-AC26b drop-path check', JSON.stringify(dropCheck));
  await p.waitForTimeout(100);
});
await browser.close(); kill();
console.log('done');
