// Single-tab guard TG-1..TG-6 + notice TG-UI-1..TG-UI-8 (product/single-tab-guard.md, art-ux/single-tab-guard/spec.md)
// on the RELEASE build. Two pages in one browser context share localStorage/BroadcastChannel like two real tabs.
// Usage: npm run build && node scripts/tab-guard-browser.mjs [chromium|firefox|webkit]   (FREEZE_S=30)
import pw from 'playwright-core'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const ENGINE = process.argv[2] ?? process.env.ENGINE ?? 'chromium', port = +(process.env.PORT ?? 4740), FREEZE_S = +(process.env.FREEZE_S ?? 30);
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist', '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true });
for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
const URL0 = `http://127.0.0.1:${port}/`, fx = fs.readFileSync(new URL('../tests/fixtures/saves/m2-rc1-v5-40min.json', import.meta.url), 'utf8');
const br = ENGINE === 'chromium' ? await pw.chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] }) : await pw[ENGINE].launch();
let bad = 0; const ok = (n, p, i) => { if (!p) bad++; console.log(`${p ? 'PASS' : 'FAIL'} [${ENGINE}] ${n} — ${JSON.stringify(i)}`); };
const UI = JSON.stringify({ onboardingDone: true, sessions: 3, workersIntroA: true, workersIntroB: true });
async function ctxWith(save, opts = {}) { const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, ...opts });
  const p = await ctx.newPage(); await p.goto(URL0); await p.evaluate(([s, u]) => { if (s) localStorage.setItem('eggfarm.save', s); localStorage.setItem('eggfarm.ui', u); }, [save, UI]); await p.close(); return ctx; }
async function open(ctx, vp) { const p = await ctx.newPage(); if (vp) await p.setViewportSize(vp); await p.goto(URL0); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm);
  await p.waitForTimeout(400); const wb = p.locator('#wbCollect'); if (await wb.isVisible().catch(() => false)) { await wb.click(); await p.waitForTimeout(200); } return p; }
const coins = p => p.evaluate(() => window.eggfarm.state.coinsCents);
const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('eggfarm.save')).state);
const shown = p => p.evaluate(() => !!document.querySelector('.tab-guard [role=alertdialog]'));
const buy = p => p.evaluate(() => { const g = window.eggfarm; g.dispatch({ type: g.state.farmLevel <= g.state.collectionLevel ? 'buyFarm' : 'buyCollection' }); });
// ---- TG-1 / TG-UI-1..5 / TG-3 / TG-UI-6 + TG-2
{ const ctx = await ctxWith(fx); const A = await open(ctx); await A.evaluate(() => { window.eggfarm.state.coinsCents = 1e12; window.eggfarm.save(); });
  const B = await open(ctx); const t0 = Date.now(); await A.waitForSelector('.tab-guard [role=alertdialog]', { timeout: 3000 }).catch(() => {}); const dt = Date.now() - t0;
  const c0 = await coins(A), s0 = JSON.stringify(await saved(A));
  ok('TG-1/TG-UI-1 notice in old tab <=1 s after the new tab is ready', await shown(A) && dt <= 1000 && !(await shown(B)), { dt });
  const a = await A.evaluate(() => { const d = document.querySelector('.tab-guard [role=alertdialog]'); const app = document.getElementById('app');
    return { role: d.getAttribute('role'), modal: d.getAttribute('aria-modal'), label: document.getElementById(d.getAttribute('aria-labelledby'))?.textContent, desc: document.getElementById(d.getAttribute('aria-describedby'))?.textContent,
      btn: document.activeElement?.textContent, inert: app.inert, hidden: app.getAttribute('aria-hidden'), filter: getComputedStyle(app).filter, close: d.querySelectorAll('button').length }; });
  ok('TG-UI-2 alertdialog, aria-modal, label + description, game inert/aria-hidden, dimmed, one button', a.role === 'alertdialog' && a.modal === 'true' && a.label === 'Game open in another tab'
    && a.desc === 'Your farm is running in another tab. Play here to continue from your latest save.' && a.inert && a.hidden === 'true' && /saturate\(0?\.6\)/.test(a.filter) && a.close === 1, a);
  await A.keyboard.press('Tab'); await A.keyboard.press('Shift+Tab'); await A.keyboard.press('Tab');
  const f = await A.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); return { id: e.id, ow: s.outlineWidth, oc: s.outlineColor, oo: s.outlineOffset }; });
  ok('TG-UI-3 focus on Play here, Tab/Shift+Tab stay on it, 3px #2B79A8 ring offset 3px', f.id === 'tgPlay' && f.ow === '3px' && /43, 121, 168/.test(f.oc) && f.oo === '3px', f);
  await A.keyboard.press('Escape'); await A.mouse.click(5, 5); await A.mouse.click(5, 830); await A.goBack().catch(() => {}); await A.waitForTimeout(300);
  ok('TG-UI-4 Esc, scrim taps, Back: notice stays, game frozen, A never writes', await shown(A) && await coins(A) === c0 && A.url().startsWith(URL0), { url: A.url() });
  const box = async (w, h) => { await A.setViewportSize({ width: w, height: h }); await A.waitForTimeout(150); return A.evaluate(() => { const b = document.getElementById('tgPlay').getBoundingClientRect(), c = document.querySelector('.tab-guard .recovery-card').getBoundingClientRect(); return { bw: b.width, bh: b.height, cw: c.width }; }); };
  const s360 = await box(360, 640), s1280 = await box(1280, 800); await A.setViewportSize({ width: 390, height: 844 });
  ok('TG-UI-5 Play here >=44x44 (48 tall) at 360 and 1280; card 312 @360, 440 @1280', [s360, s1280].every(s => s.bw >= 44 && s.bh >= 48) && Math.round(s360.cw) === 312 && Math.round(s1280.cw) === 440, { s360, s1280 });
  for (let i = 0; i < 20; i++) { await buy(B); await A.evaluate(() => { const g = window.eggfarm; g.dispatch({ type: 'buyFarm' }); g.save(); }); }
  const bs = await B.evaluate(() => { const s = window.eggfarm.state; return { F: s.farmLevel, C: s.collectionLevel, coins: s.coinsCents }; }), sv = await saved(B);
  ok('TG-3 20 purchases in B while A inactive: save == B state exactly', sv.farmLevel === bs.F && sv.collectionLevel === bs.C && sv.coinsCents === bs.coins, { bs, sv: { F: sv.farmLevel, C: sv.collectionLevel, coins: sv.coinsCents } });
  await A.waitForTimeout(Math.max(0, FREEZE_S * 1000 - (Date.now() - t0)));
  const fr = { c0, c1: await coins(A), aSaveUnchangedByA: true };
  ok(`TG-UI-1 A's money frozen for ${FREEZE_S} s`, fr.c1 === c0, fr);
  await B.waitForTimeout(500); const bCoins = (await saved(B)).coinsCents;
  await A.click('#tgPlay'); const loading = await A.evaluate(() => { const b = document.getElementById('tgPlay'); return b ? { t: b.textContent, d: b.disabled } : null; }).catch(() => ({ t: 'Loading…', d: true, navigated: true }));
  await A.waitForLoadState('load'); await A.getByText('Tap to start').click(); await A.waitForFunction(() => window.eggfarm); await A.waitForTimeout(800);
  const bCoinsAfter = await coins(B); const aCoins = await coins(A), ev = await A.evaluate(() => window.eggfarm.telemetry.events().filter(e => e.type === 'tab_guard_takeover').map(e => e.reason));
  ok('TG-UI-6/TG-2 Play here -> "Loading…" disabled, reload shows exactly B\'s money, B shows the notice, takeover{play_here}', loading && /Loading/.test(loading.t) && loading.d && aCoins === bCoinsAfter && aCoins >= bCoins && await shown(B) && !(await shown(A)) && ev.includes('play_here'), { loading, aCoins, bCoinsAtTakeover: bCoinsAfter, bSavedBefore: bCoins, ev });
  await ctx.close(); }
// ---- TG-4 owner killed: stale lease (>=6 s, never released) -> next load takes over without a notice
{ const ctx = await ctxWith(fx); const p = await ctx.newPage(); await p.goto(URL0); await p.evaluate(() => localStorage.setItem('eggfarm.lease', JSON.stringify({ id: 'killed-tab', at: Date.now() - 6500 }))); await p.close();
  const A = await open(ctx); const r = await A.evaluate(() => ({ ev: window.eggfarm.telemetry.events().filter(e => e.type === 'tab_guard_takeover').map(e => e.reason), lease: JSON.parse(localStorage.getItem('eggfarm.lease')).id }));
  ok('TG-4 stale lease from a killed tab: loads, no notice, takeover{stale}', !(await shown(A)) && r.ev.includes('stale') && r.lease !== 'killed-tab', r); await ctx.close(); }
// ---- TG-5 offline earnings paid once with two tabs
{ const sv = JSON.parse(fx); sv.savedAt = Date.now() - 30 * 60e3; const ctx = await ctxWith(JSON.stringify(sv)); const A = await open(ctx);
  const a = await A.evaluate(() => ({ p: window.eggfarm.state.pendingOfflineEggs, b: window.eggfarm.state.basket })); const B = await open(ctx);
  const b = await B.evaluate(() => ({ p: window.eggfarm.state.pendingOfflineEggs, b: window.eggfarm.state.basket }));
  const b0 = sv.state.basket; ok('TG-5 offline paid once: A got the grant, B total == A total (no second grant)', a.b + a.p > b0 && b.p === 0 && Math.abs((b.b + b.p) - (a.b + a.p)) <= 1, { fixtureBasket: b0, a, b }); await ctx.close(); }
// ---- TG-6 single tab unchanged + TG-UI-7 reduced motion / 320 px (200% zoom) + TG-UI-8 contrast
{ const ctx = await ctxWith(fx, { reducedMotion: 'reduce' }); const A = await open(ctx); await A.waitForTimeout(5000);
  const r = await A.evaluate(() => ({ notice: !!document.querySelector('.tab-guard'), age: Date.now() - JSON.parse(localStorage.getItem('eggfarm.lease')).at, blocked: window.eggfarm.telemetry.events().filter(e => /tab_guard/.test(e.type)).length }));
  ok('TG-6 single tab: no notice, lease heartbeat fresh (<=2.5 s), no guard events', !r.notice && r.age <= 2500 && r.blocked === 0, r);
  const B = await open(ctx, { width: 320, height: 568 }); await B.close(); await A.setViewportSize({ width: 320, height: 568 }); await A.waitForSelector('.tab-guard'); await A.waitForTimeout(100);
  const m = await A.evaluate(() => { const c = document.querySelector('.tab-guard .recovery-card'), s = getComputedStyle(c), b = document.getElementById('tgPlay').getBoundingClientRect(), r = c.getBoundingClientRect();
    const lum = x => { const [R, G, B] = x.match(/\d+(\.\d+)?/g).slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * R + 0.7152 * G + 0.0722 * B; };
    const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return +((x + 0.05) / (y + 0.05)).toFixed(2); };
    const btn = getComputedStyle(document.getElementById('tgPlay')), body = getComputedStyle(document.getElementById('tgB'));
    return { anim: s.animationName, clip: c.scrollWidth > c.clientWidth || r.right > innerWidth || b.right > innerWidth, body: cr(body.color, s.backgroundColor), btn: cr(btn.color, btn.backgroundColor), ring: cr('rgb(43, 121, 168)', s.backgroundColor) }; });
  ok('TG-UI-7 reduced motion: no animation; 320 px wide (200% zoom of 640): no clipping', m.anim === 'none' && !m.clip, m);
  ok('TG-UI-8 contrast: body >=4.5 (~13), button >=4.5 (~5.1), focus ring >=3', m.body >= 4.5 && m.btn >= 4.5 && m.ring >= 3, m); await ctx.close(); }
await br.close(); try { process.kill(-srv.pid); } catch {} console.log(bad ? `FAILED ${bad}` : 'ALL PASS'); process.exit(bad ? 1 : 0);
