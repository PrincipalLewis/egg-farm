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
  await ctx.addInitScript(() => { window.__sfx = 0; window.__ac = []; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const st = AudioBufferSourceNode.prototype.start; AudioBufferSourceNode.prototype.start = function (...a) { window.__sfx++; return st.apply(this, a); };
    const W = function (...a) { const c = new AC(...a); window.__ac.push(c); return c; }; W.prototype = AC.prototype; window.AudioContext = W; window.webkitAudioContext = W; });
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
  const c0 = await coins(A), s0 = JSON.stringify(await saved(A)); await A.waitForTimeout(300); const auNotice = await A.evaluate(() => window.__sfx);
  ok('TG-1/TG-UI-1 notice in old tab <=1 s after the new tab is ready', await shown(A) && dt <= 1000 && !(await shown(B)), { dt });
  const a = await A.evaluate(() => { const d = document.querySelector('.tab-guard [role=alertdialog]'); const app = document.getElementById('app');
    return { role: d.getAttribute('role'), modal: d.getAttribute('aria-modal'), label: document.getElementById(d.getAttribute('aria-labelledby'))?.textContent, desc: document.getElementById(d.getAttribute('aria-describedby'))?.textContent,
      btn: document.activeElement?.textContent, inert: app.inert, hidden: app.getAttribute('aria-hidden'), filter: getComputedStyle(app).filter, close: d.querySelectorAll('button').length }; });
  ok('TG-UI-2 alertdialog, aria-modal, label + description, game inert/aria-hidden, dimmed, one button', a.role === 'alertdialog' && a.modal === 'true' && a.label === 'Game open in another tab'
    && a.desc === 'Your farm is running in another tab. Play here to continue from your latest save.' && a.inert && a.hidden === 'true' && /saturate\(0?\.6\)/.test(a.filter) && a.close === 1, a);
  await A.keyboard.press('Tab'); await A.keyboard.press('Shift+Tab'); await A.keyboard.press('Tab');
  const f = await A.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e), card = getComputedStyle(e.closest('.recovery-card'));
    const lum = x => { const [R, G, B] = x.match(/\d+(\.\d+)?/g).slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * R + 0.7152 * G + 0.0722 * B; };
    const [x, y] = [lum(s.outlineColor), lum(card.backgroundColor)].sort((p, q) => q - p);
    return { id: e.id, ow: s.outlineWidth, os: s.outlineStyle, oc: s.outlineColor, oo: s.outlineOffset, ringVsCard: +((x + 0.05) / (y + 0.05)).toFixed(2) }; });
  ok('TG-UI-3 focus on Play here, Tab/Shift+Tab stay on it, 3px solid ring offset 3px, ring >=3:1 vs card', f.id === 'tgPlay' && f.ow === '3px' && f.os === 'solid' && f.oo === '3px' && f.ringVsCard >= 3, f);
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
  const au0 = await A.evaluate(() => ({ n: window.__sfx, st: window.__ac.map(c => c.state) }));
  const quiet = { atNoticeSfx: auNotice, afterFreezeSfx: au0.n, ctx: au0.st };
  ok('TG-UI-9a no audio while the notice is up (no sfx started, AudioContext suspended)', au0.n === auNotice && au0.st.every(x => x !== 'running'), quiet);
  await B.waitForTimeout(500); const bCoins = (await saved(B)).coinsCents;
  const loading = await A.evaluate(() => { const b = document.getElementById('tgPlay'); b.click(); return { t: b.textContent, d: b.disabled }; });
  await A.waitForLoadState('load'); await A.getByText('Tap to start').click(); await A.waitForFunction(() => window.eggfarm); await A.waitForTimeout(800);
  const bCoinsAfter = await coins(B); const aCoins = await A.evaluate(() => window.eggfarm.loaded.coinsCents), ev = await A.evaluate(() => window.eggfarm.telemetry.events().filter(e => e.type === 'tab_guard_takeover').map(e => e.reason));
  const ac1 = await A.evaluate(() => window.__ac.map(c => c.state)); const n1 = await A.evaluate(() => window.__sfx);
  await A.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, coop: 50 }; }); await A.locator('#collect').click(); await A.waitForTimeout(800);
  const n2 = await A.evaluate(() => window.__sfx);
  ok('TG-UI-9b sound returns after the Play here reload (AudioContext running, a tap plays sfx)', ac1.includes('running') && n2 > n1, { ac: ac1, before: n1, after: n2 });
  ok('TG-UI-6/TG-2 Play here -> "Loading…" disabled, reload shows exactly B\'s money, B shows the notice, takeover{play_here}', loading && /Loading/.test(loading.t) && loading.d && aCoins === bCoinsAfter && await shown(B) && !(await shown(A)) && ev.includes('play_here'), { loading, aCoins, bCoinsAtTakeover: bCoinsAfter, bSavedBefore: bCoins, ev });
  await ctx.close(); }
// ---- TG-4 owner killed: stale lease (>=6 s, never released) -> next load takes over without a notice
{ const ctx = await ctxWith(fx); const p = await ctx.newPage(); await p.goto(URL0); await p.evaluate(() => localStorage.setItem('eggfarm.lease', JSON.stringify({ id: 'killed-tab', at: Date.now() - 6500 }))); await p.close();
  const A = await open(ctx); const r = await A.evaluate(() => ({ ev: window.eggfarm.telemetry.events().filter(e => e.type === 'tab_guard_takeover').map(e => e.reason), lease: JSON.parse(localStorage.getItem('eggfarm.lease')).id }));
  ok('TG-4 stale lease from a killed tab: loads, no notice, takeover{stale}', !(await shown(A)) && r.ev.includes('stale') && r.lease !== 'killed-tab', r); await ctx.close(); }
// ---- TG-5 offline earnings paid once with two tabs
{ const sv = JSON.parse(fx); sv.savedAt = Date.now() - 30 * 60e3; const ctx = await ctxWith(JSON.stringify(sv)); const A = await open(ctx);
  const grants = p => p.evaluate(() => window.eggfarm.telemetry.events().filter(e => e.type === 'offline_grant').map(e => e.eggs));
  const a = await grants(A); const B = await open(ctx); await B.waitForTimeout(300); const b = await grants(B);
  const bs = await B.evaluate(() => window.eggfarm.state.pendingOfflineEggs);
  ok('TG-5 offline paid once: shared telemetry has exactly one offline_grant after both tabs load, B has nothing pending', a.length === 1 && a[0] > 0 && b.length === 1 && bs === 0, { a, b, bPending: bs }); await ctx.close(); }
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
  await A.setViewportSize({ width: 320, height: 400 }); await A.waitForTimeout(150);
  const w = await A.evaluate(() => { const c = document.querySelector('.tab-guard .recovery-card'), h = document.getElementById('tgT'), hs = getComputedStyle(h), cs = getComputedStyle(c), b = document.getElementById('tgPlay').getBoundingClientRect(), se = document.scrollingElement;
    return { titleLines: Math.round(h.getBoundingClientRect().height / parseFloat(hs.lineHeight === 'normal' ? parseFloat(hs.fontSize) * 1.2 : hs.lineHeight)), titleClipped: h.scrollWidth > h.clientWidth || hs.textOverflow === 'ellipsis' || hs.whiteSpace === 'nowrap',
      btnH: b.height, cardOverflowY: cs.overflowY, cardScrolls: c.scrollHeight > c.clientHeight, pageScrolls: se.scrollHeight > innerHeight + 1, cardBottom: c.getBoundingClientRect().bottom, vh: innerHeight }; });
  ok('TG-UI-7b 320x400: title wraps (not truncated), Play here >=44 tall, card fits, page does not scroll', w.titleLines >= 2 && !w.titleClipped && w.btnH >= 44 && !w.pageScrolls && w.cardBottom <= w.vh, w);
  await A.setViewportSize({ width: 320, height: 240 }); await A.waitForTimeout(150);
  const o = await A.evaluate(() => { const c = document.querySelector('.tab-guard .recovery-card'); const before = c.scrollTop; c.scrollTop = 1e4; const r = c.getBoundingClientRect();
    return { overflowY: getComputedStyle(c).overflowY, cardScrolls: c.scrollHeight > c.clientHeight, scrolled: c.scrollTop > before, pageScrolls: document.scrollingElement.scrollHeight > innerHeight + 1, cardBottom: r.bottom, vh: innerHeight, btnH: document.getElementById('tgPlay').getBoundingClientRect().height }; });
  ok('TG-UI-7c 320x240 overflow: the card scrolls, the page does not, button still >=44', /auto|scroll/.test(o.overflowY) && o.cardScrolls && o.scrolled && !o.pageScrolls && o.cardBottom <= o.vh && o.btnH >= 44, o);
  await A.setViewportSize({ width: 320, height: 568 }); await A.waitForTimeout(100);
  ok('TG-UI-7 reduced motion: no animation; 320 px wide (200% zoom of 640): no clipping', m.anim === 'none' && !m.clip, m);
  ok('TG-UI-8 contrast: body >=4.5 (~13), button >=4.5 (~5.1), focus ring >=3', m.body >= 4.5 && m.btn >= 4.5 && m.ring >= 3, m); await ctx.close(); }
await br.close(); try { process.kill(-srv.pid); } catch {} console.log(bad ? `FAILED ${bad}` : 'ALL PASS'); process.exit(bad ? 1 : 0);
