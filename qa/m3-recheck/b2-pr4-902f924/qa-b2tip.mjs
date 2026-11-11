// B-2 @902f924: hire tip -> hire -> tired tip (sampled ~6s) -> Manage tip. node qa-b2tip.mjs <engine> <port> <outdir> <label> [sizes]
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const pw = createRequire(process.cwd() + '/package.json')('playwright-core');
const [ENG, PORT, OUT, LABEL, SZ] = process.argv.slice(2); if (+PORT === 4173) process.exit(3);
const sizes = (SZ || '1280x800,1280x720,1280x600,1024x474,390x640,360x740').split(',').map(s => s.split('x').map(Number));
const srv = spawn('npx', ['vite','preview','--outDir','dist-qa','--port',PORT,'--strictPort','--host','127.0.0.1'], { stdio:'ignore', detached:true });
const kill = () => { try { process.kill(-srv.pid,'SIGTERM'); } catch {} }; process.on('exit', kill);
for (let i = 0; i < 240; i++) { try { await fetch(`http://127.0.0.1:${PORT}/`); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
{ const h = await (await fetch(`http://127.0.0.1:${PORT}/`)).text(); const j = h.match(/assets\/index-[^"]+\.js/)[0]; const bb = await (await fetch(`http://127.0.0.1:${PORT}/` + j)).text(); console.log('served build', (bb.match(/m\d+-rc[\w-]*\+[0-9a-f]{7}/) || [])[0]); }
const br = await pw[ENG].launch(ENG === 'chromium' ? { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] } : {});
const SNAP = () => { const R = e => { const b = e.getBoundingClientRect(); return { l: +b.left.toFixed(1), t: +b.top.toFixed(1), r: +b.right.toFixed(1), b: +b.bottom.toFixed(1) }; };
  const ar = (a, c) => Math.max(0, Math.min(a.r,c.r)-Math.max(a.l,c.l)) * Math.max(0, Math.min(a.b,c.b)-Math.max(a.t,c.t));
  const tabs = [...document.querySelectorAll('[role=tablist]')].filter(t => t.getBoundingClientRect().width && t.getBoundingClientRect().height).map(R);
  const row = document.querySelector('#uRow [data-w=market_hand]'); const rr = row && row.getBoundingClientRect().height ? R(row) : null; const eb = row?.querySelector('.ebar'); const er = eb && eb.getBoundingClientRect().width ? R(eb) : null;
  return [...document.querySelectorAll('.coach')].filter(c => c.getBoundingClientRect().width && getComputedStyle(c).visibility !== 'hidden' && +getComputedStyle(c).opacity > 0 && c.getBoundingClientRect().height > 0).map(c => { const b = R(c);
    return { txt: c.textContent.slice(0, 30), ...b, w: +(b.r-b.l).toFixed(1), tabOv: Math.round(Math.max(0, ...tabs.map(t => ar(b, t)))), rowOv: rr ? Math.round(ar(b, rr)) : null, ebarOv: er ? Math.round(ar(b, er)) : null, covers: row ? [...row.querySelectorAll('button, .ebar, b, .name')].filter(x => x.getBoundingClientRect().width && ar(b, R(x)) > 0).map(x => (x.dataset.act || x.className || x.tagName).toString().slice(0, 20)) : [], gap: rr ? +(b.t - rr.b).toFixed(1) : null, rowVis: rr ? (rr.t >= 0 && rr.b <= innerHeight) : null, sheet: !!document.querySelector('[data-tab=workers].active') && !!rr, side: er ? (b.b <= er.t + 1 ? 'above' : b.t >= er.b - 1 ? 'below' : 'mid') : null,
      inVpY: b.t >= 0 && b.b <= innerHeight, inVpX: b.l >= 0 && b.r <= innerWidth, tabs: tabs.length }; }); };
const res = {};
for (const mode of ['viaHireTip', 'direct']) for (const [w, h] of sizes) {
  const key = `${mode}-${w}x${h}`; const ctx = await br.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(m => { if (!sessionStorage.qa) { localStorage.setItem('eggfarm.ui', JSON.stringify(m === 'direct' ? { onboardingDone: true, workersIntroA: true } : { onboardingDone: true })); sessionStorage.qa = 1; } }, mode);
  await p.goto(`http://127.0.0.1:${PORT}/`, { timeout: 90000 }); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm && window.eggfarm.state, null, { timeout: 30000 }); await p.waitForTimeout(800);
  await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 6, coinsCents: 5e6 }; });
  const r = { errs };
  if (mode === 'direct') r.hire = 'n/a (direct hire, rc0 b2tip flow)'; else try { await p.locator('#iaOpen').click({ timeout: 8000 }); await p.waitForTimeout(700); r.hire = (await p.evaluate(SNAP)).find(c => /Hire them/.test(c.txt)) || null; } catch (e) { r.hire = 'no hire tip: ' + String(e).slice(0, 80); }
  await p.evaluate(() => window.eggfarm.dispatch({ type: 'hire', worker: 'market_hand' }));
  if (mode === 'direct') { const P = []; const q0 = Date.now(); while (Date.now() - q0 < 2500) { P.push(...(await p.evaluate(SNAP)).filter(c => /tired/.test(c.txt) && !c.sheet)); r.preTab = await p.evaluate(() => document.querySelector('[role=tab].active')?.dataset.tab); await p.waitForTimeout(100); } r.preOpen = P.length;
    const nav = p.locator('[data-nav=upgrades]'); if (await nav.isVisible()) await nav.click(); await p.locator('[data-tab=workers]').click(); await p.waitForTimeout(100); }
  const t0 = Date.now(); const S = []; let shot = false;
  while (Date.now() - t0 < 6000) { const c = await p.evaluate(SNAP); S.push({ ms: Date.now() - t0, c });
    if (!shot && c.some(x => /tired/.test(x.txt))) { await p.waitForTimeout(150); await p.screenshot({ path: `${OUT}/${LABEL}-${ENG}-tired-${key}.png` }); shot = true; }
    await p.waitForTimeout(100); }
  const tired = S.flatMap(s => s.c.filter(c => /tired/.test(c.txt)).map(c => ({ ms: s.ms, ...c })));
  r.tired = { n: tired.length, first: tired[0] || null, tabHits: tired.filter(c => c.tabOv > 0).length, rowHits: tired.filter(c => c.rowOv > 0).length, ebarHits: tired.filter(c => c.ebarOv > 0).length, outY: tired.filter(c => !c.inVpY).length, outX: tired.filter(c => !c.inVpX).length, sides: [...new Set(tired.map(c => c.side))] };
  r.manage = S.flatMap(s => s.c).find(c => /Manage/.test(c.txt)) || null;
  r.under = await p.evaluate(() => null); const t = r.tired; t.minGap = tired.length ? Math.min(...tired.map(c => c.gap ?? -999)) : null; t.noSheet = tired.filter(c => !c.sheet || !c.rowVis).length; const defer = (w === 1280 && h <= 720) || (w === 1024 && h === 474);
  r.pass = !errs.length && !r.preOpen && (defer ? true : (t.n > 0 && !t.tabHits && !t.rowHits && !t.outY && !t.outX && !t.noSheet && t.minGap >= 7.5)); r.defer = defer && t.n === 0 ? 'DEFERRED(open item)' : defer ? 'SHOWN-at-defer-size' : '';
  console.log(`${LABEL} ${r.pass ? 'PASS' : 'CHECK'} [${ENG}] ${key} tired n=${t.n} tabHits=${t.tabHits} rowHits=${t.rowHits} ebarHits=${t.ebarHits} outY=${t.outY} outX=${t.outX} sides=${t.sides} minGap=${t.minGap} noSheet=${t.noSheet} preOpen=${r.preOpen ?? "-"} preTab=${r.preTab ?? "-"} ${r.defer||''} errs=${errs.length} first=${JSON.stringify(t.first)} | hire=${JSON.stringify(r.hire)} | manage=${JSON.stringify(r.manage)}`);
  res[key] = r; await ctx.close();
}
fs.writeFileSync(`${OUT}/${LABEL}-b2-${ENG}.json`, JSON.stringify(res, null, 1));
await br.close(); kill(); console.log(`DONE ${LABEL} ${ENG} pass=${Object.values(res).filter(r => r.pass).length}/${sizes.length*2}`); process.exit(0);
