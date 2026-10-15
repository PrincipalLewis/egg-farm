// Art & UX rc0 review shots + rotate-prompt checks (art-ux/m3-rotate-portrait-prompt.md §6.2/§6.3). Usage: node scripts/artux-shots.mjs [webkit|chromium]
import { chromium, webkit } from 'playwright-core';
import { spawn } from 'node:child_process'; import { mkdirSync } from 'node:fs';
const eng = process.argv[2] || 'chromium'; const OUT = '../engineering/screenshots/rc0-artux'; mkdirSync(OUT, { recursive: true });
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
  if (want) { const before = await p.evaluate(() => window.eggfarm.state.basket); await p.mouse.click(320, 300); await p.waitForTimeout(200); r.tapBlocked = (await p.evaluate(() => window.eggfarm.state.basket)) === before;
    await p.screenshot({ path: `${OUT}/rotate-prompt-640x360-${eng}.png` }); }
  ok(`rotate prompt ${name}`, r.shown === want && r.inert === want && (!want || r.tapBlocked), r); await ctx.close(); }
// Font credits in Settings
{ const { ctx, p } = await open({ viewport: { width: 360, height: 640 } }, null); await p.locator('[aria-label=Settings], #settingsBtn, .settings').first().click(); await p.waitForTimeout(500);
  const r = await p.evaluate(() => { const e = document.querySelector('.font-credits'); e?.scrollIntoView(); const a = e?.querySelector('a'); return { text: e?.textContent, href: a?.getAttribute('href'), h: a && Math.round(a.getBoundingClientRect().height) }; });
  await p.screenshot({ path: `${OUT}/settings-font-credits-360-${eng}.png` });
  const lic = await (await fetch(`http://127.0.0.1:${port}/fonts/OFL.txt`)).text();
  ok('font credits line + OFL link (44px)', /Fonts: Fredoka © 2016 The Fredoka Project Authors; Nunito © 2014 The Nunito Project Authors\. SIL Open Font License 1\.1\./.test(r.text ?? '') && r.h >= 44 && /SIL OPEN FONT LICENSE/i.test(lic), r); await ctx.close(); }
await br.close(); process.kill(-srv.pid); process.exit(bad ? 1 : 0);
