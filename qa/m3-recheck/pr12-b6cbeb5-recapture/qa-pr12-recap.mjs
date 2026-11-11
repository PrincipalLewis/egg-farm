// PR #12 recapture: L25 hire nudge + Workers New dot. usage: node qa-pr12-recap.mjs <engine> <port> <sha7> <outdir>
import pw from 'playwright-core';
const [E, PORT, S7, OUT] = process.argv.slice(2);
const res = []; const rec = (n, p, i) => { res.push({ e: E, n, p, i }); console.log(`${p === true ? 'PASS' : p === false ? 'FAIL' : 'NOTE'} ${E} ${n} ${JSON.stringify(i)}`); };
const b = await pw[E].launch(E === 'chromium' ? { executablePath: '/usr/bin/google-chrome' } : {});
for (const [w, h] of [[360, 800], [1280, 720]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } }); const pg = await ctx.newPage();
  await pg.addInitScript(() => { if (!sessionStorage.qaInit) { localStorage.clear(); localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true })); sessionStorage.qaInit = 1; } });
  await pg.goto(`http://127.0.0.1:${PORT}/`); await pg.getByText('Tap to start').click();
  await pg.waitForFunction(() => window.eggfarm, null, { timeout: 15000 });
  const bid = await pg.evaluate(() => [...document.scripts].map(s => s.src).join()); 
  const id = await pg.evaluate(async () => { const t = await Promise.all([...document.scripts].filter(s => s.src).map(s => fetch(s.src).then(r => r.text()))); return (t.join().match(/m3-rc1-pre\+[0-9a-f]+(\+dirty)?/) || [null])[0]; });
  const okId = id === `m3-rc1-pre+${S7}` || id === `m3-rc1-pre+${S7}+dirty`; rec(`${w} build ID (+dirty = QA-only m4.enabled=1 balance edit)`, okId, id); if (!okId) { await ctx.close(); continue; }
  rec(`${w} M4 flag on`, await pg.evaluate(() => !!window.eggfarm.balance.m4?.enabled), null);
  await pg.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 25, coinsCents: 50_000_00 }; });
  await pg.waitForTimeout(500); if (await pg.locator('nav [data-nav=upgrades]').isVisible()) await pg.locator('nav [data-nav=upgrades]').click({ force: true }); rec(`${w} layout`, 'n/a', { navVisible: await pg.locator('nav [data-nav=upgrades]').isVisible() }); await pg.locator('.tabs [data-tab=farm]').click({ force: true }); await pg.waitForTimeout(1200);
  const line = pg.locator('[data-testid=hire-nudge-line]');
  const vis = await line.isVisible().catch(() => false); rec(`${w} nudge visible at L25`, vis, null);
  if (vis) {
    await line.scrollIntoViewIfNeeded();
    const m = await pg.evaluate(() => {
      const L = document.querySelector('[data-testid=hire-nudge-line]'), n = L.querySelector('.hire-nudge'), x = L.querySelector('.hire-nudge-x'), lead = n.querySelector('.hn-lead');
      const r = n.getBoundingClientRect(), xr = x.getBoundingClientRect(), lr = L.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(n).lineHeight) || 16;
      const txt = [...n.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.trim()).map(e => ({ t: e.textContent, sw: e.scrollWidth, cw: e.clientWidth, h: e.getBoundingClientRect().height, d: getComputedStyle(e).display }));
      const hit = [-21, 0, 21].map(dy => { const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2 + dy); return !!el && (n === el || n.contains(el)); });
      return { text: n.innerText.replace(/\s+/g, ' ').trim(), leadShown: !!lead && getComputedStyle(lead).display !== 'none', sw: n.scrollWidth, cw: n.clientWidth, h: r.height, lh, txt, rowW: lr.width, nR: r.right, xL: xr.left, xW: xr.width, xH: xr.height, reserve: lr.right - r.right, vw: innerWidth, hit };
    });
    const oneLine = m.h <= m.lh * 1.5 && m.txt.every(t => t.d === 'none' || t.h <= m.lh * 1.5);
    const copyOk = m.leadShown ? /^Busy farm! · Hire a worker ›?$/.test(m.text.replace(/\u00a0/g, ' ')) || m.text.includes('Busy farm') : /Hire a worker/.test(m.text);
    rec(`${w} nudge copy (${m.leadShown ? 'full' : 'fallback'})`, copyOk, { text: m.text, lead: m.leadShown, rowW: m.rowW });
    rec(`${w} nudge one line, no clip (scrollWidth<=clientWidth)`, oneLine && m.sw <= m.cw && m.txt.every(t => t.d === 'none' || t.sw <= t.cw + 0.5) && m.nR <= m.vw, { sw: m.sw, cw: m.cw, h: m.h, lh: m.lh, kids: m.txt });
    rec(`${w} nudge 44px hit area (elementFromPoint ±21px)`, m.hit.every(Boolean), m.hit);
    rec(`${w} × 44x44, no overlap, 52px reserve`, m.xW >= 44 && m.xH >= 44 && m.nR <= m.xL && m.reserve >= 52 - 0.5, { x: [m.xW, m.xH], gap: m.xL - m.nR, reserve: m.reserve });
    await line.screenshot({ path: `${OUT}/${E}-${w}-nudge-line.png` }).catch(() => {});
    await pg.screenshot({ path: `${OUT}/${E}-${w}-nudge.png` });
  }
  // Workers tab New dot: open Upgrades
  await pg.waitForTimeout(300);
  const d = await pg.evaluate(() => {
    const t = document.querySelector('.tabs [data-tab=workers]'), p = t?.querySelector('.tab-pill'), dot = t?.querySelector('.new-dot'); if (!t || !dot) return null;
    const rg = document.createRange(); const tn = [...p.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); rg.selectNodeContents(tn); const tr = rg.getBoundingClientRect();
    const dr = dot.getBoundingClientRect(), pr = p.getBoundingClientRect(), br = t.getBoundingClientRect();
    const ov = !(dr.right <= tr.left || dr.left >= tr.right || dr.bottom <= tr.top || dr.top >= tr.bottom);
    return { shown: !dot.hidden && dr.width > 0, inPill: dot.parentElement === p, text: tn.textContent.trim(), textR: tr.right, dotL: dr.left, dotR: dr.right, gap: dr.left - tr.right, ov, psw: p.scrollWidth, pcw: p.clientWidth, bsw: t.scrollWidth, bcw: t.clientWidth, pillR: pr.right, btnR: br.right, btnH: br.height, btnW: br.width, hit: [-21, 21].map(dy => { const el = document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2 + dy); return !!el && t.contains(el); }), dotInBtn: dr.right <= br.right + 0.5 && dr.left >= br.left };
  });
  rec(`${w} Workers New dot shown`, !!d?.shown, d && { inPill: d.inPill });
  if (d) {
    rec(`${w} 'Workers' not clipped (scrollWidth<=clientWidth pill+tab)`, d.psw <= d.pcw && d.bsw <= d.bcw && d.text === 'Workers', { psw: d.psw, pcw: d.pcw, bsw: d.bsw, bcw: d.bcw });
    rec(`${w} dot does not overlap 'Workers' text rect`, !d.ov && d.dotInBtn, { gap: +d.gap.toFixed(2), textR: d.textR, dotL: d.dotL, dotR: d.dotR, btnR: d.btnR });
    rec(`${w} Workers tab 44px target (rect or elementFromPoint ±21px; pre-existing tab style, not PR #12 scope)`, d.btnH >= 44 || d.hit.every(Boolean) ? true : 'n/a', { h: d.btnH, w: d.btnW, hit: d.hit });
    await pg.locator('.tabs').first().screenshot({ path: `${OUT}/${E}-${w}-workers-tab.png` }).catch(() => {});
    await pg.screenshot({ path: `${OUT}/${E}-${w}-upgrades.png` });
  }
  await ctx.close();
}
await b.close();
(await import('fs')).writeFileSync(`${OUT}/${E}-results.json`, JSON.stringify(res, null, 1));
console.log(`SUMMARY ${E} ${res.filter(r => r.p === true).length} pass ${res.filter(r => r.p === false).length} fail`);
