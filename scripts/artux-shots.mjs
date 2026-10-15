// Art & UX rc0 review shots + rotate-prompt checks (art-ux/m3-rotate-portrait-prompt.md §6.2/§6.3). Usage: node scripts/artux-shots.mjs [webkit|chromium]
import { chromium, webkit } from 'playwright-core';
import { spawn } from 'node:child_process'; import { mkdirSync } from 'node:fs';
const eng = process.argv[2] || 'chromium'; const OUT = process.env.OUT ?? '../engineering/screenshots/rc1-pending-artux'; mkdirSync(OUT, { recursive: true });
const port = 5100 + Math.floor(Math.random() * 200);
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
const br = eng === 'webkit' ? await webkit.launch() : await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); let bad = 0;
const ok = (k, v, d) => { if (!v) bad++; console.log(k, v ? 'PASS' : 'FAIL', JSON.stringify(d ?? '')); };
const open = async (opt, st) => { const ctx = await br.newContext(opt); const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, seenSlots: 6 })));
  await p.goto(`http://127.0.0.1:${port}/`); await p.getByText('Tap to start').click({ force: true }).catch(() => {}); await p.waitForFunction(() => window.eggfarm);
  if (st) await p.evaluate(st); await p.waitForTimeout(800); return { ctx, p }; };
const F24 = () => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 24, collectionLevel: 20, basket: 0, customers: Array.from({ length: 10 }, (_, i) => ({ id: 9000 + i, demand: 50 + i, filled: 0, waitedS: i * 2.5 })), nextCustomerInS: 1e9 }; };
// F3: queue at 390x844 (farm strip + Market) ; F2 Sell all disabled copy ; F4 separator
{ const { ctx, p } = await open({ viewport: { width: 390, height: 844 } }, F24); await p.screenshot({ path: `${OUT}/queue-farm-390x844-${eng}.png` });
  await p.evaluate(() => document.querySelector('nav [data-nav=market]').click()); await p.waitForTimeout(600); await p.screenshot({ path: `${OUT}/queue-market-390x844-${eng}.png` });
  const r = await p.evaluate(() => ({ sellAll: document.querySelector('#sellAll').textContent, line: document.querySelector('#mRows .order[data-row] .l1').innerText, chip: document.querySelector('#mRows .queue-more').textContent }));
  ok('F2 disabled Sell all copy', r.sellAll === 'No eggs to sell', r); ok('F4 " · " separator', /eggs\s+·\s\$/.test(r.line.replace(/\u00a0/g, ' ')), r.line); await ctx.close(); }
// F5: strip and Market counts at 360 (4 chips / 4 cards) agree
{ const { ctx, p } = await open({ viewport: { width: 360, height: 640 } }, F24); const strip = await p.evaluate(() => document.querySelector('.queue .chip.more').textContent);
  await p.evaluate(() => document.querySelector('nav [data-nav=market]').click()); await p.waitForTimeout(600);
  const m = await p.evaluate(() => document.querySelector('#mRows .queue-more').textContent); ok('F5 strip "+N" == Market "+N waiting" at 360', strip === m.split(' ')[0], { strip, m }); await ctx.close(); }
// F1: toast below the strip, slot copy only on a slot level
for (const [F, want] of [[19, 'Coop upgraded! +1 customer slot'], [24, 'Coop upgraded!']]) {
  const { ctx, p } = await open({ viewport: { width: 360, height: 640 } }, null);
  const r = await p.evaluate(async F => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: F, celebratedTier: 0, coinsCents: 1e15, customers: Array.from({ length: 9 }, (_, i) => ({ id: i + 1, demand: 5, filled: 0, waitedS: 0 })), nextCustomerInS: 1e9 };
    await new Promise(r => setTimeout(r, 300)); g.dispatch({ type: 'buyFarm' }); const seen = new Set(); const end = performance.now() + 1500; let top = 0;
    while (performance.now() < end) { await new Promise(r => requestAnimationFrame(r)); const t = document.querySelector('.toast.show'); if (t) { seen.add(t.textContent); top = t.getBoundingClientRect().top; } }
    return { seen: [...seen], toastTop: Math.round(top), stripBottom: Math.round(document.querySelector('.queue').getBoundingClientRect().bottom) }; }, F);
  if (F === 19) await p.screenshot({ path: `${OUT}/toast-below-strip-360-${eng}.png` });
  ok(`F1 toast at F${F + 1}`, r.seen.includes(want) && !r.seen.includes(F === 24 ? 'Coop upgraded! +1 customer slot' : '__') && r.toastTop >= r.stripBottom, r); await ctx.close(); }
// Rotate prompt §6.2/§6.3
for (const [name, opt, want] of [['640x360 touch phone', { viewport: { width: 640, height: 360 }, hasTouch: true, isMobile: eng !== 'webkit' || true }, true], ['1024x768 touch tablet', { viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true }, false], ['1280x720 mouse', { viewport: { width: 1280, height: 720 } }, false], ['844x390 mouse', { viewport: { width: 844, height: 390 } }, false]]) {
  const { ctx, p } = await open(opt, null);
  const r = await p.evaluate(() => { const e = document.querySelector('#rotate-prompt'); return { shown: !!e && !e.hidden && getComputedStyle(e).display !== 'none', inert: document.querySelector('#app').inert, coarse: matchMedia('(pointer:coarse)').matches }; });
  if (want) { const before = await p.evaluate(() => window.eggfarm.state.basket); await p.mouse.click(320, 300); await p.waitForTimeout(200); r.tapBlocked = (await p.evaluate(() => window.eggfarm.state.basket)) === before; r.icon = await p.evaluate(() => { const i = document.querySelector('#rotate-prompt img').getBoundingClientRect(); return [Math.round(i.width), Math.round(i.height)]; });
    await p.screenshot({ path: `${OUT}/rotate-prompt-640x360-${eng}.png` }); }
  ok(`rotate prompt ${name}`, r.shown === want && r.inert === want && (!want || (r.tapBlocked && r.icon.join() === '64,64')), r); await ctx.close(); }
// R1: FTUE bubble + Skip hidden while Settings is open, back after it closes (new save, FTUE running)
{ const ctx = await br.newContext({ viewport: { width: 360, height: 640 } }); const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${port}/`); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm); await p.waitForTimeout(600);
  const vis = () => p.evaluate(() => { const o = document.querySelector('.onb'); const sk = document.querySelector('.onb-skip'); return !!o && !o.hidden && getComputedStyle(o).display !== 'none' && !!sk && sk.getBoundingClientRect().width > 0; });
  const before = await vis(); await p.locator('[aria-label=Settings], #settingsBtn, .settings').first().click(); await p.waitForTimeout(400); const during = await vis();
  const t0 = await p.evaluate(() => document.querySelector('.onb-txt')?.textContent);
  await p.screenshot({ path: `${OUT}/r1-settings-over-ftue-360-${eng}.png` });
  const tm = () => p.evaluate(() => window.eggfarmOnb.closedFor); const tA = await tm(); await p.waitForTimeout(1500); const tB = await tm(); // frozen while open
  await p.keyboard.press('Escape'); await p.waitForTimeout(400); const after = await vis();
  // keep the Collect gate closed (coop < eggs/tap) so the step timer runs rather than resetting on an open gate
  await p.evaluate(() => { window.eggfarm.state.coop = 0; }); await p.waitForTimeout(100); const tB2 = await tm(); await p.waitForTimeout(400); await p.evaluate(() => { window.eggfarm.state.coop = 0; }); await p.waitForTimeout(100); const tC = await tm(); // continues after close
  const step = await p.evaluate(() => JSON.parse(localStorage.getItem('eggfarm.ui') || '{}').onboardingDone);
  await p.locator('.onb-skip').click(); await p.waitForTimeout(300); const skipped = await p.evaluate(() => (!window.eggfarmOnb || window.eggfarmOnb.finished) && !document.querySelector('.onb:not([hidden]) .onb-skip'));
  ok('R1 FTUE bubble/Skip hidden under Settings; after close: visible, step timer continues, Skip works', before && !during && after && !step && tB === tA && tC > tB2 && skipped, { before, during, after, tA, tB, tB2, tC, skipped, t0 }); await ctx.close(); }
// R1 (all dialog types): open/close each in turn on one FTUE session; bubble+Skip hidden and timer frozen while open, visible + timer running after close; Skip works at the end
{ const ctx = await br.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: eng === 'chromium' }); const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${port}/`); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm && window.eggfarmOnb); await p.waitForTimeout(500);
  const vis = () => p.evaluate(() => { const o = document.querySelector('.onb'); const sk = document.querySelector('.onb-skip'); return !!o && !o.hidden && getComputedStyle(o).display !== 'none' && !!sk && sk.getBoundingClientRect().width > 0; });
  const hold = () => p.evaluate(() => { window.eggfarm.state.coop = 0; }); // keep the Collect gate closed so the step timer runs
  const tm = () => p.evaluate(() => window.eggfarmOnb.closedFor);
  const kinds = {
    settings: [async () => { await p.locator('[aria-label=Settings], #settingsBtn, .settings').first().click(); }, async () => { await p.keyboard.press('Escape'); }],
    'save recovery': [async () => { await p.evaluate(() => { window.eggfarmQaRecovery(); }); await p.waitForSelector('.recovery-layer'); }, async () => { await p.locator('#rcGo').click(); await p.waitForSelector('.recovery-layer', { state: 'detached' }); }],
    'rotate prompt': [async () => { await p.setViewportSize({ width: 640, height: 360 }); await p.waitForSelector('#rotate-prompt:not([hidden])'); }, async () => { await p.setViewportSize({ width: 360, height: 640 }); await p.waitForSelector('#rotate-prompt', { state: 'hidden' }); }],
    alertdialog: [async () => { await p.evaluate(() => { const d = document.createElement('div'); d.id = 'qa-ad'; d.setAttribute('role', 'alertdialog'); d.textContent = 'QA'; document.body.append(d); }); }, async () => { await p.evaluate(() => document.querySelector('#qa-ad').remove()); }],
  };
  const res = {};
  for (const [k, [openD, closeD]] of Object.entries(kinds)) {
    await hold(); await p.waitForTimeout(100); await openD(); await p.waitForTimeout(300); const during = await vis(); const tA = await tm(); await p.waitForTimeout(800); const tB = await tm();
    await closeD(); await p.waitForTimeout(300); await hold(); const after = await vis(); const tC = await tm(); await p.waitForTimeout(500); await hold(); const tD = await tm();
    res[k] = { during, after, frozen: tA === tB, runs: tD > tC, step: await p.evaluate(() => window.eggfarmOnb.step) };
  }
  await p.locator('.onb-skip').click(); await p.waitForTimeout(300); const skipped = await p.evaluate(() => (!window.eggfarmOnb || window.eggfarmOnb.finished) && !document.querySelector('.onb:not([hidden]) .onb-skip'));
  const good = Object.values(res).every(r => !r.during && r.after && r.frozen && r.runs && r.step === 0);
  ok('R1 every dialog type (Settings, save recovery, rotate prompt, alertdialog): hidden+frozen while open, visible+running after, Skip works', good && skipped, { ...res, skipped }); await ctx.close(); }
// Font credits in Settings
{ const { ctx, p } = await open({ viewport: { width: 360, height: 640 } }, null); await p.locator('[aria-label=Settings], #settingsBtn, .settings').first().click(); await p.waitForTimeout(500);
  const r = await p.evaluate(() => { const e = document.querySelector('.font-credits'); e?.scrollIntoView(); const a = e?.querySelector('a'); const rs = a ? [...a.getClientRects()] : []; const range = document.createRange(); range.selectNodeContents(e); const lines = new Set([...range.getClientRects()].map(x => Math.round(x.top))).size;
    const words = [...e.childNodes].length; return { text: e?.textContent, href: a?.getAttribute('href'), h: a && Math.round(Math.min(...rs.map(x => x.height))), tag: e?.tagName, blocks: e ? [...e.children].filter(c => c.tagName !== 'A' && getComputedStyle(c).display !== 'inline').length : -1, authorsAlone: /\n\s*Authors\./.test(e?.innerText ?? '') }; });
  await p.screenshot({ path: `${OUT}/settings-font-credits-360-${eng}.png` });
  // D1: link box >=44px tall, no overlap with Reset save, and taps at its corners land on the link
  const d1 = await p.evaluate(() => { const a = document.querySelector('.font-credits a'); a.scrollIntoView({ block: 'center' }); const b = a.getBoundingClientRect(); const rs = document.querySelector('#sReset').getBoundingClientRect();
    const overlap = !(b.right <= rs.left || rs.right <= b.left || b.bottom <= rs.top || rs.bottom <= b.top);
    const pts = [[b.left + 1, b.top + 1], [b.right - 1, b.top + 1], [b.left + 1, b.bottom - 1], [b.right - 1, b.bottom - 1]];
    const hits = pts.map(([x, y]) => document.elementFromPoint(x, y)?.closest('a') === a);
    return { box: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)], reset: [Math.round(rs.left), Math.round(rs.top), Math.round(rs.width), Math.round(rs.height)], display: getComputedStyle(a).display, overlap, hits }; });
  ok('D1 OFL link inline-block >=44px, no overlap with Reset save, corner taps land on it', d1.display === 'inline-block' && d1.box[3] >= 44 && !d1.overlap && d1.hits.every(Boolean), d1);
  const lic = await (await fetch(`http://127.0.0.1:${port}/fonts/OFL.txt`)).text();
  ok('R2/R4 font credits: one <p>, link with >=44px tap target, OFL ships', /Fonts: Fredoka © 2016 The Fredoka Project Authors; Nunito © 2014 The Nunito Project Authors\. SIL Open Font License 1\.1\./.test(r.text ?? '') && r.h >= 44 && r.tag === 'P' && r.blocks === 0 && !r.authorsAlone && /SIL OPEN FONT LICENSE/i.test(lic), r); await ctx.close(); }
await br.close(); process.kill(-srv.pid); process.exit(bad ? 1 : 0);
