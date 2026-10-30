// Art-c1 (HoE 2026-10-30 00:19): "the badge keeps its visual position". Shoots the bottom nav with the Upgrades count badge at
// N = 1 and 2 (360x800, 390x844, 1280x800) and measures the badge against the icon, for ANY checkout's dist-qa:
//   shoot:   (cd <checkout> && npm run build:qa && node <this repo>/scripts/m41-p2-nav-compare.mjs shoot <engine> <outDir>)
//   compare: node scripts/m41-p2-nav-compare.mjs compare <baseDir> <headDir>   (chromium decodes the PNGs; pixel diff per shot)
// Used to compare the #83 head against 1befa17 (badge still inside .nav-ic). Writes nav-<engine>.json (+ compare.json); exit 1 on a diff.
import { chromium, webkit, firefox } from 'playwright-core';
import { serveForRun } from './serve-own.mjs';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
const [mode, a1, a2] = process.argv.slice(2);
const launch = e => e === 'webkit' ? webkit.launch() : e === 'firefox' ? firefox.launch() : chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const SIZES = [[360, 800], [390, 844], [1280, 800]], SCENES = [[1, { market_hand: { energy: 0, cdS: 0 } }], [2, { market_hand: { energy: 0, cdS: 0 }, coop_hand: { energy: 0, cdS: 0 } }]];
if (mode === 'shoot') {
  const ENGINE = a1, OUT = a2; if (!['chromium', 'firefox', 'webkit'].includes(ENGINE) || !OUT) { console.error('usage: shoot <engine> <outDir>'); process.exit(2); }
  mkdirSync(OUT, { recursive: true }); const srv = await serveForRun('dist-qa', 'm41-p2-nav-compare'); const browser = await launch(ENGINE);
  const UI = JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false }), rows = [];
  for (const [w, h] of SIZES) for (const [n, ws] of SCENES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 600, reducedMotion: 'reduce' }), page = await ctx.newPage();
    await page.addInitScript(ui => localStorage.setItem('eggfarm.ui', ui), UI);
    await page.goto(srv.url, { waitUntil: 'domcontentloaded' }); await page.getByText('Tap to start').click(); await page.waitForFunction(() => window.eggfarm);
    await page.evaluate(ws => { document.getElementById('modal-layer')?.classList.remove('open'); const g = window.eggfarm;
      g.state = { ...g.state, seenTracksExplainer: true, collectionLevel: 20, farmLevel: 30, customers: [], nextCustomerInS: 1e9, graderTier: 1, manageCdS: 0, coinsCents: 0, workers: { market_hand: { energy: 90, cdS: 0 }, coop_hand: { energy: 90, cdS: 0 }, hawker: { energy: 90, cdS: 0 }, ...ws } };
      g.frame = () => {}; }, ws);
    await page.waitForTimeout(900);
    const m = await page.evaluate(() => { const up = document.querySelector('nav [data-nav=upgrades]'), bd = up.querySelector('.asleep-badge'), ic = up.querySelector('.nav-ic'), nav = document.querySelector('nav.actions');
      const R = e => { const b = e.getBoundingClientRect(); return { x: +b.left.toFixed(2), y: +b.top.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2) }; };
      return { navShown: nav.checkVisibility(), badgeShown: !!bd && bd.checkVisibility(), inIcon: !!bd && ic.contains(bd), text: bd?.textContent ?? null, badge: bd ? R(bd) : null, icon: R(ic), nav: R(nav), name: up.getAttribute('aria-label') }; });
    const file = `${ENGINE}-nav-n${n}-${w}.png`; let sha = null;
    if (m.navShown) { const clip = { x: 0, y: Math.max(0, Math.floor(m.nav.y) - 12), width: w, height: Math.ceil(m.nav.h) + 12 }; const buf = await page.screenshot({ path: `${OUT}/${file}`, clip }); sha = createHash('sha256').update(buf).digest('hex'); }
    rows.push({ engine: ENGINE, w, n, file: m.navShown ? file : null, sha256: sha, ...m }); await ctx.close();
  }
  await browser.close(); srv.stop();
  writeFileSync(`${OUT}/nav-${ENGINE}.json`, JSON.stringify({ head: execSync('git rev-parse HEAD').toString().trim(), buildId: srv.buildId, rows }, null, 1) + '\n');
  console.log(`m41-p2-nav-compare shoot [${ENGINE}] ${rows.length} scenes -> ${OUT}`);
} else if (mode === 'compare') {
  const [B, H] = [a1, a2]; const out = []; let diffs = 0; const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] }); const page = await browser.newPage();
  for (const f of readdirSync(B).filter(f => /^nav-\w+\.json$/.test(f))) { if (!existsSync(`${H}/${f}`)) { out.push({ f, missing: true }); diffs++; continue; }
    const b = JSON.parse(readFileSync(`${B}/${f}`, 'utf8')), h = JSON.parse(readFileSync(`${H}/${f}`, 'utf8'));
    for (const rb of b.rows) { const rh = h.rows.find(r => r.w === rb.w && r.n === rb.n); const geo = ['badge', 'icon', 'nav'].map(k => JSON.stringify(rb[k]) === JSON.stringify(rh[k]));
      let px = null; if (rb.file && rh.file) { const d = u => 'data:image/png;base64,' + readFileSync(u).toString('base64');
        px = await page.evaluate(async ([x, y]) => { const ld = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; }); const [i1, i2] = [await ld(x), await ld(y)];
          if (i1.width !== i2.width || i1.height !== i2.height) return { size: false }; const c = Object.assign(document.createElement('canvas'), { width: i1.width, height: i1.height }), g = c.getContext('2d');
          g.drawImage(i1, 0, 0); const p1 = g.getImageData(0, 0, c.width, c.height).data; g.clearRect(0, 0, c.width, c.height); g.drawImage(i2, 0, 0); const p2 = g.getImageData(0, 0, c.width, c.height).data;
          let n = 0; for (let k = 0; k < p1.length; k += 4) if (p1[k] !== p2[k] || p1[k + 1] !== p2[k + 1] || p1[k + 2] !== p2[k + 2] || p1[k + 3] !== p2[k + 3]) n++; return { size: true, diffPx: n, total: p1.length / 4 }; }, [d(`${B}/${rb.file}`), d(`${H}/${rh.file}`)]); }
      const same = geo.every(Boolean) && (px === null ? rb.file === rh.file : px.size && px.diffPx === 0) && rb.badgeShown === rh.badgeShown;
      if (!same) diffs++; out.push({ engine: rb.engine, w: rb.w, n: rb.n, same, badgeSame: geo[0], iconSame: geo[1], navSame: geo[2], px, base: { inIcon: rb.inIcon, badge: rb.badge, sha: rb.sha256, name: rb.name }, head: { inIcon: rh.inIcon, badge: rh.badge, sha: rh.sha256, name: rh.name } });
      console.log(`${same ? 'same' : 'DIFF'} ${rb.engine} ${rb.w} N=${rb.n} badge ${JSON.stringify(rb.badge)} -> ${JSON.stringify(rh.badge)} px ${px ? px.diffPx : 'n/a (nav not displayed)'}`); } }
  await browser.close(); writeFileSync(`${H}/compare.json`, JSON.stringify({ base: B, head: H, diffs, rows: out }, null, 1) + '\n'); console.log(`m41-p2-nav-compare: ${diffs} differences`); process.exitCode = diffs ? 1 : 0;
} else { console.error('usage: m41-p2-nav-compare.mjs shoot <engine> <outDir> | compare <baseDir> <headDir>'); process.exit(2); }
