// QA Cut A probe @1371305. node scripts/qa-cuta.mjs <engine> <outdir> <port>
import pw from 'playwright-core'; import { spawn } from 'node:child_process'; import net from 'node:net'; import { writeFileSync } from 'node:fs';
const [ENG, OUTD, PORT] = process.argv.slice(2); const OUT = OUTD + '/'; const port = +PORT, base = `http://127.0.0.1:${port}/`;
if (await new Promise(r => { const c = net.connect(port, '127.0.0.1'); c.on('connect', () => { c.destroy(); r(true); }); c.on('error', () => r(false)); })) { console.error('port taken', port); process.exit(3); }
const srv = spawn('npx', ['vite','preview','--outDir','dist-qa','--port',String(port),'--strictPort','--host','127.0.0.1'], { stdio:'ignore', detached:true });
const kill = () => { try { process.kill(-srv.pid,'SIGTERM'); } catch {} }; setTimeout(() => { kill(); process.exit(2); }, 900_000).unref();
await new Promise(r => setTimeout(r, 3000));
{ const h = await (await fetch(base)).text(); const j = h.match(/assets\/index-[^"]+\.js/)[0]; const b = await (await fetch(base + j)).text(); const id = (b.match(/m\d+-rc[\w-]*\+[0-9a-f]{7,40}/)||[])[0]; console.log('served build', id); if (!id?.endsWith('1371305')) { console.error('WRONG BUILD'); kill(); process.exit(4); } }
const browser = await pw[ENG].launch(ENG === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {});
const res = []; const ok = (n, p, info = '') => { res.push({ n, p: !!p, info }); console.log(`${p ? 'PASS' : 'FAIL'} [${ENG}] ${n} — ${typeof info === 'string' ? info : JSON.stringify(info)}`.slice(0, 900)); };
const DONE0 = 0; const DONE = { onboardingDone: true, seenSlots: 10, workersIntroA: true, workersIntroB: true };
async function open(w, ui = DONE, seed = null) {
  const desk = w >= 960; const ctx = await browser.newContext(desk ? { viewport: { width: w, height: 800 } } : { viewport: { width: w, height: 800 }, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(([u, s]) => { if (sessionStorage.getItem('seeded')) return; localStorage.setItem('eggfarm.ui', JSON.stringify(u)); if (s) localStorage.setItem('eggfarm.save', JSON.stringify({ version: 6, savedAt: Date.now(), state: s })); sessionStorage.setItem('seeded', '1'); }, [ui, seed]);
  await page.goto(base, { timeout: 90_000 }); await page.getByText('Tap to start').click(); await page.waitForFunction(() => window.eggfarm); await page.waitForTimeout(400);
  const wb = page.locator('.modal button, [role=dialog] button').first(); if (await wb.isVisible().catch(() => false)) { await wb.click().catch(() => {}); await page.waitForTimeout(300); }
  return { ctx, page, errs, desk };
}
const st = (o = {}) => ({ coinsCents: 2_000_000, coop: 0, basket: 0, collectionLevel: 5, farmLevel: 12, customers: [], nextCustomerInS: 600, nextCustomerId: 1, rng: 99, pendingOfflineEggs: 0, celebratedTier: 9, workers: { market_hand: { energy: 100, cdS: 0 } }, graderTier: 0, manageCdS: 0, coopFullS: 0, wageFracCents: {}, ...o });
const scanTap = () => { const out = []; for (const el of document.querySelectorAll('body *')) { if (el.children.length) continue; const t = el.textContent.trim(); if (!/\/tap/.test(t) || !el.getClientRects().length) continue; const card = el.closest('.card,.row,li,button,.up,.goal,[class*=upg]') ?? el.parentElement; const ct = card.textContent.replace(/\s+/g, ' '); const iTap = ct.search(/\+?\d+\s*(eggs)?\/tap/), iPrice = ct.search(/egg price|% income|% price|Egg price/); out.push({ t, ct: ct.slice(0, 160), bare: /^\+?\d+\s*(eggs)?\/tap$/.test(t) && iPrice < 0, priceFirst: iPrice >= 0 && iPrice < iTap }); } return out; };
const scanClip = () => { const out = []; for (const el of document.querySelectorAll('body *')) { const r = el.getBoundingClientRect(); if (!r.width || el.closest('.sr') || !el.textContent.trim() || el.closest('[hidden],[aria-hidden=true]')) continue; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue; const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!own) continue; if ((cs.overflow.includes('hidden') || cs.textOverflow === 'ellipsis' || cs.overflowX === 'hidden') && el.scrollWidth > el.clientWidth + 1) out.push({ cls: el.className, t: el.textContent.trim().slice(0, 60), sw: el.scrollWidth, cw: el.clientWidth }); if (/…$/.test(el.textContent.trim()) && !/^…/.test(el.textContent.trim())) out.push({ cls: el.className, ellipsisText: el.textContent.trim().slice(0, 60) }); }
  const btns = [...document.querySelectorAll('button,[role=tab]')].filter(b => b.getClientRects().length && getComputedStyle(b).visibility !== 'hidden' && !b.closest('[hidden]')).map(b => ({ b, r: b.getBoundingClientRect() })).filter(({ b, r }) => { const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return h && (b === h || b.contains(h)); }); const ov = [];
  for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) { const a = btns[i].r, c = btns[j].r; if (btns[i].b.contains(btns[j].b) || btns[j].b.contains(btns[i].b)) continue; const x = Math.min(a.right, c.right) - Math.max(a.left, c.left), y = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top); if (x > 1 && y > 1) ov.push([btns[i].b.className + ':' + btns[i].b.textContent.trim().slice(0, 20), btns[j].b.className + ':' + btns[j].b.textContent.trim().slice(0, 20), +x.toFixed(1), +y.toFixed(1)]); }
  return { clip: out, ov, hscroll: document.documentElement.scrollWidth > innerWidth + 1 }; };
const closeSheet = async p => { for (const sel of ['.sheet .close','button[aria-label=Close]','.close']) { const c = p.locator(sel).first(); if (await c.isVisible().catch(() => false)) { await c.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(400); return; } } };
const goTab = async (p, t) => { const desk = (p.viewportSize()?.width ?? 0) >= 960;
  if (t === 'farm-tab') t = 'farm_'; if (t === 'farm') { if (!desk) await closeSheet(p); return true; }
  if (t === 'market') { if (desk) return true; await closeSheet(p); await p.locator('[data-nav=market]').click({ timeout: 5000, force: true }); await p.waitForTimeout(500); return true; }
  if (!desk && !(await p.locator('[role=tab][data-tab=collection]').first().isVisible().catch(() => false))) { await closeSheet(p); await p.locator('[data-nav=upgrades]').click({ timeout: 5000, force: true }); await p.waitForTimeout(400); }
  const tb = p.locator(`[role=tab][data-tab=${t === 'farm_' ? 'farm' : t}]`).first(); if (!(await tb.isVisible().catch(() => false))) return false; await tb.click({ timeout: 5000 }); await p.waitForTimeout(500); return true; };

for (const w of [360, 1280]) {
  // 1. layout + C-AC26 scan on every tab (mid-game save)
  { const { ctx, page, errs } = await open(w, DONE, st());
    for (const t of ['farm', 'market', 'collection', 'upgfarm', 'workers']) { const went = await goTab(page, t === 'upgfarm' ? 'farm-tab' : t); const s = await page.evaluate(scanClip), tap = await page.evaluate(scanTap);
      ok(`layout ${t} ${w}: no clipped/ellipsised text, no button overlap, no h-scroll`, went && !s.clip.length && !s.ov.length && !s.hscroll, went ? s : 'tab not found');
      if (tap.length) ok(`C-AC26 ${t} ${w}: every "/tap" surface leads with price, none bare`, tap.every(x => !x.bare && x.priceFirst), tap);
      await page.screenshot({ path: `${OUT}${ENG}-${t}-${w}.png` }); }
    const goal = await page.evaluate(() => { const l = document.querySelector('.goal-label'); return l && { t: l.textContent, star: !l.querySelector('.g-star')?.hidden }; }); console.log('goal', w, JSON.stringify(goal));
    ok(`page errors ${w}`, !errs.length, errs); await ctx.close(); }
  // 2. C-AC26/26b goal strip at Collection L25 (state from selectGoal search: F30, grader 5, all workers)
  { const W4 = { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 }, hawker: { energy: 100, cdS: 0 }, grader: { energy: 100, cdS: 0 } };
    const { ctx, page } = await open(w, DONE, st({ collectionLevel: 24, farmLevel: 30, graderTier: 5, coinsCents: 0, workers: W4 }));
    if (w < 960) await closeSheet(page); await page.waitForTimeout(800);
    const found = await page.evaluate(() => { const l = document.querySelector('.goal-label'); const t = l?.textContent ?? ''; if (!l || !/L25/.test(t)) return { notFound: t }; const tr = l.querySelector('.g-track'), gn = l.querySelector('.g-gain'), sr = l.querySelector('.g-star');
      const c = l.cloneNode(true); c.style.cssText = 'position:absolute;visibility:hidden;width:auto;max-width:none;white-space:nowrap;display:inline-flex'; c.querySelector('.g-star').hidden = false; c.querySelector('.g-track').textContent = 'Collection L25'; l.parentElement.append(c); const natural = c.getBoundingClientRect().width; c.remove();
      return { t, starShown: !sr.hidden, track: tr.textContent, trackClipped: tr.scrollWidth > tr.clientWidth + 0.5, gain: gn.textContent, gainClipped: gn.scrollWidth > gn.clientWidth + 0.5, labelW: l.getBoundingClientRect().width, labelCW: l.clientWidth, natural }; });
    console.log('L25', w, JSON.stringify(found)); await page.screenshot({ path: `${OUT}${ENG}-goal-L25-${w}.png` });
    if (found.notFound !== undefined) ok(`C-AC26b L25 goal strip ${w}: goal shows Collection L25`, false, found);
    else { const t = found.t;
      ok(`C-AC26 L25 strip ${w}: price/income effect present, no bare +5/tap`, /% income/.test(t) && !/\/tap/.test(t), t);
      ok(`C-AC26b L25 strip ${w}: % gain not cut, track not shortened/ellipsised`, !found.gainClipped && !found.trackClipped && /Collection L25/.test(found.track), found);
      ok(`L25 strip ${w}: ★ kept`, found.starShown, found); }
    await ctx.close(); }
  // 3. AC-R8 / AC-R9 refill captions and plurals
  { const { ctx, page } = await open(w, DONE, st({ workers: { market_hand: { energy: 20, cdS: 0 }, coop_hand: { energy: 20, cdS: 0 }, hawker: { energy: 100, cdS: 0 } }, farmLevel: 20 }));
    await goTab(page, 'workers'); await page.waitForTimeout(600);
    const two = await page.evaluate(() => ({ txt: (document.querySelector('#uRow .manage-all')?.textContent ?? '') + '|' + document.body.innerText, arias: [...document.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')).filter(a => /tired/.test(a)) }));
    console.log('R9', w, JSON.stringify(two.txt.slice(0, 120))); ok(`AC-R9 N=2 ${w}: "Refill 2 tired workers" present`, (two.txt + two.arias.join('|')).includes('Refill 2 tired workers'), two.arias);
    await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, workers: { ...g.state.workers, coop_hand: { energy: 100, cdS: 0 } } }; }); await page.waitForTimeout(1200);
    const one = await page.evaluate(() => ({ txt: (document.querySelector('#uRow .manage-all')?.textContent ?? '') + '|' + document.body.innerText, arias: [...document.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')).filter(a => /tired/.test(a)), cap: [...document.querySelectorAll('*')].filter(e => !e.children.length && /Rested, refill below 40%|Ready in \d+s/.test(e.textContent)).map(e => e.textContent.trim()) }));
    ok(`AC-R9 N=1 ${w}: "Refill 1 tired worker", never "1 tired workers"`, (one.txt + one.arias.join('|')).includes('Refill 1 tired worker') && !/1 tired workers/.test(one.txt + one.arias.join('|')), one.arias);
    ok(`AC-R8 ${w}: rested worker (>40%) shows "Rested, refill below 40%"`, one.cap.includes('Rested, refill below 40%'), one.cap);
    await page.screenshot({ path: `${OUT}${ENG}-refill-${w}.png` }); await ctx.close(); }
  // 4. T6 HUD rate text vs aria + 5. full coop silent stall (Claude Gamer #1)
  { const { ctx, page } = await open(w, DONE, st({ farmLevel: 13, collectionLevel: 6, coinsCents: 1_500, coop: 999_999, basket: 0, nextCustomerInS: 3, customers: [{ id: 1, demand: 20, filled: 0, waitedS: 0 }], workers: { market_hand: { energy: 100, cdS: 0 } } }));
    const samp = []; for (let i = 0; i < 6; i++) { samp.push(await page.evaluate(() => { const r = document.querySelector('#rate'); return { t: r.textContent, a: r.getAttribute('aria-label') }; })); await page.waitForTimeout(700); }
    const num = s => { const m = (s.t.match(/[\d,.]+/) || [''])[0].replace(/,/g, ''); return m; };
    ok(`T6 ${w}: HUD rate text and aria carry the same number`, samp.every(s => !num(s) || s.a.replace(/,/g, '').includes(num(s)) || (/zero/.test(s.a) && /\$0/.test(s.t))), samp);
    const a = await page.evaluate(() => { const g = window.eggfarm, c = document.querySelector('#collect'), cs = getComputedStyle(c), full = document.querySelector('#full'); return { coins: g.state.coinsCents, coop: g.state.coop, fullShown: full && !full.hidden, collect: c.textContent.trim(), cls: c.className, dis: c.disabled || c.getAttribute('aria-disabled'), op: cs.opacity, bg: cs.backgroundColor, rate: document.querySelector('#rate').textContent, goal: document.querySelector('#goal')?.textContent.replace(/\s+/g, ' ').trim() }; });
    await page.screenshot({ path: `${OUT}${ENG}-coopfull-t0-${w}.png` });
    await page.waitForTimeout(20_000);
    const b2 = await page.evaluate(() => { const g = window.eggfarm; return { coins: g.state.coinsCents, coop: g.state.coop, rate: document.querySelector('#rate').textContent, goal: document.querySelector('#goal')?.textContent.replace(/\s+/g, ' ').trim(), hint: [...document.querySelectorAll('.toast,.coach,.hint,[role=status]')].map(e => e.textContent.trim()).filter(Boolean) }; });
    await page.screenshot({ path: `${OUT}${ENG}-coopfull-t20-${w}.png` });
    const info = { t0: a, t20: b2 };
    console.log('coopfull', w, JSON.stringify(info));
    const positive = /^\+|^\$|▲/.test(a.rate.trim()) && !/−|-|▼/.test(a.rate);
    ok(`Claude-G1 ${w}: coop full + no sales — top bar is not positive while money falls`, !(positive && b2.coins < a.coins), info);
    ok(`Claude-G1 ${w}: coop full — Collect does not look like a normal +N action / full state is explained`, !(a.fullShown && /Collect \+\d/.test(a.collect) && a.op === '1'), info);
    ok(`Claude-G1 ${w}: goal ETA not frozen while money falls`, !(b2.coins < a.coins && a.goal === b2.goal && /~|in/.test(a.goal)), info);
    await ctx.close(); }
  // 6. Workers-get-tired tooltip vs tab bar (Claude Gamer #3) + 7. Farm card (Claude Gamer #6)
  { const { ctx, page } = await open(w, { onboardingDone: true, seenSlots: 10, workersIntroA: true }, st({ workers: {}, farmLevel: 6, coinsCents: 5_000_000 }));
    await page.evaluate(() => window.eggfarm.dispatch({ type: 'hire', worker: 'market_hand' }));
    let coach = null; for (let i = 0; i < 20 && !coach; i++) { await page.waitForTimeout(150); coach = await page.evaluate(() => { const c = [...document.querySelectorAll('.coach')].find(e => /tired/.test(e.textContent)); if (!c) return null; const r = c.getBoundingClientRect(); const hits = [...document.querySelectorAll('[role=tab],[data-nav],.tabs button')].filter(t => t.getClientRects().length).map(t => { const q = t.getBoundingClientRect(); return { t: t.textContent.trim().slice(0, 14), ov: Math.max(0, Math.min(r.right, q.right) - Math.max(r.left, q.left)) * Math.max(0, Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top)) }; }).filter(x => x.ov > 4); return { r: [r.left, r.top, r.width, r.height].map(Math.round), hits }; }); }
    if (coach) await page.screenshot({ path: `${OUT}${ENG}-tired-tip-${w}.png` });
    ok(`Claude-G3 ${w}: "Workers get tired" tip does not cover tabs`, coach && !coach.hits.length, coach ?? 'tip not shown');
    await page.waitForTimeout(4000); await goTab(page, 'farm-tab');
    const farm = await page.evaluate(() => { const el = [...document.querySelectorAll('.up')].find(e => e.getClientRects().length); if (!el) return null; const r = el.getBoundingClientRect(); el.scrollIntoView({ block: 'center' }); const lines = new Set(); const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) { if (!n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const q of rg.getClientRects()) lines.add(Math.round(q.top / 4)); } return { h: Math.round(r.height), w: Math.round(r.width), lines: lines.size, t: el.innerText.replace(/\n+/g, ' | ').slice(0, 260) }; });
    await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}${ENG}-farmcard-${w}.png` });
    console.log('farmcard', w, JSON.stringify(farm));
    ok(`Claude-G6 ${w}: Farm card <= 4 text lines (info)`, farm && farm.lines <= 4, farm); await ctx.close(); }
}
await browser.close(); kill();
writeFileSync(`${OUT}cuta-${ENG}.json`, JSON.stringify(res, null, 1));
console.log(`${res.filter(r => r.p).length}/${res.length} passed`); process.exit(0);
