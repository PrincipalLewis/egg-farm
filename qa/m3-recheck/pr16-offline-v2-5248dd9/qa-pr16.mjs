// QA PR#16 offline popup v2 @5248dd9. node qa-pr16.mjs <engine> [phase]  (run with cwd=/tmp/qa-pr16-5248dd9; PORT env)
import { chromium, webkit, firefox } from 'playwright-core';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const ENG = process.argv[2] ?? 'chromium', PHASE = process.argv[3] ?? 'all';
const EXPECT = 'm3-rc1-pre+5248dd9';
const OUT = '/workspace/egg-farm-studio/qa/m3-recheck/pr16-offline-v2-5248dd9'; mkdirSync(`${OUT}/shots`, { recursive: true });
const port = +(process.env.PORT ?? 4301), base = `http://127.0.0.1:${port}/`;
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: '/tmp/qa-pr16-5248dd9', stdio: 'ignore', detached: true });
const kill = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch {} }; process.on('exit', kill);
for (let i = 0; i < 80; i++) { try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
const browser = ENG === 'webkit' ? await webkit.launch() : ENG === 'firefox' ? await firefox.launch() : await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const R = []; const ok = (ac, name, pass, info = '') => R.push({ ac, name, pass: !!pass, info: typeof info === 'string' ? info : JSON.stringify(info) });
// Real offline path: take the live save, rewrite farm/coins/savedAt, reload.
async function loadAway(vp, { awayS, farm = 15, coll = 4, coins = 0, rm = false, extra = {} }) {
  const desktop = vp.width >= 960;
  const ctx = await browser.newContext({ viewport: vp, reducedMotion: rm ? 'reduce' : 'no-preference', deviceScaleFactor: desktop ? 1 : 2, hasTouch: !desktop });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(base); const t = page.getByText('Tap to start'); if (await t.count()) await t.first().click();
  await page.waitForFunction(() => window.eggfarm); await page.waitForTimeout(300);
  const bid = await page.evaluate(async X => { for (const sc of document.querySelectorAll('script[src]')) { const t = await (await fetch(sc.src)).text(); const m = t.match(/m3-rc1-pre\+[0-9a-f]{7,}(\+dirty)?/); if (m) return m[0]; } return null; }, EXPECT);
  if (bid !== EXPECT) { console.error('BUILD MISMATCH', bid); process.exit(2); }
  const raw = await page.evaluate(() => localStorage.getItem('eggfarm.save')); await ctx.close();
  const sv = JSON.parse(raw); delete sv.sum; sv.state = { ...sv.state, farmLevel: farm, collectionLevel: coll, coinsCents: coins, basket: 0, coop: 0, pendingOfflineEggs: 0, customers: [], ...extra };
  const ctx2 = await browser.newContext({ viewport: vp, reducedMotion: rm ? 'reduce' : 'no-preference', deviceScaleFactor: desktop ? 1 : 2, hasTouch: !desktop });
  await ctx2.addInitScript(([sv, a]) => { if (sessionStorage.getItem('qaSeeded')) return; sessionStorage.setItem('qaSeeded', '1'); sv.savedAt = Date.now() - a * 1000; localStorage.setItem('eggfarm.save', JSON.stringify(sv)); localStorage.setItem('eggfarm.ui', JSON.stringify({ seenSlots: 5, onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false })); }, [sv, awayS]);
  const page2 = await ctx2.newPage(); page2.on('pageerror', e => errs.push(e.message));
  await page2.goto(base); const t2 = page2.getByText('Tap to start'); if (await t2.count()) await t2.first().click().catch(() => {});
  await page2.waitForTimeout(1400);
  return { ctx: ctx2, page: page2, errs, bid };
}
const M = page => page.evaluate(() => {
  const card = document.querySelector('.welcome-v2'); if (!card) return null;
  const r = e => { const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), b: +b.bottom.toFixed(1), r: +b.right.toFixed(1) }; };
  const vis = e => { const cs = getComputedStyle(e), b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && !e.closest('[hidden]'); };
  const all = [...card.querySelectorAll('*')].filter(vis).filter(e => !e.closest('.sr') && !e.classList.contains('slot-ghost') && !e.closest('.slot-ghost'));
  const clip = all.filter(e => e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0 && !['auto', 'scroll'].includes(getComputedStyle(e).overflowX)).map(e => `${e.tagName}.${e.className} ${e.scrollWidth}>${e.clientWidth}`);
  const ell = all.filter(e => getComputedStyle(e).textOverflow === 'ellipsis').map(e => e.className);
  const lines = [...card.children].filter(e => vis(e) && !e.classList.contains('sr') && !e.classList.contains('close'));
  const ov = []; for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) { const a = lines[i].getBoundingClientRect(), c = lines[j].getBoundingClientRect(); const ix = Math.min(a.right, c.right) - Math.max(a.left, c.left), iy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top); if (ix > 1 && iy > 1) ov.push(`${lines[i].className}x${lines[j].className} ${ix.toFixed(1)}x${iy.toFixed(1)}`); }
  const close = card.querySelector('.close'); const cr = close.getBoundingClientRect(); const lr = lines.map(l => l.getBoundingClientRect());
  const closeOv = lines.filter((l, i) => { const a = lr[i]; return Math.min(a.right, cr.right) - Math.max(a.left, cr.left) > 1 && Math.min(a.bottom, cr.bottom) - Math.max(a.top, cr.top) > 1 && l.innerText.trim(); }).map(l => l.className);
  const btns = [...card.querySelectorAll('button')].filter(vis).map(e => ({ id: e.id || e.className, ...r(e), u44: e.getBoundingClientRect().width < 44 || e.getBoundingClientRect().height < 44 }));
  const cs = getComputedStyle(card), cw = card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const d = document.getElementById(card.getAttribute('aria-describedby')), l = document.getElementById(card.getAttribute('aria-labelledby'));
  return { card: r(card), vw: innerWidth, vh: innerHeight, sh: card.scrollHeight, ch: card.clientHeight, cw, clip, ell, ov, closeOv, btns, text: card.innerText.replace(/\n+/g, ' | '),
    a: r(card.querySelector('.wb-a')), hero: r(card.querySelector('.wb-hero')), heroText: card.querySelector('#wbN').textContent, heroAnim: getComputedStyle(card.querySelector('.wb-hero')).animationName,
    rateHidden: card.querySelector('.wb-rate').hidden, capColor: card.querySelector('.wb-cap') && getComputedStyle(card.querySelector('.wb-cap')).color,
    role: card.getAttribute('role'), modal: card.getAttribute('aria-modal'), label: l?.textContent, desc: d?.textContent, btnName: document.querySelector('#wbCollect').getAttribute('aria-label'),
    focus: document.activeElement?.id || document.activeElement?.className || document.activeElement?.tagName, coins: document.querySelector('#coins')?.textContent };
});
const res = { engine: ENG, build: EXPECT, layout: {}, func: {} };
const SIZES = [[360, 640], [375, 700], [390, 844], [430, 932], [1280, 800], [1024, 474], [1280, 720], [1366, 768]];
if (PHASE === 'all' || PHASE === 'layout') for (const [w, h] of SIZES) {
  const tag = `${w}x${h}`; const { ctx, page, errs } = await loadAway({ width: w, height: h }, { awayS: 11520, farm: 15 });
  // force N=1,234,567 capped (C-AC33 case) via the shipped modal path
  await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, pendingOfflineEggs: 1234567 }; g.offline = { eggs: 1234567, awayS: 7200, realAwayS: 11520 }; window.eggfarmUi.showWelcome(); });
  await page.waitForTimeout(1300); const m = await M(page);
  await page.screenshot({ path: `${OUT}/shots/${ENG}-${tag}-capped-1234567.png` });
  // keyboard: focus trap (Tab x6 stays inside), Esc closes, focus return
  const focusOpen = m.focus;
  await page.locator('#wbCollect').focus(); const inside = [];
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); inside.push(await page.evaluate(() => !!document.activeElement?.closest('.welcome-v2'))); }
  const pend0 = await page.evaluate(() => window.eggfarm.state.pendingOfflineEggs);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({ open: !!document.querySelector('.welcome-v2'), pend: window.eggfarm.state.pendingOfflineEggs, basket: window.eggfarm.state.basket, focus: document.activeElement === document.body ? 'BODY' : (document.activeElement?.id || document.activeElement?.className) }));
  res.layout[tag] = { m, focusOpen, trap: inside, pend0, after, errs };
  const u44 = m.btns.filter(b => b.u44);
  ok('C-AC33/layout', `${tag} no clip/ellipsis`, !m.clip.length && !m.ell.length, m.clip.concat(m.ell));
  ok('layout', `${tag} no overlap (lines, close×)`, !m.ov.length && !m.closeOv.length, m.ov.concat(m.closeOv));
  ok('layout', `${tag} targets >=44`, !u44.length, u44);
  ok('C-AC33', `${tag} Collect full width >=48 visible no scroll, card<=80%`, (() => { const c = m.btns.find(b => b.id === 'wbCollect'); return c.h >= 48 && c.w >= m.cw - 1 && c.b <= m.vh && m.sh <= m.ch + 1 && m.card.h <= m.vh * 0.8 + 1; })(), { btn: m.btns, cw: m.cw, card: m.card, vh: m.vh, sh: m.sh, ch: m.ch });
  ok('C-AC33', `${tag} line A / hero separate lines`, m.hero.y >= m.a.b - 1, [m.a, m.hero]);
  ok('C-AC29', `${tag} full digits, no K/M/B/no limit`, m.text.includes('+1,234,567 eggs') && !/\d[KMB]\b/.test(m.text) && !/no limit/i.test(m.text), m.text);
  ok('aria', `${tag} role=dialog aria-modal, labelled "Welcome back!"`, m.role === 'dialog' && m.modal === 'true' && m.label === 'Welcome back!', [m.role, m.modal, m.label]);
  ok('aria', `${tag} focus on open in dialog`, ['wbCollect', 'icon-btn close'].includes(focusOpen), focusOpen);
  ok('aria', `${tag} focus trap (Tab x6 stays in dialog)`, inside.every(Boolean), inside);
  ok('aria', `${tag} Esc closes (grant kept, no flyers)`, !after.open && after.pend === 0 && after.basket >= pend0, after);
  ok('aria', `${tag} focus return to a meaningful control`, after.focus !== 'BODY', after.focus);
  ok('errors', `${tag} no page errors`, !errs.length, errs);
  await ctx.close();
}
if (PHASE === 'all' || PHASE === 'func') {
  const vp = { width: 390, height: 844 };
  const run = async (name, opts, fn) => { const { ctx, page, errs } = await loadAway(vp, opts); const m = await M(page); await page.screenshot({ path: `${OUT}/shots/${ENG}-func-${name}.png` }); res.func[name] = m; try { await fn(m, page); } catch (e) { ok(name, 'exception', false, e.message); } ok('errors', `${name} no page errors`, !errs.length, errs); await ctx.close(); };
  await run('cac27-671s', { awayS: 671 }, async m => ok('C-AC27', 'real load 671 s L15: "Away 11m 11s", no cap, hero = spec +2,732', m && m.text.includes('Away 11m 11s') && !/capped|Offline limit/.test(m.text) && m.heroText === '+2,732 eggs', m && [m.heroText, m.text]));
  await run('cac28-11520s', { awayS: 11520 }, async m => ok('C-AC28', '3h12m L15: line A, +28,800, cap line accent ⏱, no 2h+', m && m.text.includes('Away 3h 12m · capped at 2h') && m.heroText === '+28,800 eggs' && m.text.includes('⏱ Offline limit is 2h. Check in sooner to earn more.') && !m.text.includes('2h+'), m && [m.heroText, m.capColor, m.text]));
  await run('cac32-7200', { awayS: 7200 }, async m => ok('C-AC32', '7200 s: cap line + capped at 2h', m && m.text.includes('capped at 2h') && m.text.includes('Offline limit'), m?.text));
  await run('cac32-7199', { awayS: 7199 }, async m => ok('C-AC32', '7199 s: neither', m && !m.text.includes('capped') && !m.text.includes('Offline limit'), m?.text));
  await run('cac35-59', { awayS: 59 }, async m => ok('C-AC35', '59 s: no popup', !m, m?.text));
  await run('cac35-neg', { awayS: -300 }, async m => ok('C-AC35', 'negative delta: no popup', !m, m?.text));
  await run('cac30-price', { awayS: 671, coll: 10 }, async (m, page) => {
    const v = await page.evaluate(() => { const s = window.eggfarm.state; return { pend: s.pendingOfflineEggs, priceTxt: [...document.querySelectorAll('*')].filter(e => /\$[\d.,]+\s*(\/|each|per)/.test(e.textContent) && e.children.length === 0).map(e => e.textContent).slice(0, 3) }; });
    const mm = m.text.match(/Worth up to \$([\d,]+(?:\.\d\d)?) when sold/); ok('C-AC30', 'worth line format, no "Coins while away"', !!mm && !/Coins while away/i.test(m.text), [m.text, v]);
    res.func.cac30extra = { worth: mm?.[1], ...v }; });
  await run('cac31-basket', { awayS: 671 }, async (m, page) => { const pend = await page.evaluate(() => window.eggfarm.state.pendingOfflineEggs); const b0 = await page.evaluate(() => window.eggfarm.state.basket);
    await page.click('#wbCollect'); const b1 = await page.evaluate(() => window.eggfarm.state.basket);
    ok('C-AC31', 'sub-line + Basket += N exactly, N > coop 800', m.text.includes('added to your basket') && b1 - b0 === pend && pend > 800, `${b0}->${b1} N=${pend}`); });
  await run('cac34-one', { awayS: 3600, farm: 1 }, async (m, page) => { await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, pendingOfflineEggs: 1 }; g.offline = { eggs: 1, awayS: 671, realAwayS: 671 }; window.eggfarmUi.showWelcome(); }); await page.waitForTimeout(1300); const m2 = await M(page); res.func.cac34b = m2;
    ok('C-AC34', 'N=1: "+1 egg", worth = single egg price', m2.heroText === '+1 egg' && /Worth up to \$\d+\.\d\d when sold/.test(m2.text), m2.text); });
  await run('cac37-motion', { awayS: 11520 }, async m => ok('C-AC37', 'motion on: pop + reaches N', m.heroAnim === 'wbpop' && m.heroText === '+28,800 eggs', [m.heroAnim, m.heroText]));
  { const { ctx, page } = await loadAway(vp, { awayS: 11520, rm: true }); await page.waitForTimeout(0); const m = await M(page);
    ok('C-AC37', 'reduced motion: static N, no pop', m && m.heroAnim === 'none' && m.heroText === '+28,800 eggs', m && [m.heroAnim, m.heroText]); await ctx.close(); }
  { const m = res.func['cac28-11520s']; ok('C-AC38', 'aria text in full + button name', m && /^Welcome back\. Away 3 hours 12 minutes, capped at 2 hours\. Plus 28,800 eggs added to your basket\. Worth up to [\d,]+ dollars when sold\. Offline limit is 2 hours\.$/.test(m.desc) && m.btnName === 'Collect 28,800 eggs' && !/\d[KMB]\b/.test(m.desc), m && [m.desc, m.btnName]); }
  { // C-AC39 HUD
    const { ctx, page } = await loadAway({ width: 360, height: 640 }, { awayS: 0 }); const out = [];
    for (const c of [81240, 100000, 1041237, 99999999, 123456700]) { await page.evaluate(c => { window.eggfarm.state = { ...window.eggfarm.state, coinsCents: c }; window.eggfarmUi.render(); }, c); await page.waitForTimeout(80);
      out.push(await page.evaluate(() => { const e = document.querySelector('#coins'); return { t: e.textContent, slot: e.parentElement.getBoundingClientRect().width, tab: getComputedStyle(e).fontVariantNumeric }; })); }
    res.func.cac39 = out;
    ok('C-AC39', 'HUD $812.40/$1,000/$10,412/$999,999/$1.23M', out.map(o => o.t).join('|') === '$812.40|$1,000|$10,412|$999,999|$1.23M', out.map(o => o.t).join('|'));
    ok('C-AC39', 'tabular + slot width constant $1,000..$999,999', out.every(o => o.tab.includes('tabular')) && Math.max(out[1].slot, out[2].slot, out[3].slot) - Math.min(out[1].slot, out[2].slot, out[3].slot) < 0.5, out); await ctx.close(); }
}
await browser.close(); kill();
writeFileSync(`${OUT}/result-${ENG}-${PHASE}.json`, JSON.stringify({ res, R }, null, 1));
for (const r of R) console.log(`${r.pass ? 'PASS' : 'FAIL'} [${ENG}] ${r.ac} | ${r.name}${r.pass ? '' : '  ' + r.info.slice(0, 400)}`);
console.log(`${R.filter(r => r.pass).length}/${R.length} (${ENG} ${PHASE})`);
