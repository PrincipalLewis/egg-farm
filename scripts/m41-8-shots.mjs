// M41-8 F3/F4 360 shots + checks (art-ux/f4-next-goal-label.md; m4a-spec v1.25 §18 F4-11/F4-17; art-ux/m4.1-ui-minors.md UX-M4).
// Usage: npm run build:qa && node scripts/m41-8-shots.mjs <chromium|firefox|webkit> <outDir ending in -<sha7 of the build>>
// One engine per run (run each inside the browser lock). Refuses a +dirty build and an outDir not named for the build's hash.
import pw from 'playwright-core'; import { serveOwn } from './serve-own.mjs';
import { mkdirSync, existsSync, writeFileSync, appendFileSync } from 'node:fs'; import { basename } from 'node:path';
const [eng = 'chromium', OUT] = process.argv.slice(2);
if (!OUT) { console.error('usage: node scripts/m41-8-shots.mjs <engine> <outDir>'); process.exit(2); }
const srv = await serveOwn('dist-qa');
const die = m => { console.error(`m41-8-shots: ${m}`); srv.stop(); process.exit(2); };
const html = await (await fetch(srv.url)).text();
let ver = null; for (const [, u] of html.matchAll(/src="([^"]+\.js)"/g)) { const m = (await (await fetch(new URL(u, srv.url))).text()).match(/["'`](m\d[a-z0-9.-]*)\+([0-9a-f]{7,40})(\+dirty)?["'`]/); if (m) { ver = m; break; } }
if (!ver) die('no build id in the served dist-qa'); const [, release, hash, dirty] = ver;
if (dirty) die(`build ${ver[0]} is +dirty: commit, npm run build:qa, re-run`);
if (!basename(OUT).endsWith(`-${hash.slice(0, 7)}`)) die(`outDir ${OUT} must end with -${hash.slice(0, 7)} (the served build)`);
mkdirSync(OUT, { recursive: true });
if (!existsSync(`${OUT}/README.txt`)) writeFileSync(`${OUT}/README.txt`, `M41-8 F3/F4 shots from build ${release}+${hash} (scripts/m41-8-shots.mjs, dist-qa), 360x640, one engine per run.\n`);
const br = eng === 'chromium' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[eng].launch();
let bad = 0; const log = [];
const ok = (k, v, d) => { if (!v) bad++; const line = `${v ? 'PASS' : 'FAIL'} [${eng}] ${k} ${JSON.stringify(d ?? '')}`; console.log(line); log.push(line); };
const NB = '\u00a0';
/** `income`: seed one sale first so the rolling income/s is > 0 (F4-11 hides the % while it is 0). */
async function open(st, income = false) {
  const ctx = await br.newContext({ viewport: { width: 360, height: 640 } }); const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, seenSlots: 6 })));
  await p.goto(srv.url); await p.getByText('Tap to start').click({ force: true }).catch(() => {}); await p.waitForFunction(() => window.eggfarm);
  await p.evaluate(({ st, income }) => { const g = window.eggfarm;
    if (income) { g.state = { ...g.state, basket: 20, customers: [{ id: 99001, demand: 5, filled: 0, waitedS: 0 }] }; g.dispatch({ type: 'sellAll' }); }
    g.state = { ...g.state, ...st, seenTracksExplainer: true, customers: [], nextCustomerInS: 1e9 }; }, { st, income });
  await p.waitForTimeout(1300); return { ctx, p };
}
/** Open the Upgrades sheet on `tab` and scroll the chip (or the first row) into view: the sheet covers the strip at 360. */
async function openTab(p, tab) {
  await p.evaluate(() => document.querySelector('nav [data-nav=upgrades]').click()); await p.waitForTimeout(300);
  await p.evaluate(t => document.querySelector(`[data-tab=${t}]`).click(), tab); await p.waitForTimeout(600);
  await p.evaluate(() => (document.querySelector('.best-chip') ?? document.querySelector('.up'))?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
}
/** Geometry of the strip label: suffix / level spans fully visible and inside the pill; only .ng-name may be ellipsised. */
const measure = (p, sel = '#goal') => p.evaluate(sel => {
  const b = document.querySelector(sel), pill = b.querySelector('.goal-pill').getBoundingClientRect(), lbl = b.querySelector('.goal-label');
  const r = e => e && e.getBoundingClientRect(), inside = e => { const q = r(e); return !e || (q.left >= pill.left - 0.5 && q.right <= pill.right + 0.5); };
  const sfx = lbl.querySelector('.ng-sfx'), lv = lbl.querySelector('.ng-lv'), name = lbl.querySelector('.ng-name'), tail = lbl.querySelector('.ng-tail');
  const full = e => !e || e.scrollWidth <= e.clientWidth + 0.5 && getComputedStyle(e).textOverflow !== 'ellipsis';
  const lr = r(lbl), within = e => !e || (r(e).right <= lr.right + 0.5);
  const d = b.getAttribute('aria-describedby'); // F4-14a: F4 targets speak via the description, others via aria-label
  return { text: lbl.textContent, ng: lbl.classList.contains('ng'), aria: b.getAttribute('aria-label') ?? (d ? document.getElementById(d)?.textContent : null) ?? '', sfxOk: full(tail) && inside(sfx) && within(sfx), lvOk: full(tail) && inside(lv) && within(lv), // lv / sfx are inline in the .ng-tail flex item
    nameCut: name ? name.scrollWidth > name.clientWidth + 0.5 : false, chips: [...document.querySelectorAll('.best-chip')].map(c => c.dataset.bestBuy) };
}, sel);
const CASES = [
  { name: 'fresh-noincome', st: { farmLevel: 1, hensLevel: 0, eggValueLevel: 0, collectionLevel: 0, coinsCents: 1e13 }, noIncome: true, tab: 'farm', want: '★ Hens L1', chip: 'HENS' },
  { name: 'hens-pct', st: { farmLevel: 1, hensLevel: 0, eggValueLevel: 0, collectionLevel: 0, coinsCents: 1e13 }, tab: 'farm', want: '★ Hens L1 · +33% income', chip: 'HENS' },
  { name: 'value-pct-27', st: { farmLevel: 6, hensLevel: 8, eggValueLevel: 8, collectionLevel: 3, coinsCents: 1e13 }, tab: 'farm', want: '★ Egg value L9 · +9% income', chip: 'VALUE' },
  { name: 'value-milestone', st: { farmLevel: 2, hensLevel: 4, eggValueLevel: 4, collectionLevel: 0, coinsCents: 1e13 }, tab: 'farm', want: '★ Egg value L5: Grade A', chip: 'VALUE' },
  { name: 'hens-milestone', st: { farmLevel: 7, hensLevel: 9, eggValueLevel: 10, collectionLevel: 4, coinsCents: 1e13 }, tab: 'farm', want: '★ Hens L10: bigger coop', chip: 'HENS' },
  { name: 'collection', st: { farmLevel: 3, hensLevel: 5, eggValueLevel: 6, collectionLevel: 0, coinsCents: 1e13 }, tab: 'collection', want: '★ Collection L1: +5/tap', chip: 'COLL' },
  { name: 'broke-no-star', st: { farmLevel: 6, hensLevel: 8, eggValueLevel: 8, collectionLevel: 3, coinsCents: 0 }, tab: 'farm', want: null, chip: null },
];
for (const c of CASES) {
  const { ctx, p } = await open(c.st, !c.noIncome); const m = await measure(p);
  await p.screenshot({ path: `${OUT}/${c.name}-strip-360-${eng}.png` });
  await openTab(p, c.tab); m.chips = await p.evaluate(() => [...document.querySelectorAll('.best-chip')].map(e => e.dataset.bestBuy));
  await p.screenshot({ path: `${OUT}/${c.name}-chip-360-${eng}.png` });
  const text = m.text.replace(/\u00a0/g, ' ');
  if (c.want) ok(`${c.name}: strip text`, text === c.want && m.ng, { text });
  else ok(`${c.name}: no ★ and no "best buy" when nothing is affordable`, !text.startsWith('★') && !/best buy/.test(m.aria), { text, aria: m.aria });
  ok(`${c.name}: chip on exactly the best-buy row (UX-M4)`, c.chip ? m.chips.length === 1 && m.chips[0] === c.chip : m.chips.length === 0, m.chips);
  ok(`${c.name}: level + suffix spans fully visible inside the pill, ≤27`, m.lvOk && m.sfxOk && [...m.text].length <= 27, { lv: m.lvOk, sfx: m.sfxOk, len: [...m.text].length });
  await ctx.close();
}
// F4-17 worst-case strings at 360 in this engine. Not reachable on shipped data (L30 cap), so they are rendered with the
// app's own CSS into a clone of the live strip (same classes, same container) using goal-label.ts goalLabelHtml markup.
const WORST = [['★ ', 'Egg value', 55, `${NB}·${NB}+999% income`], ['★ ', 'Egg value', 30, `${NB}·${NB}+<1% income`], ['★ ', 'Hens', 30, ': bigger coop'], ['★ ', 'Egg value', 20, ': Jumbo'], ['★ ', 'Collection', 30, ': +5/tap']];
{ const { ctx, p } = await open({ farmLevel: 6, hensLevel: 8, eggValueLevel: 8, collectionLevel: 3, coinsCents: 1e13 }, true);
  for (const [i, [star, name, n, sfx]] of WORST.entries()) {
    await p.evaluate(({ star, name, n, sfx, i }) => {
      const esc = v => v.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      const live = document.querySelector('#goal'); document.querySelectorAll('.m418-clone').forEach(e => e.remove());
      const cl = live.cloneNode(true); cl.removeAttribute('id'); cl.classList.add('m418-clone'); cl.id = `goal-worst-${i}`;
      const lbl = cl.querySelector('.goal-label'); lbl.className = 'goal-label ng';
      lbl.innerHTML = `<span class="ng-star" aria-hidden="true">${esc(star)}</span><span class="ng-name">${esc(name)}</span><span class="ng-tail"><span class="ng-lv">\u00a0L${n}</span><span class="ng-sfx">${esc(sfx)}</span></span>`;
      live.style.display = 'none'; live.after(cl);
    }, { star, name, n, sfx, i });
    await p.waitForTimeout(150);
    const m = await measure(p, `#goal-worst-${i}`), label = `${star}${name} L${n}${sfx}`.replace(/\u00a0/g, ' ');
    await p.screenshot({ path: `${OUT}/worst-${i + 1}-360-${eng}.png` });
    ok(`F4-17 "${label}": suffix + level never cut (only .ng-name may shrink)`, m.sfxOk && m.lvOk, { nameCut: m.nameCut });
  }
  await ctx.close(); }
appendFileSync(`${OUT}/checks-${eng}.txt`, log.join('\n') + '\n');
await br.close(); srv.stop(); console.log(`${bad ? 'FAIL' : 'PASS'} [${eng}] m41-8-shots ${bad} failing check(s) -> ${OUT}`); process.exit(bad ? 1 : 0);
