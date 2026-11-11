// Hire2 clockWage Art evidence: caption, fall-asleep toasts (4 roles), yawn tip, welcome-back lines. Throwaway copy, m4.flags.clockWage = 1 only.
import { chromium, firefox, webkit } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const OUT = process.argv[2] ?? '/tmp/hire2/cwevidence'; mkdirSync(OUT, { recursive: true });
const port = 4392, url = `http://127.0.0.1:${port}/?marketSeed=7`;
const srv = spawn('npx', ['vite', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 4000));
const ck = t => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); };
// MH yawning (energy 50 = yawn_at_pct -> first-yawn tip), CH Asleep (caption "Still paid $X/min"), Hawker / Grader working.
const state = { coinsCents: 123456789, coop: 0, basket: 0, collectionLevel: 12, farmLevel: 12, customers: [], nextCustomerInS: 10, nextCustomerId: 1, rng: 3700654487, pendingOfflineEggs: 0, celebratedTier: 0,
  workers: { market_hand: { energy: 50, cdS: 0.5 }, coop_hand: { energy: 0, cdS: 1 }, hawker: { energy: 90, cdS: 0 }, grader: { energy: 90, cdS: 0 } },
  graderTier: 1, manageCdS: 0, coopFullS: 0, wageFracCents: {}, hensLevel: 12, eggValueLevel: 12, celebratedMilestones: [], tracksV7: 1 };
const save = t => { const st = JSON.stringify(state); return `{"version":6,"savedAt":${t},"sum":"${ck(st)}","state":${st}}`; };
const out = [];
const setW = (page, id, w) => page.evaluate(([id, w]) => { const g = window.eggfarm; g.state = { ...g.state, workers: { ...g.state.workers, [id]: { ...g.state.workers[id], ...w } } }; }, [id, w]);
for (const [bn, bt, exe] of [['chromium', chromium, '/usr/bin/google-chrome'], ['firefox', firefox], ['webkit', webkit]].filter(([n]) => !process.env.ONLY || process.env.ONLY.split(',').includes(n))) {
  let browser; try { browser = await bt.launch(exe ? { executablePath: exe, args: ['--no-sandbox'] } : {}); } catch (e) { out.push(`${bn}: launch failed ${e.message.split('\n')[0]}`); continue; }
  for (const w of [360, 390, 1280]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w > 1000 ? 800 : 780 } });
    let page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await ctx.addInitScript(([s, ui]) => { if (!localStorage.getItem('qa.seeded')) { localStorage.setItem('eggfarm.save', s); localStorage.setItem('eggfarm.ui', ui); localStorage.setItem('qa.seeded', '1'); }  /* after the pagehide save: back-date it 10 min so the reload is a real offline return */ }, [save(Date.now()), JSON.stringify({ seenSlots: 3, onboardingDone: true, sfx: false, reducedMotion: false })]);
    await page.goto(url); await page.getByText('Tap to start').click().catch(() => {}); await page.waitForTimeout(500);
    if (w < 1000) await page.locator('[data-nav=upgrades]').click().catch(() => {});
    await page.locator('[data-tab=workers]').click().catch(() => {}); await page.waitForTimeout(400);
    // 1) caption + tip
    const cap = await page.evaluate(() => ({ caption: [...document.querySelectorAll('#uRow .wk')].map(c => `${c.dataset.w}: ${c.querySelector('.wk-cap, .cap, .caption')?.textContent ?? ''}`).join(' | '),
      card: document.querySelector('#uRow .wk[data-w=coop_hand]')?.innerText.replace(/\s+/g, ' ').slice(0, 160),
      tip: document.querySelector('.cw-tip')?.textContent ?? null, tipFont: (() => { const t = document.querySelector('.cw-tip'); if (!t) return null; const cs = getComputedStyle(t); const r = t.getBoundingClientRect(); return `${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} w=${Math.round(r.width)} clip=${t.scrollWidth > t.clientWidth || t.scrollHeight > t.clientHeight}`; })() }));
    out.push(`${bn} ${w} caption+tip: ${JSON.stringify(cap)}`);
    await page.screenshot({ path: `${OUT}/${bn}-${w}-1-caption-tip.png` });
    await page.evaluate(() => document.querySelector('.cw-tip')?.remove());
    // 2) fall-asleep toasts, one per role
    for (const id of ['market_hand', 'coop_hand', 'hawker', 'grader']) {
      if (id === 'coop_hand') await setW(page, id, { energy: 60 }), await page.waitForTimeout(200);
      await page.waitForFunction(() => { const on = !!document.querySelector('.toast.show'); const n = performance.now(); if (on) window.__idle = n; return !on && n - (window.__idle ?? 0) > 700; }, null, { timeout: 25000, polling: 100 }).catch(() => {}); // queue idle (boot milestone toasts first; never overwritten)
      await setW(page, id, { energy: 0.02 });
      await page.waitForFunction(t => document.querySelector('.toast.show')?.textContent?.includes(t), id === 'grader' ? 'Egg Grader' : id === 'coop_hand' ? 'Coop Hand' : id === 'hawker' ? 'Hawker' : 'Market Hand', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(350); // slide-in done
      const t = await page.evaluate(() => { const el = document.querySelector('.toast'); const hud = document.querySelector('.hud, header'); const hb = hud ? Math.round(hud.getBoundingClientRect().bottom) : null; if (!el) return null; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2; return { top: Math.round(r.top), hudBottom: hb, text: el.textContent, h: Math.round(r.height), w: Math.round(r.width), lines: Math.round((el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) / lh), clip: el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight }; });
      out.push(`  toast ${id}: ${JSON.stringify(t)}`);
      await page.screenshot({ path: `${OUT}/${bn}-${w}-2-toast-${id}.png` });
    }
    // 3) welcome-back from the SAVED clockWageWindow (AC-FC12): 120 s live play with MH + CH Asleep, save, back-date the save 10 min, reload.
    await setW(page, 'hawker', { energy: 90 }); await setW(page, 'grader', { energy: 90 });
    await page.evaluate(() => { const g = window.eggfarm; g.dispatch({ type: 'dismissOffline' }); g.debugAdvance(120000); g.state = { ...g.state, coop: 0, basket: 0, pendingOfflineEggs: 0 }; /* empty coop so the 10-min absence grants eggs (the welcome modal needs eggs > 0) */ window.__win = JSON.stringify(g.state.clockWageWindow); g.debugBackdateSave(600000); /* the game's own QA handle: save (with clockWageWindow) back-dated 10 min, primary + mirror; blocks the pagehide save */ window.__w0 = JSON.stringify(g.state.clockWageWindow); });
    const winBefore = await page.evaluate(() => window.__win);
    // reload = a real offline return of 10 min: the boot path grants offline eggs and the welcome-back modal reads the SAVED clockWageWindow
    await page.reload(); await page.waitForFunction(() => !!window.eggfarm, null, { timeout: 15000 }).catch(() => {}); await page.getByText('Tap to start').click().catch(() => {}); await page.waitForTimeout(800);
    out.push(`  welcome (saved window ${winBefore}): ${(await page.locator('.wb-wage').first().waitFor({ timeout: 10000 }).catch(() => {}), JSON.stringify(await page.locator('.wb-wage').allTextContents()))} modal=${await page.locator('#wbT').count()} errs=${errs.length}${errs.length ? ' ' + errs.join(' / ') : ''}`);
    await page.screenshot({ path: `${OUT}/${bn}-${w}-3-welcome-back.png` });
    await ctx.close();
  }
  await browser.close();
}
srv.kill(); console.log(out.join('\n'));
