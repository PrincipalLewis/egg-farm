// rc1/ux-clarity Art FIX1–4 screenshots + hit-area getBoundingClientRect checks.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
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
const asleepWorkers = { coop_hand: { energy: 0, cdS: 0 }, market_hand: { energy: 100, cdS: 0 } };

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
  await page.evaluate(() => document.querySelectorAll('.coach,.intro-a').forEach(e => e.remove()));
  await after(page);
  // ensure rate has painted (≥1s throttle)
  await page.waitForTimeout(1100);
  const path = `${OUT}/rc1ux-${name}.png`;
  await page.screenshot({ path, fullPage: false });
  const info = await page.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100 };
    };
    return {
      buildId: document.querySelector('meta[name=build-id]')?.content
        || document.querySelector('#app')?.dataset?.buildId
        || document.querySelector('.build-tag')?.textContent,
      goal: document.querySelector('#goal .goal-label')?.textContent,
      rate: document.querySelector('#rate')?.textContent,
      rateAria: document.querySelector('#rate')?.getAttribute('aria-label'),
      asleepBadge: document.querySelector('.asleep-badge:not([hidden])')?.textContent,
      banner: document.querySelector('.wk-banner')?.textContent,
      hits: {
        close: box('#p-upgrades .close') || box('.sheet .close'),
        tabCollection: box('[data-tab=collection]'),
        tabFarm: box('[data-tab=farm]'),
        tabWorkers: box('[data-tab=workers]'),
        goal: box('#goal'),
      },
    };
  });
  console.log('wrote', path, JSON.stringify(info));
  await ctx.close();
  return info;
}

const openUpgrades = async (p, tab = 'collection') => {
  const nav = p.locator('[data-nav=upgrades]');
  if (await nav.isVisible()) await nav.click();
  else {
    await p.evaluate(() => {
      const btn = document.querySelector('[data-nav=upgrades]');
      if (btn) btn.click();
      const sheet = document.querySelector('#p-upgrades');
      if (sheet) sheet.hidden = false;
      const m = document.querySelector('#p-market'); if (m) m.hidden = true;
    });
  }
  await p.waitForTimeout(150);
  await p.locator(`[data-tab=${tab}]`).click({ force: true });
  await p.waitForTimeout(500);
};

const asleepSave = mk({ farmLevel: 7, collectionLevel: 5, coinsCents: 5000, workers: asleepWorkers });

// FIX1 workers badge at 360
const fix1w = await shot('fix1-workers-badge-360', asleepSave, { width: 360, height: 640 }, p => openUpgrades(p, 'workers'));
// FIX1 upgrades nav badge at 360 (farm view so nav is visible; asleep count > 0)
const fix1n = await shot('fix1-upgrades-nav-badge-360', asleepSave, { width: 360, height: 640 }, async (p) => {
  // stay on farm; ensure badge visible on upgrades nav
  await p.waitForTimeout(200);
  await p.evaluate(() => {
    // close any sheet
    document.querySelectorAll('.sheet').forEach(s => { s.hidden = true; });
    document.querySelector('#panel-layer')?.classList.remove('open');
  });
  await p.waitForTimeout(200);
});
// FIX2 goal strip at 1280
const fix2 = await shot('fix2-goalstrip-1280', mk({}), { width: 1280, height: 720 }, p => openUpgrades(p, 'collection'));
// FIX3 HUD asleep rate at 360
const fix3 = await shot('fix3-hud-asleep-rate-360', asleepSave, { width: 360, height: 640 }, async (p) => {
  await p.waitForTimeout(200);
});
// refresh originals
await shot('asleep-360', asleepSave, { width: 360, height: 640 }, p => openUpgrades(p, 'workers'));
await shot('1280', mk({}), { width: 1280, height: 720 }, p => openUpgrades(p, 'collection'));

// Hit-area assertions (FIX4)
const hits = fix1w.hits;
const report = {
  before: { close: { w: 44, h: 44 }, tabWorkers: { w: 106.67, h: 36 }, goal: { w: 320, h: 44 } },
  after: hits,
  rate: fix3.rate,
  rateAria: fix3.rateAria,
  goalLabel1280: fix2.goal,
};
writeFileSync('/tmp/rc1ux-fix-report.json', JSON.stringify(report, null, 2));
console.log('HIT_REPORT', JSON.stringify(report));

const fail = [];
for (const [k, v] of Object.entries(hits)) {
  if (!v) { fail.push(`${k} missing`); continue; }
  if (v.h < 44 - 0.5 || (k === 'close' && v.w < 44 - 0.5)) fail.push(`${k} ${JSON.stringify(v)} < 44`);
}
if (fix3.rate !== '⚠ ▼ $0.00/s') fail.push(`rate got ${JSON.stringify(fix3.rate)}`);
if (!fix3.rateAria?.includes('$0.00')) fail.push(`aria missing money: ${fix3.rateAria}`);
if (fail.length) {
  console.error('ASSERT FAIL', fail);
  await browser.close(); kill();
  process.exit(1);
}
await browser.close(); kill();
console.log('done');
