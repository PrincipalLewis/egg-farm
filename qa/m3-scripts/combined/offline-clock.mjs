// Offline earnings + clock change in the browser (QA build). ENGINE=.. PORT=.. DIST=dist-qa OUT=<dir> node offline-clock.mjs <clone>
import { setup } from '../s2-lib.mjs';
const { ok, open, done } = await setup('offline-clock');
const get = async (awayMs) => { const { ctx, p, errs } = await open({ awayMs, keepWelcome: true, patch: { pendingOfflineEggs: 0, farmLevel: 10 } });
  const r = await p.evaluate(() => ({ pend: window.eggfarm.state.pendingOfflineEggs, modal: !!document.querySelector('#wbCollect'), cap: window.eggfarm.b.offline.offlineCapSeconds }));
  await ctx.close(); return { ...r, errs: errs.length }; };
const h1 = await get(3600e3), cap = await get(h1.cap * 1000), d2 = await get(48 * 3600e3), back = await get(-3600e3), short = await get(20e3);
ok('1 h away: offline grant > 0 with welcome-back modal', h1.pend > 0 && h1.modal, h1);
ok('grant proportional: cap grant / 1 h grant = cap/3600 (±0.2%, page-load seconds)', Math.abs(cap.pend / h1.pend - cap.cap / 3600) <= 0.002 * cap.cap / 3600, { h1: h1.pend, cap: cap.pend });
ok('48 h away is clamped to the cap', Math.abs(d2.pend - cap.pend) <= 1, { d2: d2.pend, cap: cap.pend });
ok('clock moved back 1 h (savedAt in the future): no grant, no modal', back.pend === 0, back);
ok('20 s away (< min): no grant', short.pend === 0, short);
ok('no page errors', [h1, cap, d2, back, short].every(x => !x.errs));
await done();
