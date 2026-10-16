// Art & UX rc0 review shots + rotate-prompt checks (art-ux/m3-rotate-portrait-prompt.md §6.2/§6.3). Usage: node scripts/artux-shots.mjs [webkit|chromium]
import { chromium, webkit } from 'playwright-core';
import { spawn } from 'node:child_process'; import { mkdirSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
const eng = process.argv[2] || 'chromium'; const port = 5100 + Math.floor(Math.random() * 200);
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
// Output folder comes from the served build's version string: engineering/screenshots/artux-<release>-<hash>/.
// Refuses a +dirty build, and any existing folder whose README names a different commit (or has no README).
// OUT= is allowed only if that folder's README names the served build's hash.
const die = m => { console.error(`artux-shots: ${m}`); process.kill(-srv.pid); process.exit(2); };
const html = await (await fetch(`http://127.0.0.1:${port}/`)).text();
const srcs = [...html.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);
let ver = null; for (const u of srcs) { const m = (await (await fetch(`http://127.0.0.1:${port}${u}`)).text()).match(/["'`](m\d+-[a-z0-9-]+)\+([0-9a-f]{7,40})(\+dirty)?["'`]/); if (m) { ver = m; break; } }
if (!ver) die('no version string found in the served build');
const [, release, hash, dirty] = ver; if (dirty) die(`served build ${ver[0]} is +dirty; commit, rebuild (npm run build:qa) and re-run`);
const OUT = process.env.OUT ?? `../engineering/screenshots/artux-${release}-${hash}`;
const README = `${OUT}/README.txt`;
if (existsSync(OUT)) {
  const named = existsSync(README) ? [...readFileSync(README, 'utf8').matchAll(/\b[0-9a-f]{7,40}\b/g)].map(m => m[0]) : [];
  if (!named.some(h => h.startsWith(hash) || hash.startsWith(h))) die(`${OUT} ${existsSync(README) ? `README names ${named.join(', ') || 'no commit'}` : 'has no README'}; served build is ${hash}. Refusing to write.`);
} else if (process.env.OUT) die(`OUT=${OUT} does not exist; OUT= may only target an existing folder whose README names ${hash}`);
else { mkdirSync(OUT, { recursive: true }); writeFileSync(README, `Images from commit ${hash} (build ${release}+${hash}), artux-shots, first written ${new Date().toString()}.\n`); }
console.log(`artux-shots: build ${release}+${hash} -> ${OUT}`);
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
for (const [F, want] of [[19, 'Coop upgraded!'], [24, 'Coop upgraded!']]) { // §4.7 rc1: plain copy, never a '+1 customer slot' suffix
  const { ctx, p } = await open({ viewport: { width: 360, height: 640 } }, null);
  const r = await p.evaluate(async F => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: F, celebratedTier: 0, coinsCents: 1e15, customers: Array.from({ length: 9 }, (_, i) => ({ id: i + 1, demand: 5, filled: 0, waitedS: 0 })), nextCustomerInS: 1e9 };
    await new Promise(r => setTimeout(r, 300)); g.dispatch({ type: 'buyFarm' }); const seen = new Set(); const end = performance.now() + 1500; let top = 0;
    while (performance.now() < end) { await new Promise(r => requestAnimationFrame(r)); const t = document.querySelector('.toast.show'); if (t) { seen.add(t.textContent); top = t.getBoundingClientRect().top; } }
    return { seen: [...seen], toastTop: Math.round(top), stripBottom: Math.round(document.querySelector('.queue').getBoundingClientRect().bottom) }; }, F);
  if (F === 19) await p.screenshot({ path: `${OUT}/toast-below-strip-360-${eng}.png` });
  ok(`F1 toast at F${F + 1}`, r.seen.includes(want) && !r.seen.some(t => /customer slot/.test(t)) && r.toastTop >= r.stripBottom, r); await ctx.close(); }
// Rotate prompt §6.2/§6.3
for (const [name, opt, want] of [['640x360 touch phone', { viewport: { width: 640, height: 360 }, hasTouch: true, isMobile: eng !== 'webkit' || true }, true], ['1024x768 touch tablet', { viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true }, false], ['1280x720 mouse', { viewport: { width: 1280, height: 720 } }, false], ['844x390 mouse', { viewport: { width: 844, height: 390 } }, false]]) {
  const { ctx, p } = await open(opt, null);
  const r = await p.evaluate(() => { const e = document.querySelector('#rotate-prompt'); return { shown: !!e && !e.hidden && getComputedStyle(e).display !== 'none', inert: document.querySelector('#app').inert, coarse: matchMedia('(pointer:coarse)').matches }; });
  if (want) { const before = await p.evaluate(() => window.eggfarm.state.basket); await p.mouse.click(320, 300); await p.waitForTimeout(200); r.tapBlocked = (await p.evaluate(() => window.eggfarm.state.basket)) === before; r.icon = await p.evaluate(() => { const i = document.querySelector('#rotate-prompt img').getBoundingClientRect(); return [Math.round(i.width), Math.round(i.height)]; });
    await p.screenshot({ path: `${OUT}/rotate-prompt-640x360-${eng}.png` }); }
  ok(`rotate prompt ${name}`, r.shown === want && r.inert === want && (!want || (r.tapBlocked && r.icon.join() === '64,64')), r); await ctx.close(); }
// D7: the rotate prompt traps keyboard focus while open and restores it on close
{ const { ctx, p } = await open({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true }, null);
  await p.evaluate(() => document.querySelector('#collect').focus());
  await p.setViewportSize({ width: 640, height: 360 }); await p.waitForSelector('#rotate-prompt:not([hidden])');
  const seen = []; for (const k of ['Tab', 'Tab', 'Shift+Tab', 'Tab']) { await p.keyboard.press(k); seen.push(await p.evaluate(() => document.activeElement?.id || document.activeElement?.tagName)); }
  await p.setViewportSize({ width: 360, height: 640 }); await p.waitForSelector('#rotate-prompt', { state: 'hidden' });
  const back = await p.evaluate(() => document.activeElement?.id);
  ok('D7 rotate prompt traps Tab/Shift+Tab, restores focus to Collect on close', seen.every(x => x === 'rotate-prompt') && back === 'collect', { seen, back }); await ctx.close(); }
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
// rc1-ui review set (Art & UX, Oct 16): 360/375/390/960/1280 x {full queue 9/9, coop L5/L10/L20, toast over open sheet,
// Refill during cooldown, welcome-back sold line}
for (const [w, h] of [[360, 640], [375, 667], [390, 844], [960, 600], [1280, 800]]) {
  const sz = `${w}x${h}`, dock = w >= 960;
  { const { ctx, p } = await open({ viewport: { width: w, height: h } }, () => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 15, celebratedTier: 3, customers: Array.from({ length: 9 }, (_, i) => ({ id: 800 + i, demand: 20 + i, filled: 0, waitedS: i * 3 })), nextCustomerInS: 1e9 }; });
    await p.waitForTimeout(2300); await p.screenshot({ path: `${OUT}/rc1-queue-full-9of9-${sz}-${eng}.png` });
    const r = await p.evaluate(() => { const t = document.querySelector('.qtag').getBoundingClientRect(); return { tag: document.querySelector('.qtag').innerText.trim(), hits: [...document.querySelectorAll('#queue .chip')].map(c => c.getBoundingClientRect()).filter(c => !(t.right <= c.left || c.right <= t.left || t.bottom <= c.top || c.bottom <= t.top)).length }; });
    ok(`rc1-ui full queue tag, no overlap (${sz})`, r.hits === 0 && r.tag === (w < 380 ? 'Full' : 'Queue full'), r); await ctx.close(); }
  for (const [F, tierName] of [[4, 'l5'], [9, 'l10'], [19, 'l20']]) {
    const { ctx, p } = await open({ viewport: { width: w, height: h } }, null);
    await p.evaluate(F => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: F, celebratedTier: F === 4 ? 0 : F === 9 ? 1 : 2, coinsCents: 1e15 }; }, F);
    if (!dock) { await p.locator('[data-nav=upgrades]').click(); }
    await p.locator('[data-tab=farm]').click(); await p.waitForTimeout(400);
    await p.evaluate(() => window.eggfarm.dispatch({ type: 'buyFarm' })); await p.waitForTimeout(350);
    const t = await p.evaluate(() => ({ text: document.querySelector('.toast').textContent, vis: getComputedStyle(document.querySelector('.toast')).visibility }));
    await p.screenshot({ path: `${OUT}/rc1-toast-over-sheet-coop-${tierName}-${sz}-${eng}.png` });
    if (!dock) { await p.locator('.sheet:not([hidden]) .close').click(); }
    await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/rc1-coop-${tierName}-${sz}-${eng}.png` });
    const src = await p.evaluate(() => document.querySelector('#coop').getAttribute('src').split('/').pop());
    ok(`rc1-ui coop ${tierName} + toast over sheet (${sz})`, src === `coop-${tierName}.svg` && t.text === 'Coop upgraded!' && t.vis === 'visible', { src, t }); await ctx.close(); }
  { const { ctx, p } = await open({ viewport: { width: w, height: h } }, () => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 10, coinsCents: 1e9, workers: { market_hand: { energy: 30, cdS: 1 }, coop_hand: { energy: 35, cdS: 1 }, hawker: { energy: 90, cdS: 0 } }, manageCdS: 0 }; });
    await p.evaluate(() => window.eggfarm.dispatch({ type: 'manageAll' })); await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/rc1-refill-cooldown-farm-${sz}-${eng}.png` });
    if (!dock) await p.locator('[data-nav=upgrades]').click(); await p.locator('[data-tab=workers]').click(); await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/rc1-refill-cooldown-workers-${sz}-${eng}.png` });
    const r = await p.evaluate(() => ({ cap: document.querySelector('#refillCap')?.textContent, nav: document.querySelector('[data-act=manageAll].farm-manage-all .nav-lbl')?.textContent }));
    ok(`rc1-ui Refill cooldown (${sz})`, /^Ready in \d+s$/.test(r.cap ?? '') && (dock ? /^Ready in \d+s$/ : /^0:\d\d$/).test(r.nav ?? ''), r); await ctx.close(); }
  { const sv = JSON.stringify({ version: 5, savedAt: Date.now() - 2 * 3600e3, state: { coinsCents: 1e9, coop: 0, basket: 0, collectionLevel: 10, farmLevel: 10, customers: [{ id: 1, demand: 200, filled: 0, waitedS: 0 }, { id: 2, demand: 139, filled: 0, waitedS: 0 }], nextCustomerInS: 1e9, nextCustomerId: 9, rng: 5, pendingOfflineEggs: 0, celebratedTier: 2, workers: { market_hand: { energy: 100, cdS: 0 } }, graderTier: 0, manageCdS: 0, coopFullS: 0 } });
    const ctx = await br.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage();
    await p.addInitScript(sv => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); localStorage.setItem('eggfarm.save', sv); localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true })); }, sv);
    await p.goto(`http://127.0.0.1:${port}/`); await p.getByText('Tap to start').click({ force: true }).catch(() => {}); await p.waitForFunction(() => window.eggfarm); await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/rc1-welcome-sold-line-${sz}-${eng}.png` });
    const line = await p.evaluate(() => document.querySelector('#wbSold')?.textContent);
    ok(`rc1-ui welcome-back sold line (${sz})`, /^Market Hand sold 339 right away/.test(line ?? ''), line); await ctx.close(); }
}
await br.close(); process.kill(-srv.pid); process.exit(bad ? 1 : 0);
