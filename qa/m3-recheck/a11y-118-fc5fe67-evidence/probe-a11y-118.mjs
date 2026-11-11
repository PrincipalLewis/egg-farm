// UI QA probe for #118 (OC-A11Y-1..3, spec sha1 82176255). Chromium only. Run with cwd = the disposable worktree at fc5fe67.
// Serves THIS worktree's dist-qa via scripts/serve-own.mjs serveForRun (build-id must be HEAD, clean tree) on PORT (47118).
// QA-handle seeding only (window.eggfarm, compiled out of release). Writes results.json + shots to OUT.
const WT = process.cwd();
const { chromium } = await import(`${WT}/node_modules/playwright-core/index.mjs`);
const { serveForRun } = await import(`${WT}/scripts/serve-own.mjs`);
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
const OUT = process.env.OUT; mkdirSync(OUT, { recursive: true });
const AXE = '/workspace/egg-farm-studio/artifacts/v5-ui/tools/axe-core-4.14.0/axe.min.js', axeSrc = readFileSync(AXE, 'utf8');
const head = execSync('git rev-parse HEAD', { cwd: WT }).toString().trim();
const srv = await serveForRun('dist-qa', 'a11y-118-probe');
const results = { head, buildId: srv.buildId, port: srv.port, axe: AXE, axeSha256: createHash('sha256').update(axeSrc).digest('hex'), sizes: [] };
let fails = 0; const checks = [];
const check = (w, id, name, pass, data) => { checks.push({ w, id, name, pass: !!pass, data }); if (!pass) fails++; console.log(`${pass ? 'ok  ' : 'FAIL'} [${w}] ${id} ${name}${pass ? '' : ' ' + JSON.stringify(data)}`); };
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
console.log('chromium', browser.version(), 'build-id', srv.buildId, 'url', srv.url);
const UI = JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false });
const SEED = [[1, 4], [2, 1], [3, 3], [4, 1500], [5, 12345]]; // [id, demand]; filled 0
const fmtExpect = { 4: '4', 1: '1', 3: '3', 1500: '1,500' };
async function chipState(page, cdp) {
  const dom = await page.evaluate(() => [...document.querySelectorAll('#queue .chip.arrive')].map(el => { const r = el.getBoundingClientRect();
    return { num: el.querySelector('.tag .num')?.textContent ?? null, aria: el.getAttribute('aria-label'), role: el.getAttribute('role'), live: el.getAttribute('aria-live'),
      liveDesc: !!el.querySelector('[aria-live],[role=status],[role=alert]'), tag: el.tagName, outer: el.outerHTML.slice(0, 400),
      rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }, inView: r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth }; }));
  // CDP accessibility tree: computed name + sources for each chip
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '#queue .chip.arrive' });
  const ax = [];
  for (const nodeId of nodeIds) { const { node } = await cdp.send('DOM.describeNode', { nodeId });
    const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { backendNodeId: node.backendNodeId, fetchRelatives: false });
    const n = nodes[0]; ax.push({ role: n.role?.value, name: n.name?.value, from: (n.name?.sources ?? []).filter(s => s.value || s.attributeValue).map(s => `${s.type}${s.attribute ? ':' + s.attribute : ''}`), ignored: n.ignored, live: (n.properties ?? []).filter(p => /live/.test(p.name)).map(p => `${p.name}=${p.value?.value}`) }); }
  const snap = await page.locator('#queue').ariaSnapshot();
  return { dom, ax, snap };
}
async function runAxe(page) {
  await page.addScriptTag({ content: axeSrc });
  return page.evaluate(async () => {
    const one = await window.axe.run({ include: [['#queue']] }, { runOnly: { type: 'rule', values: ['label-content-name-mismatch'] } });
    const all = await window.axe.run({ include: [['#queue .chip.arrive']] }, { resultTypes: ['violations'] });
    const pick = r => r.map(x => ({ id: x.id, impact: x.impact, nodes: x.nodes.map(n => ({ target: n.target.join(' '), summary: n.failureSummary })) }));
    return { version: window.axe.version, lcnm: { violations: pick(one.violations), passes: one.passes.flatMap(x => x.nodes.map(n => n.target.join(' '))), incomplete: pick(one.incomplete), inapplicable: one.inapplicable.map(x => x.id) },
      allOnChips: { violations: pick(all.violations) } };
  });
}
const shot = async (page, file, measured) => { const buf = await page.screenshot({ path: `${OUT}/${file}` }); return { file, sha256: createHash('sha256').update(buf).digest('hex'), measured }; };
for (const [w, h] of [[360, 640], [1280, 720]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 600 });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(ui => localStorage.setItem('eggfarm.ui', ui), UI);
  await page.goto(srv.url, { waitUntil: 'domcontentloaded' }); await page.getByText('Tap to start').click(); await page.waitForFunction(() => window.eggfarm);
  await page.evaluate(seed => { document.getElementById('modal-layer')?.classList.remove('open'); const g = window.eggfarm;
    g.state = { ...g.state, seenTracksExplainer: true, collectionLevel: 20, farmLevel: 30, basket: 0, coinsCents: 0, nextCustomerInS: 1e9, nextCustomerId: 100,
      customers: seed.map(([id, demand]) => ({ id, demand, filled: 0, waitedS: 0 })) };
    g.frame = () => {}; window.eggfarmUi.render(); }, SEED); // sim frozen (QA snapshot), UI renders on
  await page.waitForTimeout(800);
  const cdp = await ctx.newCDPSession(page); await cdp.send('DOM.enable'); await cdp.send('Accessibility.enable');
  const S = { w, h, errors };
  // screen/tab guard before measuring
  S.guard = await page.evaluate(() => ({ activeTab: document.querySelector('.tabs [data-tab].active')?.getAttribute('data-tab') ?? null, modalOpen: !!document.querySelector('#modal-layer.open'),
    queueVisible: (() => { const r = document.getElementById('queue')?.getBoundingClientRect(); return !!r && r.width > 0 && r.height > 0; })(), state: window.eggfarm.state.customers }));
  // --- before ---
  S.before = await chipState(page, cdp); S.beforeAxe = await runAxe(page);
  S.beforeShot = await shot(page, `chromium-${w}x${h}-chips-before.png`, { names: S.before.ax.map(a => a.name) });
  check(w, 'GUARD', `active tab=${S.guard.activeTab}, no modal, #queue visible, >=1 chip in view`, S.guard.activeTab && !S.guard.modalOpen && S.guard.queueVisible && S.before.dom.some(d => d.inView), S.guard);
  check(w, 'OC-A11Y-1', `>=3 chips rendered with distinct counts (${S.before.dom.map(d => d.num).join(' | ')})`, new Set(S.before.dom.map(d => d.num)).size >= 3, S.before.dom.length);
  check(w, 'OC-A11Y-1', 'a chip >= 1,000 rendered', S.before.dom.some(d => /,|K|M/.test(d.num ?? '')), S.before.dom.map(d => d.num));
  S.before.dom.forEach((d, i) => { const a = S.before.ax[i]; const id = S.guard.state.find((c, j) => j === i); const raw = id ? id.demand - id.filled : NaN;
    check(w, 'OC-A11Y-1', `chip ${i} AX name "${a.name}" (trimmed) starts with visible "${d.num}"`, (a.name ?? '').trim().startsWith(d.num), { a, d });
    check(w, 'OC-A11Y-2', `chip ${i} AX name === "${d.num} ${raw === 1 ? 'egg' : 'eggs'} wanted by customer" (raw ${raw})`, (a.name ?? '').trim() === `${d.num} ${raw === 1 ? 'egg' : 'eggs'} wanted by customer`, { a, raw });
    if (fmtExpect[raw]) check(w, 'OC-A11Y-1', `chip ${i} visible num "${d.num}" == fmtCount(${raw}) expected "${fmtExpect[raw]}"`, d.num === fmtExpect[raw], d.num);
    check(w, 'OC-A11Y-2', `chip ${i} no aria-label="Customer" in markup`, !/aria-label="Customer"/.test(d.outer), d.outer);
    check(w, 'OC-A11Y-3', `chip ${i} role ${a.role} (button), no role attr, no aria-live, no live descendant`, a.role === 'button' && d.role === null && d.live === null && !d.liveDesc && a.live.length === 0, { a, d }); });
  check(w, 'OC-A11Y-3/axe', `axe ${S.beforeAxe.version} label-content-name-mismatch violations = ${S.beforeAxe.lcnm.violations.length} (passes on ${S.beforeAxe.lcnm.passes.length} nodes)`, S.beforeAxe.lcnm.violations.length === 0 && S.beforeAxe.lcnm.passes.length >= S.before.dom.length, S.beforeAxe.lcnm);
  // --- partial sale 4 -> 3 on chip id 1 via the real Market-row Sell button (basket 1) ---
  await page.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, basket: 1 }; window.eggfarmUi.render(); });
  S.marketOpenedByChipTap = false;
  if (!(await page.locator('button[data-id="1"]').isVisible())) { await page.locator('#queue .chip.arrive').first().click(); await page.waitForTimeout(600); S.marketOpenedByChipTap = true; }
  S.sellBtnVisible = await page.locator('button[data-id="1"]').isVisible();
  check(w, 'OC-A11Y-3', `Market Sell button for customer 1 visible (opened by chip tap: ${S.marketOpenedByChipTap})`, S.sellBtnVisible, {});
  S.sale = await page.evaluate(() => new Promise(res => { const g = window.eggfarm; g.state = { ...g.state, basket: 1 }; window.eggfarmUi.render();
    const chip = [...document.querySelectorAll('#queue .chip.arrive')][0]; const bt = document.querySelector('button[data-id="1"]');
    const pre = { num: chip.querySelector('.tag .num').textContent, aria: chip.getAttribute('aria-label'), btn: bt?.textContent ?? null };
    bt.click();
    const sync = { num: chip.querySelector('.tag .num').textContent, aria: chip.getAttribute('aria-label'), filled: g.state.customers.find(c => c.id === 1)?.filled, basket: g.state.basket };
    requestAnimationFrame(() => { const next = { num: chip.querySelector('.tag .num').textContent, aria: chip.getAttribute('aria-label'), sameEl: chip === document.querySelectorAll('#queue .chip.arrive')[0], filled: g.state.customers.find(c => c.id === 1)?.filled };
      res({ pre, sync, next }); }); }));
  await page.waitForTimeout(150);
  if (S.marketOpenedByChipTap) { await page.keyboard.press('Escape'); await page.waitForTimeout(600); }
  S.afterGuard = await page.evaluate(() => ({ activeTab: document.querySelector('.tabs [data-tab].active')?.getAttribute('data-tab') ?? null, modalOpen: !!document.querySelector('#modal-layer.open'),
    chipInView: [...document.querySelectorAll('#queue .chip.arrive')].some(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight; }) }));
  check(w, 'GUARD', `after-sale shot: active tab=${S.afterGuard.activeTab}, modal open=${S.afterGuard.modalOpen}, chip in view=${S.afterGuard.chipInView}`, S.afterGuard.activeTab && !S.afterGuard.modalOpen && S.afterGuard.chipInView, S.afterGuard);
  S.after = await chipState(page, cdp); S.afterAxe = await runAxe(page);
  S.afterShot = await shot(page, `chromium-${w}x${h}-chips-after-sale.png`, { names: S.after.ax.map(a => a.name) });
  check(w, 'OC-A11Y-3', `partial sale happened: filled ${S.sale.next.filled} (want 1), pre "${S.sale.pre.num}"/"${S.sale.pre.aria}"`, S.sale.next.filled === 1 && S.sale.pre.num === '4', S.sale);
  check(w, 'OC-A11Y-3', `next frame: num "${S.sale.next.num}" aria "${S.sale.next.aria}" (same element ${S.sale.next.sameEl})`, S.sale.next.num === '3' && S.sale.next.aria === '3 eggs wanted by customer' && S.sale.next.sameEl, S.sale);
  check(w, 'OC-A11Y-3', `no stale name at sync read after click: num "${S.sale.sync.num}" aria "${S.sale.sync.aria}"`, S.sale.sync.aria.startsWith(S.sale.sync.num), S.sale.sync);
  check(w, 'OC-A11Y-3', `AX tree after sale chip 0 name "${S.after.ax[0]?.name}"`, S.after.ax[0]?.name === '3 eggs wanted by customer', S.after.ax[0]);
  S.after.dom.forEach((d, i) => check(w, 'OC-A11Y-1', `after sale chip ${i} "${S.after.ax[i].name}" starts with "${d.num}"`, (S.after.ax[i].name ?? '').trim().startsWith(d.num), {}));
  check(w, 'OC-A11Y-3/axe', `after sale axe label-content-name-mismatch violations = ${S.afterAxe.lcnm.violations.length}`, S.afterAxe.lcnm.violations.length === 0 && S.afterAxe.lcnm.passes.length >= S.after.dom.length, S.afterAxe.lcnm);
  check(w, 'ERR', `no page errors (${errors.length})`, errors.length === 0, errors);
  results.sizes.push(S); await ctx.close();
}
await browser.close(); srv.stop?.();
results.checks = checks; results.fails = fails;
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
console.log(fails ? `FAILED ${fails}` : 'ALL PASS'); process.exit(fails ? 1 : 0);
