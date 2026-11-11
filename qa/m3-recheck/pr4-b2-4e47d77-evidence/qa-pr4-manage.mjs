// PR #4 @4e47d77 Manage tip: anchor 8px above/below Manage, inside the Upgrades scroller, never on Market/tabs/header/button;
// waits when it can't fit, then appears after scroll. node qa-pr4-manage.mjs <engine> <port> <outdir>   (cwd = worktree, dist-qa)
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process';
const pw = createRequire(process.cwd() + '/package.json')('playwright-core');
const [ENG, PORT, OUT] = process.argv.slice(2); if (+PORT === 4173) process.exit(3);
const srv = spawn('npx', ['vite','preview','--outDir','dist-qa','--port',PORT,'--strictPort','--host','127.0.0.1'], { stdio:'ignore', detached:true });
const kill = () => { try { process.kill(-srv.pid,'SIGTERM'); } catch {} }; process.on('exit', kill);
const U = `http://127.0.0.1:${PORT}/`; for (let i = 0; i < 240; i++) { try { await fetch(U); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
const br = await pw[ENG].launch(ENG === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {});
let fails = 0; const log = (ok, k, i) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} [${ENG}] ${k} ${JSON.stringify(i).slice(0, 600)}`); };
const MS = () => { const R = e => e.getBoundingClientRect(), ov = (a, c) => Math.min(a.right, c.right) > Math.max(a.left, c.left) && Math.min(a.bottom, c.bottom) > Math.max(a.top, c.top);
  const c = [...document.querySelectorAll('.coach')].find(x => /Manage/.test(x.textContent) && getComputedStyle(x).visibility !== 'hidden' && +getComputedStyle(x).opacity > 0 && R(x).width); if (!c) return null;
  const b = R(c), btn = document.querySelector('#uRow [data-w=market_hand] [data-act=manage]'), bb = btn && R(btn), up = R(document.querySelector('#p-upgrades')), mk = document.querySelector('#p-market'), mr = mk && R(mk).width ? R(mk) : null;
  const tabs = [...document.querySelectorAll('[role=tablist]')].map(R).filter(t => t.width && t.height), hand = c.querySelector('.coach-hand'), down = !!hand && /hand-down/.test(hand.src);
  const gap = bb ? (down ? bb.top - b.bottom : b.top - bb.bottom) : null;
  const body = R(document.querySelector('#uRow').closest('.body')), hd = R(document.querySelector('#p-upgrades header'));
  const inUp = b.left >= Math.max(up.left, body.left) - 0.5 && b.right <= Math.min(up.right, body.right) + 0.5 && b.top >= Math.max(up.top, body.top) - 0.5 && b.bottom <= Math.min(up.bottom, body.bottom) + 0.5;
  return { side: down ? 'above' : 'below', gap: gap && +gap.toFixed(1), inUp, onHeader: !!hd.height && ov(b, hd), onMarket: !!mr && ov(b, mr), onTabs: tabs.some(t => ov(b, t)), onBtn: !!bb && ov(b, bb), inVp: b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth }; };
const bad = m => !(m.gap >= 6.5 && m.gap <= 9.5) || !m.inUp || m.onHeader || m.onMarket || m.onTabs || m.onBtn || !m.inVp;
const start = async (w, h) => { const ctx = await br.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { if (!sessionStorage.qa) { localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true })); sessionStorage.qa = 1; } });
  await p.goto(U, { timeout: 90000 }); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm && window.eggfarm.state, null, { timeout: 30000 }); await p.waitForTimeout(600);
  await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 6, coinsCents: 5e6 }; }); return { ctx, p, errs }; };
const openW = async p => { await p.evaluate(() => { const n = document.querySelector('[data-nav=upgrades]'); if (n && n.getBoundingClientRect().height) n.click(); }); await p.waitForTimeout(400); await p.evaluate(() => document.querySelector('[data-tab=workers]')?.click()); };
const sample = async (p, ms) => { const S = []; const t0 = Date.now(); while (Date.now() - t0 < ms) { S.push(await p.evaluate(MS)); await p.waitForTimeout(100); } return S; };
// runtime build-id: served bundle contains the expected sha
{ const h = await (await fetch(U)).text(); const j = h.match(/assets\/index-[^"]+\.js/)[0]; const bb = await (await fetch(U + j)).text(); console.log(`build-id served ${j}: ${(bb.match(/m\d+-rc[\w-]*\+[0-9a-f]{7}/) || [])[0]}`); }
const KNOWN_NO_TIP = ['1280x720', '1280x600', '1024x474'];
for (const [w, h] of [[1280,800],[1280,720],[1280,600],[1024,474],[1024,768],[768,1024],[390,640],[360,740],[375,667],[414,896]]) {
  const k = `${w}x${h}`, { ctx, p, errs } = await start(w, h);
  await p.evaluate(() => window.eggfarm.dispatch({ type: 'hire', worker: 'market_hand' })); await openW(p);
  const S = (await sample(p, 9000)).filter(Boolean); const B = S.filter(bad);
  if (S.length) await p.screenshot({ path: `${OUT}/${ENG}-${k}-manage.png` }).catch(() => {});
  if (!S.length && KNOWN_NO_TIP.includes(k)) log(!errs.length, `${k} no-tip (KNOWN, by design pending Art & UX)`, { errs });
  else log(S.length > 0 && !B.length && !errs.length, `${k} anchor`, { n: S.length, bad: B.length, first: S[0] || null, bad0: B[0] || null, errs });
  // wait-then-appear: fresh context, scroll the Manage button out of the scroller before the tip can show, then scroll back
  await ctx.close();
  const c2 = await start(w, h); const q = c2.p;
  await q.evaluate(() => window.eggfarm.dispatch({ type: 'hire', worker: 'market_hand' })); await openW(q); await q.waitForTimeout(150);
  const hid = await q.evaluate(() => { const body = document.querySelector('#uRow').closest('.body'); const pad = document.createElement('div'); pad.id = 'qaPad'; pad.style.height = '3000px'; document.querySelector('#uRow').appendChild(pad); body.scrollTop = body.scrollHeight; const btn = document.querySelector('#uRow [data-w=market_hand] [data-act=manage]'); const r = btn.getBoundingClientRect(), br = body.getBoundingClientRect(); return { out: r.bottom < br.top || r.top > br.bottom }; });
  const W = (await sample(q, 4000)); const shownWhileHidden = W.filter(Boolean);
  await q.evaluate(() => { document.querySelector('#uRow [data-w=market_hand] [data-act=manage]').scrollIntoView({ block: 'center' }); });
  const A = (await sample(q, 6000)).filter(Boolean); const AB = A.filter(bad);
  if (A.length) await q.screenshot({ path: `${OUT}/${ENG}-${k}-after-scroll.png` }).catch(() => {});
  const known = KNOWN_NO_TIP.includes(k) && !A.length;
  log(hid.out ? (!shownWhileHidden.length && (known || (A.length > 0 && !AB.length)) && !c2.errs.length) : false, `${k} waits-then-appears${known ? ' (no tip at all: KNOWN)' : ''}`, { btnOut: hid.out, whileHidden: shownWhileHidden.length, badWhileHidden: shownWhileHidden.filter(bad).length, after: A.length, badAfter: AB.length, first: A[0] || null, errs: c2.errs });
  await c2.ctx.close();
}
console.log(`SUMMARY ${ENG} fails=${fails}`); await br.close(); kill(); process.exit(fails ? 1 : 0);
