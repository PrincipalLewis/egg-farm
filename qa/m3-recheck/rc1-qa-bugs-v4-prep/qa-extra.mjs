// rc1-qa-bugs-v4 extra probes: TUT-1 card-tap highlight, M-1 181.2B Sell fit, B-4 ?perf=1 runtime globals/overlay, B-1 coop badge live-rect + copy.
// node scripts/qa-extra.mjs <engine> <outdir> <qaPort> <relPort> <sha7>   (dist-qa on qaPort, dist on relPort)
import pw from 'playwright-core'; import { spawn } from 'node:child_process'; import net from 'node:net'; import { writeFileSync } from 'node:fs';
const [ENG, OUTD, QP, RP, SHA] = process.argv.slice(2); const OUT = OUTD + '/';
const res = []; const ok = (n, p, info = '', kind = p ? 'PASS' : 'FAIL') => { res.push({ n, kind, info }); console.log(`${kind} [${ENG}] ${n} — ${typeof info === 'string' ? info : JSON.stringify(info)}`.slice(0, 1200)); };
const free = port => new Promise(r => { const c = net.connect(port, '127.0.0.1'); c.on('connect', () => { c.destroy(); r(false); }); c.on('error', () => r(true)); });
const srvs = []; const killAll = () => srvs.forEach(s => { try { process.kill(-s.pid, 'SIGTERM'); } catch {} });
setTimeout(() => { killAll(); process.exit(2); }, (+process.env.T_EXTRA||900)*1000).unref();
async function serve(dir, port) { if (port === 4173 || !(await free(port))) { console.error('port unavailable', port); killAll(); process.exit(3); }
  srvs.push(spawn('npx', ['vite','preview','--outDir',dir,'--port',String(port),'--strictPort','--host','127.0.0.1'], { stdio:'ignore', detached:true })); await (async () => { for (let i = 0; i < 240; i++) { try { await fetch(`http://127.0.0.1:${port}/`); return; } catch { await new Promise(r => setTimeout(r, 500)); } } })();
  const base = `http://127.0.0.1:${port}/`; const h = await (await fetch(base)).text(); const j = h.match(/assets\/index-[^"]+\.js/)[0]; const b = await (await fetch(base + j)).text();
  const id = (b.match(/m\d+-rc[\w-]*\+[0-9a-f]{7,40}(\+dirty)?/)||[])[0]; console.log('served', dir, id); if (!id?.endsWith('+' + SHA)) { console.error('WRONG BUILD'); killAll(); process.exit(4); } return { base, bundle: b }; }
const qa = await serve('dist-qa', +QP), rel = await serve('dist', +RP);
const browser = await pw[ENG].launch(ENG === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {});
const DONE = { onboardingDone: true, seenSlots: 10, workersIntroA: true, workersIntroB: true };
const st = (o = {}) => ({ coinsCents: 2_000_000, coop: 0, basket: 0, collectionLevel: 5, farmLevel: 12, customers: [], nextCustomerInS: 600, nextCustomerId: 1, rng: 99, pendingOfflineEggs: 0, celebratedTier: 9, workers: {}, graderTier: 0, manageCdS: 0, coopFullS: 0, wageFracCents: {}, ...o });
async function open(base, w, h, ui = DONE, seed = null, q = '') {
  const desk = w >= 960; const ctx = await browser.newContext(desk ? { viewport: { width: w, height: h } } : { viewport: { width: w, height: h }, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(([u, s]) => { if (sessionStorage.getItem('seeded')) return; if (u) localStorage.setItem('eggfarm.ui', JSON.stringify(u)); if (s) localStorage.setItem('eggfarm.save', JSON.stringify({ version: 6, savedAt: Date.now(), state: s })); sessionStorage.setItem('seeded', '1'); }, [ui, seed]);
  await page.goto(base + q, { timeout: 90_000 }); await page.getByText('Tap to start').click().catch(() => {}); await page.waitForTimeout(700);
  const wb = page.locator('.modal button, [role=dialog] button').first(); if (await wb.isVisible().catch(() => false)) { await wb.click().catch(() => {}); await page.waitForTimeout(300); }
  return { ctx, page, errs };
}
const sec = (process.env.ONLY ?? 'tut1hl,m1,b4,b1').split(',');
try {
// --- TUT-1: docked card (customer chip) tap highlights its order row ---
if (sec.includes('tut1hl')) for (const [w, h] of [[1024, 474], [1280, 720], [1366, 768]]) {
  const { ctx, page, errs } = await open(qa.base, w, h, DONE, st({ basket: 50, customers: [{ id: 1, demand: 3, filled: 0, waitedS: 0 }, { id: 2, demand: 5, filled: 0, waitedS: 0 }], nextCustomerId: 3 }));
  await page.waitForFunction(() => document.querySelectorAll('.order:not([hidden])').length >= 2 && document.querySelector('.chip:not(.empty):not(.served)'), null, { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(1200); // chip must be on screen >=250 ms (S2-9)
  await page.evaluate(() => { window.__hl = []; new MutationObserver(ms => ms.forEach(m => { if (m.target.dataset.hl) window.__hl.push(m.target.dataset.row); })).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-hl'] }); });
  const chip = page.locator('.chip:not(.empty):not(.served)').first(); const has = await chip.isVisible().catch(() => false);
  if (has) await chip.click(); await page.waitForTimeout(200);
  const r = await page.evaluate(() => ({ seen: window.__hl, hl: [...document.querySelectorAll('.order[data-hl]')].map(o => o.dataset.row), outline: getComputedStyle(document.querySelector('.order[data-hl]') ?? document.body).outlineStyle, sheetOpen: !!document.querySelector('.sheet:not([hidden])') && !matchMedia('(orientation: landscape) and (min-width: 960px)').matches }));
  await page.screenshot({ path: `${OUT}${ENG}-tut1-cardtap-${w}x${h}.png` });
  await page.waitForTimeout(1300); const gone = await page.evaluate(() => document.querySelectorAll('.order[data-hl]').length === 0);
  ok(`TUT-1 docked ${w}x${h}: card tap highlights an order row (outline), clears after ~1.2s`, has && r.seen.length >= 1 && r.hl.length === 1 && r.hl[0] === r.seen[0] && r.outline !== 'none' && gone && !errs.length, { has, ...r, gone, errs });
  await ctx.close();
}
// --- M-1: Sell label on a 181.2B order fits the button padding (blocking in Firefox; info elsewhere) ---
if (sec.includes('m1')) for (const w of [360, 375, 390, 430, 1280]) {
  const { ctx, page, errs } = await open(qa.base, w, w >= 960 ? 800 : 844, DONE, st({ basket: 200_000_000_000, coinsCents: 500_000, collectionLevel: 7, farmLevel: 20, graderTier: 1, workers: { grader: { energy: 100, cdS: 0 } }, customers: [{ id: 3, demand: 181_200_000_000, filled: 0, waitedS: 0 }], nextCustomerId: 4 }));
  await page.waitForFunction(() => window.eggfarm?.state.customers.length > 0, null, { timeout: 20000 }).catch(() => {}); if (w < 960) { await page.locator('[data-nav=market]').click().catch(() => {}); } await page.waitForFunction(() => [...document.querySelectorAll('.order .btn.sell')].some(x => /181\.2B/.test(x.textContent) && x.getClientRects().length), null, { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(600);
  const m = await page.evaluate(() => { const b = [...document.querySelectorAll('.order .btn.sell')].find(x => /181\.2B/.test(x.textContent)); if (!b) return null; const cs = getComputedStyle(b), br = b.getBoundingClientRect();
    const pl = parseFloat(cs.paddingLeft), pr = parseFloat(cs.paddingRight), cl = br.left + pl, cr = br.right - pr;
    const kids = [...b.querySelectorAll('.sk,.sy')].map(e => { const r = e.getBoundingClientRect(); const rg = document.createRange(); rg.selectNodeContents(e); const t = rg.getBoundingClientRect(); return { t: e.textContent, sw: e.scrollWidth, cw: e.clientWidth, textL: t.left, textR: t.right }; });
    return { text: b.textContent, pl, pr, bw: br.width, content: cr - cl, kids, fits: kids.every(k => k.sw <= k.cw + 0.5 && k.textL >= cl - 0.5 && k.textR <= cr + 0.5) }; });
  await page.locator('.order').filter({ hasText: '181.2B' }).first().screenshot({ path: `${OUT}${ENG}-m1-181B-${w}.png` }).catch(() => {});
  ok(`M-1 ${w}: "Sell 181.2B" label inside the button's padding box${ENG === 'firefox' ? '' : ' (info: Firefox is the gate)'}`, !!m?.fits && !errs.length, m, ENG === 'firefox' ? undefined : (m?.fits ? 'PASS' : 'INFO'));
  await ctx.close();
}
// --- B-4: release build ?perf=1 exposes only eggfarmExportTelemetry, no perf overlay ---
if (sec.includes('b4')) { for (const q of ['', '?perf=1', '?perf=1&debug=1&ios=1']) {
  const { ctx, page } = await open(rel.base, 390, 844, DONE, null, q); await page.waitForTimeout(6000);
  const g = await page.evaluate(() => ({ own: Object.keys(window).filter(k => /eggfarm/i.test(k)), ov: document.querySelectorAll('.perf-ov').length, perf: 'eggfarmPerf' in window }));
  ok(`B-4 release ${q || '(no query)'}: window eggfarm* == [eggfarmExportTelemetry], no .perf-ov`, JSON.stringify(g.own) === '["eggfarmExportTelemetry"]' && g.ov === 0 && !g.perf, g);
  if (q) await page.screenshot({ path: `${OUT}${ENG}-b4-release-perf.png` }); await ctx.close(); }
  const leaks = ['eggfarmPerf', 'perf-ov', 'FrameSampler'].filter(s => rel.bundle.includes(s)); ok('B-4 release bundle has no perf overlay code (eggfarmPerf/perf-ov/FrameSampler)', !leaks.length, leaks); }
// --- B-1: coop badge live-rect (badge ~40 -> ~54px) + final copy (only enforced if the B-1 build is present) ---
if (sec.includes('b1')) for (const w of [360, 1280]) {
  const { ctx, page, errs } = await open(qa.base, w, 800, DONE, st({ farmLevel: 13, collectionLevel: 6, coinsCents: 1_500, coop: 999_999, basket: 0, nextCustomerInS: 3, customers: [{ id: 1, demand: 20, filled: 0, waitedS: 0 }], workers: { market_hand: { energy: 100, cdS: 0 } } }));
  await page.waitForTimeout(1000);
  const sample = () => page.evaluate(() => { const f = document.querySelector('#full'), box = f?.parentElement, r = e => { const b = e?.getBoundingClientRect(); return b && { l: +b.left.toFixed(1), t: +b.top.toFixed(1), r: +b.right.toFixed(1), b: +b.bottom.toFixed(1), w: +b.width.toFixed(1) }; };
    const fr = r(f), br = r(box); const inVp = fr && fr.l >= 0 && fr.r <= innerWidth && fr.t >= 0 && fr.b <= innerHeight;
    const hits = fr ? [...document.querySelectorAll('button,[role=tab],#rate,.coins-col')].filter(e => e !== f && !e.contains(f) && !f.contains(e) && e.getClientRects().length).filter(e => { const o = e.getBoundingClientRect(); return Math.min(o.right, fr.r) - Math.max(o.left, fr.l) > 1 && Math.min(o.bottom, fr.b) - Math.max(o.top, fr.t) > 1; }).map(e => e.id || e.className) : [];
    const chip = document.querySelector('.ratechip'); const rate = document.querySelector('#rate');
    return { shown: !!f && !f.hidden, text: f?.textContent.trim(), aria: f?.getAttribute('aria-label'), badge: fr, box: br, inBox: !!(fr && br && fr.l >= br.l - 0.5 && fr.r <= br.r + 0.5 && fr.t >= br.t - 0.5 && fr.b <= br.b + 0.5), inVp, hits,
      chip: chip && !chip.hidden ? chip.textContent.trim() : null, rate: rate?.textContent, rateAria: rate?.getAttribute('aria-label'),
      hints: [...document.querySelectorAll('body *')].filter(e => !e.children.length && e.getClientRects().length && /Collect (eggs|or hire Coop Hand|or refill Coop Hand)|Hire a Coop Hand to collect/.test(e.textContent)).map(e => e.textContent.trim()), fullCount: [...document.querySelectorAll('body *')].filter(e => !e.children.length && e.getClientRects().length && /^Full!$/.test(e.textContent.trim())).length }; });
  const live = []; for (let i = 0; i < 8; i++) { live.push(await sample()); await page.waitForTimeout(750); }
  await page.screenshot({ path: `${OUT}${ENG}-b1-coopfull-${w}.png` }); await page.locator('#full').screenshot({ path: `${OUT}${ENG}-b1-badge-${w}.png` }).catch(() => {});
  const last = live.at(-1), b1in = last.chip !== null || /⚠/.test(last.text ?? '');
  ok(`B-1 live-rect ${w}: coop badge shown, inside its coop box and viewport, no overlap, 8 samples`, live.every(s => s.shown && s.inBox && s.inVp && !s.hits.length) && !errs.length, { widths: live.map(s => s.badge?.w), box: last.box, hits: last.hits, errs });
  console.log('b1', w, JSON.stringify(last));
  const copyOk = /^⚠\uFE0E?\s*Full!$/.test(last.text ?? '') && last.aria === 'Coop full' && /^⚠\uFE0E?\s*Full!$/.test(last.chip ?? '') && /Coop full\.$/.test(last.rateAria ?? '') && last.hints.length === 1 && !last.hints.some(h => /Hire a Coop Hand to collect/.test(h)) && last.fullCount === 2 && (last.badge?.w ?? 0) >= 48;
  ok(`B-1 copy ${w}: badge+chip "⚠ Full!", badge aria "Coop full", rate aria ends "Coop full.", one hint, old tip absent, badge ~54px`, copyOk, { b1BuildPresent: b1in, text: last.text, chip: last.chip, rateAria: last.rateAria, hints: last.hints, w: last.badge?.w }, copyOk ? 'PASS' : (b1in ? 'FAIL' : 'NOT-IN-BUILD'));
  await ctx.close();
}
} catch (e) { ok('qa-extra threw', false, String(e).slice(0, 400)); }
await browser.close(); killAll(); writeFileSync(`${OUT}extra-${ENG}.json`, JSON.stringify(res, null, 1));
const f = res.filter(r => r.kind === 'FAIL'); console.log(f.length ? `FAILS ${f.length}` : 'NO FAILS', ENG, res.map(r => r.kind).join(','));
