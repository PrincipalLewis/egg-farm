// QA-D-1024-CAPPREC: shipped egg-farm.html (30b29d3) - per-worker caption when Rested (>T%) AND shared Refill cooldown running.
import { createRequire } from 'node:module'; import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire('/workspace/wt-m41-p1/package.json'); const pw = require('playwright-core');
const DIR = '/workspace/egg-farm-studio/qa/m41/capprec-30b29d3', URL0 = process.argv[2];
const fnv = t => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); };
const base = JSON.parse(readFileSync('/workspace/egg-farm-studio/qa/m41/pub-30b29d3/mig/M2-v5-workers-via-5d9efa6-save-after-30b29d3.json', 'utf8'));
const st = { ...base.state, coinsCents: 1e9, manageCdS: 0, workers: { market_hand: { energy: 40, cdS: 0 }, coop_hand: { energy: 90, cdS: 0 }, hawker: { energy: 20, cdS: 0 } } };
const sj = JSON.stringify(st); const save = `{"version":6,"savedAt":${Date.now()},"saveSeq":1,"sum":"${fnv(sj)}","state":${sj}}`;
const res = {}; const br = await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }); res.browser = br.version();
const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => errs.push(String(e)));
await p.addInitScript(([r, ui]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('eggfarm.save', r); localStorage.setItem('eggfarm.ui', ui); sessionStorage.setItem('seeded', '1'); } },
  [save, JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false })]);
await p.goto(URL0); await p.getByText('Tap to start').click(); await p.waitForTimeout(1200);
if (await p.locator('.onb-skip').count()) await p.locator('.onb-skip').click().catch(() => {});
res.build = await p.evaluate(() => document.querySelector('meta[name="build-id"]')?.content);
await p.locator('[data-nav=upgrades]').click(); await p.waitForTimeout(400); await p.locator('[data-tab=workers]').click(); await p.waitForTimeout(600);
const read = () => p.evaluate(() => [...document.querySelectorAll('.wk[data-w]')].filter(c => c.querySelector('[data-act=manage]')).map(c => { const id = c.dataset.w, btn = c.querySelector('[data-act=manage]');
  return { id, energy: c.querySelector('.meta')?.textContent, state: c.querySelector('.st')?.textContent, caption: c.querySelector(`#cap-${id}`)?.textContent ?? null,
    btnCooldown: btn.classList.contains('is-cooldown'), ariaDisabled: btn.getAttribute('aria-disabled'), describedby: btn.getAttribute('aria-describedby') }; }));
res.before = await read(); await p.screenshot({ path: `${DIR}/before-refill.png`, fullPage: true });
await p.locator('.wk[data-w=market_hand] [data-act=manage]').click(); await p.waitForTimeout(700);
res.afterRefill = await read(); await p.screenshot({ path: `${DIR}/after-refill-cooldown.png`, fullPage: true });
await p.waitForTimeout(5000); res.after6s = await read();
await p.waitForTimeout(27000); res.afterCooldown = await read(); await p.screenshot({ path: `${DIR}/after-cooldown-ended.png`, fullPage: true });
res.errors = errs; writeFileSync(`${DIR}/result.json`, JSON.stringify(res, null, 2)); console.log(JSON.stringify(res, null, 1)); await br.close();
