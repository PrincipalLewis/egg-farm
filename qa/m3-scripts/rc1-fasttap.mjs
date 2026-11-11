// QA fast-tap Collect (S2-10 leftover). ENGINE=... OUT=... node rc1-fasttap.mjs <worktree>
import { setup } from './s2-lib.mjs';
const { ENGINE, ok, open, done, OUT } = await setup('fasttap');
import fs from 'node:fs';
const rows = [];
for (const [mode, rate] of [['pointer',5],['pointer',10],['pointer',15],['click',5],['click',10],['click',15],['pointer-norefill',15]]) {
  const { ctx, p, errs } = await open({ width: 375, patch: { workers: {}, customers: [], nextCustomerInS: 9999 } });
  await p.evaluate(() => { const g = window.eggfarm, btn = document.querySelector('#collect'); window.__t = []; let cur = null;
    btn.addEventListener('pointerdown', () => { cur = { pd: performance.now() }; window.__t.push(cur); }, true);
    btn.addEventListener('click', () => { if (!cur || cur.clk) { cur = { pd: performance.now() }; window.__t.push(cur); } cur.clk = performance.now(); cur.b0 = g.state.basket; cur.c0 = g.state.coop; }, true);
    btn.addEventListener('click', () => { if (cur) { cur.b1 = g.state.basket; cur.c1 = g.state.coop; } }); // bubble, registered after app.ts: sees post-dispatch state
    new MutationObserver(() => { if (btn.classList.contains('squash') && cur && cur.sq == null) cur.sq = performance.now(); }).observe(btn, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(ms => { for (const m of ms) { const tg = m.target.nodeType === 3 ? m.target.parentElement : m.target; const fl = [...m.addedNodes].some(n => n.classList?.contains('floater') && !n.classList.contains('coin')) || (tg?.closest?.('.floater:not(.coin)'));
      if (fl && cur && cur.pop == null) { cur.pop = performance.now(); cur.popKind = [...m.addedNodes].some(n => n.classList?.contains('floater')) ? 'new' : 'combined'; } } }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] }); });
  const box = await p.locator('#collect').boundingBox(); const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const N = 20, gap = 1000 / rate;
  if (mode === 'pointer-norefill') await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coop: 60 }; });
  for (let i = 0; i < N; i++) { if (mode !== 'pointer-norefill') await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coop: 200 }; }); // keep eggs available: isolates input handling from empty-coop "Empty"
    const t0 = Date.now();
    if (mode.startsWith('pointer')) { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.up(); } else await p.locator('#collect').click({ timeout: 2000 }).catch(() => {});
    const w = gap - (Date.now() - t0); if (w > 0) await p.waitForTimeout(w); }
  await p.waitForTimeout(300);
  const t = await p.evaluate(() => window.__t); const empties = await p.evaluate(() => 0);
  let lost = 0, fb = 0, okc = 0, noClick = 0, noSq = 0, noPop = 0, combined = 0, sqMax = 0, popMax = 0;
  for (const r of t) { const changed = r.b1 != null && (r.b1 !== r.b0 || r.c1 !== r.c0);
    if (!r.clk) { noClick++; lost++; } else if (!changed) lost++; else if (!(r.sq != null && r.sq - r.clk <= 100 && r.pop != null && r.pop - r.clk <= 100)) fb++; else okc++;
    if (r.clk) { if (r.sq == null || r.sq - r.clk > 100) noSq++; if (r.pop == null || r.pop - r.clk > 100) noPop++; if (r.popKind === 'combined') combined++; if (r.sq) sqMax = Math.max(sqMax, r.sq - r.clk); if (r.pop) popMax = Math.max(popMax, r.pop - r.clk); } }
  const sent = N, reg = t.filter(r => r.clk).length, row = { engine: ENGINE, mode, rate, sent, seen: t.length, clicks: reg, lost: lost + (sent - t.length), feedbackMissing: fb, ok: okc, noClickAfterPointerdown: noClick, noSquash100: noSq, noPop100: noPop, combinedPops: combined, sqMaxMs: Math.round(sqMax), popMaxMs: Math.round(popMax), errs: errs.length };
  rows.push(row); ok(`fast-tap ${mode} ${rate}/s: 0 lost`, row.lost === 0, row); ok(`fast-tap ${mode} ${rate}/s: feedback <=100 ms on all`, row.feedbackMissing === 0, row);
  await ctx.close(); }
fs.writeFileSync(`${OUT}/fasttap-rows-${ENGINE}.json`, JSON.stringify(rows, null, 1));
await done();
