// M41-9 evidence shots for Art (art-ux/number-format-big.md §6): money pill, Sell button, upgrade-row cost, eggs counter and the
// order card (WebKit "eggs" drop) at $999.9Dc / $1.23e36 / $1.00e36 plus a >= $1e15 coin pop, at 360/375/390/1280.
// Cloned from scripts/artux-shots.mjs (dist-qa build with the window.eggfarm QA handle, refuses a +dirty build).
// Usage: npm run build:qa && node scripts/m41-9-bignum-shots.mjs <chromium|firefox|webkit> [outDir]
//   one engine per run, under the browser-test flock. outDir defaults to /workspace/wt-ui-shots/m41-9-<sha7 of the served build>/
//   and must end with -<sha7>; no environment override. A README names the served commit.
// Clip rule: text overflowing its box (scrollWidth > clientWidth + 1) or the viewport; for the Sell button, its .sk/.sy text
// leaving the button's border box (Firefox reports scrollWidth without the border, so the box test is the visual one).
// Elements inside a closed sheet (display:none, width 0, scrollWidth 0) are logged as hidden, not scored.
// Seeding (QA handle only, never a save): g.state = {...} for coins / basket / one customer. The farm cost comes from
// balance.farm.costTable / the curve and can never reach $1e35, so the upgrade-row cost uses a SEEDED BALANCE OVERRIDE:
// g.b is replaced by a copy whose farm.costTable is the target dollars at every level (UI reads g.balance live).
import { chromium, webkit, firefox } from 'playwright-core';
import { spawnRecorded, stopOrReport } from './recorded-pid.mjs';
import { execSync } from 'node:child_process'; import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'; import { basename } from 'node:path';
const [eng = 'chromium', OUT_ARG] = process.argv.slice(2); if (!['chromium', 'firefox', 'webkit'].includes(eng)) { console.error(`unknown engine ${eng}`); process.exit(2); }
const port = 5300 + Math.floor(Math.random() * 200);
const { child: srv, rec: srvRec } = spawnRecorded('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' });
for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
const die = m => { console.error(`m41-9-bignum-shots: ${m}`); stopOrReport(srv, srvRec, 'm41-9-bignum-shots'); process.exit(2); };
const html = await (await fetch(`http://127.0.0.1:${port}/`)).text();
const srcs = [...html.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);
let ver = null; for (const u of srcs) { const m = (await (await fetch(`http://127.0.0.1:${port}${u}`)).text()).match(/["'`](m\d+[a-z0-9.-]*)\+([0-9a-f]{7,40})(\+dirty)?["'`]/); if (m) { ver = m; break; } }
if (!ver) die('no version string found in the served build');
const [buildId, release, hash, dirty] = ver; if (dirty) die(`served build ${buildId} is +dirty; commit, rebuild (npm run build:qa) and re-run`);
const sha = execSync('git rev-parse HEAD').toString().trim(), branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
if (!sha.startsWith(hash)) die(`served build ${hash} is not HEAD ${sha}; rebuild dist-qa`);
const OUT = OUT_ARG ?? `/workspace/wt-ui-shots/m41-9-${hash.slice(0, 7)}`, README = `${OUT}/README.txt`;
if (!basename(OUT).endsWith(`-${hash.slice(0, 7)}`)) die(`outDir ${OUT} must end with -${hash.slice(0, 7)} (the served build)`);
if (existsSync(OUT)) { const named = existsSync(README) ? readFileSync(README, 'utf8') : ''; if (!named.includes(sha)) die(`${OUT} README does not name ${sha}; refusing to write`); }
else { mkdirSync(OUT, { recursive: true }); writeFileSync(README, `m41-9-bignum-shots from commit ${sha} (branch ${branch}, build ${buildId}), first written ${new Date().toString()}.\n`); }
console.log(`m41-9-bignum-shots: ${eng} build ${buildId} -> ${OUT}`);
const br = eng === 'webkit' ? await webkit.launch() : eng === 'firefox' ? await firefox.launch() : await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const WIDTHS = [[360, 640], [375, 667], [390, 844], [1280, 800]];
// Each state: coins (cents), farm cost override (dollars), Sell target (cents; basket sized from the measured per-egg price), counter (eggs).
const STATES = [
  { name: 'dc', label: '$999.9Dc', coins: 9.9994e37, cost: 9.9994e35, sellCents: 9.9994e37, eggs: 9.9994e35 },
  { name: 'sci', label: '$1.23e36', coins: 1.2349e38, cost: 1.2349e36, sellCents: 1.2349e38, eggs: 1.2349e36 },
  { name: 'e36', label: '$1.00e36', coins: 1e38, cost: 1e36, sellCents: 1.0001e38, eggs: 1e36 },
];
// Designer: every shot folder carries manifest.json (state, viewport, engine, file, sha per shot); merged across engine runs.
const index = []; const snap = async (p, f) => { await p.screenshot({ path: `${OUT}/${f}` }); const vp = p.viewportSize();
  index.push({ state: f.replace(/-w\d+-(chromium|firefox|webkit)\.png$/, ''), viewport: `${vp.width}x${vp.height}`, engine: eng, file: f, sha }); };
let bad = 0; const manifest = { sha, branch, buildId, engine: eng, written: new Date().toString(), shots: [] };
const open = async (w, h) => { const ctx = await br.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, seenSlots: 6 })));
  await p.goto(`http://127.0.0.1:${port}/`); await p.getByText('Tap to start').click({ force: true }).catch(() => {}); await p.waitForFunction(() => window.eggfarm);
  await p.evaluate(() => { document.getElementById('modal-layer')?.classList.remove('open'); window.__b0 = window.eggfarm.b; }); return { ctx, p }; };
// Per-egg price in cents at the seeded state, read from the Sell button aria (exact money below $1e15).
const seed = (p, st, basket, demand) => p.evaluate(({ st, basket, demand }) => { const g = window.eggfarm;
  g.b = { ...g.b, farm: { ...g.b.farm, costTable: Array.from({ length: g.b.maxLevel + 1 }, () => st.cost) } };
  g.state = { ...g.state, farmLevel: 10, collectionLevel: 10, coinsCents: st.coins, basket, coop: 0, workers: {}, nextCustomerInS: 1e9,
    customers: [{ id: 4242, demand, filled: 0, waitedS: 0 }] }; }, { st, basket, demand });
const nav = (p, n) => p.evaluate(n => { const b = document.querySelector(`nav [data-nav=${n}]`); if (b && !b.classList.contains('active')) b.click(); }, n);
const measure = p => p.evaluate(() => { const q = s => document.querySelector(s); const vw = innerWidth;
  const m = (k, el) => { if (!el) return { k, missing: true }; const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return { k, text: el.innerText ?? el.textContent, aria: el.getAttribute('aria-label'), sw: el.scrollWidth, cw: el.clientWidth, left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), vw,
      clip: (el.matches('.btn.sell') ? [...el.querySelectorAll('.sk,.sy')].some(t => { const q = t.getBoundingClientRect(); return q.left < r.left - 0.5 || q.right > r.right + 0.5; }) : el.scrollWidth > el.clientWidth + 1) || r.right > vw + 0.5 || r.left < -0.5,
      font: cs.fontSize, cls: el.className, ell: cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1, visible: r.width > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' }; };
  return [m('money pill #coins', q('#coins')), m('money pill .pill.coins', q('.pill.coins')), m('eggs counter #basket', q('#basket')), m('eggs counter .pill.basket', q('.pill.basket')),
    m('order card .l1', q('#mRows .order .l1')), m('order card .n', q('#mRows .order .l1 .n')), m('order card .egg', q('#mRows .order .l1 .egg')), m('order card .v', q('#mRows .order .l1 .v')),
    m('Sell button', q('#mRows .order .btn.sell')), m('Sell .sk', q('#mRows .order .btn.sell .sk')), m('Sell .sy', q('#mRows .order .btn.sell .sy')), m('Sell all', q('#sellAll')),
    m('upgrade cost .num', q('#uRow .btn.buy[data-kind=farm] .num')), m('upgrade cost button', q('#uRow .btn.buy[data-kind=farm]'))]; });
// Art: the order card must keep the word 'eggs' (the WebKit 360 drop, QA4-1); checked on every engine/width, named for WebKit 360.
const eggsWord = (shot, ms) => { const e = ms.find(x => x.k === 'order card .egg'); if (!e || e.missing) return;
  const pass = e.visible && !e.ell && e.w >= 4 && e.text === 'eggs'; if (!pass) bad++;
  manifest.shots.push({ shot, eggsWord: { pass, text: e.text, w: e.w, ell: e.ell } }); console.log(`${shot} order card 'eggs' word: ${pass ? 'PASS' : 'FAIL'} ${JSON.stringify(e.text)} w=${e.w}`); };
const record = (shot, ms) => { manifest.shots.push({ shot, elements: ms });
  for (const e of ms) { if (e.missing) continue; if (!e.visible && e.sw === 0 && e.w === 0) { console.log(`${shot} ${e.k}: hidden (sheet closed)`); continue; } const fail = e.clip || (e.k === 'order card .egg' && (!e.visible || e.w < 4 || e.ell));
    if (fail) bad++; console.log(`${shot} ${e.k}: ${fail ? 'CLIP/DROP' : 'ok'} sw=${e.sw} cw=${e.cw} w=${e.w} text=${JSON.stringify(e.text)}`); } };
for (const [w, h] of WIDTHS) {
  const { ctx, p } = await open(w, h);
  // per-egg price at the seeded level (1e6 eggs, exact aria money)
  await seed(p, STATES[0], 1e6, 1e6); await nav(p, 'market'); await p.waitForTimeout(500);
  const ariaMoney = await p.evaluate(() => document.querySelector('#mRows .order .btn.sell')?.getAttribute('aria-label') ?? '');
  const per = Number((/\+\$([\d,.]+)/.exec(ariaMoney)?.[1] ?? 'NaN').replace(/,/g, '')) * 100 / 1e6;
  if (!(per > 0)) die(`could not read the per-egg price from Sell aria ${JSON.stringify(ariaMoney)}`);
  for (const st of STATES) {
    const sellEggs = Math.ceil(st.sellCents / per);
    // A) money: pill + Sell (+ order card) at the target, farm row cost at the target
    await seed(p, st, sellEggs, sellEggs); await nav(p, 'market'); await p.waitForTimeout(700);
    const clamp = await p.evaluate(() => ({ coins: window.eggfarm.state.coinsCents, basket: window.eggfarm.state.basket }));
    manifest.shots.push({ shot: `seed ${st.name} w${w}`, perEggCents: per, seeded: { coins: st.coins, basket: sellEggs }, after: clamp, clamped: clamp.coins < st.coins * 0.999 || clamp.basket < sellEggs * 0.999 });
    let f = `${st.name}-market-w${w}-${eng}.png`; await snap(p, f); { const ms = await measure(p); record(f, ms); eggsWord(f, ms); }
    await nav(p, 'upgrades'); await p.evaluate(() => document.querySelector('[data-tab=farm]')?.click()); await p.waitForTimeout(500);
    f = `${st.name}-upgrades-w${w}-${eng}.png`; await snap(p, f); record(f, await measure(p));
    // B) eggs counter + order card count at the target count
    await seed(p, st, st.eggs, st.eggs); await nav(p, 'market'); await p.waitForTimeout(700);
    f = `${st.name}-counter-w${w}-${eng}.png`; await snap(p, f); { const ms = await measure(p); record(f, ms); eggsWord(f, ms); }
  }
  // D) Art ruling on #64, FORCED over-12px case: '999Dc/999.9Dc eggs · $999.9Dc' (delivered + wanted both Dc) cannot fit at 12px
  //    at 360, so the line must WRAP (fit3, card grows): nothing clipped, nothing ellipsized, 'eggs' whole. Card clip = the line,
//    bar or Sell button crossing the card's border box (scrollHeight is not used: a fixed-60px card reports +2-4px on main too).
  const lineCheck = async (name, needWrap) => {
    const rs = await p.evaluate(() => [...document.querySelectorAll('#mRows .order')].filter(o => o.getClientRects().length).map(card => { const l1 = card.querySelector('.l1');
      const lr = l1.getBoundingClientRect(), cr = card.getBoundingClientRect(), lh = parseFloat(getComputedStyle(l1).fontSize) * 1.2;
      const parts = [...l1.children].map(e => { const q = e.getBoundingClientRect(), cs = getComputedStyle(e); return { cls: e.className, text: e.textContent, sw: e.scrollWidth, cw: e.clientWidth,
        inLine: q.left >= lr.left - 0.5 && q.right <= lr.right + 0.5, inCard: q.top >= cr.top - 0.5 && q.bottom <= cr.bottom + 0.5 && q.right <= cr.right + 0.5,
        ell: cs.textOverflow === 'ellipsis' || (cs.overflow === 'hidden' && e.scrollWidth > e.clientWidth + 0.5) }; });
      return { line: l1.textContent, cls: l1.className, font: getComputedStyle(l1).fontSize, lines: Math.round(lr.height / lh), cardH: cr.height, lineOver: l1.scrollWidth > l1.clientWidth + 0.5,
        cardClip: [l1, card.querySelector('.bar'), card.querySelector('.btn.sell')].some(e => { const q = e.getBoundingClientRect(); return q.top < cr.top + 1 || q.bottom > cr.bottom - 1; }), parts }; }));
    const okCard = r => !r.cardClip && !r.lineOver && r.parts.every(x => x.inLine && x.inCard && !x.ell && x.sw <= x.cw + 1) && r.parts.find(x => /egg/.test(x.cls))?.text === 'eggs';
    const pass = rs.length > 0 && rs.every(okCard) && (!needWrap || w !== 360 || (/fit3/.test(rs[0].cls) && rs[0].lines >= 2));
    if (!pass) bad++; const f = `${name}-w${w}-${eng}.png`; await snap(p, f);
    manifest.shots.push({ shot: f, [name]: { pass, cards: rs } });
    console.log(`${f} ${name}: ${pass ? 'PASS' : 'FAIL'} ${rs.map(r => `${JSON.stringify(r.line)} ${r.cls} ${r.font} lines=${r.lines}`).join(' | ')}`); };
  // D) Art ruling on #64, FORCED over-12px case: '999Dc/999.9Dc eggs · $999.9Dc' (delivered + wanted both Dc) cannot fit at 12px
  //    at 360, so the line must WRAP (fit3, card grows). Card clip = the line, bar or Sell button crossing the card's border box
  //    (scrollHeight is not used: a fixed-60px card reports +2-4px on main too).
  await seed(p, STATES[0], 0, 9.9994e35); await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, customers: [{ id: 4243, demand: 9.9994e35, filled: 9.99e35, waitedS: 0 }] }; });
  await nav(p, 'market'); await p.waitForTimeout(700); await lineCheck('wrap-forced', true);
  // C) coin pop / +$ floater at >= $1e15 (1.2e15 dollars) after a real Sell tap
  { const st = { ...STATES[0], coins: 100, cost: 1e3 }; const k = Math.ceil(1.2e17 / per); await seed(p, st, k, k); await nav(p, 'market'); await p.waitForTimeout(600);
    await p.evaluate(() => { window.__pops = []; new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && /qpop|float/.test(n.className)) window.__pops.push({ cls: n.className, text: n.textContent }); }).observe(document.body, { childList: true, subtree: true }); });
    await p.locator('#mRows .order .btn.sell').first().click(); await p.waitForTimeout(120);
    const f = `pop-1.2Qa-w${w}-${eng}.png`; await snap(p, f);
    const pops = await p.evaluate(() => window.__pops); const spelled = pops.some(x => /illion|times/.test(x.text)), qa = pops.some(x => /\$1\.2Qa/.test(x.text));
    if (spelled || !pops.length || !qa) bad++; manifest.shots.push({ shot: f, pops, spelled, live: await p.evaluate(() => document.querySelector('#live')?.textContent) });
    console.log(`${f} pops=${JSON.stringify(pops)} ${spelled || !pops.length || !qa ? 'FAIL' : 'ok'}`); }
  // E) (after C: it moves every level to 30, which changes the per-egg price C relies on) HoE / QA UI Oct 22: REAL data at the 75-egg cap (QA m41-9-6041522 'max-real': all levels 30, $22.43 an egg, basket 200):
  //    '74/75 eggs · $1,682.25' must never ellipsize or clip; every card on the list is checked.
  await p.evaluate(() => { const g = window.eggfarm; g.b = window.__b0 ?? g.b; g.state = { ...g.state, farmLevel: 30, hensLevel: 30, eggValueLevel: 30, collectionLevel: 30, basket: 200, coinsCents: 100, nextCustomerInS: 1e9,
    customers: [{ id: 921, demand: 75, filled: 74, waitedS: 0 }, { id: 922, demand: 75, filled: 0, waitedS: 0 }, { id: 923, demand: 68, filled: 67, waitedS: 0 }] }; });
  await nav(p, 'market'); await p.waitForTimeout(700); await lineCheck('cap-real-75', false);
  await ctx.close();
}
writeFileSync(`${OUT}/manifest-${eng}.json`, JSON.stringify(manifest, null, 1));
{ const MF = `${OUT}/manifest.json`, m = existsSync(MF) ? JSON.parse(readFileSync(MF, 'utf8')) : { script: 'scripts/m41-9-bignum-shots.mjs', sha, buildId, shots: [] };
  m.shots = [...m.shots.filter(x => x.engine !== eng), ...index]; writeFileSync(MF, JSON.stringify(m, null, 1) + '\n'); }
console.log(`m41-9-bignum-shots ${eng}: ${bad ? `${bad} CLIP/DROP/FAIL` : 'all ok'}`);
await br.close(); const stopped = stopOrReport(srv, srvRec, 'm41-9-bignum-shots'); process.exit(bad ? 1 : stopped ? 0 : 3);
