// Shared helpers for the S2 (session 2) QA scripts. Usage pattern as rc0: PORT=.. ENGINE=chromium|webkit HEADED=1 node <script> <worktree>
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
export async function setup(name) {
  const ROOT = process.argv[2], ENGINE = process.env.ENGINE ?? 'chromium', port = +(process.env.PORT ?? 4700), headed = process.env.HEADED === '1';
  const pw = createRequire(ROOT + '/package.json')('playwright-core');
  const OUT = process.env.OUT ?? `/workspace/egg-farm-studio/qa/m3-recheck/shots-${name}`; fs.mkdirSync(OUT, { recursive: true });
  const srv = spawn('npx', ['vite', 'preview', '--outDir', process.env.DIST ?? 'dist', '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true, cwd: ROOT });
  for (let i = 0; i < 80; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
  const URL = `http://127.0.0.1:${port}/`;
  { // served-bundle guard (stale-server false results): served index must name the worktree's built bundle
    const want = (fs.readFileSync(ROOT + '/' + (process.env.DIST ?? 'dist') + '/index.html', 'utf8').match(/index-[\w-]+\.js/) || [])[0], got = ((await (await fetch(URL)).text()).match(/index-[\w-]+\.js/) || [])[0];
    console.log(`BUNDLE served=${got} worktree=${want} port=${port}`); if (!want || got !== want) { console.error('served bundle mismatch: refusing to run'); try { process.kill(-srv.pid); } catch {} process.exit(3); } }
  { const served = await (await fetch(URL)).text(), local = fs.readFileSync(`${ROOT}/${process.env.DIST ?? 'dist'}/index.html`, 'utf8');
    if (served !== local) { console.log(`ABORT bundle mismatch on port ${port}: served index.html != ${ROOT}/${process.env.DIST ?? 'dist'}`); try { process.kill(-srv.pid); } catch {} process.exit(2); }
    console.log(`bundle ok: port ${port} serves ${ROOT}/${process.env.DIST ?? 'dist'} (${(served.match(/index-[\w-]+\.js/) ?? [''])[0]})`); }
  const fx = JSON.parse(fs.readFileSync(ROOT + '/tests/fixtures/saves/m2-rc1-v5-40min.json', 'utf8'));
  const br = ENGINE === 'webkit' ? await pw.webkit.launch({ headless: !headed }) : ENGINE === 'firefox' ? await pw.firefox.launch({ headless: !headed }) : await pw.chromium.launch({ headless: !headed, executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const R = []; const ok = (n, p, i) => { R.push({ n, pass: !!p, i }); console.log(`${p ? 'PASS' : 'FAIL'} [${ENGINE}${headed ? ' headed' : ''}] ${n}${i !== undefined ? ' — ' + JSON.stringify(i) : ''}`); };
  const UI = JSON.stringify({ onboardingDone: true, sessions: 3, seenSlots: 99, workersIntroA: true, workersIntroB: true });
  // patch: object merged into fixture state; awayMs: savedAt offset (0 = no offline popup)
  async function open({ patch = {}, awayMs = 0, width = 375, height = 812, keepWelcome = false, dsf = 1 } = {}) {
    const save = JSON.stringify({ ...fx, savedAt: Date.now() - awayMs, state: { ...fx.state, ...patch } });
    const ctx = await br.newContext({ viewport: { width, height }, deviceScaleFactor: dsf }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(String(e)));
    await p.addInitScript(([raw, ui]) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('eggfarm.save', raw); localStorage.setItem('eggfarm.ui', ui); sessionStorage.setItem('s', '1'); } }, [save, UI]);
    await p.goto(URL); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm); await p.waitForTimeout(600);
    if (!keepWelcome) for (const s of ['#wbCollect', '.modal button.btn']) { const l = p.locator(s).first(); if (await l.isVisible().catch(() => false)) { await l.click().catch(() => {}); await p.waitForTimeout(300); } }
    return { ctx, p, errs };
  }
  const done = async () => { await br.close(); try { process.kill(-srv.pid); } catch {} fs.writeFileSync(`${OUT}/${name}-${ENGINE}.json`, JSON.stringify(R, null, 1)); const f = R.filter(r => !r.pass).length; console.log(`SUMMARY [${ENGINE}] ${name}: ${R.length - f}/${R.length} pass`); process.exit(0); };
  return { ROOT, ENGINE, OUT, ok, open, done, R };
}
// money text -> cents ("$1.2K" etc. is lossy; use state for exactness, text only for "did it drop")
export const st = p => p.evaluate(() => { const s = window.eggfarm.state; return { coins: s.coinsCents, farm: s.farmLevel, coll: s.collectionLevel, basket: s.basket, workers: JSON.stringify(s.workers), grader: s.graderTier, header: document.getElementById('coins').textContent }; });
export const saved = p => p.evaluate(() => { try { const s = JSON.parse(localStorage.getItem('eggfarm.save')).state; return { coins: s.coinsCents, farm: s.farmLevel, coll: s.collectionLevel, workers: JSON.stringify(s.workers), grader: s.graderTier }; } catch (e) { return String(e); } });
