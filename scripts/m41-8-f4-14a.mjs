// M41-8 F4-14a (m4a-spec v1.25, D-HOP-2026-10-22-02): label-in-name on the next-goal strip, Chromium at 360 / 390 / 430 px.
// Usage: npm run build:qa && AXE_PATH=<axe-core 4.x>/axe.min.js node scripts/m41-8-f4-14a.mjs [chromium|firefox|webkit]
// Per state × width: axe `label-content-name-mismatch` (forced on, it is tagged experimental) + every serious/critical rule
// on #goal → 0 violations; the browser's computed accessible name (Chromium: CDP AX tree; else ariaSnapshot) contains the
// visible label text (★ and a JS `…` are aria-hidden) and the status; the description equals the F4-14 sentence + status
// sentence; neither contains `…` or `★`. Non-F4 targets (FARM waiting/ready, W1 / W3 / W4, done; Art 2.5.3 ruling + final call):
// the name STARTS with the visible text (label + status) and the description is the spelled-out sentence for THAT target
// (`Next goal: Farm level 1. …`). W2 (Coop Hand) is never the best_roi pick on shipped data with M4 on (grid search), so it is
// covered in jsdom on the flag-off build path. Flag-off is a build-time config (balance.json m4.enabled), not reachable from dist-qa; it
// shares the non-F4 code path and is covered in jsdom (tests/m41-8-best-chip.test.ts). Run inside the browser lock.
import pw from 'playwright-core'; import { readFileSync } from 'node:fs'; import { serveOwn } from './serve-own.mjs';
const eng = process.argv[2] ?? 'chromium';
const axe = readFileSync(process.env.AXE_PATH || '/tmp/axe/node_modules/axe-core/axe.min.js', 'utf8');
const srv = await serveOwn('dist-qa', process.env.PORT ? +process.env.PORT : 0);
const br = eng === 'chromium' ? await pw.chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[eng].launch();
let bad = 0, n = 0; const ok = (k, v, d) => { n++; if (!v) bad++; console.log(`${v ? 'PASS' : 'FAIL'} [${eng}] ${k} ${v ? '' : JSON.stringify(d ?? '')}`); };
const SENT = /^Next goal: (best buy, )?(Hens|Egg value|Collection) level \d+(, .+)?\. (Ready now|Ready in about .+|Sell eggs to earn coins)\.$/;
const SENT_OTHER = /^Next goal: (.+\. (Ready now|Ready in about .+|Sell eggs to earn coins)|all upgrades done)\.$/;
/** CCR m1-new: the description must name the strip's OWN target and status, not just have the right shape.
 *  F4 label → `{Track} level {n}` (`Value`→`Egg value`, `Coll.`→`Collection`; a JS-ellipsised name matches as a prefix);
 *  non-F4 label → `Next goal: {label, L{n} → level {n} (M4 on; f4 = 'off' keeps L{n}), first : → ,}.`; done → `Next goal: all upgrades done.`; status pill → its sentence. */
const descMatchesTarget = (desc, labelText, status, f4) => {
  if (!desc) return false;
  const lbl = labelText.replace(/\u00a0/g, ' ').replace(/^★ /, '');
  if (/^All upgrades done!$/.test(lbl)) return desc === 'Next goal: all upgrades done.';
  const st = status === 'Ready!' ? 'Ready now.' : status === '—' ? 'Sell eggs to earn coins.' : status.startsWith('~') ? 'Ready in about ' : null;
  if (!st || !desc.includes(` ${st}`)) return false;
  if (f4 === 'off') return desc.startsWith(`Next goal: ${lbl.replace(':', ',')}. `); // flag-off AC5 sentence, byte-identical
  if (!f4) return desc.startsWith(`Next goal: ${lbl.replace(/\bL(\d+)\b/, 'level $1').replace(':', ',')}. `); // M4 on: `Farm L2` → `Farm level 2`
  const m = lbl.match(/^(.*?) L(\d+)(?=[: ]|$)/); if (!m) return false;
  const cut = m[1].endsWith('…'), name = cut ? m[1].slice(0, -1) : ({ Value: 'Egg value', 'Coll.': 'Collection' })[m[1]] ?? m[1];
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^Next goal: (best buy, )?${esc(name)}${cut ? '[^,]*' : ''} level ${m[2]}(,|\\.)`).test(desc) && (/^★/.test(labelText) === /^Next goal: best buy, /.test(desc));
};
// income: seed one sale so the rolling income/s is > 0 (else F4-11 hides the %).
const STATES = [
  { name: 'hens-pct', st: { farmLevel: 1, hensLevel: 0, eggValueLevel: 0, collectionLevel: 0, coinsCents: 1e13 }, income: true, sfx: /% income$/ },
  { name: 'value-pct', st: { farmLevel: 6, hensLevel: 8, eggValueLevel: 8, collectionLevel: 3, coinsCents: 1e13 }, income: true, sfx: /% income$/ },
  { name: 'value-milestone', st: { farmLevel: 2, hensLevel: 4, eggValueLevel: 4, collectionLevel: 0, coinsCents: 1e13 }, income: true, sfx: /: Grade A$/ },
  { name: 'collection', st: { farmLevel: 3, hensLevel: 5, eggValueLevel: 6, collectionLevel: 0, coinsCents: 1e13 }, income: true, sfx: /\/tap$/ },
  { name: 'fresh-noincome', st: { farmLevel: 0, hensLevel: 0, eggValueLevel: 0, collectionLevel: 0, coinsCents: 0 }, income: false, sfx: /L1$/ },
  { name: 'broke-waiting', st: { farmLevel: 6, hensLevel: 8, eggValueLevel: 8, collectionLevel: 3, coinsCents: 0 }, income: true, sfx: /./ },
  // Art ruling (2026-10-22, WCAG 2.5.3) for the non-F4 targets: the name must START with the visible text, and axe stays at 0.
  { name: 'farm-waiting', other: /^Farm L\d+/, st: { farmLevel: 0, hensLevel: 3, eggValueLevel: 3, collectionLevel: 0, coinsCents: 0 }, income: true },
  { name: 'farm-ready', other: /^Farm L\d+/, st: { farmLevel: 0, hensLevel: 3, eggValueLevel: 3, collectionLevel: 0, coinsCents: 1e13 }, income: true },
  { name: 'w1-market-hand-ready', other: /^Hire Market Hand$/, st: { farmLevel: 11, hensLevel: 16, eggValueLevel: 16, collectionLevel: 6, coinsCents: 1e13, workers: { hawker: { energy: 100, cdS: 1 } } }, income: true },
  { name: 'w3-hawker-waiting', other: /^Hire Hawker$/, st: { farmLevel: 8, hensLevel: 11, eggValueLevel: 11, collectionLevel: 2, coinsCents: 0 }, income: true },
  { name: 'w4-grader-ready', other: /^Grader tier \d+: ×/, st: { farmLevel: 18, hensLevel: 15, eggValueLevel: 15, collectionLevel: 12, coinsCents: 1e13 }, income: true },
  { name: 'done', other: /^All upgrades done!$/, done: true, st: { farmLevel: 30, hensLevel: 99, eggValueLevel: 99, collectionLevel: 30, coinsCents: 0, graderTier: 99,
    workers: Object.fromEntries(['market_hand', 'coop_hand', 'hawker', 'grader'].map(k => [k, { energy: 100, cdS: 1 }])) }, income: false },
];
for (const w of [360, 390, 430]) for (const c of STATES) {
  const ctx = await br.newContext({ viewport: { width: w, height: 800 } }); const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, seenSlots: 6 })));
  await p.goto(srv.url); await p.getByText('Tap to start').click({ force: true }).catch(() => {}); await p.waitForFunction(() => window.eggfarm);
  await p.evaluate(({ st, income }) => { const g = window.eggfarm;
    if (income) { g.state = { ...g.state, basket: 20, customers: [{ id: 99001, demand: 5, filled: 0, waitedS: 0 }] }; g.dispatch({ type: 'sellAll' }); }
    const gt = st.graderTier === 99 ? g.b?.workers?.grader?.tiers?.length : undefined; // `done`: every grader tier bought
    g.state = { ...g.state, ...st, ...(st.graderTier === 99 ? { graderTier: gt ?? 5 } : {}), seenTracksExplainer: true, customers: [], nextCustomerInS: 1e9 }; }, c);
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const b = document.querySelector('#goal'), lbl = b.querySelector('.goal-label'), d = b.getAttribute('aria-describedby');
    const vis = n => [...n.childNodes].map(x => x.nodeType === 3 ? x.textContent : x.getAttribute?.('aria-hidden') === 'true' ? '' : vis(x)).join('');
    return { text: lbl.textContent, labelVis: vis(lbl), ng: lbl.classList.contains('ng'), ariaLabel: b.getAttribute('aria-label'), descAttr: d ? document.getElementById(d)?.textContent : null, status: b.querySelector('.goal-status').textContent }; });
  if (eng === 'chromium') { // the browser's own computation (accname + describedby)
    const cdp = await ctx.newCDPSession(p); await cdp.send('Accessibility.enable'); await cdp.send('DOM.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: -1 }); const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#goal' });
    const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
    const ax = nodes.find(x => x.role?.value === 'button') ?? nodes[0]; r.name = ax.name?.value ?? null; r.desc = ax.description?.value ?? null;
  } else { r.name = (await p.locator('#goal').ariaSnapshot()).match(/^- '?button "(.*)"'?:?$/m)?.[1] ?? null; r.desc = r.descAttr; }
  await p.addScriptTag({ content: axe });
  const v = await p.evaluate(async () => { const a = await axe.run('#goal', { runOnly: { type: 'rule', values: ['label-content-name-mismatch'] }, resultTypes: ['violations'] });
    const all = await axe.run('#goal', { resultTypes: ['violations'] });
    return [...a.violations, ...all.violations.filter(x => x.impact === 'serious' || x.impact === 'critical')].map(x => ({ id: x.id, impact: x.impact, n: x.nodes.length })); });
  const ws = s => (s ?? '').replace(/\s+/g, ' ').trim(), tag = `${c.name} @${w}`;
  ok(`F4-14a ${tag}: axe label-in-name + serious/critical on #goal = 0`, v.length === 0, v);
  if (c.other) { // non-F4 target: name starts with the visible text (label, then status), same sentence as the description
    const visible = ws(`${r.labelVis} ${r.status}`);
    ok(`2.5.3 ${tag}: non-F4 target ${c.other} (not the F4 template)`, !r.ng && c.other.test(ws(r.labelVis)), r);
    ok(`2.5.3 ${tag}: accessible name STARTS with the visible text "${visible}"`, ws(r.name).startsWith(visible) && visible.length > 0, r);
    ok(`2.5.3 ${tag}: no aria-label; the B3 sentence is the description`, r.ariaLabel === null && SENT_OTHER.test(r.desc ?? '') && r.desc === r.descAttr, r);
    ok(`2.5.3 ${tag}: description names the shown target + status (m1-new)`, descMatchesTarget(r.desc, r.text, r.status, false), r);
  } else {
  ok(`F4-14a ${tag}: F4 strip, no aria-label, described by the visually-hidden node`, r.ng && r.ariaLabel === null && r.descAttr !== null, r);
  ok(`F4-14a ${tag}: name contains the visible label (★ / … excluded) and the status; suffix ${c.sfx}`, ws(r.name).includes(ws(r.labelVis)) && ws(r.name).includes(ws(r.status)) && c.sfx.test(ws(r.labelVis)), r);
  ok(`F4-14a ${tag}: description = F4-14 sentence + status sentence (as rendered by the app)`, SENT.test(r.desc ?? '') && r.desc === r.descAttr, r);
  ok(`F4-14a ${tag}: description names the shown target ({Track} level {n}, ★ ⇔ best buy) + status (m1-new)`, descMatchesTarget(r.desc, r.text, r.status, true), r);
  }
  ok(`F4-14a ${tag}: no … or ★ in name or description`, !/[…★]/.test((r.name ?? '') + (r.desc ?? '')), r);
  if (c.name === 'fresh-noincome') ok(`F4-11 ${tag}: income/s 0 → no % in label or description`, !/%|percent/.test(r.text + r.desc), r);
  if (w === 360) console.log(`  ${tag}: visible=${JSON.stringify(ws(`${r.labelVis} ${r.status}`))} name=${JSON.stringify(r.name)} aria-label=${JSON.stringify(r.ariaLabel)} desc=${JSON.stringify(r.desc)}`);
  await ctx.close();
}
await br.close(); srv.stop(); console.log(`${bad ? 'FAIL' : 'PASS'} [${eng}] m41-8-f4-14a ${n - bad}/${n}`); process.exit(bad ? 1 : 0);
