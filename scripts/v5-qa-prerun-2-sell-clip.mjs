// QA-PRERUN-2 (UI QA 76390f2 pre-run, HoQ QA-D-1030-PRERUN-TRIAGE; qa/m3-recheck/prerun-76390f2-bugs/bug-p64-ff375-sell-label-clip.md):
// the QA4-1 Sell button label must never overflow its box (MK-24-1 v3: shared --sell-w, never ellipsis/clip the button).
// Usage: npm run build:qa && node scripts/v5-qa-prerun-2-sell-clip.mjs <chromium|firefox|webkit> [WxH ...]
//        default sizes 360x640 375x667 390x844 1280x800. One engine per run, inside the browser-test flock. Exit 1 on any FAIL.
//   Serves this worktree's dist-qa (must be HEAD, not +dirty); writes /workspace/wt-ui-shots/v5-qa-prerun-2-<sha7>/sell-<engine>-<WxH>.jsonl
//   and one Market screenshot per (fixture, size) (shots/<engine>-<fixture>-<WxH>.png) for Art.
// Fixtures = the QA p64 'huge' set (p64.mjs:91): 999.9K, Qa, Dc-999.9, sci-1.00e36, huge-max (orders #900/#901).
// Per Sell button (independent of order-list.ts): scrollWidth vs clientWidth (QA's check), and the fractional width of each label line
//   (.sk / .sy getBoundingClientRect) vs the button's content box (clientWidth - padding). Also records the border-box width and
//   --sell-w, so before/after runs can be compared (Chromium/WebKit may only change by the slack).
import pw from 'playwright-core'; import { serveOwn } from './serve-own.mjs';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs'; import { execSync } from 'node:child_process';
const ARGS = process.argv.slice(2), HEAD = execSync('git rev-parse HEAD').toString().trim(), OUT = `/workspace/wt-ui-shots/v5-qa-prerun-2-${HEAD.slice(0, 7)}`;
const [eng, ...sa] = ARGS, SIZES = (sa.length ? sa : ['360x640', '375x667', '390x844', '1280x800']).map(s => s.split('x').map(Number));
if (!['chromium', 'firefox', 'webkit'].includes(eng) || SIZES.some(([w, h]) => !(w > 0 && h > 0))) { console.error('usage: node scripts/v5-qa-prerun-2-sell-clip.mjs <chromium|firefox|webkit> [WxH ...]'); process.exit(2); }
const srv = await serveOwn('dist-qa'); const die = m => { console.error(`v5-qa-prerun-2: ${m}`); srv.stop(); process.exit(2); };
const html = await (await fetch(srv.url)).text(); let bid = null;
for (const [, u] of html.matchAll(/src="([^"]+\.js)"/g)) { const m = (await (await fetch(new URL(u, srv.url))).text()).match(/["'`](m\d[a-z0-9.-]*)\+([0-9a-f]{7,40})(\+dirty)?["'`]/); if (m) { bid = m; break; } }
if (!bid) die('no build id in dist-qa'); if (bid[3]) die(`dist-qa is +dirty (${bid[0]})`); if (!HEAD.startsWith(bid[2])) die(`dist-qa ${bid[0]} is not HEAD ${HEAD}; npm run build:qa`);
mkdirSync(`${OUT}/shots`, { recursive: true });
const br = eng === 'chromium' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[eng].launch();
const HUGE = [['999.9K', [[999_949, 123_456], [999_999, 999_000]], 2e6], ['Qa', [[1.2e15, 6e14], [9.99e15, 1e15]], 2e16], ['Dc-999.9', [[999.9e33, 999e33], [4.5e34, 1e34]], 1e35],
  ['sci-1.00e36', [[1e36, 9.9e35], [1.234e36, 5e35]], 2e36], ['huge-max', [[Number.MAX_SAFE_INTEGER, 1e15], [9e37, 1e37]], 1e38]];
const MEASURE = () => [...document.querySelectorAll('#p-market .order[data-row] .btn.sell')].filter(b => b.getClientRects().length).map(b => {
  const cs = getComputedStyle(b), r = b.getBoundingClientRect(), content = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const line = sel => { const e = b.querySelector(sel); if (!e) return null; const k = e.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(e); return { text: e.textContent, w: +k.width.toFixed(3), textW: +rg.getBoundingClientRect().width.toFixed(3), sw: e.scrollWidth, cw: e.clientWidth }; };
  const sk = line('.sk'), sy = line('.sy');
  return { row: b.closest('.order')?.dataset.row, text: b.textContent, sw: b.scrollWidth, cw: b.clientWidth, w: +r.width.toFixed(3), content: +content.toFixed(3),
    sellW: b.closest('.order-list')?.style.getPropertyValue('--sell-w') || null, sk, sy, need: Math.max(sk?.textW ?? 0, sy?.textW ?? 0) };
});
let checks = 0; const fails = [];
for (const [w, h] of SIZES) {
  const size = `${w}x${h}`, OUTF = `${OUT}/sell-${eng}-${size}.jsonl`; writeFileSync(OUTF, '');
  const rec = o => appendFileSync(OUTF, JSON.stringify({ sha: HEAD, build: bid[0], engine: eng, size, ...o }) + '\n');
  const ok = (cond, name, d) => { checks++; if (!cond) { fails.push(`${size} ${name}`); console.log('FAIL', size, name, JSON.stringify(d ?? '').slice(0, 400)); } rec({ kind: 'check', id: 'QA-PRERUN-2', name, pass: !!cond, detail: d }); return cond; };
  for (const [nm, cs, basket] of HUGE) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900 }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    try {
      await p.addInitScript(() => { if (!sessionStorage.getItem('qa2')) { sessionStorage.setItem('qa2', '1'); localStorage.clear(); localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, seenSlots: 10, workersIntroA: true, workersIntroB: true, sfx: false, reducedMotion: true })); } });
      await p.goto(srv.url); await p.getByText('Tap to start').click({ timeout: 60000 }).catch(() => {}); await p.waitForFunction(() => window.eggfarm && window.eggfarmUi, null, { timeout: 20000 });
      for (let i = 0; i < 4; i++) { if (await p.locator('#wbCollect').isVisible().catch(() => false)) await p.locator('#wbCollect').click().catch(() => {}); await p.waitForTimeout(150); }
      await p.evaluate(([cs, bk]) => { document.getElementById('modal-layer')?.classList.remove('open'); document.querySelectorAll('.tracks-exp').forEach(e => e.remove()); const g = window.eggfarm;
        g.state = { ...g.state, seenTracksExplainer: true, customers: cs.map(([d, f], i) => ({ id: 900 + i, demand: d, filled: f, waitedS: 0 })), basket: bk, nextCustomerInS: 1e9, nextCustomerId: 999 }; window.eggfarmUi.render(); }, [cs, basket]);
      const vis = () => p.evaluate(() => { const m = document.querySelector('#p-market'); return !!m && m.getClientRects().length > 0 && m.getBoundingClientRect().height > 0; });
      if (!(await vis())) { await p.locator('[data-nav=market]').click(); await p.waitForTimeout(600); }
      await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
      const btns = await p.evaluate(MEASURE); await p.screenshot({ path: `${OUT}/shots/${eng}-${nm}-${size}.png` });
      ok(btns.length >= 2, `${nm}: Sell buttons measured`, btns.length);
      for (const b of btns) {
        ok(b.sw <= b.cw, `${nm} #${b.row}: Sell scrollWidth <= clientWidth (QA p64 check, no 0.5 tolerance)`, b);
        ok(b.need <= b.content + 0.01, `${nm} #${b.row}: each label line (fractional) fits the button content box`, b);
      }
      rec({ kind: 'state', fixture: nm, btns, errs });
      ok(errs.length === 0, `${nm}: no page errors`, errs);
      console.log(eng, size, nm, btns.map(b => `#${b.row} w=${b.w} cw=${b.cw} sw=${b.sw} need=${b.need} content=${b.content} --sell-w=${b.sellW}`).join(' | '));
    } catch (e) { ok(false, `${nm} threw ${e.message.slice(0, 200)}`); }
    await ctx.close();
  }
}
await br.close(); srv.stop();
console.log(`v5-qa-prerun-2 ${eng} ${SIZES.map(s => s.join('x')).join(' ')} @ ${HEAD.slice(0, 7)}: checks=${checks} fails=${fails.length}${fails.length ? '\n  ' + fails.join('\n  ') : ''}`);
process.exit(fails.length ? 1 : 0);
