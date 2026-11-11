// Art&UX triage probe. node probe.mjs <engine> <worktree> <sha7> <port> <outdir>
import pw from 'playwright-core'; import { spawn } from 'node:child_process'; import net from 'node:net'; import { writeFileSync } from 'node:fs';
const [ENG, WT, SHA, PORT, OUT] = process.argv.slice(2); const port = +PORT, base = `http://127.0.0.1:${port}/`;
if (port === 4173 || await new Promise(r => { const c = net.connect(port, '127.0.0.1'); c.on('connect', () => { c.destroy(); r(true); }); c.on('error', () => r(false)); })) { console.error('port taken', port); process.exit(3); }
const srv = spawn('npx', ['vite','preview','--outDir','dist-qa','--port',String(port),'--strictPort','--host','127.0.0.1'], { cwd: WT, stdio:'ignore', detached:true });
const kill = () => { try { process.kill(-srv.pid,'SIGTERM'); } catch {} }; setTimeout(() => { kill(); process.exit(2); }, 600_000).unref();
for (let i = 0; i < 60; i++) { try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
const h = await (await fetch(base)).text(); const j = h.match(/assets\/index-[^"]+\.js/)[0]; const bid = ((await (await fetch(base + j)).text()).match(/m\d+-rc[\w-]*\+[0-9a-f]{7,40}/)||[])[0];
console.log('served build', bid); if (!bid?.endsWith(SHA)) { console.error('WRONG BUILD'); kill(); process.exit(4); }
const browser = await pw[ENG].launch(ENG === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {});
const res = { engine: ENG, sha: SHA, build: bid, farm: [], goal: [] };
const DONE = { onboardingDone: true, seenSlots: 10, workersIntroA: true, workersIntroB: true };
const st = (o = {}) => ({ coinsCents: 2_000_000, coop: 0, basket: 0, collectionLevel: 5, farmLevel: 6, customers: [], nextCustomerInS: 600, nextCustomerId: 1, rng: 99, pendingOfflineEggs: 0, celebratedTier: 9, workers: { market_hand: { energy: 100, cdS: 0 } }, graderTier: 0, manageCdS: 0, coopFullS: 0, wageFracCents: {}, ...o });
async function open(w, seed) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, hasTouch: true, deviceScaleFactor: 2 }); const page = await ctx.newPage();
  await page.addInitScript(([u, s]) => { if (sessionStorage.getItem('seeded')) return; localStorage.setItem('eggfarm.ui', JSON.stringify(u)); localStorage.setItem('eggfarm.save', JSON.stringify({ version: 6, savedAt: Date.now(), state: s })); sessionStorage.setItem('seeded', '1'); }, [DONE, seed]);
  await page.goto(base, { timeout: 90_000 }); await page.getByText('Tap to start').click(); await page.waitForFunction(() => window.eggfarm); await page.waitForTimeout(500);
  const wb = page.locator('.modal button, [role=dialog] button').first(); if (await wb.isVisible().catch(() => false)) { await wb.click().catch(() => {}); await page.waitForTimeout(300); }
  const rb = await page.evaluate(() => document.body.innerText.match(/build \w+/)?.[0]); return { ctx, page, rb };
}
const measure = () => { const up = [...document.querySelectorAll('.up')].find(e => e.getClientRects().length && /Farm level/.test(e.textContent)); if (!up) return { noCard: true };
  const R = e => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: +r.left.toFixed(1), t: +r.top.toFixed(1), r: +r.right.toFixed(1), b: +r.bottom.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
  const txt = e => { if (!e) return null; const rg = document.createRange(); rg.selectNodeContents(e); const r = rg.getBoundingClientRect(); return { l: +r.left.toFixed(1), t: +r.top.toFixed(1), r: +r.right.toFixed(1), b: +r.bottom.toFixed(1) }; };
  const ov = (a, c) => a && c ? { x: +Math.max(0, Math.min(a.r, c.r) - Math.max(a.l, c.l)).toFixed(1), y: +Math.max(0, Math.min(a.b, c.b) - Math.max(a.t, c.t)).toFixed(1) } : null;
  const link = up.querySelector('.hint.coop .link'), pb = up.querySelector('.vchip.pb'), meta = up.querySelector('.meta'), eta = up.querySelector('.hint.eta'), btn = up.querySelector('.btn');
  const lt = txt(link), lr = R(link), pr = R(pb);
  return { eta: eta?.textContent.trim() ?? null, placeholderHint: !!up.querySelector('.hint[aria-hidden=true]'), hasLink: !!link, pbText: pb?.textContent.trim(), linkBox: lr, linkGlyphs: lt, pb: pr, meta: R(meta), btn: R(btn), card: R(up),
    ovGlyphsVsPb: ov(lt, pr), ovBoxVsPb: ov(lr, pr), ovGlyphsVsMeta: ov(lt, R(meta)), ovGlyphsVsBtn: ov(lt, R(btn)), linkPos: link && getComputedStyle(link).position, coach: [...document.querySelectorAll('.coach')].filter(c => c.getClientRects().length).map(c => c.textContent.trim().slice(0, 40)) }; };
const cases = [ ['affordable_noETA', { coinsCents: 5_000_000 }], ['unaffordable_withETA', { coinsCents: 1_000 }], ['control_C25_notLimited', { coinsCents: 1_000, collectionLevel: 25 }] ];
if (!process.env.GOAL_ONLY) for (const w of [360, 375, 390]) for (const [name, o] of cases) {
  const { ctx, page, rb } = await open(w, st(o));
  await page.locator('[data-nav=upgrades]').click({ timeout: 5000, force: true }).catch(() => {}); await page.waitForTimeout(400);
  await page.locator('[role=tab][data-tab=farm]').first().click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(700);
  const m = await page.evaluate(measure); m.case = name; m.w = w; m.runtimeBuild = rb; res.farm.push(m); console.log('farm', w, name, JSON.stringify(m));
  await page.screenshot({ path: `${OUT}/${SHA}-${ENG}-farmcard-${name}-${w}.png` }); await ctx.close(); }
if (SHA === '1371305') { const { ctx, page, rb } = await open(360, st({ farmLevel: 12 }));
  const g = await page.evaluate(() => { const l = document.querySelector('.goal-label'); if (!l) return { noLabel: true };
    l.replaceChildren(); const mk = (c, t) => { const s = document.createElement('span'); s.className = c; s.textContent = t; return s; };
    const star = mk('g-star', '★ '), tr = mk('g-track', 'Egg value'), gn = mk('g-gain', ' · +999% income'); l.append(star, tr, gn);
    const c = l.cloneNode(true); c.style.cssText = 'position:absolute;visibility:hidden;width:auto;max-width:none;white-space:nowrap;display:inline-flex'; l.parentElement.append(c); const natural = c.getBoundingClientRect().width; const parts = [...c.children].map(e => +e.getBoundingClientRect().width.toFixed(2)); c.remove();
    const lines = new Set(); for (const s of [star, tr, gn]) { const rg = document.createRange(); rg.selectNodeContents(s); for (const q of rg.getClientRects()) if (q.width) lines.add(Math.round(q.top)); }
    const cs = getComputedStyle(l); return { natural: +natural.toFixed(2), parts, labelW: +l.getBoundingClientRect().width.toFixed(2), clientW: l.clientWidth, scrollW: l.scrollWidth, trackClipped: tr.scrollWidth > tr.clientWidth + 0.5, labelClipped: l.scrollWidth > l.clientWidth + 0.5, lines: lines.size, ws: cs.whiteSpace, ov: cs.overflow, to: cs.textOverflow, font: cs.font, fontsReady: document.fonts.status, fredoka: [...document.fonts].filter(f => /Fredoka/i.test(f.family)).map(f => f.weight + ':' + f.status) }; });
  g.runtimeBuild = rb; res.goal.push(g); console.log('goal', JSON.stringify(g)); await page.locator('.goal-label').evaluate(l => { const k = l.cloneNode(true); window.__k = k; }); await page.locator('.goal').first().screenshot({ path: `${OUT}/${SHA}-${ENG}-goal-eggvalue-360.png` }); g.afterShot = await page.evaluate(() => document.querySelector('.goal-label').textContent); await ctx.close(); }
await browser.close(); kill(); writeFileSync(`${OUT}/${SHA}-${ENG}.json`, JSON.stringify(res, null, 1)); process.exit(0);
