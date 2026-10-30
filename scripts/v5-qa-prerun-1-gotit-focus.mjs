// QA-PRERUN-1 (UI QA 76390f2 pre-run, HoQ QA-D-1030-PRERUN-TRIAGE; qa/m3-recheck/prerun-76390f2-bugs/bug-csr-wk375-gotit-focus.md):
// keyboard focus must reach (and stay on) "Got it" in the tracks explainer, and the card must be painted whenever it, or anything
// inside it, has focus. Repro + regression check, one engine per run (inside the browser-test flock).
// Usage: npm run build:qa && node scripts/v5-qa-prerun-1-gotit-focus.mjs <chromium|firefox|webkit> [WxH ...]
//        default sizes 360x640 375x667 375x800 390x844 (375x800 = the QA harness size). Exit 1 on any FAIL.
//   Serves this worktree's dist-qa (must be HEAD, not +dirty); writes /workspace/wt-ui-shots/v5-qa-prerun-1-<sha7>/gotit-<engine>-<WxH>.jsonl
//   (one record per check, with the full per-keystroke focus trace) and screenshots of the focused state.
// Cases per size: main view, Upgrades > Farm, Upgrades > Collection x refund line off / on (migrationRefundCents 0 / 123450):
//   QA-PRERUN-1 harness      the csr-spot.mjs sequence: Tab x8 looking for focus in .tracks-exp; fallback Got it.focus() + Shift+Tab + Tab.
//                            PASS = focus lands on Got it, card painted (visibility visible, opacity 1, data-place != none), and a
//                            visible ring (outline solid >= 2px; the resting box-shadow does not count).
//   QA-PRERUN-1 roundtrip    Tab x8 then Shift+Tab x8 returns to Got it, painted, with a ring.
//   QA-PRERUN-1 never-hidden at every keystroke of both sequences: if document.activeElement is inside the card, the card is painted.
//   QA-PRERUN-1 pointer      (Farm, refund on) card shown after mouse input, sheet scrolled to every 20 px: whenever the card is not
//                            painted, focus is not inside it (no hidden focused element) and the card does not cover a Buy when painted.
//   QA-PRERUN-1 autoclose    (Farm, refund on) the card is still up at 7.6 s and gone by 8.6 s after show, untouched and with keyboard
//                            focus moved into it (EXP_MS 8000 unchanged).
import pw from 'playwright-core'; import { serveOwn } from './serve-own.mjs';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs'; import { execSync } from 'node:child_process';
const ARGS = process.argv.slice(2), HEAD = execSync('git rev-parse HEAD').toString().trim(), OUT = `/workspace/wt-ui-shots/v5-qa-prerun-1-${HEAD.slice(0, 7)}`;
const [eng, ...sa] = ARGS, SIZES = (sa.length ? sa : ['360x640', '375x667', '375x800', '390x844']).map(s => s.split('x').map(Number));
if (!['chromium', 'firefox', 'webkit'].includes(eng) || SIZES.some(([w, h]) => !(w > 0 && h > 0))) { console.error('usage: node scripts/v5-qa-prerun-1-gotit-focus.mjs <chromium|firefox|webkit> [WxH ...]'); process.exit(2); }
const srv = await serveOwn('dist-qa'); const die = m => { console.error(`v5-qa-prerun-1: ${m}`); srv.stop(); process.exit(2); };
const html = await (await fetch(srv.url)).text(); let bid = null;
for (const [, u] of html.matchAll(/src="([^"]+\.js)"/g)) { const m = (await (await fetch(new URL(u, srv.url))).text()).match(/["'`](m\d[a-z0-9.-]*)\+([0-9a-f]{7,40})(\+dirty)?["'`]/); if (m) { bid = m; break; } }
if (!bid) die('no build id in dist-qa'); if (bid[3]) die(`dist-qa is +dirty (${bid[0]})`); if (!HEAD.startsWith(bid[2])) die(`dist-qa ${bid[0]} is not HEAD ${HEAD}; npm run build:qa`);
mkdirSync(`${OUT}/shots`, { recursive: true });
const br = eng === 'chromium' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[eng].launch();
let checks = 0; const fails = [];
// In-page state, independent of tracks-explainer.ts: where focus is, whether the card is painted, sheet scroll, card vs Buy overlap.
const STATE = () => {
  const a = document.activeElement, c = document.querySelector('.tracks-exp'), cs = c && getComputedStyle(c), body = document.querySelector('#p-upgrades .body');
  const inCard = !!(a && c && c.contains(a)), painted = !!c && cs.visibility === 'visible' && cs.display !== 'none' && parseFloat(cs.opacity) >= 0.99 && c.dataset.place !== 'none';
  const acs = a && getComputedStyle(a); let fv = false; try { fv = !!a?.matches(':focus-visible'); } catch {}
  const nm = e => !e ? null : e === document.body ? 'body' : e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.classList.length ? '.' + [...e.classList].join('.') : '') + (e.dataset?.tab ? `[tab=${e.dataset.tab}]` : '') + (e.dataset?.nav ? `[nav=${e.dataset.nav}]` : '');
  const k = c?.getBoundingClientRect(), bb = body?.getBoundingClientRect();
  const buys = [...document.querySelectorAll('.btn.buy')].filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(), cl = body && body.contains(e) ? bb : { left: 0, right: innerWidth, top: 0, bottom: innerHeight };
    return { l: Math.max(r.left, cl.left, 0), r: Math.min(r.right, cl.right, innerWidth), t: Math.max(r.top, cl.top, 0), b: Math.min(r.bottom, cl.bottom, innerHeight) }; }).filter(r => r.r > r.l && r.b > r.t);
  const over = painted && k ? buys.filter(r => k.left < r.r && r.l < k.right && k.top < r.b && r.t < k.bottom).length : 0;
  return { active: nm(a), activeText: a?.textContent?.trim().slice(0, 24) ?? null, inCard, onOk: !!a?.classList?.contains('tracks-exp-ok'), focusVisible: fv,
    ring: !!acs && acs.outlineStyle !== 'none' && parseFloat(acs.outlineWidth) >= 2, outline: acs ? `${acs.outlineStyle} ${acs.outlineWidth} ${acs.outlineColor}` : null,
    card: !!c, place: c?.dataset.place ?? null, visibility: cs?.visibility ?? null, opacity: cs ? +parseFloat(cs.opacity).toFixed(2) : null, painted,
    rect: k ? [k.left, k.top, k.right, k.bottom].map(Math.round) : null, scrollTop: body ? Math.round(body.scrollTop) : null, overBuys: over };
};
for (const [w, h] of SIZES) {
  const size = `${w}x${h}`, OUTF = `${OUT}/gotit-${eng}-${size}.jsonl`; writeFileSync(OUTF, '');
  const rec = o => appendFileSync(OUTF, JSON.stringify({ sha: HEAD, build: bid[0], engine: eng, size, ...o }) + '\n');
  const ok = (cond, id, name, d) => { checks++; if (!cond) { fails.push(`${size} ${name}`); console.log('FAIL', size, name, JSON.stringify(d ?? '').slice(0, 400)); } rec({ kind: 'check', id, name, pass: !!cond, detail: d }); return cond; };
  const errs = [];
  const open = async (view) => {
    const ctx = await br.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { if (!sessionStorage.getItem('qaS')) { sessionStorage.setItem('qaS', '1'); localStorage.clear(); localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, seenSlots: 10, workersIntroA: true, workersIntroB: true, sfx: false })); } });
    await p.goto(srv.url); await p.getByText('Tap to start').click({ timeout: 60000 }).catch(() => {}); await p.waitForFunction(() => window.eggfarm && window.eggfarmUi, null, { timeout: 20000 });
    await p.evaluate(() => { document.getElementById('modal-layer')?.classList.remove('open'); document.querySelectorAll('.tracks-exp').forEach(e => e.remove()); const g = window.eggfarm;
      g.state = { ...g.state, farmLevel: 3, hensLevel: 2, eggValueLevel: 2, collectionLevel: 1, seenTracksExplainer: true, customers: [], nextCustomerInS: 1e9, coinsCents: 5e7 }; window.eggfarmUi.render(); });
    await p.waitForTimeout(300);
    if (view !== 'main') { await p.locator('[data-nav=upgrades]').click(); await p.waitForTimeout(350); await p.locator(`[data-tab=${view.split('-')[1]}]`).click(); await p.waitForTimeout(400); }
    return { ctx, p };
  };
  const show = async (p, refund) => { await p.evaluate(r => { document.querySelectorAll('.tracks-exp,.tracks-exp-out,.exp-pop,.exp-coin').forEach(e => e.remove()); const g = window.eggfarm; g.migrationRefundCents = r; g.state = { ...g.state, seenTracksExplainer: false }; g.onTracksCommitted(); }, refund);
    await p.waitForSelector('.tracks-exp', { state: 'attached', timeout: 3000 }); await p.waitForTimeout(400); };
  const press = async (p, key, trace) => { await p.keyboard.press(key); await p.waitForTimeout(120); const s = await p.evaluate(STATE); trace.push({ key, ...s }); return s; };
  for (const view of ['main', 'sheet-farm', 'sheet-collection']) for (const refund of [0, 123450]) {
    const tag = `exp-${view}-${refund ? 'refund' : 'plain'}`; let ctx;
    try {
      const o = await open(view); ctx = o.ctx; const p = o.p;
      // 1. the QA harness sequence (csr-spot.mjs tabTo + fallback)
      await show(p, refund); const s0 = await p.evaluate(STATE); const trace = [{ key: 'show', ...s0 }];
      ok(s0.onOk && s0.painted, 'QA-PRERUN-1', `${tag}: at show Got it has focus and the card is painted`, s0);
      let hit = null;
      for (let i = 0; i < 8; i++) { const s = await press(p, 'Tab', trace); if (s.inCard) { hit = s; break; } }
      let via = hit ? 'Tab' : null;
      if (!hit) { await p.evaluate(() => document.querySelector('.tracks-exp-ok')?.focus()); trace.push({ key: 'focus()', ...(await p.evaluate(STATE)) }); await press(p, 'Shift+Tab', trace); const s = await press(p, 'Tab', trace); if (s.inCard) { hit = s; via = 'focus()+Shift+Tab/Tab'; } }
      await p.screenshot({ path: `${OUT}/shots/${eng}-${tag}-harness-focus-${size}.png` });
      ok(!!hit && hit.onOk && hit.painted && hit.ring, 'QA-PRERUN-1', `${tag}: harness sequence puts keyboard focus on Got it, card painted, ring visible`, { via, hit, trace });
      ok(trace.every(s => !s.inCard || s.painted), 'QA-PRERUN-1', `${tag}: never-hidden (harness sequence): card painted whenever focus is inside it`, trace.filter(s => s.inCard && !s.painted));
      rec({ kind: 'trace', id: 'QA-PRERUN-1', seq: 'harness', tag, via, trace });
      // 2. round trip: Tab x8 then Shift+Tab x8 from Got it
      await show(p, refund); const t2 = [{ key: 'show', ...(await p.evaluate(STATE)) }];
      for (let i = 0; i < 8; i++) await press(p, 'Tab', t2);
      let back = null; for (let i = 0; i < 8; i++) back = await press(p, 'Shift+Tab', t2);
      await p.screenshot({ path: `${OUT}/shots/${eng}-${tag}-roundtrip-${size}.png` });
      ok(back.onOk && back.painted && back.ring, 'QA-PRERUN-1', `${tag}: roundtrip Tab x8 + Shift+Tab x8 returns to Got it, painted, ring visible`, { back, trace: t2 });
      ok(t2.every(s => !s.inCard || s.painted), 'QA-PRERUN-1', `${tag}: never-hidden (roundtrip): card painted whenever focus is inside it`, t2.filter(s => s.inCard && !s.painted));
      rec({ kind: 'trace', id: 'QA-PRERUN-1', seq: 'roundtrip', tag, trace: t2 });
      await ctx.close(); ctx = null;
    } catch (e) { ok(false, 'QA-PRERUN-1', `${tag} threw ${e.message.slice(0, 200)}`); }
    await ctx?.close();
  }
  // 3. pointer: card up after mouse input, programmatic scroll of the sheet body
  try {
    const { ctx, p } = await open('sheet-farm'); await show(p, 123450);
    const max = await p.evaluate(() => { const b = document.querySelector('#p-upgrades .body'); return b.scrollHeight - b.clientHeight; }); const pts = [];
    for (let s = 0; s <= max + 19; s += 20) { await p.evaluate(s => { document.querySelector('#p-upgrades .body').scrollTop = s; }, Math.min(s, max)); await p.waitForTimeout(80); pts.push(await p.evaluate(STATE)); }
    ok(pts.every(s => !s.inCard || s.painted), 'QA-PRERUN-1', 'pointer: no hidden focused element while the sheet scrolls (focus never inside an unpainted card)', pts.filter(s => s.inCard && !s.painted));
    ok(pts.every(s => !s.painted || s.overBuys === 0), 'QA-PRERUN-1', 'pointer: a painted card never covers a visible Buy while the sheet scrolls (M41-9 rule kept)', pts.filter(s => s.painted && s.overBuys));
    rec({ kind: 'trace', id: 'QA-PRERUN-1', seq: 'pointer-scroll', places: pts.map(s => `${s.scrollTop}:${s.place}${s.inCard ? '*' : ''}`) });
    await ctx.close();
  } catch (e) { ok(false, 'QA-PRERUN-1', `pointer threw ${e.message.slice(0, 200)}`); }
  // 4. 8 s auto-close unchanged (untouched; keyboard focus moved into the card)
  for (const mode of ['untouched', 'keyboard']) try {
    const { ctx, p } = await open('sheet-farm'); await show(p, 123450); const t0 = Date.now() - 400;
    if (mode === 'keyboard') { const tr = []; await press(p, 'Tab', tr); await press(p, 'Shift+Tab', tr); }
    await p.waitForTimeout(Math.max(0, 7600 - (Date.now() - t0))); const at76 = await p.evaluate(() => !!document.querySelector('.tracks-exp'));
    await p.waitForTimeout(Math.max(0, 8600 - (Date.now() - t0))); const at86 = await p.evaluate(() => !!document.querySelector('.tracks-exp'));
    ok(at76 && !at86, 'QA-PRERUN-1', `autoclose (${mode}): card up at 7.6 s, gone by 8.6 s`, { at76, at86 });
    await ctx.close();
  } catch (e) { ok(false, 'QA-PRERUN-1', `autoclose ${mode} threw ${e.message.slice(0, 200)}`); }
  ok(errs.length === 0, 'QA-PRERUN-1', 'no page errors', errs);
  rec({ kind: 'done', pageErrors: errs });
}
await br.close(); srv.stop();
console.log(`v5-qa-prerun-1 ${eng} ${SIZES.map(s => s.join('x')).join(' ')} @ ${HEAD.slice(0, 7)}: checks=${checks} fails=${fails.length}${fails.length ? '\n  ' + fails.join('\n  ') : ''}`);
process.exit(fails.length ? 1 : 0);
