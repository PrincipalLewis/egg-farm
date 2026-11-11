// Golden-2 empirical probe (PR #1 @ab8f366 §4): a01faea single-file asset × tests/fixtures/saves, clock T0=fixture savedAt, saved at now=1792087260000.
import http from 'node:http'; import fs from 'node:fs'; import crypto from 'node:crypto'; import { createRequire } from 'node:module';
const ENGINE = process.env.ENGINE, PORT = +process.env.PORT; if (!PORT || PORT === 4173) process.exit(2);
const ASSET = '/workspace/egg-farm-studio/qa/m3-recheck/m4-guard-baseline-a01faea/dist-asset/index.html', html = fs.readFileSync(ASSET);
const FX = '/workspace/egg-farm-studio/game/tests/fixtures/saves/', FIX = ['m1-rc2-v4-12min', 'm2-rc1-v5-12min', 'm2-rc1-v5-40min', 'm2-rc1-v5-40min-edge'];
const T0 = 1792087200000, NOW = 1792087260000, sha = s => crypto.createHash('sha256').update(s).digest('hex');
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }); await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
const pw = createRequire('/workspace/egg-farm-studio/game/package.json')('playwright-core');
const br = await pw[ENGINE].launch(ENGINE === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {});
const U = `http://127.0.0.1:${PORT}/`, UI = JSON.stringify({ onboardingDone: true, sessions: 3, workersIntroA: true, workersIntroB: true }), out = { engine: ENGINE, port: PORT, asset_sha256: sha(html), results: [] };
try {
  { const c = await br.newContext(), p = await c.newPage(); await p.goto(U);
    out.build_id = await p.evaluate(() => { for (const s of document.scripts) { const m = s.textContent.match(/m3-rc1-pre\+[0-9a-f]{7,}(\+dirty)?/); if (m) return m[0]; } return null; });
    await c.close(); console.log('BUILD', out.build_id); if (!out.build_id?.includes('a01faea') || out.build_id.includes('dirty')) throw new Error('wrong build'); }
  for (const f of FIX) for (const rep of [1, 2]) { const raw = fs.readFileSync(FX + f + '.json', 'utf8');
    const c = await br.newContext({ viewport: { width: 390, height: 844 } }), p = await c.newPage(), errs = []; p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(String(e)));
    await p.clock.install({ time: T0 }); await p.goto(U); await p.evaluate(([r, u]) => { localStorage.clear(); localStorage.setItem('eggfarm.save', r); localStorage.setItem('eggfarm.ui', u); }, [raw, UI]);
    await p.goto(U); await p.clock.pauseAt(T0 + 5000);
    await p.getByText('Tap to start').click({ timeout: 5000 }).catch(() => {}); await p.clock.runFor(1000);
    for (const s of ['#wbCollect', '#modal-layer.open .btn']) { const b = p.locator(s).first(); if (await b.isVisible().catch(() => false)) await b.click().catch(() => {}); }
    const nowBefore = await p.evaluate(() => Date.now()); await p.clock.runFor(NOW - nowBefore);
    await p.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide')); }); await p.clock.runFor(0);
    const s = await p.evaluate(() => localStorage.getItem('eggfarm.save')), d = JSON.parse(s);
    const r = { fixture: f, rep, now: await p.evaluate(() => Date.now()), version: d.version, savedAt: d.savedAt, sha256: sha(s), bytes: s.length, hasM4: ['hensLevel', 'eggValueLevel', 'celebratedMilestones', 'tracksV7'].filter(k => k in d.state), coins: d.state.coinsCents, errs };
    out.results.push(r); console.log(JSON.stringify(r)); fs.writeFileSync(`${ENGINE}-${f}-r${rep}.json`, s); await c.close(); }
} finally { await br.close(); srv.close(); fs.writeFileSync(`${ENGINE}.json`, JSON.stringify(out, null, 1)); }
