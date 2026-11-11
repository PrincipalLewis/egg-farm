// QA PR28 probe: Sell all label vs money gained at Grader 0/1/2, 390 & 360; fit + 44px; build id.
import { chromium, webkit, firefox } from '/tmp/qa-pr28/node_modules/playwright-core/index.mjs';
const ENGINE = process.argv[2], port = +process.argv[3], OUT = process.argv[4];
const browser = ENGINE === 'webkit' ? await webkit.launch() : ENGINE === 'firefox' ? await firefox.launch() : await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const money = t => { const m = /\$([\d,.]+)([KMBT]?)/.exec(t); return m ? +m[1].replace(/,/g, '') * ({ '': 1, K: 1e3, M: 1e6, B: 1e9, T: 1e12 })[m[2]] : NaN; };
let fails = 0; const log = (ok, s) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} [${ENGINE}] ${s}`); };
const cases = [ // [label, farm, coll, basket, demands]
  ['orig 181.2B farm20', 20, 1, 181.2e9, [181.2e9]],
  ['QA-scale multi-order', 23, 17, 181.2e9, [1.1e11, 0.9e11]],
  ['small 37 eggs partial', 3, 1, 37.7, [7, 13, 30]],
];
for (const w of [390, 360]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, hasTouch: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { if (!sessionStorage.getItem('s')) { localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true })); sessionStorage.setItem('s', '1'); } });
  await page.goto(`http://127.0.0.1:${port}/`); await page.getByText('Tap to start').click(); await page.waitForFunction(() => window.eggfarm);
  if (w === 390) { const html = await page.content(); let bid = /m3-rc1-pre\+[0-9a-f]+(\+dirty)?/.exec(html)?.[0];
    if (!bid) { const srcs = await page.evaluate(() => [...document.scripts].map(s => s.src).filter(Boolean)); for (const s of srcs) { const t = await (await page.request.get(s)).text(); bid = /m3-rc1-pre\+[0-9a-f]+(\+dirty)?/.exec(t)?.[0]; if (bid) break; } }
    log(bid === 'm3-rc1-pre+f7642c9', `build id at runtime = ${bid}`); }
  await page.locator('[data-nav=market]').click(); await page.waitForTimeout(200);
  for (const tier of [0, 1, 2]) for (const [name, farm, coll, basket, dem] of cases) {
    await page.evaluate(([tier, farm, coll, basket, dem]) => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: farm, collectionLevel: coll, basket, coop: 0, coinsCents: 0, nextCustomerInS: 999,
      customers: dem.map((d, i) => ({ id: 801 + i, demand: d, filled: i === 0 && d < 100 ? 2 : 0, waitedS: 0 })), workers: tier ? { grader: { energy: 100, cdS: 0 } } : {}, graderTier: tier }; }, [tier, farm, coll, basket, dem]);
    await page.waitForTimeout(350);
    const m = await page.evaluate(() => { const b = document.querySelector('#sellAll'), r = b.getBoundingClientRect(); return { t: b.textContent, sw: b.scrollWidth, cw: b.clientWidth, h: r.height, wd: r.width, l: r.left, r: r.right, vw: innerWidth, c0: window.eggfarm.state.coinsCents }; });
    if (tier === 1 && name.startsWith('orig')) await page.screenshot({ path: `${OUT}/${ENGINE}-${w}-t1-orig.png` });
    log(m.sw <= m.cw && m.l >= 0 && m.r <= m.vw + 0.5, `${w} G${tier} ${name}: fit sw=${m.sw} cw=${m.cw} l=${m.l.toFixed(1)} r=${m.r.toFixed(1)}`);
    log(m.h >= 44 && m.wd >= 44, `${w} G${tier} ${name}: size ${m.wd.toFixed(1)}x${m.h.toFixed(1)}`);
    await page.locator('#sellAll').click(); await page.waitForTimeout(250);
    const got = ((await page.evaluate(() => window.eggfarm.state.coinsCents)) - m.c0) / 100, lab = money(m.t);
    log(got > 0 && Math.abs(lab - got) <= Math.max(0.005, got * 0.005), `${w} G${tier} ${name}: label "${m.t}" gained $${got.toPrecision(6)}`);
  }
  log(errs.length === 0, `${w} page errors: ${errs.join('|') || 'none'}`); await ctx.close();
}
await browser.close(); console.log(`TOTAL FAILS ${fails}`); process.exit(fails ? 1 : 0);
