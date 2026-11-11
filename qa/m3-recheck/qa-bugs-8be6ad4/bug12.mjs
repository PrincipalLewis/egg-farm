import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
const OUT = process.argv[2]; const port = 4292, base = `http://127.0.0.1:${port}/`;
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
const kill = () => { try { process.kill(-srv.pid, 'SIGTERM'); } catch {} };
setTimeout(() => { kill(); process.exit(2); }, 600000).unref();
await new Promise(r => setTimeout(r, 5000));
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const money = t => { const m = t.replace(/,/g,'').match(/\$([0-9.]+)([KMBT]?)/); return m ? Math.round(parseFloat(m[1]) * {"":1,K:1e3,M:1e6,B:1e9,T:1e12}[m[2]] * 100) : NaN; };
const cases = [
  { name: 'orig-repro-grader-t1-working', F: 20, C: 7, basket: 58, cust: [[58, 0]], grader: { energy: 100 }, tier: 1 },
  { name: 'grader-off', F: 20, C: 7, basket: 58, cust: [[58, 0]], grader: null, tier: 0 },
  { name: 'grader-off-multi-partial', F: 13, C: 5, basket: 15, cust: [[10, 3], [7, 0], [13, 0]], grader: null, tier: 0 },
  { name: 'grader-t3-tired-multi-partial', F: 21, C: 9, basket: 17, cust: [[9, 2], [7, 0], [13, 4]], grader: { energy: 20 }, tier: 3 },
  { name: 'grader-t5-asleep-multi', F: 24, C: 11, basket: 23, cust: [[3, 0], [11, 1], [5, 0], [6, 0]], grader: { energy: 0 }, tier: 5 },
  { name: 'grader-t2-working-odd', F: 19, C: 3, basket: 11, cust: [[7, 0], [9, 5]], grader: { energy: 100 }, tier: 2 },
];
let fails = 0; const lines = [];
const ok = (t, p, i) => { if (!p) fails++; const l = `${p ? 'PASS' : 'FAIL'} ${t} ${JSON.stringify(i)}`; lines.push(l); console.log(l); };
for (const desktop of [false, true]) for (const c of cases) {
  const tag = `${desktop ? 'desktop' : '390'}-${c.name}`;
  const workers = c.grader ? { grader: { ...c.grader, cdS: 0 } } : {};
  const save = { version: 5, savedAt: Date.now(), state: { coinsCents: 500_000, coop: 0, basket: c.basket, collectionLevel: c.C, farmLevel: c.F, customers: c.cust.map(([d, f], i) => ({ id: i + 1, demand: d, filled: f, waitedS: 0 })), nextCustomerInS: 9999, nextCustomerId: 99, rng: 99, pendingOfflineEggs: 0, celebratedTier: 9, workers, graderTier: c.tier, manageCdS: 0, coopFullS: 0 } };
  const ctx = await browser.newContext(desktop ? { viewport: { width: 1280, height: 800 } } : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(([s]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('eggfarm.save', JSON.stringify(s)); localStorage.setItem('eggfarm.ui', JSON.stringify({ seenSlots: 5, onboardingDone: true, workersIntroA: true, workersIntroB: true })); sessionStorage.setItem('seeded', '1'); } }, [save]);
  await p.goto(base, { timeout: 120000 }); await p.getByText('Tap to start').click({ timeout: 60000 }); await p.waitForTimeout(800);
  if (!desktop) await p.locator('[data-nav=market]').click(); await p.waitForTimeout(800);
  // capture every coin floater text as it is created
  await p.evaluate(() => { window.__pops = []; new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.classList?.contains('floater') && n.classList.contains('coin')) window.__pops.push(n.textContent); }))).observe(document.body, { childList: true, subtree: true }); window.__cred = []; window.eggfarm.on(e => { if (e.type === 'sell') window.__cred.push(e.value); }); });
  const rows = async () => p.locator('.order[data-row]').evaluateAll(rs => rs.map(r => ({ id: +r.dataset.row, line: r.querySelector('.l1').textContent.replace(/\u00a0/g, ' '), btn: (r.querySelector('.sell').getAttribute('aria-label') || '').replace(/\u00a0/g, ' '), vis: r.querySelector('.sell').innerText.replace(/\u00a0/g, ' ').replace(/\n/g, ' | '), dis: r.querySelector('.sell').getAttribute('aria-disabled') })));
  const st = () => p.evaluate(() => { const s = window.eggfarm.state; return { coins: s.coinsCents, basket: s.basket, cust: s.customers.map(c => [c.id, c.demand, c.filled]) }; });
  // independent expectation: price via formula from page state + Grader mult from balance (not payout.ts)
  const R0 = await rows(); const S0 = await st();
  await p.screenshot({ path: `${OUT}/${tag}-1-before.png` });
  // per-row checks: card line shows full order value; button 'Sell k · +$X' / 'Need N'
  for (const r of R0) { const cu = S0.cust.find(x => x[0] === r.id), rem = cu[1] - cu[2];
    if (r.dis === 'true') ok(`${tag} row ${r.id} wait label`, /^Need \d/.test(r.btn) && r.btn === `Need ${rem}`, r);
    else ok(`${tag} row ${r.id} sell label shape`, /^Sell \d+ · \+\$[0-9.,]+[KMBT]?$/.test(r.btn), r); }
  // tap Sell on first actionable row: X == credited == popup == coin delta
  const first = R0.find(r => r.dis !== 'true');
  let rowSellCredit = 0;
  if (first) { const before = (await st()).coins;
    await p.locator(`.order[data-row="${first.id}"] .sell`).click(); await p.waitForTimeout(400);
    const after = (await st()).coins, cred = await p.evaluate(() => window.__cred.slice()), pops = await p.evaluate(() => window.__pops.slice());
    await p.screenshot({ path: `${OUT}/${tag}-2-rowsell.png` });
    const X = money(first.btn.split('·')[1]); rowSellCredit = after - before;
    ok(`${tag} row Sell button X == credited == popup == coin delta`, X === cred[0] && X === after - before && money(pops[0]) === X, { btn: first.btn, X, cred, pops, delta: after - before });
    // card full value: for ready row (sell == remaining from 0 filled) full value == credited
    const cu = S0.cust.find(x => x[0] === first.id); if (cu[2] === 0 && /Sell (\d+)/.exec(first.btn)[1] == cu[1]) ok(`${tag} ready card full value == credit`, money(first.line.split('·')[1]) === X, first.line);
  }
  await p.waitForTimeout(1200);
  // Sell all
  const R1 = await rows(); const sa = (await p.locator('#sellAll').textContent()).replace(/\u00a0/g, ' '); const b1 = (await st()).coins; const c1 = await p.evaluate(() => window.__cred.length); const p1 = await p.evaluate(() => window.__pops.length);
  const rowSum = R1.filter(r => r.dis !== 'true').reduce((a, r) => a + money(r.btn.split('·')[1]), 0);
  const coins0 = money(await p.locator('#coins').textContent());
  if (!/\(0 /.test(sa) && await p.locator('#sellAll').getAttribute('aria-disabled') !== 'true') {
    await p.locator('#sellAll').click(); await p.waitForTimeout(400);
    const a1 = (await st()).coins, cred = (await p.evaluate(() => window.__cred.slice())).slice(c1), pops = (await p.evaluate(() => window.__pops.slice())).slice(p1);
    await p.screenshot({ path: `${OUT}/${tag}-3-sellall-popup.png` });
    const SA = money(sa.split('·')[1] ?? sa); const credSum = cred.reduce((a, x) => a + x, 0);
    // pops only show last floater? collect all
    ok(`${tag} Sell all label == sum credited == coin delta == sum of row Sell buttons`, SA === credSum && SA === a1 - b1 && SA === rowSum, { sa, SA, cred, credSum, delta: a1 - b1, rowSum });
    ok(`${tag} each '+$X' popup == its credit`, pops.length === cred.length && pops.every((t, i) => money(t) === cred[i]), { pops, cred });
    await p.waitForTimeout(1500);
    const coinsHud = money(await p.locator('#coins').textContent());
    ok(`${tag} HUD coin delta == credited (display rounding aware)`, Math.abs((coinsHud - coins0) - credSum) <= (coinsHud >= 1e6 ? 10000 : 1), { coins0, coinsHud, credSum });
  }
  const all = await p.evaluate(() => window.__cred.reduce((a, x) => a + x, 0));
  const rate = await p.evaluate(() => window.eggfarmUi?.rates().incomeCentsPerSec);
  ok(`${tag} income rate x60 == total credited (to the cent)`, rate !== undefined && Math.abs(rate * 60 - all) < 1e-6, { rate, all });
  ok(`${tag} no page errors`, errs.length === 0, errs);
  await p.screenshot({ path: `${OUT}/${tag}-4-after.png` });
  await ctx.close();
}
console.log(`${lines.length - fails}/${lines.length} passed`); process.exitCode = fails ? 1 : 0;
await browser.close(); kill();
