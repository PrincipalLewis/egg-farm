import pw from 'playwright-core';
import { spawn } from 'node:child_process';
const ENG = process.argv[2], OUT = process.argv[3] + '/';
const exe = { chromium: '/usr/bin/google-chrome' }[ENG];
const port = 4298 + ['chromium','firefox','webkit'].indexOf(ENG), base = `http://127.0.0.1:${port}/`;
const srv = spawn('npx', ['vite','preview','--outDir','dist','--port',String(port),'--strictPort','--host','127.0.0.1'], { stdio:'ignore', detached:true });
const kill = () => { try { process.kill(-srv.pid,'SIGTERM'); } catch {} };
setTimeout(() => { kill(); process.exit(2); }, 600_000).unref();
await new Promise(r => setTimeout(r, 3000));
const browser = await pw[ENG].launch(exe ? { executablePath: exe, args:['--no-sandbox'] } : {});
const mk = (basket, customers) => ({ version: 6, savedAt: Date.now(), state: { coinsCents: 500_000, coop: 0, basket, collectionLevel: 7, farmLevel: 20, customers,
  nextCustomerInS: 600, nextCustomerId: 9, rng: 99, pendingOfflineEggs: 0, celebratedTier: 3, workers: { grader: { energy: 100, cdS: 0 } }, graderTier: 1, manageCdS: 0, coopFullS: 0, wageFracCents: {} } });
// unit price 552c (368 x grader 1.5)
const scen = {
  mixed: mk(200_000_000_000, [ { id:1, demand:3, filled:0, waitedS:0 }, { id:2, demand:1_800_000, filled:0, waitedS:0 }, { id:3, demand:181_200_000_000, filled:0, waitedS:0 }, { id:4, demand:17, filled:4, waitedS:0 } ]),
  need: mk(0, [ { id:1, demand:3, filled:0, waitedS:0 }, { id:2, demand:1_800_000, filled:0, waitedS:0 }, { id:3, demand:181_200_000_000, filled:0, waitedS:0 }, { id:4, demand:17, filled:4, waitedS:0 } ]),
};
let fails = [];
for (const [sn, save] of Object.entries(scen)) for (const w of [360,375,390,430,1280]) {
  const desk = w >= 960;
  const ctx = await browser.newContext(desk ? { viewport:{width:w,height:800} } : { viewport:{width:w,height:844}, deviceScaleFactor:2, hasTouch:true, ...(ENG==='firefox'?{}:{isMobile:true}) });
  const p = await ctx.newPage();
  await p.addInitScript(([s]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('eggfarm.save', JSON.stringify(s)); localStorage.setItem('eggfarm.ui', JSON.stringify({ seenSlots:5, onboardingDone:true })); sessionStorage.setItem('seeded','1'); } }, [save]);
  await p.goto(base, { timeout: 90_000 }); await p.getByText('Tap to start').click(); await p.waitForTimeout(800);
  if (!desk) { await p.locator('[data-nav=market]').click(); }
  await p.waitForTimeout(1200);
  const rows = await p.locator('.order').evaluateAll(os => os.map(o => {
    const r = el => el ? el.getBoundingClientRect() : null, b = o.querySelector('.btn.sell'), txt = o.querySelector('.txt'), av = o.querySelector('.av');
    const m = el => el ? { t: el.textContent, sw: el.scrollWidth, cw: el.clientWidth, to: getComputedStyle(el).textOverflow } : null;
    const br = r(b), tr = r(txt), ar = r(av), orr = r(o);
    const ov = (a, c) => a && c && a.left < c.right - 0.5 && c.left < a.right - 0.5 && a.top < c.bottom - 0.5 && c.top < a.bottom - 0.5;
    return { id: b?.dataset.id, aria: b?.getAttribute('aria-label'), btn: m(b), sk: m(b?.querySelector('.sk')), sy: m(b?.querySelector('.sy')), e: m(o.querySelector('.e')), v: m(o.querySelector('.v')), l1: m(o.querySelector('.l1')),
      bw: br.width, bh: br.height, rowW: orr.width, ovTxt: ov(br, tr), ovAv: ov(br, ar), outRow: br.right > orr.right + 0.5 || br.left < orr.left - 0.5 };
  }));
  const tag = `${ENG} ${sn} ${w}`;
  const ws = rows.map(r => r.bw);
  if (!rows.length) fails.push(`${tag}: no rows`);
  if (Math.max(...ws) - Math.min(...ws) > 0.5) fails.push(`${tag}: unequal widths ${ws.map(x=>x.toFixed(1))}`);
  for (const r of rows) {
    for (const k of ['btn','sk','sy','e','v','l1']) { const x = r[k]; if (!x) continue; if (x.sw > x.cw + 1) fails.push(`${tag} row${r.id} ${k} clipped sw${x.sw}>cw${x.cw} "${x.t}"`); if (/…|\.\.\./.test(x.t)) fails.push(`${tag} row${r.id} ${k} ellipsis "${x.t}"`); }
    if (r.bw < 88 - 0.5 || r.bh < 44 - 0.5) fails.push(`${tag} row${r.id} size ${r.bw.toFixed(1)}x${r.bh.toFixed(1)}`);
    if (r.ovTxt || r.ovAv || r.outRow) fails.push(`${tag} row${r.id} overlap txt=${r.ovTxt} av=${r.ovAv} out=${r.outRow}`);
    if (r.bw > 0.45 * r.rowW + 1) fails.push(`${tag} row${r.id} btn ${r.bw.toFixed(1)} > 45% of row ${r.rowW.toFixed(1)} (info)`);
  }
  console.log(tag, JSON.stringify(rows.map(r => ({ id:r.id, l1:r.l1?.t, btn:r.btn?.t, aria:r.aria, w:+r.bw.toFixed(1), h:+r.bh.toFixed(1), rowW:+r.rowW.toFixed(1) }))));
  await p.screenshot({ path: `${OUT}${ENG}-${sn}-${w}.png` });
  await ctx.close();
}
await browser.close(); kill();
console.log(fails.length ? 'FAILS\n' + fails.join('\n') : 'ALL PASS', ENG);
process.exit(0);
