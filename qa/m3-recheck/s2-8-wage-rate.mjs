// S2-8 wage-rate checks (Product ruling Oct 16: charge the exact economy.csv rate, carry fractional cents).
// Needs the QA build (window.eggfarm): npm run build:qa; DIST=dist-qa PORT=.. ENGINE=chromium|firefox|webkit node s2-8-wage-rate.mjs <worktree>
// Optional: FARM=3 (economy.csv w1_wage_per_min 0.75 at F3), REAL_S=60.
// (a) 60 s of Market Hand wages = csv/min ±1¢ (real time and accelerated), 10 min = 10x ±1¢ (accelerated, energy pinned Working)
// (b) wage < $0.10/s shown per minute ("Wage $0.75/min"), never "$0.01/s"   (c) net-rate/wage value == exact charged value
import fs from 'node:fs';
import { setup } from '../m3-scripts/s2-lib.mjs';
const { ROOT, ok, open, done, OUT, ENGINE } = await setup('s2-8-wage-rate');
const F = +(process.env.FARM ?? 3), REAL_S = +(process.env.REAL_S ?? 60);
const rows = fs.readFileSync(ROOT + '/data/economy.csv', 'utf8').trim().split('\n').map(l => l.split(','));
const hdr = rows[0], row = rows.find(r => +r[0] === F); const csvPerMin = +row[hdr.indexOf('w1_wage_per_min')];
const expMin = Math.round(csvPerMin * 100), exp10 = Math.round(csvPerMin * 1000);
console.log(`economy.csv w1_wage_per_min @F${F} = $${csvPerMin}/min -> expect ${expMin}¢/60s, ${exp10}¢/600s`);
const patch = { farmLevel: F, coinsCents: 10_000_000, basket: 0, coop: 0, customers: [], nextCustomerInS: 1e9, workers: { market_hand: { energy: 100, cdS: 0 } } };
const { ctx, p, errs } = await open({ patch });
await p.evaluate(() => { const g = window.eggfarm; window.__w = []; g.on(e => { if (e.type === 'wage') window.__w.push([performance.now(), e.worker, e.cents]); }); });
// (a1) real time
const r1 = await p.evaluate(async ms => { const g = window.eggfarm; const c0 = g.state.coinsCents; window.__w.length = 0;
  const pin = setInterval(() => { const w = g.state.workers.market_hand; if (w && w.energy < 99) g.state = { ...g.state, workers: { ...g.state.workers, market_hand: { ...w, energy: 100 } } }; }, 500);
  await new Promise(r => setTimeout(r, ms)); clearInterval(pin);
  const ev = window.__w.filter(x => x[1] === 'market_hand'); return { charged: ev.reduce((a, x) => a + x[2], 0), coinDelta: c0 - g.state.coinsCents, n: ev.length, perEvent: [...new Set(ev.map(x => x[2]))] }; }, REAL_S * 1000);
const realPerMin = r1.charged * 60 / REAL_S;
ok(`(a) real ${REAL_S}s Market Hand wage = $${csvPerMin}/min ±1¢`, Math.abs(realPerMin - expMin) <= 1, { ...r1, perMinCents: realPerMin, expectCents: expMin });
// (a2) accelerated 60 s and 600 s via debugAdvance, 1 s steps, energy pinned
const acc = async secs => p.evaluate(secs => { const g = window.eggfarm; window.__w.length = 0; const c0 = g.state.coinsCents;
  for (let i = 0; i < secs * 4; i++) { const w = g.state.workers.market_hand; g.state = { ...g.state, workers: { ...g.state.workers, market_hand: { ...w, energy: 100 } } }; g.debugAdvance(250); }
  const ev = window.__w.filter(x => x[1] === 'market_hand'); return { charged: ev.reduce((a, x) => a + x[2], 0), coinDelta: c0 - g.state.coinsCents, n: ev.length }; }, secs);
const a60 = await acc(60), a600 = await acc(600);
ok(`(a) accelerated 60s = ${expMin}¢ ±1¢`, Math.abs(a60.charged - expMin) <= 1, { ...a60, expect: expMin });
ok(`(a) accelerated 10 min = ${exp10}¢ ±1¢`, Math.abs(a600.charged - exp10) <= 1, { ...a600, expect: exp10 });
// (b) label: N/A on s2-money (per-minute label + net-rate pill ship on m3/rc1-ui); recorded only. Set LABEL=1 to enforce on a UI build.
const labels = await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && /wage/i.test(e.textContent)).map(e => e.textContent.trim()));
const rates = await p.evaluate(() => window.eggfarmUi?.rates?.() ?? null);
const listed = rates?.workers?.market_hand?.listedWageCentsPerSec, wantLbl = `$${csvPerMin.toFixed(2)}/min`;
if (process.env.LABEL === '1') ok(`(b) wage label "Wage ${wantLbl}" (< $0.10/s), "Wage $X/s" from $0.10/s`, labels.some(l => l.includes(wantLbl)) && !labels.some(l => /\$0\.0\d\/s/.test(l)), { labels });
else console.log(`N/A (b) wage label not on this branch (moves to m3/rc1-ui); labels on screen: ${JSON.stringify(labels)}; rates listed = ${listed} ¢/s`);
// (c) net-rate line / rates() uses the same exact value as charged (exact = csv/60 ¢/s)
const exact = expMin / 60, charged = a600.charged / 600, ui = rates?.wageCentsPerSec;
const netLine = await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && /\/(s|min)\b/.test(e.textContent) && /[−-]?\$/.test(e.textContent)).map(e => e.textContent.trim()).slice(0, 6));
ok('(c) net-rate wage value == exact rate == charged rate', ui !== undefined && Math.abs(ui - exact) < 1e-6 && Math.abs(charged - exact) < 0.0025 && Math.abs(a600.coinDelta - a600.charged) <= 0,
  { uiWageCentsPerSec: ui, exactCentsPerSec: +exact.toFixed(4), chargedCentsPerSec: +charged.toFixed(4), netCentsPerSec: rates?.netCentsPerSec, rateTextsOnScreen: netLine });
fs.writeFileSync(`${OUT}/wage-${ENGINE}.json`, JSON.stringify({ F, csvPerMin, r1, a60, a600, labels, rates, errs }, null, 1));
await ctx.close(); await done();
