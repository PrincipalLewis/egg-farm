// M41-9 evidence shots for Art (art-ux/number-format-big.md §6): money pill, Sell button, upgrade-row cost, eggs counter and the
// order card (WebKit "eggs" drop) at $999.9Dc / $1.23e36 / $1.00e36 plus a >= $1e15 coin pop, at 360/375/390/1280.
// Cloned from scripts/artux-shots.mjs (dist-qa build with the window.eggfarm QA handle, refuses a +dirty build).
// Usage: npm run build:qa && node scripts/m41-9-bignum-shots.mjs <chromium|firefox|webkit> [outDir]
//   one engine per run, under the browser-test flock. outDir defaults to /workspace/wt-ui-shots/m41-9-<sha7 of the served build>/
//   and must end with -<sha7>; no environment override. A README names the served commit.
// Seeding (QA handle only, never a save): g.state = {...} for coins / basket / one customer. The farm cost comes from
// balance.farm.costTable / the curve and can never reach $1e35, so the upgrade-row cost uses a SEEDED BALANCE OVERRIDE:
// g.b is replaced by a copy whose farm.costTable is the target dollars at every level (UI reads g.balance live).
import { chromium, webkit, firefox } from 'playwright-core';
import { spawn, execSync } from 'node:child_process'; import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'; import { basename } from 'node:path';
const [eng = 'chromium', OUT_ARG] = process.argv.slice(2); if (!['chromium', 'firefox', 'webkit'].includes(eng)) { console.error(`unknown engine ${eng}`); process.exit(2); }
const port = 5300 + Math.floor(Math.random() * 200);
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
const die = m => { console.error(`m41-9-bignum-shots: ${m}`); process.kill(-srv.pid); process.exit(2); };
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
let bad = 0; const manifest = { sha, branch, buildId, engine: eng, written: new Date().toString(), shots: [] };
const open = async (w, h) => { const ctx = await br.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, seenSlots: 6 })));
  await p.goto(`http://127.0.0.1:${port}/`); await p.getByText('Tap to start').click({ force: true }).catch(() => {}); await p.waitForFunction(() => window.eggfarm);
  await p.evaluate(() => document.getElementById('modal-layer')?.classList.remove('open')); return { ctx, p }; };
// Per-egg price in cents at the seeded state, read from the Sell button aria (exact money below $1e15).
const seed = (p, st, basket, demand) => p.evaluate(({ st, basket, demand }) => { const g = window.eggfarm;
  g.b = { ...g.b, farm: { ...g.b.farm, costTable: Array.from({ length: g.b.maxLevel + 1 }, () => st.cost) } };
  g.state = { ...g.state, farmLevel: 10, collectionLevel: 10, coinsCents: st.coins, basket, coop: 0, workers: {}, nextCustomerInS: 1e9,
    customers: [{ id: 4242, demand, filled: 0, waitedS: 0 }] }; }, { st, basket, demand });
const nav = (p, n) => p.evaluate(n => { const b = document.querySelector(`nav [data-nav=${n}]`); if (b && !b.classList.contains('active')) b.click(); }, n);
const measure = p => p.evaluate(() => { const q = s => document.querySelector(s); const vw = innerWidth;
  const m = (k, el) => { if (!el) return { k, missing: true }; const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return { k, text: el.innerText ?? el.textContent, aria: el.getAttribute('aria-label'), sw: el.scrollWidth, cw: el.clientWidth, left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), vw,
      clip: el.scrollWidth > el.clientWidth + 1 || r.right > vw + 0.5 || r.left < -0.5, ell: cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1, visible: r.width > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' }; };
  return [m('money pill #coins', q('#coins')), m('money pill .pill.coins', q('.pill.coins')), m('eggs counter #basket', q('#basket')), m('eggs counter .pill.basket', q('.pill.basket')),
    m('order card .l1', q('#mRows .order .l1')), m('order card .n', q('#mRows .order .l1 .n')), m('order card .egg', q('#mRows .order .l1 .egg')), m('order card .v', q('#mRows .order .l1 .v')),
    m('Sell button', q('#mRows .order .btn.sell')), m('Sell .sk', q('#mRows .order .btn.sell .sk')), m('Sell .sy', q('#mRows .order .btn.sell .sy')), m('Sell all', q('#sellAll')),
    m('upgrade cost .num', q('#uRow .btn.buy[data-kind=farm] .num')), m('upgrade cost button', q('#uRow .btn.buy[data-kind=farm]'))]; });
// Art: the order card must keep the word 'eggs' (the WebKit 360 drop, QA4-1); checked on every engine/width, named for WebKit 360.
const eggsWord = (shot, ms) => { const e = ms.find(x => x.k === 'order card .egg'); if (!e || e.missing) return;
  const pass = e.visible && !e.ell && e.w >= 4 && e.text === 'eggs'; if (!pass) bad++;
  manifest.shots.push({ shot, eggsWord: { pass, text: e.text, w: e.w, ell: e.ell } }); console.log(`${shot} order card 'eggs' word: ${pass ? 'PASS' : 'FAIL'} ${JSON.stringify(e.text)} w=${e.w}`); };
const record = (shot, ms) => { manifest.shots.push({ shot, elements: ms });
  for (const e of ms) { if (e.missing) continue; const fail = e.clip || (e.k === 'order card .egg' && (!e.visible || e.w < 4 || e.ell));
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
    let f = `${st.name}-market-w${w}-${eng}.png`; await p.screenshot({ path: `${OUT}/${f}` }); { const ms = await measure(p); record(f, ms); eggsWord(f, ms); }
    await nav(p, 'upgrades'); await p.evaluate(() => document.querySelector('[data-tab=farm]')?.click()); await p.waitForTimeout(500);
    f = `${st.name}-upgrades-w${w}-${eng}.png`; await p.screenshot({ path: `${OUT}/${f}` }); record(f, await measure(p));
    // B) eggs counter + order card count at the target count
    await seed(p, st, st.eggs, st.eggs); await nav(p, 'market'); await p.waitForTimeout(700);
    f = `${st.name}-counter-w${w}-${eng}.png`; await p.screenshot({ path: `${OUT}/${f}` }); { const ms = await measure(p); record(f, ms); eggsWord(f, ms); }
  }
  // C) coin pop / +$ floater at >= $1e15 (1.2e15 dollars) after a real Sell tap
  { const st = { ...STATES[0], coins: 100, cost: 1e3 }; const k = Math.ceil(1.2e17 / per); await seed(p, st, k, k); await nav(p, 'market'); await p.waitForTimeout(600);
    await p.evaluate(() => { window.__pops = []; new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && /qpop|float/.test(n.className)) window.__pops.push({ cls: n.className, text: n.textContent }); }).observe(document.body, { childList: true, subtree: true }); });
    await p.locator('#mRows .order .btn.sell').first().click(); await p.waitForTimeout(120);
    const f = `pop-1.2Qa-w${w}-${eng}.png`; await p.screenshot({ path: `${OUT}/${f}` });
    const pops = await p.evaluate(() => window.__pops); const spelled = pops.some(x => /illion|times/.test(x.text)), qa = pops.some(x => /\$1\.2Qa/.test(x.text));
    if (spelled || !pops.length || !qa) bad++; manifest.shots.push({ shot: f, pops, spelled, live: await p.evaluate(() => document.querySelector('#live')?.textContent) });
    console.log(`${f} pops=${JSON.stringify(pops)} ${spelled || !pops.length || !qa ? 'FAIL' : 'ok'}`); }
  await ctx.close();
}
writeFileSync(`${OUT}/manifest-${eng}.json`, JSON.stringify(manifest, null, 1));
console.log(`m41-9-bignum-shots ${eng}: ${bad ? `${bad} CLIP/DROP/FAIL` : 'all ok'}`);
await br.close(); process.kill(-srv.pid); process.exit(bad ? 1 : 0);
