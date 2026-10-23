// M41-9 #65 exit criteria (HoQA + Art, after CCR M1 on 7779088): the explainer card is NEVER over a visible Buy hit area or a
// hittable Collect, and the FIRST tap on every visible Buy buys, with the Upgrades sheet scrolled.
// Usage: npm run build:qa && node scripts/m41-9-scroll-sweep.mjs <chromium|firefox|webkit> [360|375|390 ...]   (default: all three)
//        node scripts/m41-9-scroll-sweep.mjs --summary            (matrix over every sweep-*.jsonl in the out dir)
//   Serves this worktree's dist-qa (must be HEAD, not +dirty); writes /workspace/wt-ui-shots/m41-9-<sha7>/sweep-<engine>-<w>.jsonl,
//   one screenshot per (tab, refund, scroll) state (mouse pass) and merges them into manifest.json. No environment overrides.
//   One engine per run, inside the browser-test flock.
// Matrix: 360x640 / 375x667 / 390x844 x Farm + Collection tabs x refund line off / on (migrationRefundCents 0 / 123450)
//   x sheet scroll 0 / 100 / 200 / 300 px / end x mouse (page.mouse.click) + touch (hasTouch, touchscreen.tap).
// Fine sweep: Farm + Collection x refund off/on, mouse pass, scrollTop every 4 px 0..end, overlap + hit test only (CCR's sweep).
// Per state: the card is shown at scroll 0 (g.onTracksCommitted, the in-session hook), THEN the sheet body is scrolled (the CCR
//   repro order: the card must re-place on scroll). Measured independently of the app's own placement code:
//   - overlap: the painted card's rect vs every Buy rect clipped to the sheet's scroll container and the viewport, and #collect if
//     elementsFromPoint at its centre (skipping the card) is Collect; a [data-place=none] card has visibility:hidden (no paint, no
//     hit area) and is recorded as such.
//   - first tap: for EACH visible Buy (centre hit-testable with no card), re-arm state + card, scroll, tap the hittable centre once:
//     BUY (level +1, coins down) / DISMISS-ONLY (card closed, nothing bought) / NOTHING. Exit: 0 overlaps, 0 DISMISS-ONLY, 0 NOTHING.
import pw from 'playwright-core'; import { serveOwn } from './serve-own.mjs';
import { mkdirSync, writeFileSync, appendFileSync, readFileSync, existsSync, readdirSync } from 'node:fs'; import { execSync } from 'node:child_process';
const ARGS = process.argv.slice(2), HEAD = execSync('git rev-parse HEAD').toString().trim(), OUT = `/workspace/wt-ui-shots/m41-9-${HEAD.slice(0, 7)}`;
const SIZES = { 360: 640, 375: 667, 390: 844 }, SCROLLS = [0, 100, 200, 300, 'end'], TABS = ['farm', 'collection'], REFUNDS = [0, 123450], INPUTS = ['mouse', 'touch'];
if (ARGS[0] === '--summary') {
  const rows = readdirSync(OUT).filter(f => /^sweep-(chromium|firefox|webkit)-\d+\.jsonl$/.test(f)).flatMap(f => readFileSync(`${OUT}/${f}`, 'utf8').trim().split('\n').map(l => JSON.parse(l)));
  const st = rows.filter(r => r.kind === 'state'), fine = rows.filter(r => r.kind === 'fine'), taps = rows.filter(r => r.kind === 'tap'), ends = rows.filter(r => r.kind === 'done');
  const lines = ['| engine | width | states | card over Buy/Collect | 4px fine sweep: positions / over a Buy | places (states) | taps | BUY | DISMISS-ONLY | NOTHING | page errors |', '|---|---|---|---|---|---|---|---|---|---|---|'];
  let bad = 0;
  for (const eng of ['chromium', 'firefox', 'webkit']) for (const w of [360, 375, 390]) {
    const s = st.filter(r => r.engine === eng && r.w === w), t = taps.filter(r => r.engine === eng && r.w === w), d = ends.find(r => r.engine === eng && r.w === w);
    if (!s.length) { lines.push(`| ${eng} | ${w} | not run | | | | | | | | |`); bad++; continue; }
    const pl = {}; s.forEach(r => pl[r.place] = (pl[r.place] ?? 0) + 1);
    const f = fine.filter(r => r.engine === eng && r.w === w), fp = f.reduce((a, r) => a + r.positions, 0), fo = f.reduce((a, r) => a + r.over.length, 0);
    const ov = s.filter(r => r.overlaps.length || r.efp.some(e => e.onCard)).length, n = k => t.filter(r => r.outcome === k).length, pe = d?.pageErrors?.length ?? 'n/a';
    bad += ov + fo + (fp ? 0 : 1) + n('DISMISS-ONLY') + n('NOTHING') + (t.length ? 0 : 1) + (pe === 0 ? 0 : 1);
    lines.push(`| ${eng} | ${w} | ${s.length} | ${ov} | ${fp} / ${fo} | ${Object.entries(pl).map(([k, v]) => `${k} ${v}`).join(', ')} | ${t.length} | ${n('BUY')} | ${n('DISMISS-ONLY')} | ${n('NOTHING')} | ${pe} |`);
  }
  const fineNone = fine.filter(r => r.places.none).map(r => `${r.engine} ${r.w} ${r.tab} refund=${r.refund ? 'on' : 'off'}: ${r.places.none} of ${r.positions} positions (fine sweep)`);
  const none = st.filter(r => r.place === 'none').map(r => `${r.engine} ${r.w} ${r.tab} refund=${r.refund ? 'on' : 'off'} scroll=${r.scroll}(${r.scrollTop}px) ${r.input}`);
  const txt = `M41-9 #65 scroll sweep @ ${HEAD} (scripts/m41-9-scroll-sweep.mjs)\n\n${lines.join('\n')}\n\nplace:'none' states (card kept out of the way, hidden): ${none.length}\n${none.join('\n')}\n${fineNone.join('\n')}\n\n${bad ? `FAIL (${bad})` : 'PASS: 0 overlaps, 0 dismiss-only, 0 nothing, every engine x width run'}\n`;
  writeFileSync(`${OUT}/sweep-summary.md`, txt); console.log(txt); process.exit(bad ? 1 : 0);
}
const [eng, ...wa] = ARGS, WIDTHS = wa.length ? wa.map(Number) : [360, 375, 390];
if (!['chromium', 'firefox', 'webkit'].includes(eng) || WIDTHS.some(w => !SIZES[w])) { console.error('usage: node scripts/m41-9-scroll-sweep.mjs <chromium|firefox|webkit> [360|375|390 ...] | --summary'); process.exit(2); }
const srv = await serveOwn('dist-qa'); const die = m => { console.error(`m41-9-scroll-sweep: ${m}`); srv.stop(); process.exit(2); };
const html = await (await fetch(srv.url)).text(); let bid = null;
for (const [, u] of html.matchAll(/src="([^"]+\.js)"/g)) { const m = (await (await fetch(new URL(u, srv.url))).text()).match(/["'`](m\d[a-z0-9.-]*)\+([0-9a-f]{7,40})(\+dirty)?["'`]/); if (m) { bid = m; break; } }
if (!bid) die('no build id in dist-qa'); if (bid[3]) die(`dist-qa is +dirty (${bid[0]})`); if (!HEAD.startsWith(bid[2])) die(`dist-qa ${bid[0]} is not HEAD ${HEAD}; npm run build:qa`);
mkdirSync(`${OUT}/sweep`, { recursive: true });
const br = eng === 'chromium' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[eng].launch();
const LV = { farm: 'farmLevel', hens: 'hensLevel', eggValue: 'eggValueLevel', collection: 'collectionLevel' };
const BASE = { farmLevel: 3, hensLevel: 2, eggValueLevel: 2, collectionLevel: 1, coinsCents: 5e7 }, shots = [];
// In-page measurement (independent of tracks-explainer.ts): visible Buy hit areas clipped to the scroll body + viewport, hittable Collect.
const MEASURE = () => {
  const body = document.querySelector('#p-upgrades .body'), br = body.getBoundingClientRect(), card = document.querySelector('.tracks-exp');
  const clip = r => ({ l: Math.max(r.left, br.left, 0), r: Math.min(r.right, br.right, innerWidth), t: Math.max(r.top, br.top, 0), b: Math.min(r.bottom, br.bottom, innerHeight) });
  const notCard = e => !e.closest('.tracks-exp,.tracks-exp-out');
  const buys = [...document.querySelectorAll('#p-upgrades .btn.buy')].map((e, i) => ({ i, kind: e.dataset.kind ?? e.dataset.act ?? '', ...clip(e.getBoundingClientRect()) })).filter(r => r.r > r.l && r.b > r.t);
  const c = document.getElementById('collect'), cr = c.getBoundingClientRect(), top = document.elementsFromPoint(cr.left + cr.width / 2, cr.top + cr.height / 2).find(notCard);
  const collect = top && (top === c || c.contains(top)) ? { kind: 'collect', l: cr.left, r: cr.right, t: cr.top, b: cr.bottom } : null;
  const cs = card && getComputedStyle(card), k = card?.getBoundingClientRect(), painted = !!card && cs.visibility === 'visible' && cs.display !== 'none';
  const cardR = k ? { l: k.left, r: k.right, t: k.top, b: k.bottom } : null, hit = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  const overlaps = painted ? [...buys, ...(collect ? [collect] : [])].filter(r => hit(cardR, r)).map(r => r.kind) : [];
  const efp = buys.map(b => { const e = document.elementFromPoint((b.l + b.r) / 2, (b.t + b.b) / 2); return { kind: b.kind, onBuy: !!e?.closest('.btn.buy'), onCard: !!e?.closest('.tracks-exp') }; });
  return { scrollTop: Math.round(body.scrollTop), maxScroll: body.scrollHeight - body.clientHeight, card: cardR, place: card?.dataset.place ?? null, painted, buys, collect, overlaps, efp };
};
let tapN = 0;
for (const w of WIDTHS) {
  const h = SIZES[w], OUTF = `${OUT}/sweep-${eng}-${w}.jsonl`; writeFileSync(OUTF, ''); const errs = [];
  const rec = o => appendFileSync(OUTF, JSON.stringify({ sha: HEAD, build: bid[0], engine: eng, w, h, ...o }) + '\n');
  for (const input of INPUTS) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: input === 'touch' }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, seenSlots: 10, sfx: false })));
    await p.goto(srv.url); await p.getByText('Tap to start').click({ force: true, timeout: 5000 }).catch(() => {}); await p.waitForFunction(() => window.eggfarm && window.eggfarmUi);
    await p.evaluate(() => { document.getElementById('modal-layer')?.classList.remove('open'); document.querySelectorAll('.tracks-exp').forEach(e => e.remove()); });
    const reset = () => p.evaluate(st => { document.querySelectorAll('.tracks-exp').forEach(e => e.remove()); const g = window.eggfarm; g.state = { ...g.state, ...st, customers: [], nextCustomerInS: 1e9, seenTracksExplainer: true }; window.eggfarmUi.render(); }, BASE);
    const scrollTo = s => p.evaluate(s => { const b = document.querySelector('#p-upgrades .body'); b.scrollTop = s === 'end' ? b.scrollHeight : s; }, s);
    const arm = async (refund, s) => { await reset(); await scrollTo(0); await p.waitForTimeout(120);
      await p.evaluate(r => { const g = window.eggfarm; g.migrationRefundCents = r; g.state = { ...g.state, seenTracksExplainer: false }; g.onTracksCommitted(); }, refund);
      await p.waitForSelector('.tracks-exp', { state: 'attached', timeout: 3000 }); await p.waitForTimeout(300); await scrollTo(s); await p.waitForTimeout(250); };
    await reset(); await p.locator('[data-nav=upgrades]').click(); await p.waitForTimeout(500);
    for (const tab of TABS) {
      await p.locator(`[data-tab=${tab}]`).click(); await p.waitForTimeout(300);
      // fine sweep (mouse pass): every 4 px from 0 to the end with the card up (re-armed every 4 s, inside its 8 s life), overlap only
      if (input === 'mouse') for (const refund of REFUNDS) {
        const max = await p.evaluate(() => { const b = document.querySelector('#p-upgrades .body'); return b.scrollHeight - b.clientHeight; });
        let armed = 0; const fine = { positions: 0, over: [], places: {} };
        for (let s = 0; s <= max + 3; s += 4) { if (Date.now() - armed > 4000) { await arm(refund, 0); armed = Date.now(); }
          await scrollTo(Math.min(s, max)); await p.waitForTimeout(60); const m = await p.evaluate(MEASURE); fine.positions++;
          fine.places[m.place] = (fine.places[m.place] ?? 0) + 1; if (m.overlaps.length || m.efp.some(e => e.onCard)) fine.over.push({ scrollTop: m.scrollTop, place: m.place, overlaps: m.overlaps }); }
        rec({ kind: 'fine', input, tab, refund, maxScroll: max, ...fine });
      }
      for (const refund of REFUNDS) for (const s of SCROLLS) {
        await arm(refund, s); const m = await p.evaluate(MEASURE);
        rec({ kind: 'state', input, tab, refund, scroll: s, ...m });
        if (input === 'mouse') { const file = `sweep/${eng}-${tab}-${refund ? 'refund' : 'plain'}-scroll${s}-${w}x${h}.png`; await p.screenshot({ path: `${OUT}/${file}` });
          shots.push({ state: `#65 scroll sweep: ${tab} sheet, refund line ${refund ? 'on' : 'off'}, scroll ${s} (${m.scrollTop}px), card place=${m.place}${m.painted ? '' : ' (hidden)'}`, viewport: `${w}x${h}`, engine: eng, file, sha: HEAD, build: bid[0] }); }
        // tap targets: Buys whose (clipped) centre hits the Buy with NO card up
        await reset(); await scrollTo(s); await p.waitForTimeout(150);
        const targets = await p.evaluate(() => [...document.querySelectorAll('#p-upgrades #uRow .btn.buy[data-kind]')].map((e, i) => { const body = document.querySelector('#p-upgrades .body').getBoundingClientRect(), r = e.getBoundingClientRect();
          const t = Math.max(r.top, body.top, 0), b = Math.min(r.bottom, body.bottom, innerHeight), x = r.left + r.width / 2, y = (t + b) / 2, hit = document.elementFromPoint(x, y);
          return { i, kind: e.dataset.kind, x, y, ok: b > t && !!hit && (hit === e || e.contains(hit)) }; }).filter(b => b.ok));
        for (const tg of targets) {
          await arm(refund, s); const pre = await p.evaluate(([i, k]) => { const g = window.eggfarm.state, c = document.querySelector('.tracks-exp'); return { lv: g[k], coins: g.coinsCents, place: c?.dataset.place ?? null, painted: !!c && getComputedStyle(c).visibility === 'visible', scrollTop: Math.round(document.querySelector('#p-upgrades .body').scrollTop) }; }, [tg.i, LV[tg.kind]]);
          const cur = await p.evaluate(i => { const e = document.querySelectorAll('#p-upgrades #uRow .btn.buy[data-kind]')[i], body = document.querySelector('#p-upgrades .body').getBoundingClientRect(), r = e.getBoundingClientRect();
            const t = Math.max(r.top, body.top, 0), b = Math.min(r.bottom, body.bottom, innerHeight); return { x: r.left + r.width / 2, y: (t + b) / 2 }; }, tg.i);
          if (input === 'mouse') await p.mouse.click(cur.x, cur.y); else await p.touchscreen.tap(cur.x, cur.y); await p.waitForTimeout(300);
          const post = await p.evaluate(k => { const g = window.eggfarm.state; return { lv: g[k], coins: g.coinsCents, card: !!document.querySelector('.tracks-exp') }; }, LV[tg.kind]);
          const bought = post.lv === pre.lv + 1 && post.coins < pre.coins, outcome = bought ? 'BUY' : !post.card ? 'DISMISS-ONLY' : 'NOTHING'; tapN++;
          rec({ kind: 'tap', input, tab, refund, scroll: s, scrollTop: pre.scrollTop, buy: tg.kind, at: cur, place: pre.place, painted: pre.painted, cardAfter: post.card, outcome });
          console.log(eng, w, input, tab, refund ? 'refund' : 'plain', `scroll=${s}`, tg.kind, pre.place, outcome);
        }
      }
    }
    await ctx.close();
  }
  rec({ kind: 'done', pageErrors: errs });
}
const MF = `${OUT}/manifest.json`, man = existsSync(MF) ? JSON.parse(readFileSync(MF, 'utf8')) : { shots: [] };
man.sweepScript = 'scripts/m41-9-scroll-sweep.mjs'; man.shots = [...(man.shots ?? []).filter(s => !(s.engine === eng && s.file.startsWith('sweep/') && WIDTHS.some(w => s.viewport.startsWith(`${w}x`)))), ...shots]; man.head = HEAD;
writeFileSync(MF, JSON.stringify(man, null, 1) + '\n');
console.log(`m41-9-scroll-sweep ${eng} ${WIDTHS.join('/')}: ${tapN} taps; run --summary for the matrix`);
await br.close(); srv.stop(); process.exit(0);
