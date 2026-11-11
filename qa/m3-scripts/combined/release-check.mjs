// Release confirm on the RELEASE build. ENGINE=.. PORT=.. TAG=<tag or empty> SHA=<full sha> OUT=<dir> node release-check.mjs <clone>
// (1) GitHub latest release == TAG (public API; unreachable/404 is reported as N/A/NOTE)  (2) tag commit == SHA == in-game build hash (Settings)
// (3) fresh game plays collect -> sell -> upgrade, then save/reload keeps it.
import { createRequire } from 'node:module'; import { spawn, execFileSync } from 'node:child_process'; import fs from 'node:fs';
const ROOT = process.argv[2], ENGINE = process.env.ENGINE ?? 'chromium', port = +process.env.PORT, DIST = process.env.DIST ?? 'dist', TAG = process.env.TAG || '', SHA = process.env.SHA;
const pw = createRequire(ROOT + '/package.json')('playwright-core'); const R = [];
const ok = (n, c, i) => { R.push({ n, pass: !!c, i }); console.log(`${c ? 'PASS' : 'FAIL'} [${ENGINE}] ${n} — ${JSON.stringify(i)}`); };
const na = (n, why) => console.log(`N/A [${ENGINE}] ${n} — ${why}`);
if (port === 4927) { console.log('ABORT port 4927 reserved'); process.exit(2); }
try { await fetch(`http://127.0.0.1:${port}/`); console.log(`ABORT port ${port} busy, refusing`); process.exit(3); } catch {}
// (1) GitHub
// private repo: authenticate with GH_TOKEN/GITHUB_TOKEN, else `gh auth token` (non-interactive); never logs the token
const GHT = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || (() => { try { return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } })();
if (ENGINE === 'chromium') { let api;
  try { const r = await fetch('https://api.github.com/repos/PrincipalLewis/egg-farm/releases/latest', { headers: { 'User-Agent': 'egg-farm-qa', Accept: 'application/vnd.github+json', ...(GHT ? { Authorization: `Bearer ${GHT}` } : {}) }, signal: AbortSignal.timeout(10000) }); api = { status: r.status, body: r.ok ? await r.json() : null }; } catch (e) { api = { error: String(e).slice(0, 80) }; }
  if (api.error) na('GitHub releases/latest', `API unreachable (${api.error}); confirm "Latest" by hand`);
  else if (api.status !== 200) na('GitHub releases/latest', `HTTP ${api.status} (no token, or no published release); confirm "Latest" by hand`);
  else if (!TAG) na('tag marked Latest', `no --tag given; Latest is ${api.body.tag_name}`);
  else ok(`tag ${TAG} is marked Latest on GitHub`, api.body.tag_name === TAG && !api.body.draft && !api.body.prerelease, { latest: api.body.tag_name, draft: api.body.draft, prerelease: api.body.prerelease });
  if (TAG) { let tc = null; try { tc = execFileSync('git', ['-C', ROOT, 'rev-parse', `${TAG}^{commit}`], { encoding: 'utf8' }).trim(); } catch {}
    ok(`tag ${TAG} commit == checked SHA`, tc === SHA, { tag: tc, sha: SHA }); } else na('tag commit == SHA', 'no --tag given (pre-tag dry run)'); }
// (2)(3) browser
const srv = spawn('npx', ['vite', 'preview', '--outDir', DIST, '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true, cwd: ROOT });
const URL = `http://127.0.0.1:${port}/`; for (let i = 0; i < 80; i++) { try { await fetch(URL); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
const kill = () => { try { process.kill(-srv.pid); } catch {} };
{ const s = await (await fetch(URL)).text(); if (s !== fs.readFileSync(`${ROOT}/${DIST}/index.html`, 'utf8')) { console.log('ABORT served bundle mismatch'); kill(); process.exit(2); } console.log(`bundle ok: ${port} serves ${ROOT}/${DIST} ${(s.match(/index-[\w-]+\.js/) ?? [''])[0]}`); }
const br = ENGINE === 'webkit' ? await pw.webkit.launch() : ENGINE === 'firefox' ? await pw.firefox.launch() : await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
try {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const errs = [];
  // fresh save, FTUE marked done (coach marks would intercept taps); same UI flags as the other QA scripts
  await p.addInitScript(ui => { if (!sessionStorage.getItem('qa')) { localStorage.setItem('eggfarm.ui', ui); sessionStorage.setItem('qa', '1'); } }, JSON.stringify({ onboardingDone: true, sessions: 3, seenSlots: 99, workersIntroA: true, workersIntroB: true }));
  p.setDefaultTimeout(5000); p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL); await p.getByText('Tap to start').click(); await p.waitForTimeout(800);
  const skip = async () => { for (const s of ['#wbCollect', '.modal button.btn']) { const l = p.locator(s).first(); if (await l.isVisible().catch(() => false)) await l.click().catch(() => {}); } };
  await skip();
  await p.locator('#settings').click(); await p.waitForTimeout(400);
  const ver = await p.evaluate(() => [...document.querySelectorAll('.version')].map(e => e.textContent).find(t => /Egg Farm/.test(t)) ?? null);
  const h = (ver ?? '').match(/\+([0-9a-f]{7,})/)?.[1];
  ok('in-game build hash (Settings) == SHA, not dirty', !!h && SHA.startsWith(h) && !/dirty/.test(ver), { ver, sha: SHA.slice(0, 12) });
  await p.keyboard.press('Escape'); await p.locator('#p-settings .close, .panel.open .close, [aria-label=Close]').first().click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(300); await skip();
  const sv = () => p.evaluate(() => { try { const s = JSON.parse(localStorage.getItem('eggfarm.save')).state; return { coins: s.coinsCents, F: s.farmLevel, C: s.collectionLevel, basket: s.basket }; } catch { return null; } });
  let collected = 0, sold = false, upgraded = false; const t0 = Date.now(); const s0 = await sv();
  const close = async () => { await p.keyboard.press('Escape').catch(() => {}); for (const c of await p.locator('.panel.open .close, #panel-layer.open .close, #p-market .close, #p-upgrades .close').all()) await c.click({ timeout: 800, force: true }).catch(() => {}); await p.waitForTimeout(250); };
  const cb = await p.locator('#collect').boundingBox();
  while (Date.now() - t0 < 120000 && !(sold && upgraded)) {
    for (let i = 0; i < 6; i++) { await p.mouse.click(cb.x + cb.width / 2, cb.y + cb.height / 2); collected++; await p.waitForTimeout(150); }
    const chip = p.locator('.queue .chip:not(.empty):not(.served)').first();
    if (await chip.isVisible().catch(() => false)) { await chip.click({ timeout: 1500, force: true }).catch(() => {}); await p.waitForTimeout(300);
      const sa = p.locator('#sellAll'); if (await sa.isVisible().catch(() => false) && await sa.getAttribute('aria-disabled') !== 'true') { await sa.click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(300); }
      await close(); }
    const cents = await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('eggfarm.save')).state.coinsCents; } catch { return 0; } });
    const coins = await p.evaluate(() => document.getElementById('coins')?.textContent?.trim());
    if (!sold && ((coins && !/^\$?0(\.00)?$/.test(coins)) || cents > 0)) sold = true;
    if (sold && !upgraded) { await close(); if (await p.locator('#p-market').isVisible().catch(() => false)) await p.locator('[data-nav=market]').click({ timeout: 1500, force: true }).catch(() => {}); await p.waitForTimeout(250); // 390px: Market panel covers the nav; close it first
      await p.locator('[data-nav=upgrades]').click({ timeout: 1500, force: true }).catch(() => {}); await p.waitForTimeout(400);
      const b = p.locator('#uRow button[data-kind][aria-disabled=false], #uRow button[data-kind].affordable').first(); if (await b.isVisible().catch(() => false)) { await b.click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(400); upgraded = true; }
      await close(); await skip(); }
  }
  await p.waitForTimeout(6000); const s1 = await sv(); // allow autosave
  ok('collect -> sell -> upgrade on a fresh release game', collected > 0 && sold && upgraded && s1 && (s1.F + s1.C) > (s0 ? s0.F + s0.C : 0), { collected, sold, upgraded, s0, s1, secs: (Date.now() - t0) / 1000 });
  await p.evaluate(() => window.dispatchEvent(new Event('pagehide'))).catch(() => {}); await p.reload(); await p.getByText('Tap to start').click().catch(() => {}); await p.waitForTimeout(1000); await skip();
  const s2 = await sv(); const hdr = await p.evaluate(() => document.getElementById('coins')?.textContent);
  ok('save/reload keeps levels and money', s2 && s1 && s2.F === s1.F && s2.C === s1.C && s2.coins >= s1.coins - 100, { s1, s2, hdr });
  const g = await p.evaluate(() => { const f = document.createElement('iframe'); document.body.appendChild(f); const base = new Set(Object.getOwnPropertyNames(f.contentWindow)); f.remove(); return Object.getOwnPropertyNames(window).filter(k => !base.has(k) && /eggfarm/i.test(k)); });
  ok('release globals only eggfarmExportTelemetry', g.length === 1 && g[0] === 'eggfarmExportTelemetry', g);
  ok('no page errors', errs.length === 0, errs.slice(0, 3)); await ctx.close();
} catch (e) { ok('release check (script error)', false, String(e).slice(0, 200)); }
await br.close(); kill(); fs.mkdirSync(process.env.OUT ?? '/tmp', { recursive: true }); fs.writeFileSync(`${process.env.OUT ?? '/tmp'}/release-${ENGINE}.json`, JSON.stringify(R, null, 1));
console.log(`SUMMARY [${ENGINE}] release: ${R.filter(r => r.pass).length}/${R.length} pass`); process.exit(0);
