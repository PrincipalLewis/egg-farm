// M41-7 dialog UI checks (Saves QA, 2026-10-22): tap targets settled vs mid-animation (strict CSS px: primary >= 48, Export >= 44),
// computed min-height, EXPORT_ARIA / WCAG 2.5.3 (aria-label starts with visible text), rendered M1-M5 strings vs art-ux/copy/csr9-recovery-copy.md.
// usage: flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node csr-m41-7-ui.mjs <worktree> <engine chromium|firefox|webkit> <port 5961-5964> <outdir> [sha7]
import { chromium, firefox, webkit } from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';
const [W0, E = 'chromium', P = '5961', OUT, SHA7 = ''] = process.argv.slice(2); const W = path.resolve(W0);
if (!['5961', '5962', '5963', '5964'].includes(P)) throw new Error('port must be 5961-5964'); fs.mkdirSync(OUT, { recursive: true });
const FX = '/workspace/egg-farm-studio/qa/m41/csr-fixtures/raw/'; const raw = n => fs.readFileSync(FX + n, 'utf8');
const EXPORT_ARIA = 'Export old save, downloads a copy of your old save file';
const ART = { // art-ux/copy/csr9-recovery-copy.md (sha256 8dec99cd…) incl. "Implementation confirmations"
  M1: { t: 'Your farm is back!', b: 'We fixed a hiccup and restored your latest save.', g: 'Continue', link: null },
  M1cf: { t: 'Your farm is back!', b: 'We fixed a hiccup and restored your latest save.', g: 'Continue', link: 'Export save file', aria: 'Export save file, downloads a copy of your old save file' },
  M2: { t: 'Your farm is back!', b: 'We restored an earlier save, from Farm level 12.', g: 'Continue', link: null },
  M3: { t: 'A fresh start', b: "We couldn't recover your save, so we started a new farm for you.", g: 'Start farming', link: 'Export old save file' },
  M4: { t: "Couldn't load your farm", b: "Your save is safe. Let's try that again.", g: 'Try again', link: 'Export save file', aria: 'Export save file, downloads a copy of your old save file', badge: '!' },
  M5: { t: 'Your farm is back!', b: 'Saving is paused on this device right now, so progress may not be kept.', g: 'Continue', link: 'Export save file', aria: 'Export save file, downloads a copy of your current farm', badge: '!' },
};
const CASES = [
  { id: 'M1', ls: { 'eggfarm.save': raw('MAIN-OQ1-abc.json'), 'eggfarm.save.bak': raw('BAK-valid-F20-seq4-older.json') } },
  { id: 'M1cf', note: 'M1 + corrupt.* copy write refused (copy_failed)', ls: { 'eggfarm.save': raw('MAIN-OQ1-abc.json'), 'eggfarm.save.bak': raw('BAK-valid-F20-seq4-older.json') }, failKey: '^eggfarm\\.save\\.corrupt' },
  { id: 'M2', ls: { 'eggfarm.save': raw('MAIN-L17-badsum.json'), 'eggfarm.save.v6_backup': raw('V6B-valid-unmarked-F12-T-3h.json') } },
  { id: 'M3', ls: { 'eggfarm.save': raw('MAIN-OQ1-abc.json'), 'eggfarm.save.bak': raw('BAK-invalid-neg1.json'), 'eggfarm.save.v6_backup': raw('V6B-invalid-raw-abc.json') } },
  { id: 'M4', note: 'defer: IDB open never answers (idb_timeout => unknown), no valid .bak', ls: { 'eggfarm.save': raw('MAIN-OQ1-abc.json'), 'eggfarm.save.bak': raw('BAK-invalid-neg1.json') }, idbHang: true },
  { id: 'M5', note: 'restored + lease write refused (QuotaExceededError)', ls: { 'eggfarm.save': raw('MAIN-OQ1-abc.json'), 'eggfarm.save.bak': raw('BAK-valid-F20-seq4-older.json') }, failKey: '^eggfarm\\.lease$' },
  { id: 'LEGACY-Q', note: 'corrupt main only + corrupt.* write refused (case Q / storage outcome)', ls: { 'eggfarm.save': raw('MAIN-OQ1-abc.json') }, failKey: '^eggfarm\\.save\\.corrupt' },
  { id: 'LEGACY-cantsave', note: 'valid save + lease write refused', ls: { 'eggfarm.save': raw('BAK-valid-F20-seq4-older.json') }, failKey: '^eggfarm\\.lease$' },
];
const INIT = ({ ls, failKey, idbHang }) => {
  const set = Storage.prototype.setItem; window.__samples = [];
  if (!sessionStorage.getItem('qa.seeded')) { localStorage.clear(); for (const [k, v] of Object.entries(ls)) set.call(localStorage, k, v); sessionStorage.setItem('qa.seeded', '1'); }
  window.__seeded = new Promise(r => { const d = indexedDB.deleteDatabase('eggfarm'); d.onsuccess = d.onerror = d.onblocked = () => r(); });
  if (idbHang) { const f = IDBFactory.prototype; const orig = f.open; f.open = function (n, v) { if (n === 'eggfarm') return {}; return orig.call(this, n, v); }; }
  if (failKey) { const re = new RegExp(failKey); Storage.prototype.setItem = function (k, v) { if (this === localStorage && re.test(k)) throw new DOMException('qa quota', 'QuotaExceededError'); return set.call(this, k, v); }; }
  // mid-animation timeline: from the moment the dialog is inserted, sample every frame for 1.2 s
  const mo = new MutationObserver(() => { const L = document.querySelector('.recovery-layer'); if (!L || window.__t0) return; window.__t0 = performance.now(); mo.disconnect();
    window.__transitionEnds = []; L.addEventListener('transitionend', e => window.__transitionEnds.push(`${e.target.id || e.target.className}:${e.propertyName}`), true);
    const tick = () => { const t = performance.now() - window.__t0; const r = s => { const e = L.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height * 100) / 100 : null; };
      const anims = L.getAnimations({ subtree: true }).map(a => `${a.animationName ?? a.transitionProperty ?? a.constructor.name}:${a.playState}`);
      window.__samples.push({ t: Math.round(t), go: r('#rcGo'), ex: r('#rcExport'), card: Math.round((L.querySelector('.recovery-card')?.getBoundingClientRect().width ?? 0) * 100) / 100, anims, docAnims: document.getAnimations().filter(a => a.playState === 'running').length });
      if (t < 1200) requestAnimationFrame(tick); };
    requestAnimationFrame(tick); });
  document.addEventListener('DOMContentLoaded', () => mo.observe(document.body, { childList: true, subtree: true }));
};
const srv = spawn(`${W}/node_modules/.bin/vite`, ['preview', '--outDir', 'dist-qa', '--port', P, '--strictPort', '--host', '127.0.0.1'], { cwd: W, stdio: 'ignore', detached: true });
const res = { engine: E, port: P, cases: {} }; let fails = 0;
try {
  for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${P}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
  const br = await { chromium, firefox, webkit }[E].launch(E === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : E === 'firefox' ? { executablePath: '/home/box/.cache/ms-playwright/firefox-1555/firefox/firefox' } : { executablePath: '/home/box/.cache/ms-playwright/webkit-2370/pw_run.sh' });
  for (const c of CASES) for (const vw of [360, 375, 390]) {
    const tag = `${c.id}@${vw}`; const r = (res.cases[tag] = { note: c.note, checks: [] });
    const ok = (n, v, x, blocking = true) => { r.checks.push({ n, pass: !!v, x, blocking }); if (!v && blocking) fails++; console.log(`${v ? 'PASS' : blocking ? 'FAIL' : 'INFO'} ${tag}: ${n} ${JSON.stringify(x ?? '').slice(0, 200)}`); };
    const ctx = await br.newContext({ viewport: { width: vw, height: 740 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    try {
      await p.addInitScript(INIT, { ls: c.ls, failKey: c.failKey ?? null, idbHang: !!c.idbHang });
      await p.goto(`http://127.0.0.1:${P}/`); await p.evaluate(() => window.__seeded);
      if (!res.buildId) res.buildId = await p.evaluate(() => document.querySelector('meta[name="build-id"]')?.content ?? null);
      await p.getByText('Tap to start').click();
      const shown = await p.locator('.recovery-layer').waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false); ok('dialog shown', shown, shown);
      if (!shown) { await p.screenshot({ path: `${OUT}/${tag}.png` }); await ctx.close(); continue; }
      // settle: recovery-layer finite animations finished + (transitionend or no running transition), max 3 s
      r.settle = await p.evaluate(async () => { const L = document.querySelector('.recovery-layer'); const t0 = performance.now();
        const fin = L.getAnimations({ subtree: true }).filter(a => (a.effect?.getTiming?.().iterations ?? 1) !== Infinity).map(a => a.finished.catch(() => null));
        await Promise.race([Promise.all(fin), new Promise(r => setTimeout(r, 3000))]);
        while (performance.now() - t0 < 3000 && L.getAnimations({ subtree: true }).some(a => a.playState === 'running' && (a.effect?.getTiming?.().iterations ?? 1) !== Infinity)) await new Promise(r => requestAnimationFrame(r));
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        return { waitedMs: Math.round(performance.now() - t0), running: L.getAnimations({ subtree: true }).filter(a => a.playState === 'running').map(a => a.animationName ?? a.transitionProperty), transitionEnds: window.__transitionEnds, docRunningInfinite: document.getAnimations().filter(a => a.playState === 'running').length }; });
      await p.waitForTimeout(1300); // let the 1.2 s sampler finish
      const m = await p.evaluate(() => { const L = document.querySelector('.recovery-layer'); const q = s => { const e = L.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(), cs = getComputedStyle(e);
          return { h: b.height, w: b.width, minHeight: cs.minHeight, display: cs.display, text: e.textContent.trim(), aria: e.getAttribute('aria-label') }; };
        return { outcome: L.dataset.outcome ?? null, variant: L.dataset.variant ?? null, notice: L.dataset.notice ?? null, t: L.querySelector('#rcT')?.textContent, b: L.querySelector('#rcB')?.textContent,
          go: q('#rcGo'), ex: q('#rcExport'), card: L.querySelector('.recovery-card')?.getBoundingClientRect().width, badge: L.querySelector('.rc-badge')?.textContent, badgeClass: L.querySelector('.rc-badge')?.className, icon: L.querySelector('.rc-icon img')?.getAttribute('src'),
          allExportAria: [...document.querySelectorAll('button')].filter(b => /export/i.test(b.textContent + (b.getAttribute('aria-label') ?? ''))).map(b => ({ text: b.textContent.trim(), aria: b.getAttribute('aria-label') })) }; });
      r.settled = m; r.samples = await p.evaluate(() => window.__samples);
      const mid = r.samples.filter(s => s.go !== null); r.mid = { n: mid.length, goMin: Math.min(...mid.map(s => s.go)), goMax: Math.max(...mid.map(s => s.go)), exMin: mid.some(s => s.ex !== null) ? Math.min(...mid.filter(s => s.ex !== null).map(s => s.ex)) : null, cardRange: [Math.min(...mid.map(s => s.card)), Math.max(...mid.map(s => s.card))], first: mid[0], animsSeen: [...new Set(mid.flatMap(s => s.anims))] };
      await p.screenshot({ path: `${OUT}/${tag}.png` });
      ok(`settled primary >= 48 CSS px (h=${m.go?.h}, min-height ${m.go?.minHeight})`, (m.go?.h ?? 0) >= 48, m.go?.h);
      if (m.ex) ok(`settled Export >= 44 CSS px (h=${m.ex.h}, min-height ${m.ex.minHeight})`, m.ex.h >= 44, m.ex.h);
      ok('mid-animation: primary height never < 48 in any frame', r.mid.goMin >= 48, { goMin: r.mid.goMin, goMax: r.mid.goMax, frames: r.mid.n, anims: r.mid.animsSeen }, false);
      if (m.ex) ok('mid-animation: Export height never < 44 in any frame', (r.mid.exMin ?? 0) >= 44, { exMin: r.mid.exMin }, false);
      // EXPORT_ARIA / WCAG 2.5.3
      for (const b of m.allExportAria) ok(`aria-label starts with visible text "${b.text}"`, (b.aria ?? b.text).startsWith(b.text), b.aria);
      const isCsr = !!m.notice && !c.id.startsWith("LEGACY-"); r.isCsr9 = isCsr;
      if (isCsr) ok('EXPORT_ARIA never on CSR-9 copy', !m.allExportAria.some(b => b.aria === EXPORT_ARIA), m.allExportAria);
      else ok('legacy dialog (no data-notice): EXPORT_ARIA/visible "Export old save" recorded', true, { outcome: m.outcome, variant: m.variant, export: m.allExportAria }, false);
      // copy vs art-ux
      const a = ART[c.id]; if (a) { ok(`${c.id} rendered = CSR-9 dialog (data-notice ${m.notice})`, isCsr && m.notice === c.id.replace('cf', ''), m.notice);
        ok('title = art', m.t === a.t, m.t); ok('body = art', m.b === a.b, m.b); ok('button = art', m.go?.text === a.g, m.go?.text);
        ok(`export link = art (${a.link ?? 'none'})`, (m.ex?.text ?? null) === a.link, m.ex?.text ?? null); if (a.aria) ok('export aria = art confirmation', m.ex?.aria === a.aria, m.ex?.aria);
        if (a.badge) ok(`badge "${a.badge}" warn, coop icon (never red)`, m.badge === a.badge && /warn/.test(m.badgeClass ?? '') && /coop/.test(m.icon ?? ''), { badge: m.badge, cls: m.badgeClass, icon: m.icon }); }
      ok('no page errors', errs.length === 0, errs.slice(0, 2));
    } catch (e) { ok('no exception', false, String(e).slice(0, 300)); }
    await ctx.close();
  }
  await br.close();
} finally { try { process.kill(-srv.pid); } catch { /* gone */ } }
res.fails = fails; fs.writeFileSync(`${OUT}/result.json`, JSON.stringify(res, null, 1)); console.log(`DONE fails=${fails} build=${res.buildId}`);
