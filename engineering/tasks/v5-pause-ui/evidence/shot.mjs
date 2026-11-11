import { chromium, firefox, webkit } from 'playwright-core';
import { spawn } from 'node:child_process';
const port = 4391, url = `http://127.0.0.1:${port}/?marketSeed=7`;
const srv = spawn('npx', ['vite', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 4000));
const ck = t => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); };
const state = { coinsCents: 123456789, coop: 0, basket: 0, collectionLevel: 12, farmLevel: 12, customers: [], nextCustomerInS: 10, nextCustomerId: 1, rng: 3700654487, pendingOfflineEggs: 0, celebratedTier: 0,
  workers: { market_hand: { energy: 80, cdS: 0.5 }, coop_hand: { energy: 40, cdS: 1, paused: true }, hawker: { energy: 22, cdS: 0 }, grader: { energy: 100, cdS: 0, paused: true } },
  graderTier: 1, manageCdS: 0, coopFullS: 0, wageFracCents: {}, hensLevel: 12, eggValueLevel: 12, celebratedMilestones: [], tracksV7: 1 };
const save = t => { const st = JSON.stringify(state); return `{"version":6,"savedAt":${t},"sum":"${ck(st)}","state":${st}}`; };
const out = [];
for (const [bn, bt, exe] of [['chromium', chromium, '/usr/bin/google-chrome'], ['firefox', firefox], ['webkit', webkit]]) {
  let browser; try { browser = await bt.launch(exe ? { executablePath: exe, args: ['--no-sandbox'] } : {}); } catch (e) { out.push(`${bn}: launch failed ${e.message.split('\n')[0]}`); continue; }
  for (const w of [360, 390, 1280]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w > 1000 ? 800 : 780 } });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(([s, ui]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('eggfarm.save', s); localStorage.setItem('eggfarm.ui', ui); sessionStorage.setItem('seeded', '1'); } }, [save(Date.now()), JSON.stringify({ seenSlots: 3, onboardingDone: true, sfx: false, reducedMotion: false })]);
    await page.goto(url); await page.getByText('Tap to start').click().catch(() => {}); await page.waitForTimeout(500);
    if (w < 1000) await page.locator('[data-nav=upgrades]').click().catch(() => {});
    await page.locator('[data-tab=workers]').click().catch(() => {}); await page.waitForTimeout(500);
    const m = await page.evaluate(() => [...document.querySelectorAll('#uRow .wk')].map(c => { const t = c.querySelector('.pz-toggle'), r = c.querySelector('.btn.manage'); const a = t?.getBoundingClientRect(), b = r?.getBoundingClientRect();
      return { w: c.dataset.w, tw: a && Math.round(a.width), th: a && Math.round(a.height), gap: a && b ? Math.round(b.left - a.right) : null, top: a && b ? Math.round(b.top - a.top) : null, lbl: t?.getAttribute('aria-label'), st: c.querySelector('.st')?.textContent, sub: c.querySelector('.pz-sub')?.textContent ?? '' }; }));
    out.push(`${bn} ${w}: ${JSON.stringify(m)} all=${await page.locator('.pz-all').count()} errs=${errs.length}`);
    // keyboard: focus MH toggle, press Enter, focus stays & pressed flips
    const mh = page.locator('.wk[data-w=market_hand] .pz-toggle'); await mh.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    out.push(`  kb: focused=${await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))} live=${await page.evaluate(() => document.getElementById('pzLive')?.textContent)}`);
    await page.screenshot({ path: `/tmp/hire2/evidence/${bn}-${w}.png`, fullPage: false });
    await ctx.close();
  }
  await browser.close();
}
srv.kill(); console.log(out.join('\n'));
