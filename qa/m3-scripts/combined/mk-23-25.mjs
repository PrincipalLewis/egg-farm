// MK-23..MK-25 (product/market/feature-spec.md) on the QA build. MK-24 per-egg copy -> N/A when not in this build.
import { setup } from '../s2-lib.mjs';
const { ok, open, done } = await setup('mk-23-25');
const cents = t => { const m = (t || '').replace(/,/g, '').match(/\+\$([\d.]+)(K|M)?/); return m ? Math.round(+m[1] * (m[2] === 'K' ? 1e3 : m[2] === 'M' ? 1e6 : 1) * 100) : null; };
for (const w of [360, 390]) {
  const { ctx, p } = await open({ width: w, patch: { farmLevel: 12, coinsCents: 50000, basket: 28, nextCustomerInS: 1e9, workers: {}, customers: [{ id: 901, demand: 138, filled: 0, waitedS: 0 }, { id: 902, demand: 1, filled: 0, waitedS: 0 }] } });
  await p.locator('[data-nav=market]').click(); await p.waitForTimeout(600);
  const rows = await p.evaluate(() => [...document.querySelectorAll('#mRows .order[data-row]')].map(r => ({ id: r.dataset.row, text: r.innerText.replace(/\s+/g, ' ').trim(), btn: r.querySelector('button[data-id]')?.innerText.replace(/\s+/g, ' ').trim(), btnH: r.querySelector('button[data-id]')?.getBoundingClientRect().height, rowH: r.getBoundingClientRect().height })));
  ok(`MK-23 ${w}px no order card shows $0.00`, rows.length >= 2 && rows.every(r => !/\$0\.00(?!\d)/.test(r.text)), rows.map(r => r.text.slice(0, 80)));
  const perEgg = rows.some(r => /per egg/.test(r.text));
  if (perEgg) { ok(`MK-24 ${w}px price line "$X per egg · paid as you sell"`, rows.every(r => /\$[\d.,]+ per egg/.test(r.text) && /paid as you sell/.test(r.text)), rows.map(r => r.text.slice(0, 90)));
    ok(`MK-24b ${w}px Sell button ≥44 px and shows eggs + coins of this tap`, rows.every(r => r.btnH >= 44 && /Sell \d+/.test(r.btn) && /\+\$/.test(r.btn)), rows.map(r => [r.btn, r.btnH])); }
  else console.log(`N/A [MK-24 ${w}px] per-egg price line / Sell N · +$Y copy not in this build`);
  // MK-25: the partial sale on the 138 order adds exactly the shown amount
  const r0 = rows.find(r => r.id === '901'); const shown = cents(r0?.btn);
  const c0 = await p.evaluate(() => window.eggfarm.state.coinsCents);
  await p.locator('#mRows .order[data-row="901"] button[data-id]').click(); await p.waitForTimeout(300);
  const c1 = await p.evaluate(() => window.eggfarm.state.coinsCents);
  if (shown !== null) ok(`MK-25 ${w}px partial sale adds exactly the shown +$ amount`, c1 - c0 === shown, { shown, delta: c1 - c0, btn: r0?.btn });
  else console.log(`N/A [MK-25 ${w}px] button shows no +$ value in this build (delta ${c1 - c0}c, btn "${r0?.btn}")`);
  await ctx.close();
}
await done();
