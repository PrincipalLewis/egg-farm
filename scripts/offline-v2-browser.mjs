// Offline popup v2 browser checks + screenshots (C-AC33/37/38/39). `node scripts/offline-v2-browser.mjs [engine]`, needs dist-qa.
// Run under the box lock: flock /workspace/egg-farm-studio/.browser-test.lock node scripts/offline-v2-browser.mjs chromium
import { chromium, webkit, firefox } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const ENGINE = process.argv[2] ?? 'chromium';
const port = +(process.env.PORT ?? 4291); const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
const killSrv = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch { } };
process.on('exit', killSrv);
await new Promise(r => setTimeout(r, 1500));
const SHOTS = process.env.SHOTS ?? '/workspace/offline-v2-shots'; mkdirSync(SHOTS, { recursive: true });
const browser = ENGINE === 'webkit' ? await webkit.launch() : ENGINE === 'firefox' ? await firefox.launch() : await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const results = []; const ok = (name, pass, info = '') => { results.push({ name, pass: !!pass, info }); if (!pass) process.exitCode = 1; };
async function open(w, h, rm = false) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: rm ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' }); await page.getByText('Tap to start').click();
  await page.waitForFunction(() => window.eggfarm && window.eggfarmUi); await page.waitForTimeout(200);
  return { ctx, page, errors };
}
// Screenshot-only overlay: burns the running build id (Game.build = BUILD_ID) into the top-left corner; checked visible.
const label = async page => { const t = await page.evaluate(() => { let d = document.getElementById('qa-build-label'); if (!d) { d = document.createElement('div'); d.id = 'qa-build-label';
  d.style.cssText = 'position:fixed;left:4px;bottom:4px;z-index:2147483647;background:#000c;color:#fff;font:600 11px/1.2 monospace;padding:2px 5px;border-radius:4px;pointer-events:none'; document.body.append(d); }
  d.textContent = 'build ' + window.eggfarm.build; const r = d.getBoundingClientRect(); const cs = getComputedStyle(d);
  return { text: d.textContent, visible: r.width > 0 && r.left >= 0 && r.bottom <= innerHeight && cs.visibility === 'visible' && cs.zIndex === '2147483647' }; });
  ok(`build label visible (${t.text})`, t.visible && /\+[0-9a-f]{7}$/.test(t.text), JSON.stringify(t)); return t.text; };
const snap = async (page, path) => { await label(page); await page.screenshot({ path }); };
const popup = async (page, eggs, awayS) => {
  await page.evaluate(([e, a]) => { const g = window.eggfarm; g.state = { ...g.state, pendingOfflineEggs: e }; g.offline = { eggs: e, awayS: Math.min(a, 7200), realAwayS: a }; window.eggfarmUi.showWelcome(); }, [eggs, awayS]);
  await page.waitForTimeout(1200);
};
const measure = page => page.evaluate(() => {
  const card = document.querySelector('.welcome-v2'), r = e => e && e.getBoundingClientRect(), btn = document.querySelector('#wbCollect'), cs = getComputedStyle(card);
  const contentW = card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const lines = [...card.children, ...(card.querySelector('.wb-body')?.children ?? [])].filter(e => !e.classList.contains('wb-body')).filter(e => !e.classList.contains('sr') && !e.classList.contains('close'));
  const trunc = lines.some(e => e.scrollWidth > e.clientWidth + 1 || getComputedStyle(e).textOverflow === 'ellipsis');
  const wb = card.querySelector('.wb-body');
  return { bodyScrolls: wb.scrollHeight > wb.clientHeight + 1, contentW, card: r(card).toJSON(), cardSH: card.scrollHeight, cardCH: card.clientHeight, btn: r(btn).toJSON(), a: r(card.querySelector('.wb-a')).toJSON(), hero: r(card.querySelector('.wb-hero')).toJSON(),
    heroText: card.querySelector('#wbN').textContent, rateHidden: card.querySelector('.wb-rate').hidden, text: card.innerText, trunc, vh: innerHeight,
    aria: card.getAttribute('aria-describedby') && document.getElementById(card.getAttribute('aria-describedby')).textContent, btnName: btn.getAttribute('aria-label'),
    cap: card.querySelector('.wb-cap') && getComputedStyle(card.querySelector('.wb-cap')).color, clock: (c => c && { stroke: getComputedStyle(c).stroke, hidden: c.getAttribute('aria-hidden') })(card.querySelector('.wb-cap svg.wb-clock')), heroAnim: getComputedStyle(card.querySelector('.wb-hero')).animationName };
});
for (const [w, h, tag] of [[360, 640, '360x640'], [375, 700, '375x700'], [390, 844, '390x844'], [1280, 800, '1280-docked']]) {
  const { ctx, page, errors } = await open(w, h);
  await popup(page, 1_234_567, 11_520); const m = await measure(page);
  if (ENGINE === 'chromium') await snap(page, `${SHOTS}/offline-v2-capped-1234567-${tag}.png`);
  ok(`C-AC33 ${tag}: line A and hero on separate lines`, m.hero.top >= m.a.bottom - 1, JSON.stringify([m.a, m.hero]));
  ok(`C-AC33 ${tag}: no truncation / ellipsis`, !m.trunc);
  ok(`C-AC33 ${tag}: Collect full width, >= 48px, visible without scrolling`, m.btn.height >= 48 && m.btn.width >= m.contentW - 1 && m.btn.bottom <= m.card.bottom && m.btn.bottom <= m.vh && m.cardSH <= m.cardCH + 1, JSON.stringify([m.btn, m.card, m.cardSH, m.cardCH]));
  ok(`C-AC33 ${tag}: card <= 80% viewport`, m.card.height <= m.vh * 0.8 + 1, `${m.card.height}/${m.vh}`);
  ok(`C-AC29 ${tag}: full digits, no K/M/B, no "no limit"`, m.text.includes('+1,234,567 eggs') && !/\d[KMB]\b/.test(m.text) && !/no limit/i.test(m.text), m.text);
  ok(`C-AC28 ${tag}: cap line + "capped at 2h", never "2h+"`, m.text.includes('Away 3h 12m · capped at 2h') && m.text.includes('Offline limit is 2h. Check in sooner to earn more.') && !m.text.includes('⏱') && m.clock && m.clock.stroke === m.cap && m.clock.hidden === 'true' && !m.text.includes('2h+') && m.cap === 'rgb(138, 85, 40)', m.cap);
  ok(`C-AC37 ${tag}: motion on -> pop + count-up reaches N`, m.heroAnim === 'wbpop' && m.heroText === '+1,234,567 eggs', m.heroAnim + ' ' + m.heroText);
  ok(`C-AC38 ${tag}: accessible text + Collect name`, /Plus 1,234,567 eggs added to your basket\. Worth up to [\d,]+ dollars when sold\. Offline limit is 2 hours\./.test(m.aria) && m.btnName === 'Collect 1,234,567 eggs', m.aria);
  ok(`no page errors ${tag}`, errors.length === 0, errors.join('; '));
  await ctx.close();
}
for (const [sw, sh] of [[360, 420], [320, 568]]) { // short height: the rate line drops first
  const { ctx, page } = await open(sw, sh); await popup(page, 1_234_567, 11_520); const m = await measure(page);
  if (ENGINE === 'chromium') await snap(page, `${SHOTS}/offline-v2-capped-short-${sw}x${sh}.png`);
  if (ENGINE === 'chromium') { await page.evaluate(() => { const b = document.querySelector('.wb-body'); b.scrollTop = b.scrollHeight; }); await page.waitForTimeout(100);
    const capVis = await page.evaluate(() => { const c = document.querySelector('.wb-cap').getBoundingClientRect(), b = document.querySelector('.wb-body').getBoundingClientRect(); return c.top >= b.top - 1 && c.bottom <= b.bottom + 1; });
    ok(`C-AC33 ${sw}x${sh}: cap line reachable by scrolling the body`, capVis); await snap(page, `${SHOTS}/offline-v2-capped-short-${sw}x${sh}-scrolled-cap.png`); }
  ok(`C-AC33 ${sw}x${sh}: card within its max height, rate line dropped first if the body scrolls, Collect pinned and visible`, (!m.bodyScrolls || m.rateHidden) && m.card.height <= (m.vh < 480 ? m.vh - 24 : m.vh * 0.8) + 1 && m.btn.bottom <= m.card.bottom && m.card.bottom - m.btn.bottom <= 40 && m.btn.bottom <= m.vh, JSON.stringify({ r: m.rateHidden, btn: m.btn, vh: m.vh })); await ctx.close();
}
{ // not capped, reduced motion: static number, no pop
  const { ctx, page } = await open(390, 844, true);
  await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, pendingOfflineEggs: 2732 }; g.offline = { eggs: 2732, awayS: 683, realAwayS: 683 }; window.eggfarmUi.showWelcome(); });
  const t0 = await page.evaluate(() => document.querySelector('#wbN').textContent); const m = await measure(page);
  if (ENGINE === 'chromium') await snap(page, `${SHOTS}/offline-v2-uncapped-rm-390x844.png`);
  ok('C-AC37 reduced motion: static N immediately, no pop animation', t0 === '+2,732 eggs' && m.heroAnim === 'none', `${t0} ${m.heroAnim}`);
  ok('C-AC27 uncapped: "Away 11m 23s", no cap text/line', m.text.includes('Away 11m 23s') && !m.text.includes('capped') && !m.text.includes('Offline limit'), m.text);
  const before = await page.evaluate(() => window.eggfarm.state.basket); await page.click('#wbCollect'); await page.waitForTimeout(100);
  const after = await page.evaluate(() => window.eggfarm.state.basket);
  ok('C-AC31 Collect adds exactly N to the Basket', after - before === 2732, `${before} -> ${after}`); await ctx.close();
}
{ // CCR Minor 1 + real hidden path: grant arriving while Settings is open shows when Settings closes, focused
  const { ctx, page } = await open(390, 844); await page.click('#settings'); await page.waitForTimeout(150);
  const r1 = await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, pendingOfflineEggs: 2732 };
    return window.eggfarmUi.welcomeFromHidden({ periodId: 991, startAt: 1, endAt: 2, elapsedMs: 683000, simulatedMs: 0, grantedMs: 683000, eggsGranted: 2732, coinsGranted: 0, capped: false, mode: 'offline-grant' }); });
  const during = await page.evaluate(() => !!document.querySelector('.welcome-v2'));
  await page.keyboard.press('Escape'); await page.waitForTimeout(1300); // count-up done
  const after = await page.evaluate(() => ({ shown: !!document.querySelector('.welcome-v2'), focus: document.activeElement?.id, text: document.querySelector('.welcome-v2')?.innerText ?? '' }));
  ok('CCR Minor 1: hidden grant held while Settings is open, shown + focused when it closes', r1 && !during && after.shown && after.focus === 'wbCollect' && after.text.includes('Away 11m 23s') && after.text.includes('+2,732 eggs'), JSON.stringify({ r1, during, after }));
  const dup = await page.evaluate(() => window.eggfarmUi.welcomeFromHidden({ periodId: 991, startAt: 1, endAt: 2, elapsedMs: 683000, simulatedMs: 0, grantedMs: 683000, eggsGranted: 2732, coinsGranted: 0, capped: false, mode: 'offline-grant' }));
  ok('same periodId again: no second popup', dup === false); await ctx.close();
}
{ // C-AC39 HUD
  const { ctx, page } = await open(360, 640); const vals = [81_240, 100_000, 1_041_237, 99_999_999, 123_456_700, 11_111_100, 80_000_800]; const out = [];
  for (const c of vals) { await page.evaluate(c => { window.eggfarm.state = { ...window.eggfarm.state, coinsCents: c }; window.eggfarmUi.render(); }, c); await page.waitForTimeout(80);
    out.push(await page.evaluate(() => { const e = document.querySelector('#coins'); return { t: e.textContent, w: e.parentElement.getBoundingClientRect().width, tw: e.getBoundingClientRect().width, gw: e.previousElementSibling.getBoundingClientRect().width, pill: e.closest('.pill').getBoundingClientRect().width, tab: getComputedStyle(e).fontVariantNumeric }; }));
    if (ENGINE === 'chromium' && c === 99_999_999) { await page.evaluate(() => { window.eggfarm.state = { ...window.eggfarm.state, basket: 99_999 }; window.eggfarmUi.render(); }); await page.waitForTimeout(80); await snap(page, `${SHOTS}/offline-v2-hud-999999-360x640.png`); } }
  { const bv = [999, 12_345, 999_999, 1_234_567], bo = [];
    for (const n of bv) { await page.evaluate(n => { window.eggfarm.state = { ...window.eggfarm.state, basket: n }; window.eggfarmUi.render(); }, n); await page.waitForTimeout(80);
      bo.push(await page.evaluate(() => { const e = document.querySelector('#basket'); return { t: e.textContent, tw: e.getBoundingClientRect().width, gw: e.previousElementSibling.getBoundingClientRect().width, pill: e.closest('.pill').getBoundingClientRect().width, tab: getComputedStyle(e).fontVariantNumeric }; })); }
    ok('C-AC39 Basket full digits < 1M, short from 1M', bo.map(o => o.t).join('|') === '999|12,345|999,999|1.23M', bo.map(o => o.t).join('|'));
    ok('C-AC39 Basket tabular + slot reserved for 999,999', bo.every(o => o.tab.includes('tabular-nums') && o.tw <= o.gw + 0.5) && bo.slice(0, 3).every(o => Math.abs(o.pill - bo[2].pill) < 0.5), JSON.stringify(bo)); }
  ok('C-AC39 HUD text', out.map(o => o.t).join('|') === '$812.40|$1,000|$10,412|$999,999|$1.23M|$111,111|$800,008', out.map(o => o.t).join('|'));
  ok('C-AC39 equal digit advance (tabular): $111,111 == $800,008 == $999,999 text width', Math.abs(out[5].tw - out[3].tw) < 0.5 && Math.abs(out[6].tw - out[3].tw) < 0.5, [out[5].tw, out[6].tw, out[3].tw].join(','));
  ok('C-AC39 pill width constant $1,000..$999,999 and no value exceeds the $999,999 ghost', [1, 2, 3, 5, 6].every(i => Math.abs(out[i].pill - out[3].pill) < 0.5 && out[i].tw <= out[i].gw + 0.5), out.map(o => `${o.pill}/${o.tw}/${o.gw}`).join(','));
  ok('C-AC39 tabular numerals', out.every(o => o.tab.includes('tabular-nums')));
  ok('C-AC39 slot width constant $1,000..$999,999', Math.abs(out[1].w - out[3].w) < 0.5 && Math.abs(out[2].w - out[3].w) < 0.5, out.map(o => o.w).join(','));
  await ctx.close();
}
await browser.close(); killSrv();
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'} [${ENGINE}] ${r.name}${r.pass ? '' : '  ' + r.info}`);
console.log(`${results.filter(r => r.pass).length}/${results.length} passed (${ENGINE})`);
