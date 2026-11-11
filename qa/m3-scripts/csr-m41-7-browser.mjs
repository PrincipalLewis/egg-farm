// M41-7 CSR real-browser skeleton (spec m41-final 6131c290…). Saves QA 2026-10-22.
// usage: flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node csr-m41-7-browser.mjs <worktree> <engine> <port 5961-5964> <outdir> [expectSha7]
// Serves <worktree>/dist-qa (vite preview, strictPort, 127.0.0.1). Fresh context per scenario. Seeds LS + IndexedDB on the
// game origin BEFORE "Tap to start" (init script, awaited). TARGET assertions = spec; at dd223f5 most fail (negative control).
// Kills only the preview server it started. Never :4173.
import { chromium, firefox, webkit } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const [W, E = 'chromium', P = '5961', OUT, SHA7 = ''] = process.argv.slice(2);
if (!['5961', '5962', '5963', '5964'].includes(P)) throw new Error('port must be 5961-5964');
const FX = '/workspace/egg-farm-studio/qa/m41/csr-fixtures/'; fs.mkdirSync(OUT, { recursive: true });
const raw = n => fs.readFileSync(FX + 'raw/' + n, 'utf8'); const man = n => JSON.parse(fs.readFileSync(`/workspace/egg-farm-studio/qa/csr/fixtures/idb1/${n}.manifest.json`, 'utf8'));
const COPY = { M1: ['Your farm is back!', 'We fixed a hiccup and restored your latest save.', 'Continue'], M3: ['A fresh start', "We couldn't recover your save, so we started a new farm for you.", 'Start farming'], M2: ['Your farm is back!', null, 'Continue'] };
const fmtAge = ms => { const m = Math.floor(ms / 60000), h = Math.floor(ms / 3600000), d = Math.floor(ms / 86400000); return ms < 300000 ? 'a few minutes' : m < 60 ? `${m} minute${m === 1 ? '' : 's'}` : h < 48 ? `about ${h} hour${h === 1 ? '' : 's'}` : `${d} day${d === 1 ? '' : 's'}`; };
const v6age = JSON.parse(JSON.parse(raw('V6B-valid-unmarked-F12-T-3h.json')).raw).savedAt;
const SC = [
  { id: 'IDB1-abc', m: man('IDB1-abc'), want: { notice: 'M3', store: 'idb', reason: 'invalid_state', idbCorrupt: 1 } },
  { id: 'IDB1-truncated', m: man('IDB1-truncated'), want: { notice: 'M3', store: 'idb', reason: 'parse', idbCorrupt: 1, idbMainKept: true } },
  { id: 'IDB1-wrongtype-version-string', m: man('IDB1-wrongtype-version-string'), want: { notice: 'M3', store: 'idb', reason: 'wrong_type', idbCorrupt: 1, idbMainKept: true } },
  { id: 'IDB1-nonstring-object', m: man('IDB1-nonstring-object'), want: { notice: 'M3', store: 'idb', reason: 'wrong_type', idbCorrupt: 1, idbMainKept: true } },
  { id: 'CSR3-B1', ls: { 'eggfarm.save': raw('MAIN-OQ1-abc.json') }, idb: { main: raw('IDB-valid-F17-seq4-T-10m.json') }, want: { notice: 'M1', store: 'ls', recovered_from: 'idb', F: 17 } },
  { id: 'CSR11-all-invalid', ls: { 'eggfarm.save': raw('MAIN-OQ1-abc.json'), 'eggfarm.save.bak': raw('BAK-invalid-neg1.json'), 'eggfarm.save.v6_backup': raw('V6B-invalid-raw-abc.json') }, idb: { main: raw('IDB-invalid-truncated.raw') }, want: { notice: 'M3', store: 'ls', recovered_from: 'none', layout: true } },
  { id: 'CSR9a-age', ls: { 'eggfarm.save': raw('TRIG-parse-truncated.raw'), 'eggfarm.save.v6_backup': raw('V6B-valid-unmarked-F12-T-3h.json') }, idb: {}, want: { notice: 'M2', store: 'ls', recovered_from: 'v6_backup', body: () => `We restored a save from ${fmtAge(Date.now() - v6age)} ago.` } },
  { id: 'CSR9a-level', ls: { 'eggfarm.save': raw('MAIN-L17-badsum.json'), 'eggfarm.save.v6_backup': raw('V6B-valid-unmarked-F12-T-3h.json') }, idb: {}, want: { notice: 'M2', store: 'ls', recovered_from: 'v6_backup', body: () => 'We restored an earlier save, from Farm level 12.' } },
  { id: 'CONTROL-valid-no-dialog', ls: { 'eggfarm.save': raw('BAK-valid-F20-seq4-older.json') }, idb: {}, want: { noDialog: true } },
];
const INIT = async ({ ls, recs }) => {
  if (sessionStorage.getItem('qa.seeded')) return; localStorage.clear(); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v);
  window.__seeded = (async () => { await new Promise(r => { const d = indexedDB.deleteDatabase('eggfarm'); d.onsuccess = d.onerror = d.onblocked = r; });
    if (recs.length) { const db = await new Promise((res, rej) => { const r = indexedDB.open('eggfarm', 1); r.onupgradeneeded = () => r.result.createObjectStore('save'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      await new Promise((res, rej) => { const t = db.transaction('save', 'readwrite'); for (const [k, v] of recs) t.objectStore('save').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); db.close(); }
    sessionStorage.setItem('qa.seeded', '1'); })();
};
const idbDump = p => p.evaluate(() => new Promise(res => { const r = indexedDB.open('eggfarm', 1); r.onupgradeneeded = () => r.result.createObjectStore('save'); r.onsuccess = () => { const db = r.result, t = db.transaction('save', 'readonly'), os = t.objectStore('save'), out = {}; const c = os.openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { out[cur.key] = typeof cur.value === 'string' ? cur.value : { nonstring: JSON.stringify(cur.value) }; cur.continue(); } else { db.close(); res(out); } }; }; r.onerror = () => res({ error: String(r.error) }); }));
const srv = spawn(`${W}/node_modules/.bin/vite`, ['preview', '--outDir', 'dist-qa', '--port', P, '--strictPort', '--host', '127.0.0.1'], { cwd: W, stdio: 'ignore', detached: true });
const res = { engine: E, port: P, scenarios: {} }; let fails = 0;
try {
  for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${P}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
  const br = await { chromium, firefox, webkit }[E].launch(E === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : E === 'firefox' ? { executablePath: '/home/box/.cache/ms-playwright/firefox-1555/firefox/firefox' } : { executablePath: '/home/box/.cache/ms-playwright/webkit-2370/pw_run.sh' });
  for (const sc of SC) for (const vw of sc.want.layout ? [360, 1280] : [390]) {
    const tag = `${sc.id}@${vw}`; const r = (res.scenarios[tag] = { checks: [] }); const ok = (n, c, v) => { r.checks.push({ n, pass: !!c, v }); if (!c) fails++; console.log(`${c ? 'PASS' : 'FAIL'} ${tag}: ${n} ${JSON.stringify(v ?? '').slice(0, 160)}`); };
    const ctx = await br.newContext({ viewport: { width: vw, height: vw === 360 ? 740 : 800 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    const ls = sc.m ? sc.m.localStorage.set : sc.ls; const recs = sc.m ? sc.m.idb.records.map(x => [x.key, x.value]) : (sc.idb.main ? [['main', sc.idb.main]] : []);
    await p.addInitScript(INIT, { ls, recs });
    try {
      await p.goto(`http://127.0.0.1:${P}/`); await p.evaluate(() => window.__seeded); const before = await idbDump(p);
      await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm, null, { timeout: 15000 });
      if (!res.buildId) { res.buildId = await p.evaluate(() => document.querySelector('meta[name="build-id"]')?.content ?? null); ok('runtime build-id', !SHA7 || (res.buildId ?? '').endsWith('+' + SHA7), res.buildId); }
      const dlg = await p.locator('.recovery-layer').waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false);
      await p.screenshot({ path: `${OUT}/${tag}-1.png` });
      if (sc.want.noDialog) ok('no recovery dialog', !dlg, dlg);
      else {
        ok('recovery dialog shown (not silent)', dlg, dlg);
        if (dlg) { const t = await p.locator('#rcT').innerText(), b = await p.locator('#rcB').innerText(), g = await p.locator('#rcGo').innerText(); r.copy = { t, b, g };
          const c = COPY[sc.want.notice]; ok(`${sc.want.notice} title`, t === c[0], t); if (c[1]) ok(`${sc.want.notice} body`, b === c[1], b); ok(`${sc.want.notice} button`, g === c[2], g);
          if (sc.want.body) ok('M2 body', b === sc.want.body(), b);
          if (sc.want.layout) await p.evaluate(async () => { const L = document.querySelector('.recovery-layer'); await Promise.race([Promise.all(L.getAnimations({ subtree: true }).filter(a => (a.effect?.getTiming?.().iterations ?? 1) !== Infinity).map(a => a.finished.catch(() => null))), new Promise(r => setTimeout(r, 3000))]); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }); // settle the entrance animation before geometry
          if (sc.want.layout) { const L = await p.evaluate(() => { const q = s => document.querySelector(s)?.getBoundingClientRect(); const card = document.querySelector('.recovery-card'), body = document.querySelector('#rcB'); const lh = parseFloat(getComputedStyle(body).lineHeight) || 22.4;
              return { cardW: q('.recovery-card')?.width, go: q('#rcGo'), ex: q('#rcExport'), bodyLines: Math.round(body.getBoundingClientRect().height / lh), overflowX: card.scrollWidth > card.clientWidth, focused: document.activeElement?.id }; });
            r.layout = L; ok('card width min(440, vw-48)', Math.abs(L.cardW - Math.min(440, vw - 48)) <= 1, L.cardW); ok('primary >= 48px tall', L.go?.height >= 48, L.go?.height);
            ok('export control present (corrupt copy exists)', !!L.ex, !!L.ex); if (L.ex) { ok('export >= 44px tall', L.ex.height >= 44, L.ex.height); ok('export hit area >= 120 wide', L.ex.width >= 120, L.ex.width); }
            if (vw === 360) ok('body <= 2 lines at 360', L.bodyLines <= 2, L.bodyLines); ok('no horizontal clipping', !L.overflowX, L.overflowX); ok('initial focus on primary', L.focused === 'rcGo', L.focused);
            await p.keyboard.press('Escape'); ok('Esc does not close', await p.locator('.recovery-layer').isVisible(), null); }
          await p.locator('#rcGo').click(); }
      }
      await p.evaluate(() => window.eggfarm?.save?.()); await p.waitForTimeout(400);
      const tel = await p.evaluate(() => JSON.parse(window.eggfarmExportTelemetry()).events); const sc0 = tel.filter(e => e.type === 'save_corrupt'); const sh = tel.filter(e => e.type === 'save_recovery_notice_shown'), di = tel.filter(e => e.type === 'save_recovery_notice_dismissed');
      r.telemetry = { save_corrupt: sc0, shown: sh, dismissed: di, save_restore: tel.filter(e => e.type === 'save_restore'), save_restored: tel.filter(e => e.type === 'save_restored').length };
      if (!sc.want.noDialog) { ok('save_corrupt x1', sc0.length === 1, sc0.length); ok(`save_corrupt.store=${sc.want.store}`, sc0[0]?.store === sc.want.store, sc0[0]?.store); if (sc.want.reason) ok(`reason=${sc.want.reason}`, sc0[0]?.reason === sc.want.reason, sc0[0]?.reason); if (sc.want.recovered_from) ok(`recovered_from=${sc.want.recovered_from}`, sc0[0]?.recovered_from === sc.want.recovered_from, sc0[0]?.recovered_from);
        ok('notice_shown x1', sh.length === 1, sh.length); ok('notice_dismissed x1', di.length === 1, di.length); ok(`notice=${sc.want.notice}`, sh[0]?.notice === sc.want.notice, sh[0]?.notice);
        ok('notice.store == save_corrupt.store (never defaulted)', sh.length === 1 && sh[0].store === sc0[0]?.store, [sh[0]?.store, sc0[0]?.store]); }
      else { ok('no save_corrupt', sc0.length === 0, sc0.length); ok('no notice events', sh.length === 0, sh.length); }
      ok('no save_restore on a corrupt boot', sc.want.noDialog || r.telemetry.save_restore.length === 0, r.telemetry.save_restore.length); ok('never save_restored', r.telemetry.save_restored === 0, r.telemetry.save_restored);
      if (sc.want.F !== undefined) { const F = await p.evaluate(() => window.eggfarm.state.farmLevel); ok(`farmLevel=${sc.want.F}`, F === sc.want.F, F); }
      const after = await idbDump(p); r.idb = { beforeKeys: Object.keys(before), afterKeys: Object.keys(after) };
      if (sc.want.idbCorrupt !== undefined) { const ks = Object.keys(after).filter(k => k.startsWith('corrupt.')); ok(`IDB corrupt.* == ${sc.want.idbCorrupt}`, ks.length === sc.want.idbCorrupt, ks);
        ok('IDB corrupt.* equals seeded main', ks.some(k => JSON.stringify(after[k]) === JSON.stringify(before.main)), null); }
      if (sc.want.idbMainKept !== undefined) r.idb.mainOverwrittenAfterSave = JSON.stringify(after.main) !== JSON.stringify(before.main);
      const real = errs; ok('no page errors', real.length === 0, real.slice(0, 2));
    } catch (e) { ok('no exception', false, String(e).slice(0, 300)); }
    await ctx.close();
  }
  await br.close();
} finally { try { process.kill(-srv.pid); } catch { /* gone */ } }
res.fails = fails; fs.writeFileSync(`${OUT}/result.json`, JSON.stringify(res, null, 1)); console.log(`DONE fails=${fails}`);
