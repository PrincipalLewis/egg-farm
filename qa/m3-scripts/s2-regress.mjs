// Regression for S2-4a/b/c. PORT=.. ENGINE=.. node s2-regress.mjs <worktree>
import { setup, st, saved } from './s2-lib.mjs';
const { ok, open, done, OUT, ENGINE } = await setup('s2-regress');
const W = ms => new Promise(r => setTimeout(r, ms));
// (a) greyed controls: money + save unchanged. No workers (no wages/auto-sales), basket 0, coop 0.
{ const { ctx, p } = await open({ patch: { farmLevel: 12, collectionLevel: 12, coinsCents: 1500, basket: 0, coop: 0, workers: {}, graderTier: 0, customers: [], nextCustomerInS: 999 } });
  await W(6000); const s0 = await st(p), v0 = await saved(p); const tapped = [];
  await p.click('[data-nav=upgrades]'); await p.waitForTimeout(400);
  for (const tab of ['farm', 'collection', 'workers']) { await p.click(`[data-tab=${tab}]`); await p.waitForTimeout(300);
    const btns = p.locator('#uRow button.btn[aria-disabled=true]'); const n = await btns.count();
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { await btns.nth(i).click({ force: true }).catch(() => {}); await p.waitForTimeout(120); } tapped.push(`${tab}:${n}`); }
  await p.screenshot({ path: `${OUT}/a-greyed-L12-${ENGINE}.png` });
  await p.locator('#p-upgrades .close').click(); await p.click('[data-nav=market]'); await p.waitForTimeout(300);
  if (await p.locator('#sellAll[aria-disabled=true]').count()) { await p.click('#sellAll', { force: true }); tapped.push('sellAll'); }
  await p.locator('#p-market .close').click(); await p.click('#collect', { force: true }).catch(() => {}); tapped.push('collect(empty)');
  await W(6500); const s1 = await st(p), v1 = await saved(p);
  const same = ['coins', 'farm', 'coll', 'workers', 'grader'].every(k => s0[k] === s1[k] && v0[k] === v1[k]);
  ok('(a) greyed taps incl. L12 farm upgrade leave money and save unchanged (no workers)', same && tapped[0] !== 'farm:0', { tapped, s0: s0.coins, s1: s1.coins, v0: v0.coins, v1: v1.coins, hdr: [s0.header, s1.header] }); await ctx.close(); }
// (a2) greyed Manage / Manage all during cooldown with workers hired: no refill, cooldown not reset, money only moves by wages/sales
{ const { ctx, p } = await open({ patch: { farmLevel: 12, coinsCents: 1500, manageCdS: 30 } });
  const s0 = await st(p); const w0 = JSON.parse(s0.workers);
  await p.click('[data-nav=upgrades]'); await p.waitForTimeout(400); await p.click('[data-tab=workers]'); await p.waitForTimeout(300);
  const btns = p.locator('#uRow button[aria-disabled=true]'); const n = await btns.count();
  for (let i = 0; i < n; i++) await btns.nth(i).click({ force: true }).catch(() => {});
  const fm = p.locator('.farm-manage-all'); if (await fm.isVisible().catch(() => false)) await fm.click({ force: true });
  await p.waitForTimeout(300); const s1 = await st(p), cd = await p.evaluate(() => window.eggfarm.state.manageCdS); const w1 = JSON.parse(s1.workers);
  const refilled = Object.keys(w0).filter(k => (w1[k]?.energy ?? 0) > (w0[k]?.energy ?? 0) + 0.5);
  ok('(a2) greyed worker/Manage taps during cooldown: no refill, cooldown not reset, no spend', !refilled.length && cd < 30 && s1.farm === s0.farm && s0.coins - s1.coins < 500, { n, refilled, cd, d: s1.coins - s0.coins }); await ctx.close(); }
// (b) Upgrades sheet live: header money + ETA + affordability update while open
{ const cost = 3664 * 100; const { ctx, p } = await open({ patch: { farmLevel: 12, coinsCents: cost - 60000 } });
  await p.click('[data-nav=upgrades]'); await p.waitForTimeout(400); await p.click('[data-tab=farm]'); await p.waitForTimeout(500); const seq = [];
  for (let i = 0; i < 20; i++) { seq.push(await p.evaluate(() => ({ c: document.getElementById('coins').textContent, cs: window.eggfarm.state.coinsCents, h: document.querySelector('#uRow .hint')?.textContent ?? '', dis: document.querySelector('#uRow .btn.buy')?.getAttribute('aria-disabled') }))); await p.waitForTimeout(1000); }
  await p.screenshot({ path: `${OUT}/b-upgrades-live-${ENGINE}.png` });
  const hdr = new Set(seq.map(s => s.c)).size, eta = new Set(seq.map(s => s.h)).size, stateMoved = new Set(seq.map(s => s.cs)).size;
  const crossed = seq.find(s => s.cs >= cost); const flip = crossed ? seq.find(s => s.cs >= cost + 100)?.dis === 'false' : null;
  ok('(b) Upgrades sheet: money and ETA update live while open', stateMoved > 1 && hdr > 1 && eta > 1 && flip !== false, { stateMoved, hdr, eta, flip, first: seq[0], last: seq.at(-1) }); await ctx.close(); }
// (c) offline popup egg count == eggs added to basket (stock)
for (const away of [600e3, 7200e3]) { const { ctx, p } = await open({ awayMs: away, keepWelcome: true, patch: { basket: 0, workers: {} } });
  const pend = await p.evaluate(() => window.eggfarm.state.pendingOfflineEggs); const txt = (await p.textContent('.modal .big, #modal-layer .big').catch(() => '')).trim();
  await p.screenshot({ path: `${OUT}/c-offline-${away / 1000}s-${ENGINE}.png` });
  const b0 = (await st(p)).basket; await p.click('#wbCollect'); await p.waitForTimeout(400); const s1 = await st(p);
  const shown = txt.replace(/[^0-9.KMB]/g, ''); const expectTxt = await p.evaluate(n => { const f = n => n >= 1e3 ? null : String(n); return f(n); }, pend);
  ok(`(c) offline popup count matches basket stock (away ${away / 1000}s)`, pend > 0 && s1.basket - b0 === pend && (expectTxt === null || shown === expectTxt) && s1.header !== undefined, { txt, pend, delta: s1.basket - b0, basketHdr: await p.textContent('#basket') }); await ctx.close(); }
await done();
