// file:// check: node fileurl-v4.mjs <label> <launchMode: exe|channel>
import pw from '/workspace/egg-farm-studio/game/node_modules/playwright-core/index.mjs';
import fs from 'node:fs'; import path from 'node:path';
const [L, MODE] = process.argv.slice(2); const EV = path.dirname(new URL(import.meta.url).pathname);
const G = 'file://' + EV + '/fileurl/game.html', SEED = 'file://' + EV + '/fileurl/seed.html';
const opts = { headless: true, args: ['--no-sandbox'], viewport: { width: 390, height: 844 }, ...(MODE === 'channel' ? { channel: 'chrome' } : { executablePath: '/usr/bin/google-chrome' }) };
const out = []; const ok = (n, p, i) => { out.push({ n, p: !!p, i }); console.log(`${p ? 'PASS' : 'FAIL'} [${L} file://] ${n} — ${JSON.stringify(i)}`); };
const errs = [], ext = [];
async function open(dir) { const ctx = await pw.chromium.launchPersistentContext(dir, opts);
  await ctx.route('**/*', r => { const u = r.request().url(); if (u.startsWith('file:') || u.startsWith('data:') || u.startsWith('blob:')) return r.continue(); ext.push(u); r.abort(); });
  const p = ctx.pages()[0] ?? await ctx.newPage(); p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push('console: ' + m.text())); return { ctx, p }; }
const start = async p => { await p.goto(G); await p.getByText('Tap to start').click({ timeout: 15000 }).catch(() => {}); await p.waitForTimeout(2500); };
const st = p => p.evaluate(() => { try { const d = JSON.parse(localStorage.getItem('eggfarm.save')); return { v: d.version, savedAt: d.savedAt, coins: d.state.coinsCents, farm: d.state.farmLevel, coll: d.state.collectionLevel }; } catch { return null; } });
const storage = p => p.evaluate(async () => { const ls = Object.keys(localStorage).sort(); let idb;
  try { if (!('indexedDB' in window)) idb = { available: false, why: 'no_global' }; else { const dbs = indexedDB.databases ? await indexedDB.databases() : 'n/a';
    const t = await new Promise(res => { const r = indexedDB.open('__qa_probe'); r.onsuccess = () => { r.result.close(); indexedDB.deleteDatabase('__qa_probe'); res('open ok'); }; r.onerror = () => res('open error: ' + r.error?.name); setTimeout(() => res('timeout'), 3000); });
    idb = { available: t === 'open ok', probe: t, databases: dbs }; } } catch (e) { idb = { available: false, why: e.name + ': ' + e.message }; }
  const tel = localStorage.getItem('eggfarm.telemetry') ?? ''; return { origin: location.origin, ls, idb, idbEvents: (tel.match(/save_backup_idb[a-z_]*|idb_[a-z_]+/g) || []).filter((v, i, a) => a.indexOf(v) === i) }; });
const sh = (p, n) => p.screenshot({ path: `${EV}/shots/fileurl-${L}-${n}.png` });
const dir1 = fs.mkdtempSync('/tmp/qa-fileurl-' + L + '-');
// 1-4 on fresh persistent profile
{ let { ctx, p } = await open(dir1); await start(p);
  const b = await p.evaluate(() => (localStorage.getItem('eggfarm.telemetry') ?? '').match(/"build":"([^"]+)"/)?.[1] ?? null); await sh(p, 'boot');
  ok('1 loads, build id', b === 'm3-rc1-pre+7d52952', { build: b });
  await p.locator('.onb-skip').click({ timeout: 3000 }).catch(() => {});
  let collected = 0, sold = false, bought = false, log = [];
  for (let i = 0; i < 90 && !(sold && bought); i++) { await p.waitForTimeout(1000);
    if (await p.locator('#collect').click({ timeout: 800 }).then(() => true).catch(() => false)) collected++;
    if (i % 5 === 4 && !sold) { await p.locator('[data-nav=market]').click({ timeout: 1000 }).catch(() => {}); await p.waitForTimeout(300);
      const btn = p.locator('.sheet:not([hidden]) button[data-id]').first();
      if (await btn.count()) { await btn.click({ timeout: 1000 }).catch(() => {}); await p.waitForTimeout(300); const s = await st(p); if (s && s.coins > 0) { sold = true; log.push('sold@' + i); } }
      await p.locator('.sheet:not([hidden]) .close').click({ timeout: 1000 }).catch(() => {}); }
    if (sold && !bought && i % 5 === 2) { await p.locator('[data-nav=upgrades]').click({ timeout: 1000 }).catch(() => {}); await p.waitForTimeout(300);
      const bb = p.locator('.sheet:not([hidden]) .btn.buy:not([disabled]):not([aria-disabled=true])').first();
      if (await bb.count()) { const s0 = await st(p); await bb.click({ timeout: 1000 }).catch(() => {}); await p.waitForTimeout(1500); const s1 = await st(p);
        if (s0 && s1 && (s1.coll > s0.coll || s1.farm > s0.farm || s1.coins < s0.coins)) { bought = true; log.push('bought@' + i); } }
      await p.locator('.sheet:not([hidden]) .close').click({ timeout: 1000 }).catch(() => {}); } }
  await p.waitForTimeout(2500); const before = await st(p); await sh(p, 'coreloop');
  ok('2 core loop collect/sell/buy', collected > 0 && sold && bought, { collected, sold, bought, log, before });
  const stor1 = await storage(p);
  await p.reload(); await p.getByText('Tap to start').click({ timeout: 15000 }).catch(() => {}); await p.waitForTimeout(2500); const afterReload = await st(p);
  const same = (a, b) => a && b && a.farm === b.farm && a.coll === b.coll && a.coins >= b.coins;
  ok('3 save survives reload (+storage inspection)', same(afterReload, before) && stor1.ls.includes('eggfarm.save'), { before, afterReload, storage: stor1 });
  // settings label
  await p.locator('#settings').click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(800);
  const lbl = await p.evaluate(() => (document.body.innerText.match(/Egg Farm m3[^\n]*/) || [])[0] ?? null); await sh(p, 'settings');
  ok('6 Settings build label', lbl && lbl.includes('m3-rc1-pre+7d52952'), { label: lbl });
  await p.locator('.sheet:not([hidden]) .close').click({ timeout: 1000 }).catch(() => {}); await p.waitForTimeout(1500);
  const lastSaved = await st(p); await ctx.close();
  ({ ctx, p } = await open(dir1)); await start(p); const reopened = await st(p); await sh(p, 'reopen');
  ok('4 close + reopen persistent context keeps progress', same(reopened, lastSaved), { lastSaved, reopened, storage: await storage(p) }); await ctx.close(); }
// 5 a01faea saves into fresh persistent profiles (seeded via sibling file:// page)
for (const name of ['v5mid', 'fresh']) { const dump = JSON.parse(fs.readFileSync(`${EV}/fixtures/a01faea-${name}-chromium.json`, 'utf8')); const src = JSON.parse(dump['eggfarm.save']);
  const want = { coins: src.state.coinsCents, farm: src.state.farmLevel, coll: src.state.collectionLevel };
  const dir = fs.mkdtempSync('/tmp/qa-fileurl-' + L + '-' + name + '-'); let { ctx, p } = await open(dir);
  await p.goto(SEED); await p.evaluate(o => { localStorage.clear(); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, dump);
  await start(p); await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(6000); const s1 = await st(p);
  const rec = await p.evaluate(() => !!document.querySelector('.recovery-layer:not([hidden])')); await sh(p, 'a01faea-' + name);
  await ctx.close(); ({ ctx, p } = await open(dir)); await start(p); const s2 = await st(p); await ctx.close();
  const good = s => s && s.farm === want.farm && s.coll === want.coll && s.coins >= want.coins && s.savedAt > src.savedAt;
  ok(`5 a01faea save (${name}) no loss incl. close+reopen`, good(s1) && good(s2) && !rec, { want, afterBoot: s1, afterReopen: s2, recoveryDialog: rec });
  fs.rmSync(dir, { recursive: true, force: true }); }
ok('1b no console errors/pageerrors, no external requests (all sessions)', errs.length === 0 && ext.length === 0, { errs, ext });
fs.rmSync(dir1, { recursive: true, force: true });
fs.writeFileSync(`${EV}/result-fileurl-${L}.json`, JSON.stringify(out, null, 1));
