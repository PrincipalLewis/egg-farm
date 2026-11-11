// Cut A 8a49d35 layout probe. node probe-layout.mjs <engine> <outdir> <port>  (run from worktree root)
import pw from 'playwright-core'; import { spawn } from 'node:child_process'; import net from 'node:net'; import { writeFileSync } from 'node:fs';
const [ENG, OUTD, PORT] = process.argv.slice(2); const OUT = OUTD + '/'; const port = +PORT, base = `http://127.0.0.1:${port}/`;
if (await new Promise(r => { const c = net.connect(port, '127.0.0.1'); c.on('connect', () => { c.destroy(); r(true); }); c.on('error', () => r(false)); })) { console.error('port taken', port); process.exit(3); }
const srv = spawn('npx', ['vite','preview','--outDir','dist-qa','--port',String(port),'--strictPort','--host','127.0.0.1'], { stdio:'ignore', detached:true });
const kill = () => { try { process.kill(-srv.pid,'SIGTERM'); } catch {} }; setTimeout(() => { kill(); process.exit(2); }, 560_000).unref();
for (let i = 0; i < 120; i++) { try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
{ const h = await (await fetch(base)).text(); const j = h.match(/assets\/index-[^"]+\.js/)[0]; const b = await (await fetch(base + j)).text(); const id = (b.match(/m\d+-rc[\w-]*\+[0-9a-f]{7,40}(\+dirty)?/)||[])[0]; console.log('served build', id); if (id !== 'm3-rc1-pre+8a49d35') { console.error('WRONG BUILD'); kill(); process.exit(4); } }
const browser = await pw[ENG].launch(ENG === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {});
const res = []; const ok = (n, p, info = '') => { res.push({ n, p: !!p, info }); console.log(`${p ? 'PASS' : 'FAIL'} [${ENG}] ${n} — ${typeof info === 'string' ? info : JSON.stringify(info)}`.slice(0, 1200)); };
const UI = { onboardingDone: true, seenSlots: 10, workersIntroA: true, workersIntroB: true, sfx: false };
const st = (o = {}) => ({ coinsCents: 995, coop: 0, basket: 0, collectionLevel: 5, farmLevel: 6, customers: [{ id: 1, demand: 181.2e9, filled: 1.8e6, waitedS: 0 }, { id: 2, demand: 5, filled: 0, waitedS: 0 }, { id: 3, demand: 9.99e6, filled: 1234567, waitedS: 0 }], nextCustomerInS: 1e9, nextCustomerId: 9, rng: 5, pendingOfflineEggs: 0, celebratedTier: 2, workers: {}, graderTier: 0, manageCdS: 0, coopFullS: 0, ...o });
const VP = [[360,800],[375,800],[390,844],[430,932],[1280,800],[1024,474],[1280,720],[1366,768]];
async function open(w, h, s) { const touch = w < 600; const ctx = await browser.newContext({ viewport: { width: w, height: h }, ...(touch ? { hasTouch: true, deviceScaleFactor: 2 } : {}) });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(([u, s]) => { if (sessionStorage.getItem('seeded')) return; localStorage.setItem('eggfarm.ui', JSON.stringify(u)); localStorage.setItem('eggfarm.save', JSON.stringify({ version: 5, savedAt: Date.now(), state: s })); sessionStorage.setItem('seeded', '1'); }, [UI, s]);
  await page.goto(base, { timeout: 90_000 }); await page.getByText('Tap to start').click(); await page.waitForFunction(() => window.eggfarm); await page.waitForTimeout(500);
  return { ctx, page, errs }; }
const scan = () => { const vis = el => { if (!el.getClientRects().length || el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (+cs.opacity === 0 || cs.visibility === 'hidden') return false; } const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
  const de = document.documentElement; const hs = de.scrollWidth > de.clientWidth;
  const over = [...document.querySelectorAll('.order .l1, button, .btn, [role=tab]')].filter(vis).filter(e => e.scrollWidth > e.clientWidth + 0.5).map(e => ({ ox: getComputedStyle(e).overflowX, to: getComputedStyle(e).textOverflow, c: e.className, t: e.textContent.trim().slice(0, 40), sw: e.scrollWidth, cw: e.clientWidth }));
  const small = [...document.querySelectorAll('button, [role=tab], a[href], .link')].filter(vis).filter(e => !e.closest('[aria-hidden=true]')).map(e => { const r = e.getBoundingClientRect(); const b = getComputedStyle(e, '::before'); let h = r.height, w = r.width; if (b.content !== 'none' && b.position === 'absolute') { h = Math.max(h, r.height - parseFloat(b.top || 0) - parseFloat(b.bottom || 0)); w = Math.max(w, r.width - parseFloat(b.left || 0) - parseFloat(b.right || 0)); } return { c: e.className, t: (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 30), w: Math.round(w), h: Math.round(h) }; }).filter(x => x.h < 44 || x.w < 44);
  const need = [...document.querySelectorAll('.order .btn')].filter(vis).map(b => ({ t: b.textContent.trim(), h: Math.round(b.getBoundingClientRect().height * 10) / 10 }));
  return { hs, sw: de.scrollWidth, cw: de.clientWidth, over, small, need }; };
for (const [w, h] of VP) {
  const { ctx, page, errs } = await open(w, h, st());
  // Market / order card (Need state: basket 0)
  if (!(await page.locator('.order .l1').first().isVisible().catch(() => false))) await page.locator('#queue .chip:not(.empty)').first().click({ force: true }).catch(() => {});
  if (!(await page.locator('.order .l1').first().isVisible().catch(() => false))) await page.locator('[data-nav=market]').click({ force: true }).catch(() => {});
  await page.waitForTimeout(500);
  const m = await page.evaluate(scan); await page.screenshot({ path: `${OUT}${ENG}-market-${w}x${h}.png` });
  ok(`layout market ${w}x${h}: no h-scroll, no .l1/button overflow`, !m.hs && !m.over.length, { hs: m.hs, sw: m.sw, cw: m.cw, over: m.over });
  ok(`tap targets market ${w}x${h}: >=44px`, !m.small.length, m.small);
  ok(`Need-state order buttons ${w}x${h}: exactly 44px high`, m.need.length > 0 && m.need.every(x => x.h === 44), m.need);
  // Farm upgrades tab
  for (const sel of ['.sheet .close','button[aria-label=Close]']) { const c = page.locator(sel).first(); if (await c.isVisible().catch(() => false)) { await c.click().catch(() => {}); await page.waitForTimeout(300); break; } }
  if (await page.locator('[data-nav=upgrades]').isVisible().catch(() => false)) await page.locator('[data-nav=upgrades]').click({ force: true }).catch(() => {});
  if (await page.locator('[data-tab=farm]').first().isVisible().catch(() => false)) await page.locator('[data-tab=farm]').first().click().catch(() => {});
  await page.waitForSelector('#uRow .up', { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(400);
  const f = await page.evaluate(scan); await page.screenshot({ path: `${OUT}${ENG}-upgrades-${w}x${h}.png` });
  ok(`layout upgrades/farm ${w}x${h}: no h-scroll, no button overflow`, !f.hs && !f.over.length, { hs: f.hs, over: f.over });
  ok(`tap targets upgrades/farm ${w}x${h}: >=44px`, !f.small.length, f.small);
  // Farm card G-strict overlap (all pairs of visible leaf/text blocks inside the card)
  const fc = await page.evaluate(() => { const card = [...document.querySelectorAll('#uRow .up')].find(e => e.getClientRects().length); if (!card) return null; card.scrollIntoView({ block: 'center' });
    const vis = el => { const r = el.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0) || el.offsetParent === null) return false; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (+cs.opacity === 0 || cs.visibility === 'hidden') return false; } return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
    const parts = [...card.querySelectorAll('.btn, .vchip, .hint, .link, h3, .name, .title, .eff, .cost, .lvl, [class*=chip]')].filter(vis).filter((e, i, a) => !a.some(o => o !== e && o.contains(e)));
    const R = e => { const a = e.getBoundingClientRect(); return [a.left, a.top, a.right, a.bottom]; }; const ov = [];
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) { const a = R(parts[i]), b = R(parts[j]); const x = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), y = Math.min(a[3], b[3]) - Math.max(a[1], b[1]); if (x > 0.5 && y > 0.5) ov.push([parts[i].className, parts[j].className, +x.toFixed(1), +y.toFixed(1)]); }
    const cr = R(card); const out = parts.filter(p => { const r = R(p); return r[0] < cr[0] - 0.5 || r[2] > cr[2] + 0.5 || r[1] < cr[1] - 0.5 || r[3] > cr[3] + 0.5; }).map(p => p.className);
    return { n: parts.map(p => p.className), ov, out, card: cr.map(Math.round), t: card.innerText.replace(/\n+/g, ' | ').slice(0, 200) }; });
  await page.waitForTimeout(200);
  if (fc) { const [x, y, x2, y2] = fc.card; await page.screenshot({ path: `${OUT}${ENG}-farmcard-${w}x${h}.png`, clip: { x: Math.max(0, x - 6), y: Math.max(0, y - 6), width: Math.min(w - Math.max(0, x - 6), x2 - x + 12), height: Math.min(h, y2 - y + 12) } }).catch(() => {}); }
  if (w <= 390) ok(`Farm card G-strict ${w}x${h}: no intersecting visible parts, all inside card`, fc && fc.n.length >= 3 && !fc.ov.length && !fc.out.length, fc);
  else ok(`Farm card G-strict ${w}x${h} (info)`, fc && !fc.ov.length && !fc.out.length, fc);
  // v1.6 goal label wrap
  if (w < 960) { for (const sel of ['.sheet .close','button[aria-label=Close]']) { const c = page.locator(sel).first(); if (await c.isVisible().catch(() => false)) { await c.click().catch(() => {}); await page.waitForTimeout(300); break; } } }
  const g = await page.evaluate(() => { const l = document.querySelector('.goal-label'); if (!l) return null; const tr = l.querySelector('.g-track'), gn = l.querySelector('.g-gain'), sr = l.querySelector('.g-star'); const lines = el => { if (!el) return 0; const s = new Set(); const rg = document.createRange(); rg.selectNodeContents(el); for (const q of rg.getClientRects()) if (q.width > 1) s.add(Math.round(q.top)); return s.size; };
    return { t: l.textContent.replace(/\s+/g, ' ').trim(), ell: /…/.test(l.textContent), trackClip: tr ? tr.scrollWidth > tr.clientWidth + 0.5 : null, gainClip: gn ? gn.scrollWidth > gn.clientWidth + 0.5 : null, gainLines: lines(gn), trackLines: lines(tr), star: sr ? !sr.hidden : null, labelClip: l.scrollWidth > l.clientWidth + 0.5 }; });
  await page.screenshot({ path: `${OUT}${ENG}-goal-${w}x${h}.png` });
  ok(`v1.6 goal label ${w}x${h}: no clip/ellipsis, gain unsplit, track <=2 lines, ★ kept`, g && !g.ell && !g.trackClip && !g.gainClip && !g.labelClip && g.gainLines <= 1 && g.trackLines <= 2 && g.star !== false, g);
  ok(`page errors ${w}x${h}`, !errs.length, errs);
  await ctx.close(); }
await browser.close(); kill();
writeFileSync(`${OUT}layout-${ENG}.json`, JSON.stringify(res, null, 1));
console.log(`${res.filter(r => r.p).length}/${res.length} passed`); process.exit(0);
