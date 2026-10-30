// art-ux/m3-customer-queue-spec.md §7 QA checks 13-20 (+ F24 frame-sampler stress) against dist-qa. Exit 1 if any check fails.
// Usage: node scripts/queue-qa.mjs [webkit]   -> qa-out/queue-qa-<engine>.json + screenshots
import { chromium, webkit } from 'playwright-core';
import { spawnRecorded, stopOrReport } from './recorded-pid.mjs';
import { writeFileSync } from 'node:fs';
const eng = process.argv[2] === 'webkit' ? 'webkit' : 'chromium'; const port = 4800 + Math.floor(Math.random() * 400);
const { child: srv, rec: srvRec } = spawnRecorded('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const br = eng === 'webkit' ? await webkit.launch() : await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const res = {}; const ok = (k, pass, data) => { res[k] = { pass: !!pass, ...data }; console.log(k, pass ? 'PASS' : 'FAIL', JSON.stringify(data)); };
const page = async (w, h, q = '', F = 24) => {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: false }); const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sessions: 1 })));
  await p.goto(`http://127.0.0.1:${port}/${q}`); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm);
  await p.evaluate(F => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: F, collectionLevel: 20, coop: 0, basket: 0, coinsCents: 0,
    customers: Array.from({ length: 10 }, (_, i) => ({ id: 9000 + i, demand: 50 + i, filled: 0, waitedS: i * 2.5 })), nextCustomerId: 9100, nextCustomerInS: 1.5 }; }, F);
  return { ctx, p };
};
const openMarket = p => p.evaluate(() => document.querySelector('nav [data-nav=market]').click());
const MON = () => { // page-side monitor: node identity, positions, chip/live writes, CLS, long tasks
  const L = document.querySelector('#mRows'), M = window.__m = { replaced: 0, moves: 0, removals: 0, chip: [], live: [], cls: 0, src: {}, long: 0, ids: new Map() };
  new MutationObserver(ms => { for (const m of ms) { for (const n of m.removedNodes) if (n.dataset?.id) M.removals++;
    for (const n of m.addedNodes) if (n.dataset?.id) { if (M.ids.has(n.dataset.id) && M.ids.get(n.dataset.id) !== n) M.replaced++; M.ids.set(n.dataset.id, n); } } }).observe(L, { childList: true });
  L.querySelectorAll('[data-id]').forEach(n => M.ids.set(n.dataset.id, n));
  const chip = L.querySelector('.queue-more'); new MutationObserver(() => M.chip.push(performance.now())).observe(chip, { characterData: true, childList: true, subtree: true });
  new MutationObserver(() => M.live.push(performance.now())).observe(document.querySelector('#ordersLive'), { characterData: true, childList: true, subtree: true });
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) { M.cls += e.value; for (const x of e.sources) { const k = (x.node?.className || x.node?.nodeName || '?') + ''; M.src[k] = +((M.src[k] || 0) + e.value).toFixed(4); } } }).observe({ type: 'layout-shift', buffered: false }); M.clsOk = true; } catch { M.clsOk = false; }
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.duration > 50) M.long++; }).observe({ type: 'longtask' }); } catch {}
  // 13: positions of surviving cards may change only in a frame where a card was removed
  let last = new Map(), lastRem = 0;
  const f = () => { const now = new Map(); L.querySelectorAll('.order[data-row]').forEach(n => now.set(n.dataset.id, n.offsetTop));
    if (M.removals === lastRem) for (const [id, y] of now) if (last.has(id) && Math.abs(last.get(id) - y) > 1 && !document.querySelector('.order.leaving')) M.moves++;
    last = now; lastRem = M.removals; requestAnimationFrame(f); }; requestAnimationFrame(f);
};
const gaps = a => a.slice(1).map((t, i) => t - a[i]);
try {
  // 13 + 15 + 17: 60 s at F24 (arrivals every 1.5 s), 360x640, Market open; we sell to the first card every ~4 s to force serve churn
  { const { ctx, p } = await page(360, 640); await openMarket(p); await p.waitForTimeout(600); await p.evaluate(MON);
    for (let s = 0; s < (process.env.QUICK ? 4 : 15); s++) { await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, basket: g.state.basket + 200 }; });
      await p.waitForTimeout(3700); { const l = p.locator('#mRows .order[data-row] button').first(); if (await l.count()) await l.click({ timeout: 1000 }).catch(() => {}); } }
    const M = await p.evaluate(() => ({ ...window.__m, ids: undefined }));
    ok('13_no_flicker_positions_only_on_serve_leave', M.moves === 0 && M.replaced === 0, { moves: M.moves, replaced: M.replaced, removals: M.removals });
    ok('15_CLS_and_long_tasks', (!M.clsOk || M.cls < 0.01) && M.long === 0, { cls: +M.cls.toFixed(4), sources: M.src, clsMeasured: M.clsOk, longTasks: M.long });
    const cg = gaps(M.chip), lg = gaps(M.live);
    ok('17_chip_live_coalesced_identity', cg.every(g => g >= 1990) && lg.every(g => g >= 1990) && M.replaced === 0, { chipWrites: M.chip.length, minChipGapMs: Math.round(Math.min(...cg, 1e9)), liveWrites: M.live.length, minLiveGapMs: Math.round(Math.min(...lg, 1e9)) });
    await p.screenshot({ path: `qa-out/queue-f24-360-${eng}.png` }); await ctx.close(); }
  // 14: expanded, scrolled to the middle: the card at the top of the viewport stays put (+-2px)
  { const { ctx, p } = await page(360, 640); await openMarket(p); await p.waitForTimeout(500);
    await p.evaluate(() => document.querySelector('#mRows .queue-more').click()); await p.waitForTimeout(500);
    const r = await p.evaluate(async () => { const L = document.querySelector('#mRows'), sc = L.closest('.body') || L; sc.scrollTop = (sc.scrollHeight - sc.clientHeight) / 2;
      await new Promise(r => setTimeout(r, 300)); let worst = 0, n = 0, anchor = null, y0 = 0;
      const pick = () => { const top = sc.getBoundingClientRect().top; anchor = [...L.querySelectorAll('.order[data-row]')].find(e => e.getBoundingClientRect().top >= top); y0 = anchor?.getBoundingClientRect().top; };
      pick(); const end = performance.now() + 20000;
      while (performance.now() < end) { await new Promise(r => requestAnimationFrame(r)); if (!anchor?.isConnected || !anchor.dataset.row) { pick(); n++; continue; } worst = Math.max(worst, Math.abs(anchor.getBoundingClientRect().top - y0)); }
      return { worstPx: +worst.toFixed(1), reAnchors: n, scrollable: sc.scrollHeight > sc.clientHeight }; });
    ok('14_scroll_anchor', r.worstPx <= 2, r); await ctx.close(); }
  // 16: hold pointerdown on a Sell button 1 s during arrivals/leaves; rect unchanged until release
  { const { ctx, p } = await page(360, 640); await openMarket(p); await p.waitForTimeout(500);
    await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, customers: g.state.customers.map((c, i) => i === 0 ? { ...c, waitedS: 29.5 } : c) }; });
    const hid = await p.evaluate(() => document.querySelectorAll('#mRows .order[data-row]')[2].dataset.id); const sel = `#mRows .order[data-id="${hid}"] button`; const bb = await p.locator(sel).boundingBox();
    await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down();
    const rs = []; for (let i = 0; i < 10; i++) { await p.waitForTimeout(100); rs.push(await p.evaluate(s => { const b = document.querySelector(s); if (!b) return 'gone'; const r = b.closest('.order').getBoundingClientRect(); return [r.x, r.y, r.width, r.height, b.offsetLeft, b.offsetTop, b.offsetWidth, b.offsetHeight].map(Math.round).join(','); }, sel)); } // card rect + button layout box (the button's own :active press scale is feedback, not movement)
    await p.mouse.move(0, 0); await p.mouse.up();
    ok('16_tap_target_stable_while_held', new Set(rs).size === 1, { rects: [...new Set(rs)] }); await ctx.close(); }
  // 18: partial leave: 2/5 sold then timeout -> card collapses, coins stay, patience never resets after "Sell k"
  { const { ctx, p } = await page(360, 640, '', 24); await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, customers: [{ id: 1, demand: 5, filled: 0, waitedS: 24 }], nextCustomerInS: 1e9, basket: 2, coinsCents: 0 }; });
    await openMarket(p); await p.waitForTimeout(400); await p.locator('#mRows .order[data-id="1"] button').click(); await p.waitForTimeout(300);
    const a = await p.evaluate(() => { const s = window.eggfarm.state; return { coins: s.coinsCents, w: s.customers[0]?.waitedS, filled: s.customers[0]?.filled }; });
    await p.waitForTimeout(6500);
    const z = await p.evaluate(() => { const s = window.eggfarm.state; return { coins: s.coinsCents, n: s.customers.length, card: !!document.querySelector('#mRows .order[data-id="1"][data-row]') }; });
    ok('18_partial_leave', a.filled === 2 && a.w >= 24 && z.n === 0 && !z.card && z.coins === a.coins && a.coins > 0, { afterSell: a, afterTimeout: z }); await ctx.close(); }
  // 19: farm strip: queue 10 -> 4 chips + "+6"; tapping it opens Market
  { const { ctx, p } = await page(360, 640); await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, nextCustomerInS: 1e9 }; }); await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({ chips: document.querySelectorAll('.queue .chip:not(.empty):not(.more)').length, more: document.querySelector('.queue .chip.more')?.textContent }));
    await p.locator('.queue .chip.more').click(); await p.waitForTimeout(400); const opened = await p.evaluate(() => !!document.querySelector('#p-market') && getComputedStyle(document.querySelector('#p-market')).display !== 'none' && document.querySelector('#panel-layer').classList.contains('open'));
    await p.screenshot({ path: `qa-out/farm-strip-360-${eng}.png` });
    ok('19_farm_strip', r.chips === 4 && r.more === '+6' && opened, { ...r, marketOpened: opened }); await ctx.close(); }
  // 20: Farm row at F4/F9/F14/F19 single lines at 360; absent at F3, F20
  { const out = {}; let pass = true;
    for (const F of [3, 4, 9, 14, 19, 20]) { const { ctx, p } = await page(360, 640, '', F);
      await p.evaluate(() => document.querySelector('nav [data-nav=upgrades]').click()); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('[data-tab=farm]').click()); await p.waitForTimeout(400);
      const r = await p.evaluate(() => { const s = document.querySelector('.fx li.slot'), o = document.querySelector('.fx li.orders'); const one = e => !e || (e.scrollWidth <= e.clientWidth + 1 && e.getBoundingClientRect().height <= 24);
        return { slot: s?.textContent ?? null, orders: o?.textContent ?? null, single: one(s) && one(o), aria: s?.getAttribute('aria-label') ?? null }; });
      out[F] = r; const want = [4, 9, 14, 19].includes(F); pass &&= want ? !!r.slot && r.single && /\+1 customer slot \(\d+ → \d+\)/.test(r.slot) : !r.slot;
      if (F === 9) await p.screenshot({ path: `qa-out/farm-row-F9-360-${eng}.png` }); await ctx.close(); }
    ok('20_farm_row_preview', pass, out); }
  // F24 stress with the SM-9 frame sampler (?perf=1, 30 s after 5 s warm-up), Market open, full queue
  { const { ctx, p } = await page(360, 640, '?perf=1&perfS=30&perfWarmS=5'); await openMarket(p);
    await p.waitForFunction(() => window.eggfarmPerf?.done, null, { timeout: 60000 }); const s = await p.evaluate(() => window.eggfarmPerf.result);
    await p.screenshot({ path: `qa-out/perf-f24-360-${eng}.png` }); ok('F24_frame_sampler', s.pass, s); await ctx.close(); }
} finally { writeFileSync(`qa-out/queue-qa-${eng}.json`, JSON.stringify(res, null, 1)); await br.close(); stopOrReport(srv, srvRec, 'queue-qa'); }
process.exit(Object.values(res).every(r => r.pass) ? 0 : 1);
