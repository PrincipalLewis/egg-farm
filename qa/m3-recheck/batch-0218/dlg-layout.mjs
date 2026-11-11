// Dialog layout QA (PR #20): node dlg-layout.mjs <engine> ; env G (worktree), PORT, OUT
import fs from 'node:fs'; const G = process.env.G, OUT = process.env.OUT, E = process.argv[2] ?? 'chromium';
const pw = (await import(G + '/node_modules/playwright-core/index.mjs')).default; const { serveOwn } = await import(G + '/scripts/serve-own.mjs');
const srv = await serveOwn('dist', +process.env.PORT, G); const U = srv.url;
const br = E === 'chromium' ? await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[E].launch();
let fails = 0; const ok = (n, p, i) => { if (!p) fails++; console.log(`${p ? 'PASS' : 'FAIL'} [${E}] ${n} — ${JSON.stringify(i)}`); };
const fx = fs.readFileSync(G + '/tests/fixtures/saves/m2-rc1-v5-12min.json', 'utf8').replace(/"savedAt":\d+/, `"savedAt":${Date.now() - 60e3}`);
const cases = [['restored', { 'eggfarm.save': '{"version":6,"sav', 'eggfarm.save.bak': fx }, null], ['fresh', { 'eggfarm.save': '{"version":6,"sav' }, null],
  ['storage', { 'eggfarm.save': '{"version":6,"sav' }, 'corrupt'], ['cantsave', { 'eggfarm.save': fx }, 'all']];
for (const vp of [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 1280, height: 800 }, { width: 1024, height: 474 }]) for (const [key, ls, block] of cases) {
  const ctx = await br.newContext({ viewport: vp }); const p = await ctx.newPage();
  await p.goto(U); const bid = await p.evaluate(() => [...document.scripts].map(s => s.src).join(' ')); await p.evaluate(o => { localStorage.clear(); localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true })); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, ls);
  if (block) await p.addInitScript(b => { const ss = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (this === window.localStorage && (b === 'all' || k.startsWith('eggfarm.save.corrupt'))) throw new DOMException('full', 'QuotaExceededError'); return ss.call(this, k, v); }; }, block);
  await p.reload(); await p.getByText('Tap to start').click().catch(() => {});
  const shown = await p.waitForSelector('.recovery-layer .recovery-card', { timeout: 8000 }).then(() => true, () => false);
  const tag = `${vp.width}x${vp.height} ${key}`;
  if (!shown) { ok(`${tag} dialog shown`, false, {}); await p.screenshot({ path: `${OUT}/${E}-${vp.width}x${vp.height}-${key}-NODIALOG.png` }); await ctx.close(); continue; }
  await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/${E}-${vp.width}x${vp.height}-${key}.png` });
  const d = await p.evaluate(() => { const c = document.querySelector('.recovery-card'); const R = e => e.getBoundingClientRect();
    const els = [...c.querySelectorAll('h2,p,button,a,.note,img,[id^=rc]')].filter(e => R(e).width > 0 && getComputedStyle(e).visibility !== 'hidden');
    const clip = els.filter(e => e.tagName !== 'IMG' && (e.scrollWidth > e.clientWidth + 0 || e.scrollHeight > e.clientHeight + 1 && getComputedStyle(e).overflowY !== 'visible')).map(e => ({ id: e.id || e.tagName, t: e.innerText.slice(0, 40), sw: e.scrollWidth, cw: e.clientWidth }));
    const tgt = [...c.querySelectorAll('button,a')].filter(e => R(e).width > 0).map(e => ({ id: e.id, t: e.innerText, h: Math.round(R(e).height * 10) / 10, w: Math.round(R(e).width) }));
    const top = els.filter(e => !els.some(o => o !== e && e.contains(o) && o.tagName !== 'IMG' && false));
    const leaf = els.filter(e => !els.some(o => o !== e && e.contains(o)));
    const ov = []; for (let i = 0; i < leaf.length; i++) for (let j = i + 1; j < leaf.length; j++) { const a = R(leaf[i]), b = R(leaf[j]); const x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (x > 0.5 && y > 0.5) ov.push([leaf[i].id || leaf[i].tagName, leaf[j].id || leaf[j].tagName, Math.round(x), Math.round(y)]); }
    const cr = R(c), L = document.querySelector('.recovery-layer'); const inView = cr.left >= 0 && cr.right <= innerWidth + 0.5 && (cr.top >= 0 && cr.bottom <= innerHeight + 0.5 || L.scrollHeight > L.clientHeight && /auto|scroll/.test(getComputedStyle(L).overflowY));
    const hscroll = document.documentElement.scrollWidth > innerWidth;
    return { clip, tgt, ov, card: [Math.round(cr.left), Math.round(cr.top), Math.round(cr.width), Math.round(cr.height)], inView, hscroll }; });
  ok(`${tag} no clipped text (scrollWidth<=clientWidth)`, d.clip.length === 0, d.clip);
  ok(`${tag} targets >=44px`, d.tgt.every(t => t.h >= 44), d.tgt);
  ok(`${tag} no overlap between leaf elements`, d.ov.length === 0, d.ov);
  ok(`${tag} card in viewport (or layer scrolls), no page h-scroll`, d.inView && !d.hscroll, { card: d.card, hscroll: d.hscroll });
  await ctx.close(); }
console.log(`SUMMARY [${E}] fails=${fails}`); await br.close(); srv.stop(); process.exit(0);
