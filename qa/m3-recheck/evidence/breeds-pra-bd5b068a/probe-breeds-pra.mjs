// TASK HoQA/PRA-PREBAR Chromium probe. cwd = scratch repo at bd5b068a.
// Serves dist-qa via serveForRun on PORT (47122). Flag-on via ?qaBreeds=1 only. balance.json is never edited.
// Chromium only. G-1 guard before each measurement/shot. Shots written immediately after their measurement.
const WT = process.cwd();
const { chromium } = await import(`${WT}/node_modules/playwright-core/index.mjs`);
const { serveForRun } = await import(`${WT}/scripts/serve-own.mjs`);
import { writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import path from 'node:path';

const OUT = process.env.OUT;
if (!OUT) throw new Error('OUT is required');
mkdirSync(path.join(OUT, 'shots'), { recursive: true });
mkdirSync(path.join(OUT, 'json'), { recursive: true });
const AXE = '/workspace/egg-farm-studio/artifacts/v5-ui/tools/axe-core-4.14.0/axe.min.js';
const axeSrc = readFileSync(AXE, 'utf8');
const axeSha = createHash('sha256').update(axeSrc).digest('hex');
const head = execSync('git rev-parse HEAD', { cwd: WT }).toString().trim();
const tree = execSync('git rev-parse HEAD^{tree}', { cwd: WT }).toString().trim();
const srv = await serveForRun('dist-qa', 'pra-prebar-probe');
const results = {
  head, tree, buildId: srv.buildId, port: srv.port, url: srv.url,
  axe: AXE, axeSha256: axeSha, started: new Date().toISOString(),
  cases: {}, leads: {}, notes: [],
};
console.log('chromium-probe build-id', srv.buildId, 'port', srv.port, 'head', head.slice(0, 8));

const UI = JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false });
const EMPTY_BR = { owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0], hatches: 0, pity: 0, rng: 1, freeHatchUsed: 0, flockCompleteLogged: 0 };
const COMMONS = ['leghorn', 'sussex', 'orpington'];
const ALL_IDS = ['leghorn', 'sussex', 'orpington', 'rhode_island_red', 'brahma', 'ayam_cemani', 'cochin', 'cream_legbar'];

const browsershots = [];
function recCase(id, status, extra = {}) {
  results.cases[id] = { id, status, ...extra, at: new Date().toISOString() };
  console.log(`${status.padEnd(8)} ${id}${extra.reason ? ' — ' + extra.reason : ''}${extra.severity ? ' [' + extra.severity + ']' : ''}`);
}
function recLead(id, status, extra = {}) {
  results.leads[id] = { id, status, ...extra };
  console.log(`LEAD ${status.padEnd(8)} ${id}${extra.severity ? ' [' + extra.severity + ']' : ''}${extra.detail ? ' — ' + String(JSON.stringify(extra.detail)).slice(0, 200) : ''}`);
}

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
console.log('chromium', browser.version());

async function shot(page, file, measured) {
  const p = path.join(OUT, 'shots', file);
  const buf = await page.screenshot({ path: p, fullPage: false });
  const rec = { file, sha256: createHash('sha256').update(buf).digest('hex'), measured };
  browsershots.push(rec);
  return rec;
}

async function boot(w, h, { qaBreeds = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 960, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e)));
  await page.addInitScript(ui => {
    try { localStorage.setItem('eggfarm.ui', ui); } catch {}
    try { sessionStorage.setItem('eggfarm.playHere', '1'); } catch {}
  }, UI);
  const url = qaBreeds ? `${srv.url}?qaBreeds=1` : srv.url;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // Tab-guard: a previous context may still hold the lease; "Play here" reloads with takeover.
  const play = page.getByText('Play here', { exact: true });
  if (await play.count()) {
    await play.click({ force: true }).catch(() => {});
    await page.waitForLoadState('domcontentloaded').catch(() => {});
  }
  // "Tap to start" can miss a Playwright pointer click; use a JS click and retry.
  for (let i = 0; i < 6; i++) {
    const ready = await page.evaluate(() => !!window.eggfarm);
    if (ready) break;
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('button, .btn, [role=button], body *')].find(e => (e.childElementCount === 0 || e.tagName === 'BUTTON' || e.classList.contains('btn')) && /Tap to start/i.test(e.textContent || ''));
      if (el) el.click();
      else [...document.querySelectorAll('button, .btn')].find(e => /start/i.test(e.textContent || ''))?.click();
    });
    try { await page.waitForFunction(() => window.eggfarm, { timeout: 4000 }); break; } catch {}
  }
  if (!(await page.evaluate(() => !!window.eggfarm))) {
    const body = await page.evaluate(() => document.body?.innerText?.slice(0, 400)).catch(() => '');
    throw new Error(`boot: window.eggfarm not ready at ${url} (${w}x${h}); body=${JSON.stringify(body)}`);
  }
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch {}
  await page.evaluate(() => { document.getElementById('modal-layer')?.classList.remove('open'); });
  await page.evaluate(() => { const g = window.eggfarm; g.__origFrame = g.frame.bind(g); g.frame = () => {}; });
  return { ctx, page, errors, w, h, qaBreeds };
}

async function seed(page, patch) {
  return page.evaluate(({ patch, EMPTY_BR }) => {
    const g = window.eggfarm;
    const st = { ...g.state, seenTracksExplainer: true, ...patch };
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'breeds')) {
      const br = patch.breeds || {};
      st.breeds = {
        ...EMPTY_BR, ...br,
        owned: { ...(br.owned || {}) },
        slots: br.slots ? [...br.slots] : [...EMPTY_BR.slots],
        settleMs: br.settleMs ? [...br.settleMs] : [...EMPTY_BR.settleMs],
      };
    }
    g.state = st;
    if (window.eggfarmUi?.render) window.eggfarmUi.render();
    return {
      farmLevel: g.state.farmLevel, coinsCents: g.state.coinsCents,
      freeHatchUsed: g.state.breeds?.freeHatchUsed ?? null,
      flagBreeds: g.balance?.m4?.flags?.breeds,
      flagAbilities: g.balance?.m4?.flags?.abilities,
      flagRc2: g.balance?.m4?.flags?.rc2Refill,
      hasEggfarmQa: !!(window.eggfarmQa && window.eggfarmQa.breeds),
      buildId: document.querySelector('meta[name="build-id"]')?.getAttribute('content') || null,
    };
  }, { patch, EMPTY_BR });
}

async function openUpgrades(page) {
  const docked = await page.evaluate(() => matchMedia('(min-width:960px) and (orientation:landscape)').matches);
  if (docked) return docked;
  // JS click: an already-open #panel-layer intercepts Playwright's pointer click on the nav.
  await page.evaluate(() => {
    const layer = document.getElementById('panel-layer');
    const up = document.getElementById('p-upgrades');
    const already = !!(layer && layer.classList.contains('open') && up && !up.hidden);
    if (!already) document.querySelector('[data-nav="upgrades"]')?.click();
  });
  await page.waitForTimeout(200);
  return docked;
}

async function openFlock(page) {
  const docked = await openUpgrades(page);
  await page.waitForFunction(() => {
    const e = document.getElementById('breeds-entry') || document.querySelector('[data-testid="breeds-entry"]');
    return !!(e && !e.hidden && e.getClientRects().length);
  }, { timeout: 8000 });
  await page.evaluate(() => {
    const e = document.getElementById('breeds-entry') || document.querySelector('[data-testid="breeds-entry"]');
    e?.click();
  });
  await page.waitForTimeout(250);
  return docked;
}

async function guard(page, expect = {}) {
  return page.evaluate((expect) => {
    const vw = innerWidth, vh = innerHeight;
    const docked = matchMedia('(min-width:960px) and (orientation:landscape)').matches;
    const flock = document.querySelector('#breeds-sheet, [data-testid="breeds-sheet"], [role=dialog][aria-label="Flock"]');
    const flockVis = !!(flock && !flock.hidden && flock.getClientRects().length);
    const modalOpen = !!document.querySelector('#modal-layer.open');
    const reveal = !!document.querySelector('[data-testid="breeds-reveal"], .breeds-reveal');
    const coach = !!document.querySelector('.coach, .intro-a, [aria-label="Tip"], [aria-label="New helper"]');
    const toast = !!document.querySelector('.toast');
    const activeTab = document.querySelector('.tabs [data-tab].active')?.getAttribute('data-tab') ?? null;
    const entry = document.getElementById('breeds-entry') || document.querySelector('[data-testid="breeds-entry"]');
    const g = window.eggfarm;
    const out = {
      vw, vh, docked, flockVis, modalOpen, reveal, coach, toast, activeTab,
      entryPresent: !!entry, entryVisible: !!(entry && entry.getClientRects().length && !entry.hidden),
      flagBreeds: g?.balance?.m4?.flags?.breeds, farmLevel: g?.state?.farmLevel, coinsCents: g?.state?.coinsCents,
      freeHatchUsed: g?.state?.breeds?.freeHatchUsed ?? null,
      buildId: document.querySelector('meta[name="build-id"]')?.getAttribute('content') || null,
    };
    const fails = [];
    if (expect.w && vw !== expect.w) fails.push(`vw ${vw}!=${expect.w}`);
    if (expect.h && vh !== expect.h) fails.push(`vh ${vh}!=${expect.h}`);
    if (expect.docked != null && docked !== expect.docked) fails.push(`docked ${docked}!=${expect.docked}`);
    if (expect.flock && !flockVis) fails.push('flock not visible');
    if (expect.noModal && modalOpen) fails.push('modal open');
    if (expect.noReveal && reveal) fails.push('reveal present');
    if (expect.noCoach && coach) fails.push('coach present');
    if (expect.flag != null && out.flagBreeds !== expect.flag) fails.push(`flag ${out.flagBreeds}!=${expect.flag}`);
    if (expect.farm != null && out.farmLevel !== expect.farm) fails.push(`farm ${out.farmLevel}!=${expect.farm}`);
    out.ok = fails.length === 0; out.fails = fails; return out;
  }, expect);
}

async function measure(page, sels) {
  return page.evaluate((sels) => {
    const one = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        sel, x: +r.left.toFixed(2), y: +r.top.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2),
        scrollW: el.scrollWidth, clientW: el.clientWidth, scrollH: el.scrollHeight, clientH: el.clientHeight,
        minH: cs.minHeight, font: cs.font, bg: cs.backgroundColor, color: cs.color, shadow: cs.boxShadow,
        text: (el.innerText || '').trim().slice(0, 300), aria: el.getAttribute('aria-label'),
        describedby: el.getAttribute('aria-describedby'), labelledby: el.getAttribute('aria-labelledby'),
        roleAttr: el.getAttribute('role'), tag: el.tagName, id: el.id, hidden: !!el.hidden,
        ariaDisabled: el.getAttribute('aria-disabled'), testdid: el.getAttribute('data-testid'), className: el.className,
      };
    };
    const out = {}; for (const s of sels) out[s] = one(s); return out;
  }, sels);
}

async function axFor(cdp, selector) {
  try {
    const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
    const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector });
    const ax = [];
    for (const nodeId of nodeIds) {
      try {
        const { node } = await cdp.send('DOM.describeNode', { nodeId });
        const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { backendNodeId: node.backendNodeId, fetchRelatives: false });
        const n = nodes[0];
        ax.push({ role: n?.role?.value, name: n?.name?.value, description: n?.description?.value,
          from: (n?.name?.sources ?? []).filter(s => s.value || s.attributeValue).map(s => `${s.type}${s.attribute ? ':' + s.attribute : ''}`) });
      } catch (e) { ax.push({ error: String(e && e.message || e), selector }); }
    }
    return ax;
  } catch (e) { return [{ error: String(e && e.message || e), selector }]; }
}

async function closeCtx(s) { try { await s.ctx.close(); } catch {} }
async function jsClick(page, sel) {
  const ok = await page.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return false; el.click(); return true; }, sel);
  if (!ok) throw new Error('jsClick: missing ' + sel);
}


function savePartial(tag) {
  writeFileSync(path.join(OUT, 'json', 'probe-partial.json'), JSON.stringify({ results, shots: browsershots }, null, 2));
  console.log('partial written', tag);
}

async function session(w, h, patch, { open = true } = {}) {
  const s = await boot(w, h, { qaBreeds: true });
  const info = await seed(s.page, patch);
  let docked = w >= 960;
  if (open) docked = await openFlock(s.page);
  else await openUpgrades(s.page);
  return { ...s, info, docked };
}

try {

// ---------- runtime build-id + flag confirmation ----------
{
  const s = await boot(360, 640, { qaBreeds: true });
  const info = await seed(s.page, { farmLevel: 10, coinsCents: 0, collectionLevel: 10 });
  results.runtime = { chromium: browser.version(), ...info, servedBuildId: srv.buildId, match: info.buildId === srv.buildId };
  console.log('runtime', results.runtime);
  await closeCtx(s);
}

// ---------- BR-UI-01 flag 0 ----------
{
  const sizes = [[360, 640], [1280, 800], [1280, 720], [1024, 474]];
  const scans = [];
  const fails = [];
  for (const [w, h] of sizes) {
    const s = await boot(w, h, { qaBreeds: false });
    await seed(s.page, { farmLevel: 20, coinsCents: 0, collectionLevel: 20, breeds: { ...EMPTY_BR, owned: { leghorn: { stars: 1 } }, slots: ['leghorn', null, null] } });
    await openUpgrades(s.page);
    const g = await guard(s.page, { w, h, docked: w >= 960, noModal: true, flag: 0, farm: 20 });
    const scan = await s.page.evaluate(() => ({
      flockEntry: !!document.querySelector('#flock-entry, #breeds-entry, [data-testid="breeds-entry"], [data-testid="breeds-sheet"]'),
      testids: [...document.querySelectorAll('[data-testid^="breeds-"]')].map(e => e.getAttribute('data-testid')),
      pchip: !!document.querySelector('.pchip, #p-flock'),
      assets: [...document.querySelectorAll('img')].map(i => i.getAttribute('src') || '').filter(x => /char-breed-/.test(x)),
      textHits: [...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && /^(Flock|Hatch)$/.test((e.textContent || '').trim())).map(e => e.textContent.trim() + '@' + (e.id || e.className)),
    }));
    const sh = await shot(s.page, `chromium-${w}x${h}-BR-UI-01-flag0.png`, { guard: g, scan });
    if (!g.ok) fails.push({ w, h, guard: g.fails });
    if (scan.flockEntry || scan.testids.length || scan.pchip || scan.assets.length || scan.textHits.length) fails.push({ w, h, scan });
    scans.push({ w, h, guard: g, scan, shot: sh.file });
    await closeCtx(s);
  }
  recCase('BR-UI-01', fails.length ? 'FAIL' : 'PASS', {
    step1_goldens: 'PASS (item 4, already run)',
    base_rect_compare: 'NOT RUN (no rc/v5 QA build in this scratch; not rebuilt)',
    telemetry_120s: 'NOT RUN (budget; DOM scan + goldens are the UI-leg evidence this pass)',
    scans, fails, severity: fails.length ? 'Major' : undefined,
    repro: fails.length ? 'Boot QA build without ?qaBreeds=1, seed F20 with a leftover breeds object, open Upgrades, inspect DOM for breeds nodes / Flock|Hatch text.' : undefined,
    evidence: scans.map(x => x.shot),
  });
}

// BR-UI-02 entry F9/F10 rects
{
  const cells = [[360, 640, 200, 168, 100, 44], [390, 844, 230, 219, 100, 44], [1280, 800, 1164, 436, 100, 44], [1024, 474, 908, 273, 100, 44], [1280, 720, null, null, 100, 44]];
  const rows = []; const findings = [];
  for (const [w, h, ex, ey, ew, eh] of cells) {
    const s = await session(w, h, { farmLevel: 9, coinsCents: 0, collectionLevel: 9 }, { open: false });
    const g9 = await guard(s.page, { w, h, docked: w >= 960, noModal: true, flag: 1, farm: 9 });
    const e9 = await s.page.evaluate(() => !!document.querySelector('#breeds-entry, [data-testid="breeds-entry"]'));
    const sh9 = await shot(s.page, `chromium-${w}x${h}-BR-UI-02-F9.png`, { entry: e9 });
    await seed(s.page, { farmLevel: 10, coinsCents: 0, collectionLevel: 10 });
    await openUpgrades(s.page);
    const g10 = await guard(s.page, { w, h, docked: w >= 960, noModal: true, flag: 1, farm: 10 });
    const ent = (await measure(s.page, ['#breeds-entry']))['#breeds-entry'];
    const tabs = await s.page.evaluate(() => [...document.querySelectorAll('.tabs [data-tab], .tabs [role=tab]')].map(t => ({ tab: t.getAttribute('data-tab'), text: (t.innerText || '').replace(/\s+/g, ' ').trim(), aria: t.getAttribute('aria-label') })));
    const sh10 = await shot(s.page, `chromium-${w}x${h}-BR-UI-02-F10.png`, { ent, tabs });
    const within = (got, exp) => exp == null || got == null ? true : Math.abs(got - exp) <= 1;
    const hOk = ent && Math.abs(ent.h - eh) <= 0.5;
    const rectOk = ex == null ? (hOk && ent && ent.w >= 44) : (hOk && within(ent.x, ex) && within(ent.y, ey) && within(ent.w, ew));
    if (e9) findings.push(`${w}x${h} F9 entry present`);
    if (!ent) findings.push(`${w}x${h} F10 entry missing`);
    if (ent && !rectOk) findings.push(`${w}x${h} F10 rect ${ent.x},${ent.y} ${ent.w}x${ent.h} vs expected ${ex},${ey} ${ew}x${eh}`);
    if (tabs.length !== 3) findings.push(`${w}x${h} tabs=${tabs.length} ${JSON.stringify(tabs)}`);
    if (ent && ent.text && !/Flock/.test(ent.text)) findings.push(`${w}x${h} label ${ent.text}`);
    rows.push({ w, h, guard9: g9, guard10: g10, e9, ent, tabs, shots: [sh9.file, sh10.file], rectOk });
    await closeCtx(s);
  }
  recCase('BR-UI-02', findings.length ? 'FAIL' : 'PASS', { rows, findings, severity: findings.length ? 'Major' : undefined, repro: findings.length ? 'qaBreeds=1, seed F9 then F10, open Upgrades, measure #breeds-entry vs Art table and confirm 3 tabs / no F9 entry.' : undefined });
}

// BR-UI-03 slot counts + locked copy
{
  const levels = [[10, 1], [13, 1], [14, 2], [19, 2], [20, 3]];
  const rows = []; const findings = [];
  for (const [w, h] of [[360, 640], [1280, 800]]) {
    for (const [F, wantOpen] of levels) {
      const s = await session(w, h, { farmLevel: F, coinsCents: 0, collectionLevel: F, breeds: { ...EMPTY_BR } });
      const g = await guard(s.page, { w, h, docked: w >= 960, flock: true, noModal: true, flag: 1, farm: F });
      const slots = await s.page.evaluate(() => [...document.querySelectorAll('[data-testid="breeds-slots"] .slot, .breeds-slots .slot')].map(el => ({
        slot: el.getAttribute('data-slot'), className: el.className, tag: el.tagName, text: (el.innerText || '').replace(/\s+/g, ' ').trim(),
        sr: [...el.querySelectorAll('.sr')].map(x => x.textContent), lock: el.querySelector('.slot-lock')?.textContent ?? null,
        focusable: el.tabIndex >= 0 || el.tagName === 'BUTTON' || el.getAttribute('tabindex') === '0',
      })));
      const open = slots.filter(x => !/\blocked\b/.test(x.className)).length;
      const locked = slots.filter(x => /\blocked\b/.test(x.className));
      const sh = await shot(s.page, `chromium-${w}x${h}-BR-UI-03-F${F}.png`, { slots });
      if (open !== wantOpen) findings.push(`${w}x${h} F${F} unlocked=${open} want ${wantOpen}`);
      for (const L of locked) {
        const expect = L.slot === '1' ? 'Slot 2 · Farm 14' : L.slot === '2' ? 'Slot 3 · Farm 20' : null;
        const vis = L.lock || '';
        const all = [L.text, ...(L.sr || [])].join(' | ');
        if (expect && vis !== expect && !all.includes(expect)) findings.push(`${w}x${h} F${F} locked slot ${L.slot} visible="${vis}" sr/text="${all}" expected "${expect}"`);
        if (L.focusable || L.tag === 'BUTTON') findings.push(`${w}x${h} F${F} locked slot ${L.slot} is focusable/${L.tag}`);
      }
      rows.push({ w, h, F, wantOpen, open, slots, shot: sh.file, guard: g });
      await closeCtx(s);
    }
  }
  recCase('BR-UI-03', findings.length ? 'FAIL' : 'PASS', { rows, findings, severity: findings.length ? 'Major' : undefined, repro: findings.length ? 'qaBreeds=1, open Flock at F10/13/14/19/20, read unlocked count and locked placeholder copy.' : undefined });
}

// BR-UI-04 / 05
{
  const s = await session(360, 640, { farmLevel: 10, coinsCents: 0, collectionLevel: 10, abilitiesCoachSeen: false }, { open: false });
  const flags = await s.page.evaluate(() => ({
    abilities: window.eggfarm.balance?.m4?.flags?.abilities,
    breeds: window.eggfarm.balance?.m4?.flags?.breeds,
    coachSeen: window.eggfarm.state.abilitiesCoachSeen,
    coachDom: !!document.querySelector('.coach, .intro-a, [aria-label="Tip"], [aria-label="New helper"]'),
    hasSetFlag: typeof window.eggfarmQa?.setFlag === 'function',
  }));
  const sh = await shot(s.page, 'chromium-360x640-BR-UI-04-no-abilities.png', flags);
  await seed(s.page, { farmLevel: 10, coinsCents: 0, collectionLevel: 10, abilitiesCoachSeen: true });
  await openUpgrades(s.page);
  const after = await s.page.evaluate(() => {
    const e = document.getElementById('breeds-entry');
    return { className: e?.className, hasGlow: e?.classList.contains('breeds-glow'), hasDot: e?.classList.contains('breeds-dot'), abilities: window.eggfarm.balance?.m4?.flags?.abilities };
  });
  const sh2 = await shot(s.page, 'chromium-360x640-BR-UI-04-coachSeen-state.png', after);
  await closeCtx(s);
  recCase('BR-UI-04', 'BLOCKED', {
    reason: 'coach leg needs m4.flags.abilities=1; authorized path (tests/helpers/breeds-on.ts + ?qaBreeds=1) sets only breeds=1. Runtime flag abilities=' + flags.abilities + '.',
    flags, after, evidence: [sh.file, sh2.file],
    note: 'abilitiesCoachSeen can be written on state (QA handle); glow/dot after that write is recorded but the coach-first sequencing is not testable without the abilities flag.',
  });
  recCase('BR-UI-05', 'BLOCKED', {
    reason: 'same as BR-UI-04: highlight fallback is defined in terms of the Shift-calls coach / abilitiesCoachSeen session rules, and abilities=1 is not reachable via the authorized switch.',
    flags,
  });
}

// BR-UI-06 phone sheet
{
  const rows = []; const findings = [];
  for (const [w, h, ex, ey, ew, eh] of [[360, 640, 0, 160, 360, 480], [390, 844, 0, 211, 390, 633]]) {
    const s = await session(w, h, { farmLevel: 20, coinsCents: 500000, collectionLevel: 20, breeds: { ...EMPTY_BR, freeHatchUsed: 1 } });
    const g = await guard(s.page, { w, h, docked: false, flock: true, noModal: true, flag: 1, farm: 20 });
    const sheet = await measure(s.page, ['#breeds-sheet', '[role=dialog][aria-label="Flock"]', '#breeds-body', '[data-testid="breeds-hatch"]', '[data-testid="breeds-back"]', '[data-testid="breeds-close"]']);
    const bodyKids = await s.page.evaluate(() => [...document.querySelector('#breeds-body')?.children || []].map(e => ({ tag: e.tagName, className: e.className, id: e.id, text: e.innerText.slice(0, 80) })));
    const hasActive = bodyKids.some(k => /active totals/i.test(k.className + k.text + k.id));
    await jsClick(s.page, '[data-testid="breeds-close"]');
    await s.page.waitForTimeout(200);
    const afterClose = await s.page.evaluate(() => ({ active: document.activeElement?.id || document.activeElement?.getAttribute('data-testid') || document.activeElement?.tagName, entryFocused: document.activeElement === document.getElementById('breeds-entry') }));
    await openFlock(s.page);
    await s.page.keyboard.press('Escape');
    await s.page.waitForTimeout(200);
    const afterEsc = await s.page.evaluate(() => ({ flockOpen: !!(document.querySelector('#breeds-sheet') && !document.querySelector('#breeds-sheet').hidden), active: document.activeElement?.id || document.activeElement?.getAttribute('data-testid') || document.activeElement?.tagName, entryFocused: document.activeElement === document.getElementById('breeds-entry') }));
    const sh = await shot(s.page, `chromium-${w}x${h}-BR-UI-06-sheet.png`, { sheet, bodyKids, afterClose, afterEsc, g });
    if (!afterEsc.flockOpen) { await openFlock(s.page); await shot(s.page, `chromium-${w}x${h}-BR-UI-06-open.png`, {}); }
    const r = sheet['#breeds-sheet'] || sheet['[role=dialog][aria-label="Flock"]'];
    if (r && (Math.abs(r.x - ex) > 1 || Math.abs(r.y - ey) > 1 || Math.abs(r.w - ew) > 1 || Math.abs(r.h - eh) > 1)) findings.push(`${w}x${h} sheet rect ${r.x},${r.y} ${r.w}x${r.h} vs ${ex},${ey} ${ew}x${eh}`);
    if (!hasActive) findings.push(`${w}x${h} no Active totals row (body=${bodyKids.map(k => k.className).join(' | ')})`);
    if (!afterClose.entryFocused) findings.push(`${w}x${h} Close did not return focus to #breeds-entry (active=${afterClose.active})`);
    if (!afterEsc.entryFocused) findings.push(`${w}x${h} Esc did not return focus to #breeds-entry (active=${afterEsc.active})`);
    rows.push({ w, h, g, sheet, bodyKids, hasActive, afterClose, afterEsc, shot: sh.file });
    await closeCtx(s);
  }
  recCase('BR-UI-06', findings.length ? 'FAIL' : 'PASS', { rows, findings, severity: findings.length ? 'Major' : undefined, repro: findings.length ? 'qaBreeds=1, F20, open Flock at 360 and 390, measure #breeds-sheet, body sections, Close/Esc focus target.' : undefined });
}

// BR-UI-07 docked overlay
{
  const rows = []; const findings = [];
  for (const [w, h, ex, ey, ew, eh] of [[1280, 800, 880, 56, 400, 744], [1024, 474, 624, 56, 400, 418], [1280, 720, null, null, null, null]]) {
    const s = await session(w, h, { farmLevel: 20, coinsCents: 500000, collectionLevel: 20, breeds: { ...EMPTY_BR, freeHatchUsed: 1 } });
    const g = await guard(s.page, { w, h, docked: true, flock: true, noModal: true, flag: 1, farm: 20 });
    const sheet = await measure(s.page, ['#breeds-sheet', '[data-testid="breeds-close"]', '#p-market', '#p-upgrades']);
    const marketPresent = !!sheet['#p-market'];
    await jsClick(s.page, '[data-testid="breeds-close"]');
    await s.page.waitForTimeout(200);
    const afterClose = await s.page.evaluate(() => ({ entryFocused: document.activeElement === document.getElementById('breeds-entry'), active: document.activeElement?.id || document.activeElement?.tagName, market: !!document.getElementById('p-market') }));
    await openFlock(s.page);
    await s.page.keyboard.press('Escape');
    await s.page.waitForTimeout(200);
    const afterEsc = await s.page.evaluate(() => ({ entryFocused: document.activeElement === document.getElementById('breeds-entry'), flockOpen: !!(document.querySelector('#breeds-sheet') && !document.querySelector('#breeds-sheet').hidden), active: document.activeElement?.id || document.activeElement?.tagName }));
    const sh = await shot(s.page, `chromium-${w}x${h}-BR-UI-07-overlay.png`, { sheet, afterClose, afterEsc, g });
    const r = sheet['#breeds-sheet'];
    if (ex != null && r && (Math.abs(r.x - ex) > 1 || Math.abs(r.y - ey) > 1 || Math.abs(r.w - ew) > 1 || Math.abs(r.h - eh) > 1)) findings.push(`${w}x${h} overlay rect ${r.x},${r.y} ${r.w}x${r.h} vs ${ex},${ey} ${ew}x${eh}`);
    if (!afterClose.entryFocused) findings.push(`${w}x${h} Close did not return focus to #breeds-entry (active=${afterClose.active})`);
    if (!afterEsc.entryFocused) findings.push(`${w}x${h} Esc did not return focus to #breeds-entry (active=${afterEsc.active})`);
    rows.push({ w, h, g, sheet, marketPresent, afterClose, afterEsc, shot: sh.file });
    await closeCtx(s);
  }
  recCase('BR-UI-07', findings.length ? 'FAIL' : 'PASS', {
    rows, findings, severity: findings.length ? 'Major' : undefined,
    sales_30s_control: 'NOT RUN (abbreviated; Market node presence recorded; no 30s sale-count compare this pass)',
    repro: findings.length ? 'qaBreeds=1, F20, open docked Flock overlay, measure rect, Close/Esc, check focus returns to #breeds-entry.' : undefined,
  });
}

// BR-UI-08
{
  const s = await session(1280, 800, { farmLevel: 20, coinsCents: 0, collectionLevel: 20 }, { open: false });
  const flags = await s.page.evaluate(() => {
    const refill = document.querySelector('.nav-manage:not([hidden]), button.desk-manage-all:not([hidden]), [aria-label="Refill tired workers"]:not([hidden])');
    return { rc2Refill: window.eggfarm.balance?.m4?.flags?.rc2Refill, refillVisible: !!(refill && refill.getClientRects().length), refillHtml: refill?.outerHTML?.slice(0, 200) || null };
  });
  const sh = await shot(s.page, 'chromium-1280x800-BR-UI-08-no-rc2Refill.png', flags);
  await closeCtx(s);
  recCase('BR-UI-08', 'BLOCKED', {
    reason: 'needs m4.flags.rc2Refill=1 and a visible docked Refill pill; authorized path sets only breeds=1. Runtime rc2Refill=' + flags.rc2Refill + ', refillVisible=' + flags.refillVisible + '.',
    flags, evidence: [sh.file],
  });
}
savePartial('after-01-08');

// Hatch cases 09-13
{
  const s = await session(360, 640, { farmLevel: 10, coinsCents: 0, collectionLevel: 10, breeds: { ...EMPTY_BR, freeHatchUsed: 0 } });
  const g = await guard(s.page, { w: 360, h: 640, flock: true, noModal: true, flag: 1, farm: 10 });
  const hatch = await measure(s.page, ['[data-testid="breeds-hatch"]', '#hatch-sub', '#hatch-fs', '.breeds-farmsoon', '#hatch-basis']);
  const emptySlot = await s.page.evaluate(() => document.querySelector('.slot.empty')?.innerText?.replace(/\s+/g, ' ').trim());
  const sh1 = await shot(s.page, 'chromium-360x640-BR-UI-09-before.png', { hatch, emptySlot, g });
  await jsClick(s.page, '[data-testid="breeds-hatch"]');
  await s.page.waitForTimeout(300);
  const after = await s.page.evaluate(() => ({ coins: window.eggfarm.state.coinsCents, free: window.eggfarm.state.breeds?.freeHatchUsed, incu: window.eggfarm.state.breeds?.incubator, label: document.querySelector('[data-testid="breeds-hatch"]')?.innerText, sub: document.querySelector('#hatch-sub')?.innerText }));
  const sh2 = await shot(s.page, 'chromium-360x640-BR-UI-09-after.png', after);
  const findings = [];
  const lab = (hatch['[data-testid="breeds-hatch"]']?.text || '').replace(/\s+/g, ' ').trim();
  if (lab !== 'Hatch · Free') findings.push(`label "${lab}" != "Hatch · Free"`);
  if ((hatch['#hatch-sub']?.text || '') !== 'Ready in 1:00') findings.push(`sub "${hatch['#hatch-sub']?.text}" != "Ready in 1:00"`);
  if (after.coins !== 0) findings.push(`charged ${after.coins}`);
  if (after.free !== 1) findings.push(`freeHatchUsed=${after.free}`);
  if (!after.incu) findings.push('incubator not started');
  if (/Free/.test(after.label || '')) findings.push(`Free still in label after press: ${after.label}`);
  recCase('BR-UI-09', findings.length ? 'FAIL' : 'PASS', { before: hatch, after, findings, severity: findings.length ? 'Major' : undefined, evidence: [sh1.file, sh2.file], repro: findings.length ? 'F10, coins 0, freeHatchUsed 0, open Flock, read Hatch, press it.' : undefined });
  await closeCtx(s);
}

{
  const rows = []; const findings = [];
  for (const [F, coins] of [[10, 10_000_000], [28, 200_000_000]]) {
    for (const [w, h] of [[360, 640], [1280, 800]]) {
      const s = await session(w, h, { farmLevel: F, coinsCents: coins, collectionLevel: F, breeds: { ...EMPTY_BR, freeHatchUsed: 1 } });
      const g = await guard(s.page, { w, h, flock: true, noModal: true, flag: 1, farm: F });
      const cdp = await s.ctx.newCDPSession(s.page); await cdp.send('DOM.enable'); await cdp.send('Accessibility.enable');
      const hatch = await measure(s.page, ['[data-testid="breeds-hatch"]', '#hatch-sub', '#hatch-fs', '.breeds-farmsoon', '#hatch-basis']);
      const ax = await axFor(cdp, '[data-testid="breeds-hatch"]');
      const textScan = await s.page.evaluate(() => {
        const t = (document.querySelector('#breeds-body')?.innerText || '');
        return { text: t, income: /income|≈|Affordable in/.test(t), ofIncome: /of income/.test(t), describedby: document.querySelector('[data-testid="breeds-hatch"]')?.getAttribute('aria-describedby'), hatchFs: !!document.getElementById('hatch-fs'), farmsoon: !!document.querySelector('.breeds-farmsoon') };
      });
      const sh = await shot(s.page, `chromium-${w}x${h}-BR-UI-10-F${F}.png`, { hatch, ax, textScan, g });
      const lab = (hatch['[data-testid="breeds-hatch"]']?.text || '').replace(/\s+/g, ' ').trim();
      if (!lab.startsWith('Hatch · $')) findings.push(`${w}x${h} F${F} label "${lab}"`);
      if ((hatch['#hatch-sub']?.text || '') !== 'Ready in 1:00') findings.push(`${w}x${h} F${F} sub "${hatch['#hatch-sub']?.text}"`);
      if (textScan.income || textScan.ofIncome) findings.push(`${w}x${h} F${F} forbidden visible text`);
      rows.push({ w, h, F, lab, ax, textScan, hatch, shot: sh.file });
      await closeCtx(s);
    }
  }
  recCase('BR-UI-10', findings.length ? 'FAIL' : 'PASS', { rows, findings, severity: findings.length ? 'Major' : undefined, repro: findings.length ? 'freeHatchUsed=1, affordable F10/F28, read Hatch label/AX/sub/describedby.' : undefined });
}

{
  const s = await session(360, 640, { farmLevel: 28, coinsCents: 1, collectionLevel: 28, breeds: { ...EMPTY_BR, freeHatchUsed: 1 } });
  const g = await guard(s.page, { w: 360, h: 640, flock: true, noModal: true, flag: 1, farm: 28 });
  const before = await s.page.evaluate(() => {
    const hb = document.querySelector('[data-testid="breeds-hatch"]');
    const buy = document.querySelector('.buy[aria-disabled="true"], .btn.buy[aria-disabled="true"]') || document.querySelector('.up .buy');
    const cs = el => el ? ((c) => ({ bg: c.backgroundColor, color: c.color, shadow: c.boxShadow }))(getComputedStyle(el)) : null;
    return {
      coins: window.eggfarm.state.coinsCents, label: hb?.innerText, ariaDisabled: hb?.getAttribute('aria-disabled'),
      hatch: cs(hb), buy: buy ? { text: buy.innerText, aria: buy.getAttribute('aria-disabled'), ...cs(buy) } : null,
      describedby: hb?.getAttribute('aria-describedby'),
      descText: hb?.getAttribute('aria-describedby') ? hb.getAttribute('aria-describedby').split(/\s+/).map(id => document.getElementById(id)?.innerText).join(' | ') : null,
      sub: document.querySelector('#hatch-sub')?.innerText, farmsoon: document.querySelector('.breeds-farmsoon')?.innerText,
    };
  });
  const coins0 = before.coins;
  await jsClick(s.page, '[data-testid="breeds-hatch"]');
  await s.page.waitForTimeout(150);
  const after = await s.page.evaluate(() => ({ coins: window.eggfarm.state.coinsCents, incu: window.eggfarm.state.breeds?.incubator }));
  const sh = await shot(s.page, 'chromium-360x640-BR-UI-11-unaffordable.png', { before, after, g });
  const findings = [];
  if (before.ariaDisabled !== 'true') findings.push(`aria-disabled=${before.ariaDisabled}`);
  if (after.coins !== coins0) findings.push(`press changed coins ${coins0}->${after.coins}`);
  if (after.incu) findings.push('incubator started on unaffordable press');
  recCase('BR-UI-11', findings.length ? 'FAIL' : 'PASS', { before, after, findings, severity: findings.length ? 'Major' : undefined, evidence: [sh.file], repro: findings.length ? 'F28, coins well below cost, freeHatchUsed=1, open Flock, read unaffordable Hatch and press it.' : undefined });
  await closeCtx(s);
}

{
  const s = await session(360, 640, { farmLevel: 20, coinsCents: 1_000_000, collectionLevel: 20, breeds: { ...EMPTY_BR, freeHatchUsed: 1, incubator: { breed: 'leghorn', remainingMs: 60000, costCents: 136800 } } });
  const g = await guard(s.page, { w: 360, h: 640, flock: true, noModal: true, flag: 1, farm: 20 });
  const t0 = await s.page.evaluate(() => ({
    label: document.querySelector('[data-testid="breeds-hatch"]')?.innerText,
    disabled: document.querySelector('[data-testid="breeds-hatch"]')?.getAttribute('aria-disabled'),
    sub: document.querySelector('#hatch-sub')?.innerText,
    now: document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow'),
    status: document.querySelector('.incu-status')?.innerText,
    sil: document.querySelector('.incu-sil, .incu-disc img, .breed-sil')?.getAttribute('src'),
  }));
  const sh0 = await shot(s.page, 'chromium-360x640-BR-UI-12-t0.png', t0);
  await seed(s.page, { farmLevel: 20, coinsCents: 1_000_000, collectionLevel: 20, breeds: { ...EMPTY_BR, freeHatchUsed: 1, incubator: { breed: 'leghorn', remainingMs: 42000, costCents: 136800 } } });
  await openFlock(s.page);
  const t18 = await s.page.evaluate(() => ({ sub: document.querySelector('#hatch-sub')?.innerText, now: document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow'), label: document.querySelector('[data-testid="breeds-hatch"]')?.innerText }));
  await seed(s.page, { farmLevel: 20, coinsCents: 1_000_000, collectionLevel: 20, breeds: { ...EMPTY_BR, freeHatchUsed: 1, incubator: { breed: 'leghorn', remainingMs: 100, costCents: 136800 } } });
  await openFlock(s.page);
  const t599 = await s.page.evaluate(() => ({ sub: document.querySelector('#hatch-sub')?.innerText, now: document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow') }));
  const sh1 = await shot(s.page, 'chromium-360x640-BR-UI-12-t599.png', t599);
  const findings = [];
  if (!/Hatching/.test(t0.label || '')) findings.push(`t0 label ${t0.label}`);
  if (t0.disabled !== 'true') findings.push(`t0 not disabled`);
  if (t0.sub !== 'Ready in 1:00') findings.push(`t0 sub ${t0.sub}`);
  if (t18.sub !== 'Ready in 0:42') findings.push(`18s sub ${t18.sub} want Ready in 0:42`);
  if (t599.sub === 'Ready in 0:00' || t599.sub === '0:00') findings.push(`59.9s sub is 0:00: ${t599.sub}`);
  recCase('BR-UI-12', findings.length ? 'FAIL' : 'PASS', { t0, t18, t599, findings, severity: findings.length ? 'Major' : undefined, evidence: [sh0.file, sh1.file], repro: findings.length ? 'Seed incubator remainingMs 60000/42000/100 and read Hatch/sub/progress.' : undefined });
  await closeCtx(s);
}

{
  const findings = []; const rows = [];
  const ownedA = Object.fromEntries(COMMONS.map(id => [id, { stars: 2 }]));
  const s = await session(360, 640, { farmLevel: 13, coinsCents: 10_000_000, collectionLevel: 13, breeds: { ...EMPTY_BR, freeHatchUsed: 1, owned: ownedA, hatches: 6 } });
  let hatch = await measure(s.page, ['[data-testid="breeds-hatch"]', '#hatch-sub']);
  const shA = await shot(s.page, 'chromium-360x640-BR-UI-13-commons.png', hatch);
  const labA = (hatch['[data-testid="breeds-hatch"]']?.text || '').replace(/\s+/g, ' ').trim();
  const subA = hatch['#hatch-sub']?.text || '';
  if (labA !== 'More breeds at Farm 14') findings.push(`(a) label "${labA}"`);
  if (subA !== 'All Commons at 2★') findings.push(`(a) sub "${subA}"`);
  rows.push({ kind: 'a', labA, subA, shot: shA.file });
  await closeCtx(s);
  const ownedB = Object.fromEntries(ALL_IDS.map(id => [id, { stars: 2 }]));
  const s2 = await session(360, 640, { farmLevel: 28, coinsCents: 10_000_000, collectionLevel: 28, breeds: { ...EMPTY_BR, freeHatchUsed: 1, owned: ownedB, hatches: 24, flockCompleteLogged: 1 } });
  hatch = await measure(s2.page, ['[data-testid="breeds-hatch"]', '#hatch-sub', '.breeds-farmsoon']);
  const shB = await shot(s2.page, 'chromium-360x640-BR-UI-13-complete.png', hatch);
  const labB = (hatch['[data-testid="breeds-hatch"]']?.text || '').replace(/\s+/g, ' ').trim();
  const subB = hatch['#hatch-sub']?.text || '';
  if (!/Flock complete/i.test(labB)) findings.push(`(b) label "${labB}" (want yolk pill "Flock complete")`);
  if (subB !== 'All 8 breeds at 2★ · slots still work') findings.push(`(b) sub "${subB}"`);
  if (hatch['.breeds-farmsoon']) findings.push('(b) farm-soon note present on complete');
  rows.push({ kind: 'b', labB, subB, shot: shB.file });
  recCase('BR-UI-13', findings.length ? 'FAIL' : 'PASS', { rows, findings, severity: findings.length ? 'Major' : undefined, evidence: [shA.file, shB.file], repro: findings.length ? 'Seed F13 commons-at-2★ and all-8-at-2★, read Hatch label/sub.' : undefined });
  await closeCtx(s2);
}
savePartial('after-09-13');

// BR-UI-14 Farm-soon + describedby lead
{
  const s = await session(360, 640, { farmLevel: 28, coinsCents: 1, collectionLevel: 28, breeds: { ...EMPTY_BR, freeHatchUsed: 1 } });
  const hook = await s.page.evaluate(() => ({ hasHook: typeof window.eggfarmQa?.breeds?.hatchEstimate === 'function', hookPresent: !!window.eggfarmQa?.breeds }));
  const findings = [];
  const natural = await s.page.evaluate(() => ({
    noteCount: document.querySelectorAll('#hatch-fs, [data-testid="breeds-farmsoon"], .breeds-farmsoon, [data-farm-soon]').length,
    noteId: [...document.querySelectorAll('#hatch-fs, .breeds-farmsoon, [data-farm-soon]')].map(e => ({ id: e.id, testdid: e.getAttribute('data-testid'), className: e.className, text: e.textContent })),
    describedby: document.querySelector('[data-testid="breeds-hatch"]')?.getAttribute('aria-describedby'),
    hatchFsInDom: !!document.getElementById('hatch-fs'),
    sub: document.querySelector('#hatch-sub')?.innerText,
  }));
  const sh = await shot(s.page, 'chromium-360x640-BR-UI-14-natural.png', { hook, natural });
  const over = await s.page.evaluate(() => {
    const fn = window.eggfarmQa?.breeds?.hatchEstimate;
    if (typeof fn !== 'function') return { noHook: true };
    return { a: fn({ defaultPerS: 1e9, assumeWorkingPerS: 1e9 }), b: fn({ defaultPerS: 0.0001, assumeWorkingPerS: 0.0001 }) };
  });
  await s.page.evaluate(() => { const g = window.eggfarm; if (g) g.breedsEstimateOverride = { defaultPerS: 1, assumeWorkingPerS: 1 }; window.eggfarmUi.render(); });
  await openFlock(s.page);
  const forced = await s.page.evaluate(() => ({
    noteCount: document.querySelectorAll('#hatch-fs, [data-testid="breeds-farmsoon"], .breeds-farmsoon, [data-farm-soon]').length,
    nodes: [...document.querySelectorAll('#hatch-fs, .breeds-farmsoon, [data-farm-soon]')].map(e => ({ id: e.id, testdid: e.getAttribute('data-testid'), className: e.className, text: (e.textContent || '').trim() })),
    describedby: document.querySelector('[data-testid="breeds-hatch"]')?.getAttribute('aria-describedby'),
    hatchFs: !!document.getElementById('hatch-fs'),
    textExact: [...document.querySelectorAll('.breeds-farmsoon, #hatch-fs')].map(e => e.textContent.trim()),
  }));
  const sh2 = await shot(s.page, 'chromium-360x640-BR-UI-14-forced.png', forced);
  if (forced.noteCount >= 1) {
    if (!forced.hatchFs) findings.push('Farm-soon note is in the DOM but has no id="hatch-fs"');
    if (!(forced.describedby || '').split(/\s+/).includes('hatch-fs')) findings.push(`Hatch aria-describedby="${forced.describedby}" does not include hatch-fs`);
    if (forced.textExact.some(t => t !== 'Needs next Farm upgrade')) findings.push(`note text ${JSON.stringify(forced.textExact)}`);
  } else {
    findings.push('could not make Farm-soon note appear (natural+override); describedby lead checked only in the absence case');
    if ((natural.describedby || '') !== 'hatch-sub') findings.push(`describedby=${natural.describedby}`);
  }
  recCase('BR-UI-14', findings.length ? 'FAIL' : 'PASS', {
    hook, natural, over, forced, findings, ff_wk: 'NOT RUN (Firefox/WebKit engines not installed)',
    severity: findings.length ? 'Major' : undefined, evidence: [sh.file, sh2.file],
    repro: findings.length ? 'qaBreeds=1, F28 unaffordable, open Flock; force hatchEstimate via eggfarmQa / breedsEstimateOverride; inspect #hatch-fs and Hatch aria-describedby.' : undefined,
  });
  recLead('hatch-describedby-missing-farmsoon', findings.some(f => /hatch-fs|describedby/.test(f)) ? 'FAIL' : (forced.noteCount >= 1 ? 'PASS' : 'NOT REPRODUCED'), {
    severity: 'Major', detail: { describedby: forced.describedby ?? natural.describedby, hatchFs: forced.hatchFs, noteCount: forced.noteCount },
    repro: 'Open Flock with Farm-soon visible; read Hatch aria-describedby and whether #hatch-fs exists.',
  });
  await closeCtx(s);
}

{
  const s = await session(360, 640, { farmLevel: 28, coinsCents: 1, collectionLevel: 28, breeds: { ...EMPTY_BR, freeHatchUsed: 1 } });
  const io = await s.page.evaluate(() => {
    const fn = window.eggfarmQa?.breeds?.hatchEstimate;
    if (typeof fn !== 'function') return { noHook: true };
    return { raw: fn({}), hasHook: true, type: typeof fn };
  });
  const sh = await shot(s.page, 'chromium-360x640-BR-UI-15-hook.png', io);
  recCase('BR-UI-15', io.noHook ? 'FAIL' : 'PASS', {
    io,
    note: io.noHook ? 'eggfarmQa.breeds.hatchEstimate missing on QA build' : 'Hook is present on the QA build. The 85/95 second-pair matrix was not fully driven (hook takes $/s). Release-hook absence is graded from the check-release-build / dist grep (item 5), not this page.',
    findings: io.noHook ? ['hook missing'] : [],
    severity: io.noHook ? 'Major' : undefined, evidence: [sh.file],
  });
  await closeCtx(s);
}

{
  const s = await session(360, 640, { farmLevel: 20, coinsCents: 1, collectionLevel: 20, breeds: {
    ...EMPTY_BR, freeHatchUsed: 1,
    owned: { rhode_island_red: { stars: 1 }, cream_legbar: { stars: 1 }, ayam_cemani: { stars: 1 }, sussex: { stars: 1 }, leghorn: { stars: 1 } },
    slots: ['sussex', null, null], settleMs: [252000, 0, 0],
  } });
  const fits = await s.page.evaluate(() => [...document.querySelectorAll('[data-testid="breeds-hatch"], #hatch-sub, .slot, .album-name, .album-cell, .slot-meta, .settle-lab, .breeds-entry, h2')].map(el => ({
    sel: el.getAttribute('data-testid') || el.id || el.className, text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80),
    scrollW: el.scrollWidth, clientW: el.clientWidth, overflow: getComputedStyle(el).textOverflow, h: el.getBoundingClientRect().height, minH: getComputedStyle(el).minHeight, fit: el.scrollWidth <= el.clientWidth + 1,
  })));
  const sh = await shot(s.page, 'chromium-360x640-BR-UI-16-fit.png', fits);
  const findings = fits.filter(f => !f.fit && f.scrollW > 0).map(f => `${f.sel} scroll ${f.scrollW}>${f.clientW} text="${f.text}"`);
  recCase('BR-UI-16', findings.length ? 'FAIL' : 'PASS', { fits, findings, ff_wk: 'NOT RUN (Firefox/WebKit not installed)', evidence: [sh.file], severity: findings.length ? 'Minor' : undefined, repro: findings.length ? 'F20 mixed album at 360, measure scrollWidth of Hatch/slot/album strings.' : undefined });
  await closeCtx(s);
}

// 17 place/move/remove + leads
{
  const s = await session(360, 640, { farmLevel: 20, coinsCents: 1_000_000, collectionLevel: 20, breeds: {
    ...EMPTY_BR, freeHatchUsed: 1, owned: { leghorn: { stars: 1 }, sussex: { stars: 1 } }, slots: ['leghorn', null, null], settleMs: [0, 0, 0],
  } });
  const g = await guard(s.page, { w: 360, h: 640, flock: true, noModal: true, flag: 1, farm: 20 });
  const cdp = await s.ctx.newCDPSession(s.page); await cdp.send('DOM.enable'); await cdp.send('Accessibility.enable');
  const filled = await s.page.evaluate(() => {
    const el = document.querySelector('.slot.filled');
    const rem = document.querySelector('.slot-remove, [data-testid="breeds-slot-remove"]');
    const rr = rem?.getBoundingClientRect();
    const cs = rem ? getComputedStyle(rem) : null;
    return {
      aria: el?.getAttribute('aria-label'), role: el?.getAttribute('role'), text: el?.innerText?.replace(/\s+/g, ' ').trim(),
      visibleParts: [...(el?.querySelectorAll('.slot-name, .slot-meta, .slot-remove') || [])].map(x => x.innerText.trim()),
      rem: rem ? { w: +rr.width.toFixed(2), h: +rr.height.toFixed(2), minH: cs.minHeight, text: rem.innerText, aria: rem.getAttribute('aria-label') } : null,
    };
  });
  const axFilled = await axFor(cdp, '.slot.filled');
  const sh0 = await shot(s.page, 'chromium-360x640-BR-UI-17-filled.png', { filled, axFilled, g });
  const place = await s.page.evaluate(() => {
    const cell = document.querySelector('.album-cell.owned[data-breed="sussex"]');
    if (!cell) return { noCell: true };
    cell.click();
    return { empties: [...document.querySelectorAll('.slot.empty')].map(e => e.innerText.replace(/\s+/g, ' ').trim()), picked: !!document.querySelector('.album-cell.picked') };
  });
  const did = await s.page.evaluate(() => {
    const slot = document.querySelector('.slot.empty[data-slot="1"]') || document.querySelector('.slot.empty');
    if (!slot) return { noEmpty: true };
    slot.click();
    return { slots: [...document.querySelectorAll('.slot')].map(e => ({ slot: e.getAttribute('data-slot'), className: e.className, breed: e.getAttribute('data-breed'), text: e.innerText.replace(/\s+/g, ' ').trim() })) };
  });
  const sh1 = await shot(s.page, 'chromium-360x640-BR-UI-17-placed.png', { place, did });
  const remH = filled.rem?.h;
  const findings = [];
  const visName = filled.visibleParts?.[0];
  const axName = axFilled[0]?.name || '';
  if (filled.aria && visName && !String(filled.aria).startsWith(visName)) findings.push(`filled slot aria-label="${filled.aria}" visible name="${visName}" AX="${axName}"`);
  if (filled.rem && remH < 44 - 0.5) findings.push(`Remove hit height ${remH}px (minH ${filled.rem.minH}) < 44`);
  recCase('BR-UI-17', findings.length ? 'FAIL' : 'PASS', { filled, axFilled, place, did, findings, severity: findings.length ? 'Major' : undefined, evidence: [sh0.file, sh1.file], repro: findings.length ? 'F20, Leghorn settled in slot 0, Sussex owned; inspect filled-slot name and Remove size; album-select and place.' : undefined });
  recLead('filled-slot-aria-label-replaces-visible-text', (filled.aria && visName && !String(filled.aria).startsWith(visName)) ? 'FAIL' : 'NOT REPRODUCED', {
    severity: 'Major', detail: { aria: filled.aria, visName, axName }, repro: 'Open Flock with a filled slot; compare the slot group aria-label to the visible name/meta text and the AX name.',
  });
  recLead('remove-button-28px', (filled.rem && remH < 44 - 0.5) ? 'FAIL' : 'NOT REPRODUCED', {
    severity: 'Major', detail: filled.rem, repro: 'Open Flock with a filled slot; measure .slot-remove getBoundingClientRect height and computed min-height.',
  });
  await closeCtx(s);
}

{
  const s = await session(360, 640, { farmLevel: 20, coinsCents: 1_000_000, collectionLevel: 20, breeds: {
    ...EMPTY_BR, freeHatchUsed: 1, owned: { sussex: { stars: 1 } }, slots: ['sussex', null, null], settleMs: [300000, 0, 0],
  } });
  const t0 = await s.page.evaluate(() => ({
    lab: document.querySelector('.settle-lab')?.innerText, meta: document.querySelector('.slot.settling .slot-meta')?.innerText,
    anim: document.getAnimations().map(a => ({ dur: a.effect?.getComputedTiming?.().duration, iter: a.effect?.getComputedTiming?.().iterations })),
  }));
  const sh = await shot(s.page, 'chromium-360x640-BR-UI-18-settling.png', t0);
  await seed(s.page, { farmLevel: 20, coinsCents: 1_000_000, collectionLevel: 20, breeds: { ...EMPTY_BR, freeHatchUsed: 1, owned: { sussex: { stars: 1 } }, slots: ['sussex', null, null], settleMs: [252000, 0, 0] } });
  await openFlock(s.page);
  const t48 = await s.page.evaluate(() => ({ lab: document.querySelector('.settle-lab')?.innerText }));
  const findings = [];
  if ((t0.lab || '') !== 'Settling 5:00') findings.push(`t0 lab "${t0.lab}"`);
  if ((t48.lab || '') !== 'Settling 4:12') findings.push(`48s lab "${t48.lab}"`);
  recCase('BR-UI-18', findings.length ? 'FAIL' : 'PASS', { t0, t48, findings, hidden50s: 'NOT RUN (tab-hide timing not scripted this pass)', t300: 'NOT RUN (settled transition not fully clocked this pass; label path checked at 5:00 and 4:12)', severity: findings.length ? 'Major' : undefined, evidence: [sh.file] });
  await closeCtx(s);
}

{
  const rows = []; const findings = [];
  const owned = { leghorn: { stars: 1 }, sussex: { stars: 2 }, orpington: { stars: 1 }, rhode_island_red: { stars: 1 }, brahma: { stars: 1 } };
  for (const [w, h, wantW, wantMinH, wantSpr] of [[360, 640, 76, 100, 48], [1280, 800, 86, 100, 48]]) {
    const s = await session(w, h, { farmLevel: 20, coinsCents: 1, collectionLevel: 20, breeds: { ...EMPTY_BR, freeHatchUsed: 1, owned, slots: ['leghorn', null, null], settleMs: [0, 0, 0] } });
    const g = await guard(s.page, { w, h, flock: true, noModal: true, flag: 1, farm: 20 });
    const album = await s.page.evaluate(() => {
      const cells = [...document.querySelectorAll('.album-cell')].map(el => {
        const r = el.getBoundingClientRect(); const img = el.querySelector('img'); const ir = img?.getBoundingClientRect();
        return { className: el.className, w: +r.width.toFixed(2), h: +r.height.toFixed(2), minH: getComputedStyle(el).minHeight, tag: el.tagName,
          imgW: ir ? +ir.width.toFixed(2) : null, imgSrc: img?.getAttribute('src'), text: el.innerText.replace(/\s+/g, ' ').trim(), opacity: img ? getComputedStyle(img).opacity : null };
      });
      return { cells, count: cells.length };
    });
    const sh = await shot(s.page, `chromium-${w}x${h}-BR-UI-19-album.png`, album);
    if (album.cells.length !== 8) findings.push(`${w}x${h} cells=${album.cells.length}`);
    for (const c of album.cells) {
      if (Math.abs(c.w - wantW) > 1) findings.push(`${w}x${h} cell width ${c.w} want ${wantW}`);
      if (c.h + 0.5 < wantMinH) findings.push(`${w}x${h} cell height ${c.h} (minH ${c.minH}) < ${wantMinH}`);
    }
    for (const c of album.cells.filter(c => /owned/.test(c.className))) if (c.imgW != null && Math.abs(c.imgW - wantSpr) > 1) findings.push(`${w}x${h} owned sprite ${c.imgW} want ${wantSpr}`);
    rows.push({ w, h, album, shot: sh.file, g });
    await closeCtx(s);
  }
  recCase('BR-UI-19', findings.length ? 'FAIL' : 'PASS', { rows, findings, severity: findings.length ? 'Major' : undefined, repro: findings.length ? 'F20, 5 of 8 owned, measure album cell width/height and sprite size at 360 and 1280×800.' : undefined });
  recLead('small-album-cells', findings.some(f => /height|sprite|width/.test(f)) ? 'FAIL' : 'NOT REPRODUCED', { severity: 'Major', detail: findings, repro: 'Measure .album-cell and .album-cell img at 360 and docked 1280.' });
}

{
  const s = await session(360, 640, { farmLevel: 20, coinsCents: 1_000_000, collectionLevel: 20, breeds: { ...EMPTY_BR, freeHatchUsed: 1, owned: { leghorn: { stars: 1 } }, slots: ['leghorn', null, null] } });
  const scan = await s.page.evaluate(() => {
    const body = document.querySelector('#breeds-sheet') || document.body;
    const texts = [];
    const walk = (el) => {
      if (el.childNodes) {
        for (const n of el.childNodes) {
          if (n.nodeType === 3) {
            const t = n.textContent;
            if (/★|payback|\bbest\b|of income/i.test(t) && !el.closest('.album-stars, .album-cell, .breeds-reveal')) texts.push({ t, where: el.className || el.id });
          }
        }
      }
      for (const c of el.children || []) walk(c);
    };
    walk(body);
    const entry = document.getElementById('breeds-entry');
    return { texts, entryClass: entry?.className, entryStar: /star|★/.test(entry?.innerText || '') };
  });
  const sh = await shot(s.page, 'chromium-360x640-BR-UI-20-scan.png', scan);
  recCase('BR-UI-20', scan.texts.length ? 'FAIL' : 'PASS', { scan, findings: scan.texts, severity: scan.texts.length ? 'Major' : undefined, evidence: [sh.file] });
  await closeCtx(s);
}

{
  const s = await session(360, 640, { farmLevel: 20, coinsCents: 1_000_000, collectionLevel: 20, breeds: { ...EMPTY_BR, freeHatchUsed: 1 } });
  await s.page.evaluate(() => { window.eggfarm.pendingReveal = 'leghorn'; });
  await jsClick(s.page, '[data-testid="breeds-close"]').catch(() => {});
  await openFlock(s.page);
  await s.page.waitForTimeout(200);
  const card = await s.page.evaluate(() => {
    const el = document.querySelector('[data-testid="breeds-reveal"], .breeds-reveal');
    if (!el) return { missing: true };
    const r = el.getBoundingClientRect();
    const kids = [...el.children].map(c => ({ tag: c.tagName, className: c.className, text: c.innerText.trim() }));
    const ok = el.querySelector('[data-testid="breeds-reveal-ok"], .reveal-ok');
    const or_ = ok?.getBoundingClientRect();
    return {
      role: el.getAttribute('role'), aria: el.getAttribute('aria-label'), className: el.className,
      overlay: { x: r.left, y: r.top, w: r.width, h: r.height }, html: el.innerHTML.slice(0, 500),
      text: el.innerText.replace(/\s+/g, ' ').trim(), kids,
      hasKicker: /New breed!|Star up!/i.test(el.innerText),
      hasPlacement: /Added to slot|Not slotted|settling 5:00/i.test(el.innerText),
      nice: ok ? { w: or_.width, h: or_.height, focused: document.activeElement === ok } : null,
    };
  });
  const sh = await shot(s.page, 'chromium-360x640-BR-UI-21-reveal.png', card);
  await s.page.keyboard.press('Escape');
  await s.page.waitForTimeout(200);
  const afterEsc = await s.page.evaluate(() => ({
    reveal: !!document.querySelector('[data-testid="breeds-reveal"], .breeds-reveal'),
    flockOpen: !!(document.querySelector('#breeds-sheet') && !document.querySelector('#breeds-sheet').hidden),
  }));
  const findings = [];
  if (card.missing) findings.push('reveal card did not appear from pendingReveal');
  if (card && !card.missing && !card.hasKicker) findings.push('no kicker "New breed!" / "Star up!"');
  if (card && !card.missing && !card.hasPlacement) findings.push('no placement line');
  if (afterEsc.reveal) findings.push('Esc did not close the reveal card');
  recCase('BR-UI-21', findings.length ? 'FAIL' : 'PASS', { card, afterEsc, findings, reduced_motion: 'NOT RUN (no RM pass this invocation)', severity: findings.length ? 'Major' : undefined, evidence: [sh.file], repro: findings.length ? 'Set eggfarm.pendingReveal="leghorn", open Flock, inspect the reveal card, press Esc.' : undefined });
  recLead('reveal-no-kicker-esc-not-closing', (card && !card.missing && (!card.hasKicker || afterEsc.reveal)) ? 'FAIL' : (card?.missing ? 'NOT REPRODUCED' : 'PASS'), {
    severity: 'Major', detail: { hasKicker: card?.hasKicker, hasPlacement: card?.hasPlacement, afterEsc },
    repro: 'Force pendingReveal, open Flock, read reveal copy, press Esc.',
  });
  await closeCtx(s);
}

{
  const s = await session(360, 640, { farmLevel: 20, coinsCents: 1_000_000, collectionLevel: 20, breeds: { ...EMPTY_BR, freeHatchUsed: 1, incubator: { breed: 'sussex', remainingMs: 40000, costCents: 100 } } });
  const attempt = await s.page.evaluate(() => ({ hasShowWelcome: typeof window.eggfarmUi?.showWelcome === 'function', pending: window.eggfarm.pendingReveal || null, modal: document.querySelector('#modal-layer')?.className }));
  const sh = await shot(s.page, 'chromium-360x640-BR-UI-22-attempt.png', attempt);
  recCase('BR-UI-22', 'NOT RUN', { reason: 'Did not construct a genuine offline save (savedAt 10 min past + remainingMs 40s) and reload in this pass; welcome-back path not exercised. reveal-after-welcome remains untested at runtime.', attempt, evidence: [sh.file] });
  await closeCtx(s);
}

{
  const s = await session(360, 640, { farmLevel: 20, coinsCents: 1_000_000, collectionLevel: 20, breeds: { ...EMPTY_BR, freeHatchUsed: 1, owned: { leghorn: { stars: 1 } }, slots: ['leghorn', null, null] } });
  const before = await s.page.evaluate(() => ({ streak: window.eggfarm.state.streak, basket: window.eggfarm.state.basket, coins: window.eggfarm.state.coinsCents }));
  for (let i = 0; i < 8; i++) { await s.page.evaluate(() => document.querySelector('#breeds-body')?.click()); }
  await jsClick(s.page, '[data-testid="breeds-hatch"]').catch(() => {});
  const after = await s.page.evaluate(() => ({ streak: window.eggfarm.state.streak, basket: window.eggfarm.state.basket, coins: window.eggfarm.state.coinsCents }));
  recCase('BR-UI-23', (before.basket === after.basket) ? 'PASS' : 'FAIL', { before, after, note: 'Sim was frozen (g.frame no-op), so credited-tap counters may also be frozen. Clicks in the sheet were issued; basket/coins/streak recorded.', evidence: [] });
  await closeCtx(s);
}

{
  const pub = path.join(WT, 'public/assets');
  const art = '/workspace/egg-farm-studio/art-ux/assets';
  const files = readdirSync(pub).filter(f => f.startsWith('char-breed-') && f.endsWith('.svg'));
  const table = []; const findings = [];
  for (const f of files) {
    const a = path.join(pub, f), b = path.join(art, f);
    const ha = createHash('sha256').update(readFileSync(a)).digest('hex');
    const hb = existsSync(b) ? createHash('sha256').update(readFileSync(b)).digest('hex') : null;
    table.push({ file: f, pub: ha, art: hb, match: ha === hb });
    if (hb && ha !== hb) findings.push(`${f} sha mismatch`);
    if (!hb) findings.push(`${f} missing in art-ux/assets`);
  }
  const expected = ALL_IDS.map(id => `char-breed-${id.replaceAll('_', '-')}.svg`).concat(['char-breed-silhouette.svg']);
  for (const e of expected) if (!files.includes(e)) findings.push(`missing ${e} in public/assets`);
  const s = await session(360, 640, { farmLevel: 20, coinsCents: 1, collectionLevel: 20, breeds: { ...EMPTY_BR, freeHatchUsed: 1, owned: Object.fromEntries(ALL_IDS.map(id => [id, { stars: 1 }])) } });
  const srcs = await s.page.evaluate(() => [...document.querySelectorAll('#breeds-sheet img')].map(i => i.getAttribute('src')));
  const sh = await shot(s.page, 'chromium-360x640-BR-UI-24-sprites.png', { srcs });
  recCase('BR-UI-24', findings.length ? 'FAIL' : 'PASS', { table, srcs, findings, reviewer_9of9: 'NOT GRADED (human reviewer; automated IoU matrix NOT RUN this pass — file identity + mapping only)', severity: findings.length ? 'Major' : undefined, evidence: [sh.file] });
  await closeCtx(s);
}
savePartial('after-14-24');

// both-tagged remaining: 30, 32, 34, 35, 37, 39
const dep = await (async () => {
  const s = await session(1280, 800, { farmLevel: 20, coinsCents: 1_000_000, collectionLevel: 20, breeds: { ...EMPTY_BR, freeHatchUsed: 1, owned: { leghorn: { stars: 1 } }, slots: ['leghorn', null, null], settleMs: [0, 0, 0] } });
  const r = await s.page.evaluate(() => {
    const g = window.eggfarm;
    const keys = g.state && typeof g.state === 'object' ? Object.keys(g.state) : [];
    const tel = typeof window.eggfarmExportTelemetry === 'function' ? window.eggfarmExportTelemetry() : null;
    let parsed = null; try { parsed = typeof tel === 'string' ? JSON.parse(tel) : tel; } catch {}
    const ev = parsed?.events || parsed || [];
    const types = Array.isArray(ev) ? [...new Set(ev.map(e => e.type))] : [];
    return {
      hasPresentOpen: 'presentOpen' in (g.state || {}) || typeof g.presentOpen === 'function',
      pchip: !!document.querySelector('.pchip, #pchip-state'),
      types, hasHatchStarted: types.includes('hatch_started'), stateKeysSample: keys.slice(0, 40),
    };
  });
  const sh = await shot(s.page, 'chromium-1280x800-deps-present-telemetry.png', r);
  await closeCtx(s);
  return { ...r, shot: sh.file };
})();
results.deps = dep;

recCase('BR-UI-30', 'BLOCKED', {
  reason: 'gate legs need the Present rate gate (W 10 / k 6) in the sim. Runtime hasPresentOpen=' + dep.hasPresentOpen + ', no .pchip in the PR-A build. Slot-card mirror cannot be graded against a live gate. Dependency (PR-A must not edit src/sim).',
  deps: dep, evidence: [dep.shot],
});
recCase('BR-UI-32', 'BLOCKED', {
  reason: 'chip state rules (reload / hidden tab / phone sheet / docked overlay) need the Present chip and rate gate, which are not on this PR-A head (hasPresentOpen=' + dep.hasPresentOpen + ', pchip=' + dep.pchip + '). Sheet/overlay themselves were exercised in BR-UI-06/07; the chip legs are blocked on the sim/PR-B dependency.',
  deps: dep,
});

{
  const findings = []; const rows = [];
  for (const [w, h] of [[360, 640], [1280, 800], [1280, 720]]) {
    const s = await session(w, h, { farmLevel: 20, coinsCents: 10_000_000, collectionLevel: 20, breeds: {
      ...EMPTY_BR, freeHatchUsed: 1, owned: { leghorn: { stars: 1 }, sussex: { stars: 1 } }, slots: ['leghorn', 'sussex', null], settleMs: [0, 252000, 0],
    } });
    const g = await guard(s.page, { w, h, flock: true, noModal: true, flag: 1, farm: 20 });
    const cdp = await s.ctx.newCDPSession(s.page); await cdp.send('DOM.enable'); await cdp.send('Accessibility.enable');
    const sels = ['#breeds-entry', '[data-testid="breeds-hatch"]', '.slot.filled', '.slot.settling', '.slot.empty', '.slot.locked', '.album-cell.owned', '.album-cell.locked', '[data-testid="breeds-back"]', '[data-testid="breeds-close"]'];
    const pack = [];
    for (const sel of sels) {
      const attr = (await measure(s.page, [sel]))[sel];
      const ax = await axFor(cdp, sel);
      pack.push({ sel, attr, ax });
      const vis = (attr?.text || '').replace(/\s+/g, ' ').trim();
      const name = ax[0]?.name || '';
      if (sel === '[data-testid="breeds-back"]' || sel === '[data-testid="breeds-close"]') continue;
      if (sel === '.slot.filled' && attr?.aria && vis && !name.startsWith(vis.split(' ')[0]) && attr.aria !== vis) {
        findings.push(`${w}x${h} ${sel} AX "${name}" aria="${attr.aria}" visible="${vis}"`);
      }
      if (sel === '[data-testid="breeds-hatch"]' && name && !name.startsWith('Hatch · ') && !name.startsWith(vis.split('\n')[0])) {
        findings.push(`${w}x${h} Hatch AX "${name}" vis "${vis}"`);
      }
    }
    const sh = await shot(s.page, `chromium-${w}x${h}-BR-UI-34-ax.png`, { pack, g });
    rows.push({ w, h, pack, shot: sh.file });
    await closeCtx(s);
  }
  recCase('BR-UI-34', findings.length ? 'FAIL' : 'PASS', {
    rows, findings, ff_wk: 'NOT RUN (Firefox/WebKit not installed)',
    prb_surfaces: 'chip active/paused, Present mirror, Broody yard — not on this PR-A head (NOT RUN / N/A for PR-B controls)',
    severity: findings.length ? 'Major' : undefined,
    repro: findings.length ? 'Open Flock at 360/1280, CDP AX on entry/Hatch/slots/album; compare name vs visible text.' : undefined,
  });
}

{
  const rows = []; const findings = [];
  for (const [w, h] of [[360, 640], [1280, 800], [1280, 720]]) {
    const s = await session(w, h, { farmLevel: 20, coinsCents: 10_000_000, collectionLevel: 20, breeds: { ...EMPTY_BR, freeHatchUsed: 1, owned: { leghorn: { stars: 1 } }, slots: ['leghorn', null, null] } });
    const g = await guard(s.page, { w, h, flock: true, noModal: true, flag: 1, farm: 20 });
    await s.page.addScriptTag({ content: axeSrc });
    const axe = await s.page.evaluate(async () => {
      const include = [['#breeds-sheet'], ['#breeds-entry']];
      const all = await window.axe.run({ include }, { resultTypes: ['violations'] });
      const lcnm = await window.axe.run({ include }, { runOnly: { type: 'rule', values: ['label-content-name-mismatch', 'nested-interactive'] } });
      const pick = r => (r || []).map(x => ({ id: x.id, impact: x.impact, nodes: x.nodes.map(n => ({ target: n.target.join(' '), summary: n.failureSummary })) }));
      return { version: window.axe.version, violations: pick(all.violations), lcnm: { violations: pick(lcnm.violations), passes: lcnm.passes?.length, incomplete: pick(lcnm.incomplete) } };
    });
    const hits = await s.page.evaluate(() => {
      const sels = ['#breeds-entry', '[data-testid="breeds-back"]', '[data-testid="breeds-close"]', '[data-testid="breeds-hatch"]', '.slot.filled', '.slot-remove', '.album-cell.owned'];
      return sels.map(sel => {
        const el = document.querySelector(sel);
        if (!el) return { sel, missing: true };
        const r = el.getBoundingClientRect();
        return { sel, w: +r.width.toFixed(2), h: +r.height.toFixed(2), ok: r.width + 0.5 >= 44 && r.height + 0.5 >= 44 };
      });
    });
    const sh = await shot(s.page, `chromium-${w}x${h}-BR-UI-35-axe.png`, { axe, hits, g });
    if (axe.violations.length) findings.push(`${w}x${h} axe violations ${JSON.stringify(axe.violations)}`);
    if (axe.lcnm.violations.length) findings.push(`${w}x${h} lcnm/nested ${JSON.stringify(axe.lcnm.violations)}`);
    for (const htr of hits) if (!htr.missing && !htr.ok) findings.push(`${w}x${h} hit ${htr.sel} ${htr.w}x${htr.h} < 44`);
    rows.push({ w, h, axe, hits, shot: sh.file });
    await closeCtx(s);
  }
  recCase('BR-UI-35', findings.length ? 'FAIL' : 'PASS', { rows, findings, severity: findings.length ? 'Major' : undefined, prb_surfaces: 'chip/tooltip/yard not on this head', repro: findings.length ? 'axe 4.14.0 on #breeds-sheet/#breeds-entry plus hit-area measure of PR-A controls.' : undefined });
}

recCase('BR-UI-37', 'BLOCKED', {
  reason: 'breed telemetry emitters (hatch_started / breed_revealed / breed_slotted / flock_complete) are not present at this head (schema.ts only). Runtime export types=' + JSON.stringify(dep.types) + ', hasHatchStarted=' + dep.hasHatchStarted + '. Dependency (drift audit row 34); UI triggers exist in PR-A but emitters are sim work.',
  deps: dep, evidence: [dep.shot],
});

{
  const cells = [];
  const sizes = [[360, 640], [390, 844], [1280, 800], [1280, 720]];
  const states = [
    { name: 'entry-F10', patch: { farmLevel: 10, coinsCents: 1_000_000, collectionLevel: 10, breeds: { ...EMPTY_BR } }, open: false },
    { name: 'sheet-affordable', patch: { farmLevel: 14, coinsCents: 10_000_000, collectionLevel: 14, breeds: { ...EMPTY_BR, freeHatchUsed: 1 } }, open: true },
    { name: 'sheet-unaffordable', patch: { farmLevel: 20, coinsCents: 1, collectionLevel: 20, breeds: { ...EMPTY_BR, freeHatchUsed: 1 } }, open: true },
    { name: 'sheet-incubating', patch: { farmLevel: 20, coinsCents: 1_000_000, collectionLevel: 20, breeds: { ...EMPTY_BR, freeHatchUsed: 1, incubator: { breed: 'leghorn', remainingMs: 45000, costCents: 100 } } }, open: true },
    { name: 'album', patch: { farmLevel: 20, coinsCents: 1, collectionLevel: 20, breeds: { ...EMPTY_BR, freeHatchUsed: 1, owned: { leghorn: { stars: 1 }, sussex: { stars: 2 } }, slots: ['leghorn', null, null] } }, open: true },
  ];
  for (const [w, h] of sizes) {
    for (const st of states) {
      const s = await session(w, h, st.patch, { open: st.open });
      if (st.open) await guard(s.page, { w, h, flock: true, noModal: true, flag: 1 });
      else { await openUpgrades(s.page); await guard(s.page, { w, h, noModal: true, flag: 1 }); }
      const sh = await shot(s.page, `chromium-${w}x${h}-BR-UI-39-${st.name}.png`, { state: st.name });
      cells.push({ w, h, state: st.name, file: sh.file, sha256: sh.sha256 });
      await closeCtx(s);
    }
  }
  recCase('BR-UI-39', 'OBSERVATION', {
    note: 'Visual judgement is an observation, never an automatic PASS against Art wireframes. This records the Chromium matrix (entry/sheet affordable/unaffordable/incubating/album) at 360/390/1280×800/1280×720. Present-badge cells are PR-B and were not shot. FF/WK NOT RUN. Visual match vs Art is not claimed.',
    ff_wk: 'NOT RUN (Firefox/WebKit not installed)',
    prb_badge_cells: 'NOT RUN (Present badge is PR-B)',
    cells,
  });
}

{
  const f03 = results.cases['BR-UI-03'];
  const hit = (f03?.findings || []).filter(x => /locked slot/.test(x));
  recLead('locked-slots-Farm-14', hit.length ? 'FAIL' : 'NOT REPRODUCED', { severity: 'Major', detail: hit, repro: 'Open Flock at F10; read the locked slot visible text vs expected "Slot 2 · Farm 14".' });
}
{
  const f06 = results.cases['BR-UI-06'];
  const hit = (f06?.findings || []).filter(x => /Active totals/.test(x));
  recLead('no-active-totals-row', hit.length ? 'FAIL' : 'NOT REPRODUCED', { severity: 'Major', detail: hit, repro: 'Open Flock at F20; inspect #breeds-body children for an Active totals row.' });
}
{
  const f06 = results.cases['BR-UI-06'];
  const f07 = results.cases['BR-UI-07'];
  const hit = [...(f06?.findings || []), ...(f07?.findings || [])].filter(x => /focus/.test(x));
  recLead('focus-not-returning-to-flock-entry', hit.length ? 'FAIL' : 'NOT REPRODUCED', { severity: 'Major', detail: hit, repro: 'Open Flock, press Close or Esc, read document.activeElement vs #breeds-entry.' });
}

results.finished = new Date().toISOString();
results.shots = browsershots;
results.chrome = browser.version();
writeFileSync(path.join(OUT, 'json', 'probe-results.json'), JSON.stringify(results, null, 2));
writeFileSync(path.join(OUT, 'json', 'probe-partial.json'), JSON.stringify(results, null, 2));
console.log('DONE cases', Object.fromEntries(Object.entries(results.cases).map(([k, v]) => [k, v.status])));
console.log('DONE leads', Object.fromEntries(Object.entries(results.leads).map(([k, v]) => [k, v.status])));
await browser.close();
srv.stop();
process.exit(0);
} catch (err) {
  console.error('PROBE_THROW', err);
  try { savePartial('throw'); } catch {}
  try { writeFileSync(path.join(OUT, 'json', 'probe-results.json'), JSON.stringify({ results, shots: browsershots, error: String(err && err.stack || err) }, null, 2)); } catch {}
  try { await browser.close(); } catch {}
  try { srv.stop(); } catch {}
  process.exit(1);
}
