// QA rc0 UI probe @m3-rc0. Usage: PORT=.. ENGINE=chromium|webkit node rc0-ui-probe.mjs <worktree>
// Covers: release inertness (?ios ?perf ?debug), AC14g variants, rotate prompt, OFL link + D1, tap-area grid, big numbers.
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const ROOT = process.argv[2], ENGINE = process.env.ENGINE ?? 'chromium', port = +(process.env.PORT ?? 4600);
const pw = createRequire(ROOT + '/package.json')('playwright-core');
const OUT = '/workspace/egg-farm-studio/qa/m3-rc0/shots/ui-probe'; fs.mkdirSync(OUT, { recursive: true });
const srv = (dir, p) => spawn('npx', ['vite', 'preview', '--outDir', dir, '--port', '' + p, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true, cwd: ROOT });
const S = [srv('dist', port), srv('dist-qa', port + 1)];
for (const p of [port, port + 1]) for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${p}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
const REL = `http://127.0.0.1:${port}/`, QA = `http://127.0.0.1:${port + 1}/`;
const fx = fs.readFileSync(ROOT + '/tests/fixtures/saves/m2-rc1-v5-40min.json', 'utf8');
const br = ENGINE === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const R = []; const ok = (n, p, i) => { R.push({ n, pass: !!p, i }); console.log(`${p ? 'PASS' : 'FAIL'} [${ENGINE}] ${n}${i !== undefined ? ' — ' + JSON.stringify(i) : ''}`); };
const seed = ([raw, ui]) => { if (!sessionStorage.getItem('s')) { if (raw) localStorage.setItem('eggfarm.save', raw); if (ui) localStorage.setItem('eggfarm.ui', ui); sessionStorage.setItem('s', '1'); } };
async function open(url, opt = {}, raw = fx, ui = JSON.stringify({ onboardingDone: true, sessions: 3, seenSlots: 99, workersIntroA: true, workersIntroB: true })) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, ...opt }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.addInitScript(seed, [raw, ui]); await p.goto(url); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm); await p.waitForTimeout(600);
  for (const s of ['#wbCollect', '.modal button.btn']) { const l = p.locator(s).first(); if (await l.isVisible().catch(() => false)) { await l.click().catch(() => {}); await p.waitForTimeout(300); } }
  return { ctx, p, errs };
}
// 1. Release inertness
for (const q of ['?ios=safari', '?ios=chrome', '?ios=standalone']) { const { ctx, p } = await open(REL + q); ok(`release: ${q} inert (no tip on non-iOS UA)`, await p.locator('.ios-tip').count() === 0); await ctx.close(); }
{ const { ctx, p } = await open(REL + '?perf=1'); await p.waitForTimeout(1500); const r = await p.evaluate(() => ({ perfNodes: [...document.querySelectorAll('body *')].filter(e => /p95|perf|fps/i.test(e.id + ' ' + e.className + ' ' + (e.textContent || '').slice(0, 60)) && !e.closest('#app')).map(e => (e.id || e.className) + ':' + (e.textContent || '').slice(0, 40)), res: performance.getEntriesByType('resource').map(x => x.name).filter(n => /frame-sampler|panel/.test(n)) }));
  ok('release: ?perf=1 sampler refused/absent in prod (SM-9 rule)', r.perfNodes.length === 0 && r.res.length === 0, r); await p.screenshot({ path: `${OUT}/release-perf1-${ENGINE}.png` }); await ctx.close(); }
{ const { ctx, p } = await open(REL + '?debug=1'); await p.waitForTimeout(1500); const r = await p.evaluate(() => performance.getEntriesByType('resource').map(x => x.name).filter(n => /panel/.test(n)));
  ok('release: ?debug=1 panel absent in prod (info)', r.length === 0, r); await p.screenshot({ path: `${OUT}/release-debug1-${ENGINE}.png` }); await ctx.close(); }
// 2. AC14g variants on dist-qa (flag on) and real UAs on release
const iphone = pw.devices['iPhone 15'];
for (const [q, want] of [['safari', 'safari'], ['chrome', 'chrome'], ['standalone', null]]) {
  const { ctx, p, errs } = await open(QA + '?ios=' + q); await p.waitForTimeout(800);
  const t = await p.evaluate(() => { const e = document.querySelector('.ios-tip'); return e ? { b: e.dataset.browser, text: e.innerText, role: e.getAttribute('role') } : null; });
  ok(`AC14g qa ?ios=${q}`, want ? t && t.b === want && (want === 'safari' ? /Tap Share\s*,? then Add to Home Screen/.test(t.text.replace(/\s+/g, ' ')) || /Tap Share/.test(t.text) && !/address bar/.test(t.text) : /address bar/.test(t.text)) : !t, { t, errs }); await p.screenshot({ path: `${OUT}/ac14g-${q}-${ENGINE}.png` }); await ctx.close(); }
{ const { ctx, p } = await open(QA + '?ios=safari', {}, fx, JSON.stringify({ onboardingDone: true, sessions: 0 })); ok('AC14g session 1 -> no tip', await p.locator('.ios-tip').count() === 0); await ctx.close(); }
{ const { ctx, p } = await open(REL, { ...iphone }); await p.waitForTimeout(800); ok('AC14g release real iPhone UA -> safari tip', await p.locator('.ios-tip[data-browser=safari]').count() === 1); await ctx.close(); }
// 3. Rotate prompt
const land = { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: ENGINE === 'chromium' };
for (const [n, o, want] of [['phone landscape', land, true], ['tablet landscape 1024x768 touch', { viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: ENGINE === 'chromium' }, false], ['desktop 1280x800', { viewport: { width: 1280, height: 800 } }, false], ['phone portrait', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: ENGINE === 'chromium' }, false]]) {
  const { ctx, p } = await open(REL, o); const r = await p.evaluate(() => { const e = document.getElementById('rotate-prompt'); return { shown: !!e && !e.hidden, role: e?.getAttribute('role'), modal: e?.getAttribute('aria-modal'), name: document.getElementById(e?.getAttribute('aria-labelledby'))?.textContent, desc: document.getElementById(e?.getAttribute('aria-describedby'))?.textContent, focus: document.activeElement?.id, inert: document.getElementById('app').inert, anim: e ? getComputedStyle(e.querySelector('img')).animationName : null }; });
  ok(`rotate: ${n} overlay ${want ? 'shown' : 'absent'}`, r.shown === want, r);
  if (want) {
    ok('rotate: role alertdialog + aria-modal + name/description', r.role === 'alertdialog' && r.modal === 'true' && r.name === 'Turn your phone' && r.desc === 'Egg Farm plays best in portrait.', r);
    ok('rotate: focus moves into prompt; #app inert', r.focus === 'rotate-prompt' && r.inert, r);
    const c0 = await p.evaluate(() => window.eggfarm.state.basket + '|' + window.eggfarm.state.coins); const hit = await p.evaluate(() => { const b = document.getElementById('collect').getBoundingClientRect(); return document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)?.closest('#rotate-prompt') ? 'prompt' : 'app'; });
    await p.mouse.click(422, 195); await p.keyboard.press('Tab'); await p.keyboard.press('Enter'); await p.keyboard.press('Space');
    const f2 = await p.evaluate(() => ({ f: document.activeElement?.id || document.activeElement?.tagName, inApp: !!document.activeElement?.closest('#app') }));
    ok('rotate: input blocked behind (hit-test + Tab/Enter/Space do not reach #app)', hit === 'prompt' && !f2.inApp, { hit, f2 });
    await p.screenshot({ path: `${OUT}/rotate-landscape-${ENGINE}.png` });
    // dismiss = rotate back to portrait; focus should return to previous element
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500);
    const back = await p.evaluate(() => ({ shown: !document.getElementById('rotate-prompt').hidden, inert: document.getElementById('app').inert, focus: document.activeElement?.id || document.activeElement?.tagName }));
    ok('rotate: back to portrait hides prompt, #app interactive, focus not stranded on prompt', !back.shown && !back.inert && back.focus !== 'rotate-prompt', back);
    // focus return from a known element
    await p.locator('#collect').focus(); await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(400); await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
    ok('rotate: focus returns to the control focused before (Collect)', await p.evaluate(() => document.activeElement?.id) === 'collect');
  }
  await ctx.close();
}
{ const { ctx, p } = await open(REL, { ...land, reducedMotion: 'reduce' }); const a = await p.evaluate(() => getComputedStyle(document.querySelector('#rotate-prompt img')).animationName); ok('rotate: prefers-reduced-motion -> no wobble', a === 'none', a); await ctx.close(); }
{ const { ctx, p } = await open(REL, land); const a = await p.evaluate(() => getComputedStyle(document.querySelector('#rotate-prompt img')).animationName); ok('rotate: default motion -> wobble animation present', a === 'rp-wobble', a); await ctx.close(); }
// 4. Font credits + D1 + tap-area grid
async function grid(p, label) {
  return p.evaluate((label) => {
    const sel = 'button, a[href], input, select, [role=button], [role=tab], [tabindex="0"]';
    const els = [...document.querySelectorAll(sel)].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !e.closest('[hidden],[inert]') && r.bottom > 0 && r.top < innerHeight; });
    const out = [];
    for (const e of els) { const rs = [...e.getClientRects()]; const r = e.getBoundingClientRect(); let own = 0, tot = 0, stolen = {}; const step = 1;
      for (let y = Math.ceil(r.top); y < r.bottom; y += step) for (let x = Math.ceil(r.left); x < r.right; x += 2) { if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue; if (!rs.some(q => x >= q.left && x < q.right && y >= q.top && y < q.bottom)) continue; tot++; const h = document.elementFromPoint(x, y); if (h && (h === e || e.contains(h))) own++; else { const k = h ? (h.id ? '#' + h.id : h.tagName + '.' + h.className).slice(0, 40) : 'null'; stolen[k] = (stolen[k] || 0) + 1; } }
      // effective height: longest column of own hits through the centre x
      let eh = 0, run = 0; const cx = r.left + r.width / 2; for (let y = Math.floor(r.top) - 20; y < r.bottom + 20; y += 0.5) { const h = document.elementFromPoint(cx, y); if (h && (h === e || e.contains(h))) { run += 0.5; eh = Math.max(eh, run); } else run = 0; }
      let ew = 0; run = 0; const cy = r.top + r.height / 2; for (let x = Math.floor(r.left) - 20; x < r.right + 20; x += 0.5) { const h = document.elementFromPoint(x, cy); if (h && (h === e || e.contains(h))) { run += 0.5; ew = Math.max(ew, run); } else run = 0; }
      out.push({ label, el: (e.id ? '#' + e.id : e.tagName + '.' + (e.className || '') + (e.textContent || '').trim().slice(0, 20)), w: +r.width.toFixed(1), h: +r.height.toFixed(1), effW: ew, effH: eh, ownPct: tot ? +(100 * own / tot).toFixed(1) : 0, stolen });
    } return out; }, label);
}
const scan = [];
for (const [vw, vh] of [[360, 640], [390, 844], [1280, 800]]) {
  const { ctx, p } = await open(REL, { viewport: { width: vw, height: vh }, hasTouch: vw < 800 });
  scan.push(...await grid(p, `${vw} farm`));
  for (const tab of ['Upgrades', 'Workers', 'Market']) { const t = p.getByRole('tab', { name: new RegExp(tab, 'i') }).first(); if (await t.count()) { await t.click().catch(() => {}); await p.waitForTimeout(300); scan.push(...await grid(p, `${vw} ${tab}`)); } }
  await p.locator('#settings').click(); await p.waitForTimeout(400);
  const lk = p.locator('.font-credits a').first(); await lk.scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
  scan.push(...await grid(p, `${vw} settings`));
  const href = await lk.getAttribute('href'); const tgt = await lk.getAttribute('target');
  const d1 = await p.evaluate(() => { const a = document.querySelector('.font-credits a').getBoundingClientRect(), s = document.getElementById('sReset').getBoundingClientRect(); const h = document.elementFromPoint(a.left + 5, a.bottom - 1); return { linkTop: a.top, linkBottom: a.bottom, resetTop: s.top, overlap: +(a.bottom - s.top).toFixed(2), hitBottom: h && (h.id || h.tagName) }; });
  ok(`D1 re-confirm (${vw}): licence link overlaps #sReset`, d1.overlap > 0, d1); // PASS here = defect still reproduces
  const res = await p.request.get(new URL(href, REL).href); const body = await res.text();
  ok(`font credits (${vw}): link -> OFL.txt bundled, 200, OFL text`, res.status() === 200 && /SIL OPEN FONT LICENSE/i.test(body) && /OFL\.txt$/.test(href), { href, tgt, status: res.status() });
  if (vw === 390) { const [np] = await Promise.all([ctx.waitForEvent('page', { timeout: 4000 }).catch(() => null), lk.click({ position: { x: 5, y: 20 } })]); const u = np ? (await np.waitForLoadState().catch(() => {}), np.url()) : p.url(); ok('font credits: tapping link opens OFL.txt', /OFL\.txt$/.test(u), { u, newTab: !!np }); }
  await p.screenshot({ path: `${OUT}/settings-${vw}-${ENGINE}.png` });
  await ctx.close();
}
fs.writeFileSync(`${OUT}/tap-grid-${ENGINE}.json`, JSON.stringify(scan, null, 1));
const bad = scan.filter(s => s.ownPct > 0 && !/^#s(Sfx|Rm)$/.test(s.el) && (s.effH < 44 || s.effW < 44 || Object.keys(s.stolen).some(k => /^#(s|c|w|r|i)[A-Z]|^#(collect|sellAll|goal|settings)$|^A\./.test(k))));
const key = s => `${s.el}`; const uniq = {}; for (const b of bad) (uniq[key(b)] ??= []).push(`${b.label}: ${b.w}x${b.h} eff ${b.effW}x${b.effH} own ${b.ownPct}% ${JSON.stringify(b.stolen)}`);
ok(`tap grid: ${scan.length} control-instances scanned; all ≥44x44 effective and unobstructed`, bad.length === 0, uniq);
// 5. Big numbers (4 h accelerated not here; format check with huge coins)
{ const { ctx, p } = await open(REL); await p.evaluate(() => { const st=window.eggfarm.state; st.coinsCents = 1e30; st.basket = 1e15; st.coop = 1e12; }); await p.waitForTimeout(1200); const t = await p.evaluate(() => document.body.innerText); const shown = await p.evaluate(() => ({ coins: document.getElementById('coins').textContent, basket: document.getElementById('basket').textContent })); ok('big numbers: coinsCents=1e30, basket=1e15 -> no NaN/Infinity/e+ in UI', !/NaN|Infinity|e\+/.test(t), shown); await p.screenshot({ path: `${OUT}/bignum-${ENGINE}.png` }); await ctx.close(); }
fs.writeFileSync(`${OUT}/results-${ENGINE}.json`, JSON.stringify(R, null, 1));
await br.close(); for (const s of S) { try { process.kill(-s.pid); } catch {} }
console.log(`TOTAL ${R.filter(r => r.pass).length}/${R.length}`);
