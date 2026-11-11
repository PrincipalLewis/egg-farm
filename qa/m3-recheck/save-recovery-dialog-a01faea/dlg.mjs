// Save-recovery dialog v2.1/v2.2 QA, a01faea. node dlg.mjs <engine>; env PORT, OUT
import pw from '/workspace/qa-sd3/game/node_modules/playwright-core/index.mjs';
import { serveOwn } from '/workspace/qa-sd3/game/scripts/serve-own.mjs'; import fs from 'node:fs';
const E = process.argv[2] ?? 'chromium', G = '/workspace/qa-sd3/game', OUT = process.env.OUT;
const srv = await serveOwn(process.env.DIST ?? 'dist', +(process.env.PORT ?? 6950), G); const U = srv.url;
const br = E === 'chromium' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[E].launch();
const ok = (n, p, i = '') => console.log(`${p ? 'PASS' : 'FAIL'} [${E}] ${n} — ${typeof i === 'string' ? i : JSON.stringify(i)}`);
const fx = fs.readFileSync(G + '/tests/fixtures/saves/m2-rc1-v5-12min.json', 'utf8').replace(/"savedAt":\d+/, `"savedAt":${Date.now() - 60e3}`);
const C = {
  restored: { t: 'Welcome back!', b: 'We loaded your backup. You may be a few moments behind.', go: 'Keep farming', exp: 'link', expTxt: 'Export old save' },
  restoredMissing: { t: 'Welcome back!', b: 'We loaded your backup. You may be a few moments behind.', go: 'Keep farming', exp: null },
  fresh: { t: 'A fresh start', b: "We couldn't open your farm. Your old save is kept safe.", go: 'Start farming', exp: 'link', expTxt: 'Export old save' },
  storage: { t: 'A fresh start', b: "We couldn't open your farm. Export it now to keep a copy.", go: 'Start farming', exp: 'button', expTxt: 'Export old save' },
  cantsave: { t: 'Saving is paused', b: "Your farm is fine, but your browser won't let us save right now. Export a copy to keep your progress.", go: 'Keep farming', exp: 'button', expTxt: 'Export save' } };
const cases = [
  ['restored (corrupt main + valid .bak)', 'restored', { 'eggfarm.save': '{"version":6,"sav', 'eggfarm.save.bak': fx }, null],
  ['restored (main missing + valid .bak)', 'restoredMissing', { 'eggfarm.save.bak': fx }, null],
  ['fresh (corrupt main, no .bak)', 'fresh', { 'eggfarm.save': '{"version":6,"sav' }, null],
  ['SD4-3 fresh (main missing + bad .bak)', 'fresh', { 'eggfarm.save.bak': '{"version":6,"savedAt":17,"sta' }, null],
  ['storage (corrupt main, copy fails)', 'storage', { 'eggfarm.save': '{"version":6,"sav' }, 'corrupt'],
  ["can't save (valid main, storage refuses all writes)", 'cantsave', { 'eggfarm.save': fx }, 'all'] ];
for (const vp of [{ width: 360, height: 740 }, { width: 1280, height: 800 }]) for (const [name, key, ls, block] of cases) {
  const exp = C[key]; const ctx = await br.newContext({ viewport: vp, acceptDownloads: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(U); await p.evaluate(o => { localStorage.clear(); localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true })); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, ls);
  if (block) await p.addInitScript(b => { window.__q = 0; const ss = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (this === window.localStorage && (b === 'all' || k.startsWith('eggfarm.save.corrupt'))) { window.__q++; throw new DOMException('full', 'QuotaExceededError'); } return ss.call(this, k, v); }; }, block);
  await p.reload(); await p.getByText('Tap to start').click(); const shown = await p.waitForSelector('.recovery-layer .recovery-card', { timeout: 8000 }).then(() => true, () => false);
  if (!shown) { ok(`${vp.width} ${name}: dialog shown`, false, { body: (await p.evaluate(() => document.body.innerText)).slice(0, 200) }); await p.screenshot({ path: `${OUT}/${E}-${vp.width}-${key}-NODIALOG.png` }); await ctx.close(); continue; }
  await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/${E}-${vp.width}-${name.split(' ')[0].replace(/\W/g, '')}-${key}.png` });
  const d = await p.evaluate(() => { const c = document.querySelector('.recovery-card'), go = c.querySelector('#rcGo'), ex = c.querySelector('#rcExport');
    const r = el => el && el.getBoundingClientRect(); const cs = getComputedStyle(c), ls = getComputedStyle(document.querySelector('.recovery-layer'));
    return { role: c.getAttribute('role'), modal: c.getAttribute('aria-modal'), lb: document.getElementById(c.getAttribute('aria-labelledby'))?.innerText, db: (c.getAttribute('aria-describedby') || '').split(' ').map(id => document.getElementById(id)?.innerText).join(' | '),
      t: c.querySelector('h2')?.innerText, b: c.querySelector('#rcB')?.innerText, note: c.querySelector('.note')?.innerText ?? null, go: go?.innerText, goH: r(go)?.height, ex: ex ? { txt: ex.innerText, cls: ex.className, h: r(ex).height, w: r(ex).width, aria: ex.getAttribute('aria-label') } : null,
      focus: document.activeElement?.id, cardW: r(c).width, op: cs.opacity, layerOp: ls.opacity, imgAlt: c.querySelector('img')?.getAttribute('alt'), toast: !!document.querySelector('.save-warn'),
      clipped: r(c).top < 0 || r(c).bottom > innerHeight + 1 && getComputedStyle(document.querySelector('.recovery-layer')).overflowY === 'visible', inert: !!document.querySelector('[inert]') }; });
  const strings = d.t === exp.t && d.b === exp.b && d.go === exp.go && (exp.exp ? d.ex && d.ex.txt === exp.expTxt && (exp.exp === 'link' ? /rc-link/.test(d.ex.cls) : /btn/.test(d.ex.cls)) : !d.ex);
  ok(`${vp.width} ${name}: exact copy, buttons`, strings, { t: d.t, b: d.b, note: d.note, go: d.go, ex: d.ex });
  ok(`${vp.width} ${name}: aria alertdialog/modal/labelledby/describedby, icon alt="", bg inert, initial focus primary`, d.role === 'alertdialog' && d.modal === 'true' && d.lb === d.t && d.db.includes(d.b) && d.imgAlt === '' && d.inert && d.focus === 'rcGo', { role: d.role, modal: d.modal, db: d.db, alt: d.imgAlt, inert: d.inert, focus: d.focus });
  ok(`${vp.width} ${name}: tap targets >=44 (primary >=48), card width ${vp.width === 360 ? 312 : 440}, opaque`, d.goH >= 48 && (!d.ex || d.ex.h >= 44 && (exp.exp !== 'link' || d.ex.w >= 120)) && Math.abs(d.cardW - (vp.width === 360 ? 312 : 440)) <= 1 && d.op === '1' && d.layerOp === '1', { goH: d.goH, ex: d.ex && [d.ex.h, d.ex.w], cardW: d.cardW, op: d.op, layerOp: d.layerOp });
  if (d.ex) ok(`${vp.width} ${name}: export aria-label`, /downloads a copy/i.test(d.ex.aria ?? ''), d.ex.aria);
  if (key === 'cantsave') ok(`${vp.width} ${name}: no-save toast suppressed while open`, !d.toast, '');
  // keyboard: Esc, scrim click, Tab cycle, focus ring
  await p.keyboard.press('Escape'); await p.mouse.click(5, 5); await p.waitForTimeout(200);
  const still = await p.evaluate(() => !!document.querySelector('.recovery-card'));
  const seq = []; const rings = [];
  for (let i = 0; i < 4; i++) { await p.keyboard.press('Tab'); seq.push(await p.evaluate(() => document.activeElement?.id)); rings.push(await p.evaluate(() => { const s = getComputedStyle(document.activeElement); return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} off ${s.outlineOffset}`; })); }
  await p.keyboard.press('Shift+Tab'); seq.push(await p.evaluate(() => document.activeElement?.id));
  ok(`${vp.width} ${name}: Esc + scrim tap don't close; Tab/Shift+Tab trapped`, still && seq.every(x => x === 'rcGo' || x === 'rcExport') && (!d.ex || new Set(seq).size === 2), { still, seq });
  ok(`${vp.width} ${name}: keyboard focus ring #2B79A8 (rgb 43,121,168) ≥2px`, rings.every(r => /rgb\(43, 121, 168\)/.test(r) && parseFloat(r.split(' ')[1]) >= 2 && /solid|auto/.test(r)), rings);
  if (vp.width === 360) await p.screenshot({ path: `${OUT}/${E}-360-${key}-focusring.png` });
  // export
  if (d.ex) { const dl = p.waitForEvent('download', { timeout: 5000 }).catch(() => null); await p.locator('#rcExport').click(); const f = await dl; await p.waitForTimeout(800);
    const msg = await p.evaluate(() => document.querySelector('#rcMsg')?.innerText); let bytes = null; if (f) { const fp = await f.path().catch(() => null); bytes = fp ? fs.readFileSync(fp, 'utf8') : null; }
    const want = key === 'cantsave' ? 'current farm (farm 10 v6)' : (ls['eggfarm.save'] ?? ls['eggfarm.save.bak']);
    const bytesOk = key === 'cantsave' ? (() => { try { const j = JSON.parse(bytes); return j.state.farmLevel === 10; } catch { return false; } })() : bytes === want;
    ok(`${vp.width} ${name}: Export downloads ${f?.suggestedFilename()} with the right bytes, "Saved a copy.", dialog stays open`, f && /^eggfarm-(old-)?save-\d{8}-\d{4}\.json$/.test(f.suggestedFilename()) && bytesOk && msg === 'Saved a copy.' && await p.evaluate(() => !!document.querySelector('.recovery-card')), { name: f?.suggestedFilename(), bytesOk, len: bytes?.length, msg }); }
  // primary
  await p.locator('#rcGo').click(); await p.waitForTimeout(600);
  const after = await p.evaluate(() => ({ gone: !document.querySelector('.recovery-card'), focus: document.activeElement?.id, toast: document.querySelector('.save-warn')?.textContent ?? null, q: window.__q ?? null, farm: (() => { try { return JSON.parse(localStorage.getItem('eggfarm.save')).state.farmLevel; } catch { return null; } })() }));
  const wantFarm = { restored: 10, restoredMissing: 10, fresh: 0, storage: null, cantsave: 10 }[key];
  ok(`${vp.width} ${name}: primary closes, focus -> collect${key === 'cantsave' ? ', toast after close' : ''}, no page errors`, after.gone && /collect/i.test(after.focus ?? '') && (key !== 'cantsave' || !!after.toast) && errs.length === 0, { ...after, errs });
  if (key === 'storage') ok(`${vp.width} storage: at most one QuotaExceededError on the corrupt copy (no retry loop)`, after.q <= 1, { q: after.q });
  await ctx.close(); }
await br.close(); srv.stop(); process.exit(0);
