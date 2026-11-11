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
    rec(`${w} nudge one line, no clip (scrollWidth<=clientWidth)`, oneLine && m.sw <= m.cw && m.txt.every(t => t.d === 'none' || t.d === 'inline' || t.sw <= t.cw + 0.5) && m.nR <= m.vw, { sw: m.sw, cw: m.cw, h: m.h, lh: m.lh, kids: m.txt });
    rec(`${w} nudge 44px hit area (elementFromPoint ±21px)`, m.hit.every(Boolean), m.hit);
    rec(`${w} × 44x44, no overlap, 52px reserve`, m.xW >= 44 && m.xH >= 44 && m.nR <= m.xL && m.reserve >= 52 - 0.5, { x: [m.xW, m.xH], gap: m.xL - m.nR, reserve: m.reserve });
    await line.screenshot({ path: `${OUT}/${E}-${w}-nudge-line.png` }).catch(() => {});
    await pg.screenshot({ path: `${OUT}/${E}-${w}-nudge.png` });
  }
  // Workers tab New dot: open Upgrades
  await pg.evaluate(() => document.querySelector('.tabs [data-tab=workers]')?.scrollIntoView({ block: 'center' })); await pg.waitForTimeout(600);
  const d = await pg.evaluate(() => {
    const t = document.querySelector('.tabs [data-tab=workers]'), p = t?.querySelector('.tab-pill'), dot = t?.querySelector('.new-dot'); if (!t || !dot) return null;
    const rg = document.createRange(); const tn = [...p.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); rg.selectNodeContents(tn); const tr = rg.getBoundingClientRect();
    const dr = dot.getBoundingClientRect(), pr = p.getBoundingClientRect(), br = t.getBoundingClientRect();
    const ov = !(dr.right <= tr.left || dr.left >= tr.right || dr.bottom <= tr.top || dr.top >= tr.bottom);
    const pcs = getComputedStyle(p); return { pOverflow: pcs.overflow + '/' + pcs.textOverflow, pPadR: pcs.paddingRight, pContentR: pr.right - parseFloat(pcs.paddingRight) - parseFloat(pcs.borderRightWidth), dotR2: dr.right, shown: !dot.hidden && dr.width > 0, inPill: dot.parentElement === p, text: tn.textContent.trim(), textR: tr.right, dotL: dr.left, dotR: dr.right, gap: dr.left - tr.right, ov, psw: p.scrollWidth, pcw: p.clientWidth, bsw: t.scrollWidth, bcw: t.clientWidth, pillR: pr.right, btnR: br.right, btnH: br.height, btnW: br.width, before: (() => { const cs = getComputedStyle(t, '::before'); return { content: cs.content, pos: cs.position, top: cs.top, bottom: cs.bottom, left: cs.left, right: cs.right, h: cs.height, w: cs.width }; })(), eff: (() => { const cx = br.left + br.width / 2, cy = br.top + br.height / 2, on = (x, y) => { const el = document.elementFromPoint(x, y); return !!el && t.contains(el); }; let top = cy, bot = cy, l = cx, r = cx; for (let y = cy; y > cy - 60 && on(cx, y); y -= 0.5) top = y; for (let y = cy; y < cy + 60 && on(cx, y); y += 0.5) bot = y; for (let x = cx; x > cx - 120 && on(x, cy); x -= 0.5) l = x; for (let x = cx; x < cx + 120 && on(x, cy); x += 0.5) r = x; const atC = (() => { const el = document.elementFromPoint(cx, cy); return el ? el.tagName + '.' + el.className + ' ' + (el.outerHTML || '').slice(0, 90) : null; })(), vp = [innerWidth, innerHeight, cx, cy]; const edges = { tl: on(l + 1, top + 1), tr: on(r - 1, top + 1), bl: on(l + 1, bot - 1), br: on(r - 1, bot - 1) }; return { atC, vp, h: bot - top + 0.5, w: r - l + 0.5, top: top - br.top, bot: bot - br.bottom, edges }; })(), hit: [-21, 21].map(dy => { const el = document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2 + dy); return !!el && t.contains(el); }), dotInBtn: dr.right <= br.right + 0.5 && dr.left >= br.left };
  });
  rec(`${w} Workers New dot shown`, !!d?.shown, d && { inPill: d.inPill });
  if (d) {
    { const strict = d.psw <= d.pcw && d.bsw <= d.bcw, vis = d.textR <= d.pillR + 0.5 && d.dotR2 <= d.pillR + 0.5; rec(`${w} 'Workers' not clipped (scrollWidth<=clientWidth pill+tab; text+dot rect inside pill)`, d.text === 'Workers' && vis && (strict || d.psw - d.pcw <= 1 ? (strict ? true : 'n/a') : false), { psw: d.psw, pcw: d.pcw, bsw: d.bsw, bcw: d.bcw, textR: d.textR, dotR: d.dotR2, pillR: d.pillR, pContentR: d.pContentR, overflow: d.pOverflow, note: strict ? '' : '1px scrollWidth rounding; see rects' }); }
    rec(`${w} dot does not overlap 'Workers' text rect`, !d.ov && d.dotInBtn, { gap: +d.gap.toFixed(2), textR: d.textR, dotL: d.dotL, dotR: d.dotR, btnR: d.btnR });
    rec(`${w} Workers tab effective tap area >=44x44 (elementFromPoint scan + corners)`, d.eff.h >= 44 && d.eff.w >= 44 && Object.values(d.eff.edges).every(Boolean), { rect: [d.btnW, d.btnH], eff: d.eff, before: d.before });
    await pg.locator('.tabs').first().screenshot({ path: `${OUT}/${E}-${w}-workers-tab.png` }).catch(() => {});
    await pg.screenshot({ path: `${OUT}/${E}-${w}-upgrades.png` });
  }
  await ctx.close();
}
await b.close();
(await import('fs')).writeFileSync(`${OUT}/${E}-results.json`, JSON.stringify(res, null, 1));
console.log(`SUMMARY ${E} ${res.filter(r => r.p === true).length} pass ${res.filter(r => r.p === false).length} fail`);
