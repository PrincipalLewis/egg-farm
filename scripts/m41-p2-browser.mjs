// v5 / M4.1 patch 2 browser ACs + Art/UI QA shots (engineering/m4.1-p2-scope.md f0524447; art package acfe36a7; rc1-asleep v1.0.12).
// Usage: npm run build:qa && node scripts/m41-p2-browser.mjs [chromium|firefox|webkit]   (inside the browser-test flock)
//   Serves THIS checkout's dist-qa (serveForRun: build-id must be HEAD, clean tree). 360x800 / 390x844 / 1280x800.
//   Writes /workspace/wt-ui-shots/m41-p2-<sha7>/<engine>-<view>-<w>.png + manifest.json (sha256 per shot) and
//   results-<engine>.json (every check with its measured numbers). Exit 1 if any check fails.
//   AXE=<path to axe.min.js> (default: the studio's pinned axe-core 4.14.0) for the AC-R17 label-content-name-mismatch run.
//   QA handle seeding only (window.eggfarm / eggfarmUi, compiled out of release builds).
import { chromium, webkit, firefox } from 'playwright-core';
import { serveForRun } from './serve-own.mjs';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
const ENGINE = process.argv[2] ?? 'chromium';
if (!['chromium', 'webkit', 'firefox'].includes(ENGINE)) { console.error(`m41-p2-browser: unknown engine ${ENGINE}`); process.exit(2); }
const AXE = process.env.AXE ?? '/workspace/egg-farm-studio/artifacts/v5-ui/tools/axe-core-4.14.0/axe.min.js';
const axeSrc = existsSync(AXE) ? readFileSync(AXE, 'utf8') : null;
const srv = await serveForRun('dist-qa', 'm41-p2-browser');
const head = execSync('git rev-parse HEAD').toString().trim(), OUT = process.env.OUT ?? `/workspace/wt-ui-shots/m41-p2-${head.slice(0, 7)}`;
mkdirSync(OUT, { recursive: true });
const MAN = `${OUT}/manifest.json`, manifest = existsSync(MAN) ? JSON.parse(readFileSync(MAN, 'utf8')) : { head, buildId: srv.buildId, shots: [] };
manifest.shots = manifest.shots.filter(s => s.engine !== ENGINE);
const browser = ENGINE === 'webkit' ? await webkit.launch() : ENGINE === 'firefox' ? await firefox.launch() : await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const URL0 = `http://127.0.0.1:${srv.port}/`, UI = JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false });
const results = []; let fails = 0;
const check = (id, w, name, pass, data) => { results.push({ id, engine: ENGINE, w, name, pass: !!pass, data }); if (!pass) { fails++; console.error(`FAIL [${ENGINE} ${w}] ${id} ${name} ${JSON.stringify(data)}`); } else console.log(`ok   [${ENGINE} ${w}] ${id} ${name}`); };
async function open(w, h, st, { rm = false, freeze = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 600, reducedMotion: rm ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(ui => localStorage.setItem('eggfarm.ui', ui), UI);
  await page.goto(URL0, { waitUntil: 'domcontentloaded' }); await page.getByText('Tap to start').click(); await page.waitForFunction(() => window.eggfarm);
  await page.evaluate(st => { document.getElementById('modal-layer')?.classList.remove('open'); const g = window.eggfarm;
    g.state = { ...g.state, seenTracksExplainer: true, collectionLevel: 20, farmLevel: 30, customers: [], nextCustomerInS: 1e9, graderTier: 1, manageCdS: 0, coinsCents: 0, ...st.st };
    if (st.freeze) g.frame = () => {}; }, { st, freeze }); // freeze: QA snapshot scenes hold still (sim off, UI renders on)
  await page.waitForTimeout(700); return { ctx, page, errors };
}
async function shot(page, view, w, label, measured, clip) {
  const file = `${ENGINE}-${view}-${w}.png`; const buf = await page.screenshot({ path: `${OUT}/${file}`, ...(clip ? { clip } : {}) });
  manifest.shots.push({ file, label: `${label} (${w}px, ${ENGINE})`, view, viewport: w, engine: ENGINE, measured, sha256: createHash('sha256').update(buf).digest('hex') });
}
const toTab = async (page, tab) => { if (await page.locator('[data-nav=upgrades]').isVisible()) await page.locator('[data-nav=upgrades]').click(); await page.locator(`[data-tab=${tab}]`).click(); await page.waitForTimeout(450); };
const hudClip = async (page, w) => { const bb = await page.locator('header.hud').boundingBox(); return { x: 0, y: 0, width: w, height: Math.ceil(bb.y + bb.height + 8) }; };
// in-page helpers: WCAG relative-luminance contrast of a text colour over its composited card background, effective opacity
const PAGE_LIB = () => {
  const rgb = s => { const m = s.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const over = (fg, bg, a) => ({ r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a) });
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return Math.round((x + 0.05) / (y + 0.05) * 100) / 100; };
  const effOpacity = (el, stop) => { let o = 1; for (let e = el; e; e = e.parentElement) { o *= +getComputedStyle(e).opacity; if (e === stop) break; } return Math.round(o * 1000) / 1000; };
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.a > 0.99) return c; } return { r: 255, g: 255, b: 255 }; };
  const contrast = (el, stop) => { const a = effOpacity(el, stop), bg = bgOf(el.closest('.wk') ?? el); return ratio(over(rgb(getComputedStyle(el).color), bg, a), bg); };
  const r = el => { const b = el.getBoundingClientRect(); return { x: +b.left.toFixed(2), y: +b.top.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2) }; };
  window.__p2 = { rgb, ratio, effOpacity, contrast, r, bgOf };
};
const SIZES = [[360, 800], [390, 844], [1280, 800]];
const ASLEEP = { market_hand: { energy: 0, cdS: 0 }, coop_hand: { energy: 0, cdS: 0 }, hawker: { energy: 90, cdS: 0 }, grader: { energy: 90, cdS: 0 } };
const CH_UNPAID = { coop_hand: { energy: 60, cdS: 0, unpaid: true } }, MH_UNPAID = { market_hand: { energy: 60, cdS: 0, unpaid: true } };
// AC-R17: the 7 QA asleep scenes (MH, CH, both; Asleep and Unpaid) + N = 0; 3 hired so the nav Refill can show (hawker tired)
const R17 = [['mh-asleep', { market_hand: { energy: 0, cdS: 0 } }], ['ch-asleep', { coop_hand: { energy: 0, cdS: 0 } }], ['both-asleep', { market_hand: { energy: 0, cdS: 0 }, coop_hand: { energy: 0, cdS: 0 } }],
  ['mh-unpaid', { market_hand: { energy: 60, cdS: 0, unpaid: true } }], ['ch-unpaid', { coop_hand: { energy: 60, cdS: 0, unpaid: true } }],
  ['both-unpaid', { market_hand: { energy: 60, cdS: 0, unpaid: true }, coop_hand: { energy: 60, cdS: 0, unpaid: true } }],
  ['mh-asleep-ch-unpaid', { market_hand: { energy: 0, cdS: 0 }, coop_hand: { energy: 60, cdS: 0, unpaid: true } }], ['none', {}]];

for (const [w, h] of SIZES) {
  const phone = w < 960;
  // ---- m9 + m5: asleep and unpaid cards (UI-M9-1/2/3/6, UI-M5-1..5, UI-WARN-1..5) ----
  for (const [view, ws, coins] of [['cards-asleep', ASLEEP, 1e9], ['cards-ch-unpaid', CH_UNPAID, 0], ['cards-mh-unpaid', MH_UNPAID, 0]]) {
    const { ctx, page, errors } = await open(w, h, { workers: ws, coinsCents: coins }); await page.evaluate(PAGE_LIB);
    await toTab(page, 'workers'); await page.locator('.wk.is-off').first().scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
    const cards = await page.evaluate(() => [...document.querySelectorAll('.wk.is-off')].map(c => { const P = window.__p2, h3 = c.querySelector('h3'), st = c.querySelector('.st'), wi = st.querySelector('svg.wi'), meta = c.querySelector('.wk-body>.meta');
      const stText = [...st.childNodes].filter(n => n.nodeType === 3).map(n => n.nodeValue).join('');
      return { w: c.dataset.w, cls: c.className, stText, h3Op: P.effOpacity(h3, c), stOp: P.effOpacity(st, c), metaOp: P.effOpacity(meta, c), ebarOp: P.effOpacity(c.querySelector('.ebar'), c),
        bannerOp: P.effOpacity(c.querySelector('.wk-banner'), c), refillOp: P.effOpacity(c.querySelector('.wk-refill'), c), stColor: getComputedStyle(st).color,
        stContrast: P.contrast(st, c), h3Contrast: P.contrast(h3, c), metaContrast: P.contrast(meta, c), h3: P.r(h3), oneLine: h3.getBoundingClientRect().height <= 21 && h3.scrollWidth <= h3.clientWidth,
        icon: wi ? { cls: wi.getAttribute('class'), ah: wi.getAttribute('aria-hidden'), foc: wi.getAttribute('focusable'), ...P.r(wi), color: getComputedStyle(wi).color, va: getComputedStyle(wi).verticalAlign, ml: getComputedStyle(wi).marginLeft } : null }; }));
    const names = await page.evaluate(() => [...document.querySelectorAll('.wk.is-off h3')].map(e => e.textContent));
    for (const c of cards) {
      const unpaid = /unpaid/.test(c.cls), word = unpaid ? 'Unpaid' : 'Asleep';
      check(unpaid ? 'UI-M9-6' : 'UI-M9-1', w, `${c.w} ${word}: h3/.st/.meta at opacity 1, text >= 4.5:1`, c.h3Op === 1 && c.stOp === 1 && c.metaOp === 1 && c.h3Contrast >= 4.5 && c.stContrast >= 4.5 && c.metaContrast >= 4.5 && (!unpaid || c.stColor === 'rgb(184, 59, 55)'), c);
      check('UI-M9-2', w, `${c.w}: .ebar 0.5, banner + Refill 1`, c.ebarOp === 0.5 && c.bannerOp === 1 && c.refillOp === 1, { ebar: c.ebarOp, banner: c.bannerOp, refill: c.refillOp });
      check('UI-M5-1/UI-WARN-1', w, `${c.w}: .st text exactly "${word}", no pictograph`, c.stText === word && !/\p{Extended_Pictographic}|\u26A0/u.test(c.stText), c.stText);
      check(unpaid ? 'UI-WARN-2/4/5' : 'UI-M5-2/4/5', w, `${c.w}: one inline 14x14 svg.${unpaid ? 'wi' : 'wi.wi-moon'}, aria-hidden, -2px, 4px gap, colour ${unpaid ? '#fff fill' : '#3E2C23 ink'}, h3 one line`,
        c.icon && c.icon.cls === (unpaid ? 'wi' : 'wi wi-moon') && c.icon.ah === 'true' && c.icon.foc === 'false' && Math.abs(c.icon.w - 14) < 0.01 && Math.abs(c.icon.h - 14) < 0.01 && c.icon.va === '-2px' && c.icon.ml === '4px'
        && c.icon.color === (unpaid ? 'rgb(255, 255, 255)' : 'rgb(62, 44, 35)') && c.oneLine, c.icon);
    }
    check('UI-M5-3/UI-WARN-3', w, `${view}: heading text = "{Role} · {Word}" (no aria-label)`, names.every(n => /^(Market Hand|Coop Hand) · (Asleep|Unpaid)$/.test(n)), names);
    const axName = await page.getByRole('heading', { name: view === 'cards-asleep' ? 'Coop Hand · Asleep' : view === 'cards-ch-unpaid' ? 'Coop Hand · Unpaid' : 'Market Hand · Unpaid', exact: true }).count();
    check('UI-M5-3/UI-WARN-3', w, `${view}: accessible heading name exact`, axName === 1, axName);
    if (view !== 'cards-asleep') { // P2b on the real card: R10/U1-style caption + describedby + disabled; AC-R16 fit
      const p2b = await page.evaluate(() => { const c = document.querySelector('.wk.unpaid'), bt = c.querySelector('button[data-act=manage]'), cap = c.querySelector('.wk-cap'), d = document.getElementById(bt.getAttribute('aria-describedby'));
        return { cap: cap?.textContent, dis: bt.getAttribute('aria-disabled'), name: bt.getAttribute('aria-label'), desc: d?.textContent, refillW: c.querySelector('.wk-refill').getBoundingClientRect().width }; });
      const role = view === 'cards-ch-unpaid' ? 'Coop Hand' : 'Market Hand', X = view === 'cards-ch-unpaid' ? '$15.00' : '$7.50'; // F30: CH $0.50 x 30, MH $0.25 x 30
      check('AC-R10/U1', w, `${role} Unpaid: "Resumes at ${X}", aria-disabled, name "Refill ${role}", describedby sentence`, p2b.cap === `Resumes at ${X}` && p2b.dis === 'true' && p2b.name === `Refill ${role}` && p2b.desc === `${role} is unpaid. Work resumes automatically when you have ${X}. Sell eggs to earn coins.`, p2b);
      const fits = [];
      for (const t of ['Resumes at $5.00', 'Resumes at $999.9K', 'Resumes at $1M', 'Resumes at $1.23M', 'Resumes at $9,999.99'])
        fits.push(await page.evaluate(t => { const cap = document.querySelector('.wk.unpaid .wk-cap'); cap.textContent = t; const r = cap.getBoundingClientRect(), lh = parseFloat(getComputedStyle(cap).lineHeight);
          return { t, sw: cap.scrollWidth, cw: cap.clientWidth, h: +r.height.toFixed(2), w: +r.width.toFixed(2), oneLine: r.height <= lh + 0.5, ok: cap.scrollWidth <= cap.clientWidth && r.height <= lh + 0.5 && getComputedStyle(cap).textOverflow !== 'ellipsis' }; }, t));
      check('AC-R16', w, `${role}: the 5 forced captions fit one line, no wrap/ellipsis (card refill column ${p2b.refillW.toFixed(1)}px)`, fits.every(f => f.ok), fits);
      await page.evaluate(() => window.eggfarmUi?.render?.());
    }
    await shot(page, view, w, view === 'cards-asleep' ? 'Worker cards asleep (m9 undim, m5 moon after "Asleep")' : `Worker card ${view.includes('ch') ? 'Coop Hand' : 'Market Hand'} unpaid (m9 red word, m5 warn icon, P2b "Resumes at $X")`, cards.map(c => ({ w: c.w, st: c.stText, h3Contrast: c.h3Contrast, stContrast: c.stContrast, icon: c.icon && `${c.icon.w}x${c.icon.h}` })));
    check('no page errors', w, view, errors.length === 0, errors); await ctx.close();
  }
  // ---- m8 coop tip (UI-M8-1/2/3) ----
  { const { ctx, page } = await open(w, h, { workers: {}, farmLevel: 30, coop: 1e9, coopFullS: 30 });
    const ok = await page.waitForSelector('.cooptip', { timeout: 4000 }).then(() => true).catch(() => false);
    const t = ok ? await page.evaluate(() => { const e = document.querySelector('.cooptip'), cs = getComputedStyle(e), r = e.getBoundingClientRect(), nav = document.querySelector('nav.actions'), nr = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect() : null;
      return { font: `${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily}`, w: +r.width.toFixed(2), h: +r.height.toFixed(2), left: +r.left.toFixed(2), right: +r.right.toFixed(2), bottom: +r.bottom.toFixed(2), navTop: nr?.top ?? null,
        lines: Math.round((r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) / parseFloat(cs.lineHeight)), sw: e.scrollWidth, cw: e.clientWidth, sh: e.scrollHeight, ch: e.clientHeight }; }) : null;
    check('UI-M8-1', w, '.cooptip computes 700 14px/18.2px Nunito', t && t.font.startsWith('700 14px/18.2px') && /Nunito/.test(t.font), t);
    check('UI-M8-2/3', w, `.cooptip ${Math.min(320, w - 32)} wide, <= 2 lines, no overflow, inside the viewport, >= 8px above the nav (phone)`, t && Math.abs(t.w - Math.min(320, w - 32)) < 0.5 && t.lines <= 2 && t.sw <= t.cw && t.sh <= t.ch && t.left >= 16 - 0.5 && t.right <= w - 16 + 0.5 && (!phone || t.navTop === null || t.bottom <= t.navTop - 8), t);
    if (t) await shot(page, 'coop-tip', w, 'Coop Hand tip (m8: 700 14px/1.3 Nunito, max-content, min(320, 100vw-32))', t);
    await ctx.close(); }
  // ---- m6 HUD rate (UI-M6-1/2/3/5/8) ----
  for (const [view, ws] of [['hud-warn-neg', { market_hand: { energy: 0, cdS: 0 } }], ['hud-pos', { market_hand: { energy: 90, cdS: 0 }, coop_hand: { energy: 90, cdS: 0 } }]]) {
    const { ctx, page } = await open(w, h, { workers: ws, coinsCents: 1e9, collectionLevel: 20 }); await page.evaluate(PAGE_LIB); await page.waitForTimeout(1300);
    const r = await page.evaluate(() => { const P = window.__p2, e = document.querySelector('#rate'), wi = e.querySelector('svg.wi'), cs = getComputedStyle(wi);
      return { text: e.textContent, aria: e.getAttribute('aria-label'), warn: e.classList.contains('warn'), shown: cs.display !== 'none', icon: P.r(wi), va: cs.verticalAlign, mr: cs.marginRight, color: cs.color, tri: e.querySelector('.tri').getAttribute('aria-hidden'), triText: e.querySelector('.tri').textContent, rt: e.querySelector('.rt').textContent, rate: P.r(e), pill: P.r(document.querySelector('.pill.coins')), settings: P.r(document.getElementById('settings')) }; });
    if (view === 'hud-warn-neg') {
      check('UI-M6-1/8', w, 'neg: no U+26A0 text, starts "▼", one visible svg.wi, ▼ in aria-hidden .tri, aria ends ", sales stopped"', !r.text.includes('\u26A0') && r.text.startsWith('\u25BC ') && r.warn && r.shown && r.tri === 'true' && r.triText === '\u25BC ' && /^Net income .* per second, sales stopped$/.test(r.aria), r);
      check('UI-M6-2/3', w, 'icon 11x11 at -1.5px, 2px gap, #fff fill; #rate 13px tall; settings 44x44', Math.abs(r.icon.w - 11) < 0.01 && Math.abs(r.icon.h - 11) < 0.01 && r.va === '-1.5px' && r.mr === '2px' && r.color === 'rgb(255, 255, 255)' && Math.abs(r.rate.h - 13) < 0.5 && r.settings.w === 44 && r.settings.h === 44, r);
      const ax = await page.locator('#rate').ariaSnapshot().catch(e => String(e));
      check('UI-M6-5/8', w, 'accessibility: #rate content has no ▼ / warning sign', !/\u25BC|\u26A0|warning/i.test(ax.replace(/"Net income[^"]*"/, '')), ax);
    } else check('UI-M6-1', w, 'pos: no .warn, icon hidden, .tri empty, "+$X/s"', !r.warn && !r.shown && r.triText === '' && /^\+\$/.test(r.text), r);
    await shot(page, view, w, view === 'hud-warn-neg' ? 'HUD rate negative (m6: inline warn SVG, aria-hidden ▼)' : 'HUD rate positive (m6: no icon)', r, await hudClip(page, w));
    await ctx.close();
  }
  // ---- m10 disabled Buy (UI-M10-1/2/8/9) ----
  { const { ctx, page } = await open(w, h, { workers: {}, farmLevel: 10, hensLevel: 5, eggValueLevel: 3, collectionLevel: 5, coinsCents: 0 });
    await toTab(page, 'farm'); await page.evaluate(PAGE_LIB);
    const r = await page.evaluate(() => { const P = window.__p2; const bs = [...document.querySelectorAll('#uRow .btn.buy[aria-disabled="true"]')];
      return { token: getComputedStyle(document.documentElement).getPropertyValue('--c-muted-strong').trim(), n: bs.length, btns: bs.map(b => { const cs = getComputedStyle(b); return { kind: b.dataset.kind, color: cs.color, num: getComputedStyle(b.querySelector('.num') ?? b).color, bg: cs.backgroundColor, cursor: cs.cursor, shadow: cs.boxShadow, native: b.disabled, tab: b.tabIndex, ratio: P.ratio(P.rgb(cs.color), P.rgb(cs.backgroundColor)), ...P.r(b) }; }) }; });
    check('UI-M10-8', w, '--c-muted-strong computes #5A4C42', r.token.toUpperCase() === '#5A4C42', r.token);
    check('UI-M10-1/2/5', w, `every disabled Buy rgb(90,76,66) on #CFC6BA >= 4.5 (4.88), not-allowed, flat, aria-disabled not native, focusable (${r.n})`, r.n >= 3 && r.btns.every(x => x.color === 'rgb(90, 76, 66)' && x.num === 'rgb(90, 76, 66)' && x.bg === 'rgb(207, 198, 186)' && x.ratio >= 4.5 && x.cursor === 'not-allowed' && x.shadow === 'none' && !x.native && x.tab === 0 && x.h >= 44), r);
    await shot(page, 'disabled-buy', w, 'Disabled / unaffordable Buy (m10: --c-muted-strong 4.88:1, cursor not-allowed), Farm tab', r.btns.map(x => `${x.kind} ${x.color} ${x.ratio}:1 ${x.w}x${x.h}`));
    await ctx.close(); }
  // ---- AC-R17 label in name (axe label-content-name-mismatch = 0; name starts with visible text) ----
  for (const [scene, ws] of R17) {
    const { ctx, page } = await open(w, h, { workers: { market_hand: { energy: 90, cdS: 0 }, coop_hand: { energy: 90, cdS: 0 }, hawker: { energy: 30, cdS: 0 }, ...ws }, coinsCents: 0 }, { freeze: true });
    await toTab(page, 'workers'); await page.waitForTimeout(300);
    const r = await page.evaluate(() => { const vis = el => [...el.childNodes].map(n => n.nodeType === 3 ? n.nodeValue : n.nodeType === 1 && n.checkVisibility?.({ visibilityProperty: true }) !== false && getComputedStyle(n).display !== 'none' ? vis(n) : '').join('');
      return ['nav [data-nav=upgrades]', '.tabs [data-tab=workers]', '[data-act=manageAll].nav-manage'].map(sel => { const e = document.querySelector(sel); if (!e || e.hidden || !e.getClientRects().length) return { sel, shown: false };
        const v = vis(e).replace(/\s+/g, ' ').trim(), name = e.getAttribute('aria-label'); return { sel, shown: true, v, name, ok: name.startsWith(v) }; }); });
    const n = { 'mh-asleep': 1, 'ch-asleep': 1, 'both-asleep': 2, 'mh-unpaid': 1, 'ch-unpaid': 1, 'both-unpaid': 2, 'mh-asleep-ch-unpaid': 2, none: 0 }[scene];
    const shown = r.filter(x => x.shown), wt = r[1];
    check('AC-R17', w, `${scene}: every shown control's name starts with its visible text; Workers tab ${n ? `"Workers ${n}, …"` : '"Workers"'}`, shown.every(x => x.ok) && wt.shown && (n ? wt.name === `Workers ${n}, ${n} asleep or unpaid` : wt.name === 'Workers'), r);
    if (axeSrc) { await page.addScriptTag({ content: axeSrc });
      const ax = await page.evaluate(async () => { const inc = ['nav [data-nav=upgrades]', '.tabs [data-tab=workers]', 'nav [data-act=manageAll]', '#p-upgrades header [data-act=manageAll]'].filter(s => document.querySelector(s));
        const res = await window.axe.run({ include: inc.map(s => [s]) }, { runOnly: { type: 'rule', values: ['label-content-name-mismatch'] } });
        return { v: res.violations.flatMap(x => x.nodes.map(n => n.target.join(' '))), passes: res.passes.flatMap(x => x.nodes.length), incomplete: res.incomplete.flatMap(x => x.nodes.map(n => n.target.join(' '))) }; });
      check('AC-R17 axe', w, `${scene}: axe 4.14 label-content-name-mismatch violations = 0`, ax.v.length === 0, ax);
    } else check('AC-R17 axe', w, `${scene}: axe not run (AXE path missing)`, false, AXE);
    await ctx.close();
  }
  // ---- WCAG 2.4.11: keyboard focus through the Workers list never hidden under the sticky Refill bar ----
  { const { ctx, page } = await open(w, h, { workers: { market_hand: { energy: 30, cdS: 0 }, coop_hand: { energy: 25, cdS: 0 }, hawker: { energy: 20, cdS: 0 }, grader: { energy: 90, cdS: 0 } }, coinsCents: 1e9, graderTier: 1 });
    await toTab(page, 'workers'); await page.waitForTimeout(300);
    const probe = () => page.evaluate(() => { const a = document.activeElement, row = document.getElementById('uRow'); if (!a || !row.contains(a)) return null;
      const bar = row.querySelector(':scope > .refill-wrap'); let sc = row.parentElement; while (sc && !/(auto|scroll)/.test(getComputedStyle(sc).overflowY)) sc = sc.parentElement;
      const r = a.getBoundingClientRect(), br = bar?.getBoundingClientRect(), sr = (sc ?? document.documentElement).getBoundingClientRect(), inBar = bar?.contains(a);
      const top = Math.max(sr.top, 0), bottom = Math.min(sr.bottom, innerHeight), under = !inBar && br ? Math.max(0, Math.min(r.bottom, br.bottom) - Math.max(r.top, br.top)) : 0;
      return { el: `${a.tagName}${a.dataset.act ? `[${a.dataset.act}${a.dataset.w ? ':' + a.dataset.w : ''}]` : ''}`, top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), barBottom: br ? +br.bottom.toFixed(1) : null, view: [+top.toFixed(1), +bottom.toFixed(1)], under: +under.toFixed(1),
        ok: under < 0.5 && r.top >= top - 0.5 && r.bottom <= bottom + 0.5, barH: row.style.getPropertyValue('--refill-bar-h'), scrollTop: sc?.scrollTop ?? null }; });
    const hasBar = await page.locator('#uRow > .refill-wrap').count();
    await page.locator('#uRow > .refill-wrap button').focus(); const fwd = [], back = [];
    for (let i = 0; i < 24; i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(80); const p = await probe(); if (!p) break; fwd.push(p); }
    let worst = null;
    for (let i = 0; i < 24; i++) { await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(80); const p = await probe(); if (!p) break; back.push(p); if (!worst || p.top - (p.barBottom ?? 0) < worst.top - (worst.barBottom ?? 0)) worst = p; }
    const all = [...fwd, ...back];
    check('WCAG 2.4.11', w, `keyboard Tab / Shift+Tab through the Workers list: every focused control fully visible, none under the sticky Refill bar (${fwd.length}+${back.length} stops, bar ${hasBar ? 'shown' : 'absent'})`, hasBar && fwd.length >= 4 && back.length >= 4 && all.every(p => p.ok), { fwd, back });
    // shot at the stop closest to the bar on the way back up (the case 2.4.11 is about)
    for (let i = 0; i < 24; i++) { const p = await probe(); if (p && worst && p.el === worst.el) break; await page.keyboard.press(i < 12 ? 'Tab' : 'Shift+Tab'); }
    await shot(page, 'focus-under-refill-bar', w, 'Keyboard focus just below the sticky Refill bar after Shift+Tab (WCAG 2.4.11 scroll-margin-top = measured bar + 8px)', worst);
    await ctx.close(); }
  // ---- Art nit n1 on #70: refund pop never covers #rate (every frame for 1 s) ----
  { const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 600 }); const page = await ctx.newPage();
    await page.addInitScript(ui => localStorage.setItem('eggfarm.ui', ui), UI);
    await page.goto(URL0); await page.getByText('Tap to start').click(); await page.waitForFunction(() => window.eggfarm);
    await page.evaluate(() => { document.getElementById('modal-layer')?.classList.remove('open'); const g = window.eggfarm;
      g.state = { ...g.state, seenTracksExplainer: true, farmLevel: 12, collectionLevel: 9, coinsCents: 500000, customers: [], nextCustomerInS: 1e9, workers: { market_hand: { energy: 0, cdS: 0 }, coop_hand: { energy: 90, cdS: 0 } } }; });
    await page.waitForTimeout(1300);
    await page.evaluate(() => { window.__pop = { frames: 0, pops: 0, hit: 0, maxOverlap: 0, minGap: Infinity, mid: null }; const rate = () => document.querySelector('#rate').getBoundingClientRect();
      new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && /exp-pop/.test(n.className)) { window.__pop.pops++; const t0 = performance.now();
        const tick = () => { if (!n.isConnected) return; const a = n.getBoundingClientRect(), r = rate(); const ov = Math.max(0, Math.min(a.right, r.right) - Math.max(a.left, r.left)) * Math.max(0, Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top));
          const coins = [...document.querySelectorAll('.exp-coin')].reduce((s, c) => { const b = c.getBoundingClientRect(); return s + Math.max(0, Math.min(b.right, r.right) - Math.max(b.left, r.left)) * Math.max(0, Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top)); }, 0);
          const P = window.__pop; P.frames++; if (ov + coins > 0) P.hit++; P.maxOverlap = Math.max(P.maxOverlap, ov + coins); P.minGap = Math.min(P.minGap, a.top - r.bottom); if (!P.mid && performance.now() - t0 > 250) P.mid = { t: Math.round(performance.now() - t0), pop: [a.left, a.top, a.width, a.height].map(v => +v.toFixed(1)), rate: [r.left, r.top, r.width, r.height].map(v => +v.toFixed(1)) };
          requestAnimationFrame(tick); }; requestAnimationFrame(tick); } }).observe(document.body, { childList: true });
      const g = window.eggfarm; g.migrationRefundCents = 123450; g.state = { ...g.state, coinsCents: g.state.coinsCents + 123450, seenTracksExplainer: false }; g.onTracksCommitted(); });
    await page.waitForSelector('.tracks-exp', { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(400);
    await page.locator('.tracks-exp-ok').first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
    await shot(page, 'refund-pop-vs-rate', w, 'Refund pop ~300 ms after dismiss: below the coins pill, #rate uncovered (Art nit n1 on #70)', null, await hudClip(page, w).then(c => ({ ...c, height: c.height + 60 })));
    await page.waitForTimeout(900);
    const p = await page.evaluate(() => window.__pop);
    check('Art n1 #70', w, `refund pop + coin burst cover 0 px² of #rate in every frame (${p.frames} frames)`, p.pops === 1 && p.frames >= 20 && p.hit === 0 && p.minGap >= 0, p);
    await ctx.close(); }
}
// ---- m1 yard trace (UI-M1-1..5, UI-M1-9), 390 + 360/1280 identity ----
for (const [w, h] of SIZES) for (const rm of [false, true]) {
  const { ctx, page } = await open(w, h, { workers: {}, farmLevel: 10, hensLevel: 0, coinsCents: 1e15 }, { rm });
  const r = await page.evaluate(async () => {
    const yard = document.getElementById('yard'), orig = [...yard.querySelectorAll('img.hen')], bob0 = orig.map(e => e.getAnimations().find(a => a.animationName === 'bob')?.startTime ?? null);
    let created = 0, removed = 0, popStart = 0, popEnd = 0, anyStart = 0, maxAnims = 0, firstFrameScale = []; const T0 = performance.now(), ends = [];
    new MutationObserver(ms => { for (const m of ms) { for (const n of m.addedNodes) if (n.nodeName === 'IMG') { created++; requestAnimationFrame(() => firstFrameScale.push(getComputedStyle(n).scale)); } for (const n of m.removedNodes) if (n.nodeName === 'IMG') removed++; } }).observe(yard, { childList: true, subtree: true });
    yard.addEventListener('animationstart', e => { anyStart++; if (e.animationName === 'popin') popStart++; }); yard.addEventListener('animationend', e => { if (e.animationName === 'popin') { popEnd++; ends.push(performance.now() - T0); } });
    let run = true; const frame = () => { for (const e of yard.querySelectorAll('img.hen')) maxAnims = Math.max(maxAnims, e.getAnimations().length); if (run) requestAnimationFrame(frame); }; requestAnimationFrame(frame);
    for (let k = 0; k < 5; k++) { window.eggfarm.dispatch({ type: 'buyTrack', track: 'hens' }); window.eggfarmUi.render(); await new Promise(r => setTimeout(r, 80)); }
    await new Promise(r => setTimeout(r, 1200)); run = false;
    const now = [...yard.querySelectorAll('img.hen')];
    return { hensLevel: window.eggfarm.state.hensLevel, count: now.length, kept: orig.filter(e => now.includes(e)).length, origN: orig.length, created, removed, popStart, popEnd, anyStart, maxAnims, lastPopEndMs: ends.length ? Math.round(Math.max(...ends)) : null,
      bobSame: orig.every((e, i) => (e.getAnimations().find(a => a.animationName === 'bob')?.startTime ?? null) === bob0[i]), firstFrameScale, rmClass: document.querySelector('.rm') !== null }; });
  if (!rm) {
    check('UI-M1-1/2', w, `5 Hens buys 80 ms apart: kept ${r.kept}/${r.origN}, created ${r.created}, discarded ${r.removed}; originals' bob startTime unchanged`, r.count === 12 && r.kept === r.origN && r.created === 7 && r.removed === 0 && r.bobSame, r);
    check('UI-M1-3/4', w, `popin: 7 starts / 7 ends (one per new hen), last end ${r.lastPopEndMs} ms after the first buy (<= ~720 incl. 4 x 80 ms spacing)`, r.popStart === 7 && r.popEnd === 7 && r.lastPopEndMs !== null && r.lastPopEndMs <= 320 + 400, r);
  } else check('UI-M1-9', w, 'reduced motion: 0 hen animations in every frame, 0 animationstart, new hens scale none at first frame, keyed 7/0', r.maxAnims === 0 && r.anyStart === 0 && r.created === 7 && r.removed === 0 && r.firstFrameScale.every(s => s === 'none'), r);
  await ctx.close();
}
await browser.close(); srv.stop();
writeFileSync(MAN, JSON.stringify(manifest, null, 1) + '\n');
writeFileSync(`${OUT}/results-${ENGINE}.json`, JSON.stringify({ head, buildId: srv.buildId, engine: ENGINE, checks: results.length, fails, results }, null, 1) + '\n');
console.log(`m41-p2-browser [${ENGINE}] ${results.length - fails}/${results.length} checks pass, ${manifest.shots.filter(s => s.engine === ENGINE).length} shots -> ${OUT}`);
process.exitCode = fails ? 1 : 0;
