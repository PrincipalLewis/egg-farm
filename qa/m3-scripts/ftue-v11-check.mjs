// QA FTUE v1.1 (art-ux/m3-ftue-spec.md §2.1 event gating + §2.2 Collect label). Usage: [ENGINE=webkit] [QUICK=1] node ftue-v11-check.mjs <worktree with dist-qa>
import { createRequire } from 'node:module'; import path from 'node:path'; import { spawn } from 'node:child_process';
const ROOT = process.argv[2], ENGINE = process.env.ENGINE ?? 'chromium';
const pw = createRequire(path.join(ROOT, 'package.json'))('playwright-core'); const port = 4450 + Math.floor(Math.random() * 40);
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true, cwd: ROOT });
await new Promise(r => setTimeout(r, 2500));
const b = ENGINE === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const R = []; const ok = (n, p, i) => R.push(`${p ? 'PASS' : 'FAIL'} [${ENGINE}] ${n}${i !== undefined ? ' — ' + JSON.stringify(i) : ''}`);
const open = async () => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${port}/`); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm); await p.waitForTimeout(200); return { ctx, p, errs }; };
const S = p => p.evaluate(() => { const L = document.querySelector('.onb-layer, #onb, [class*=onb]')?.closest('body') && document.querySelector('.onb-cap')?.parentElement; const cap = document.querySelector('.onb-cap'), ring = document.querySelector('.onb-ring'), hand = document.querySelector('.onb-hand'), skip = document.querySelector('.onb-skip');
  const vis = e => !!e && !e.hidden && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden' && e.getBoundingClientRect().width > 0;
  return { hintMode: !!L?.classList.contains('hint'), cap: vis(cap), txt: cap?.querySelector('.onb-txt')?.textContent ?? null, ring: vis(ring), hand: vis(hand), skip: vis(skip), collect: document.querySelector('#collect')?.innerText.replace(/\s+/g, ' ').trim() }; });
const set = (p, o) => p.evaluate(o => { const g = window.eggfarm; g.state = { ...g.state, ...o }; }, o);
const ev = p => p.evaluate(() => { try { return (window.eggfarm.telemetry?.events?.() ?? JSON.parse(localStorage.getItem('eggfarm.telemetry') || '[]')).filter(e => /onboarding|ftue/.test(e.type)); } catch { return []; } });
{ // gating walk-through
  const { ctx, p, errs } = await open();
  await set(p, { coop: 1, basket: 0, customers: [], nextCustomerInS: 30, coinsCents: 0 }); await p.waitForTimeout(250);
  let s = await S(p); ok('§2.2 Collect label = real eggs_per_tap with "N ready" when coop < per-tap', /^Collect \+5 · 1 ready/.test(s.collect), s.collect);
  ok('§2.1 collect gate closed (coop 1 < 5) -> wait hint, no ring/pointer, Skip visible', s.hintMode && s.cap && !s.ring && !s.hand && s.skip && /laying eggs/.test(s.txt), s);
  await set(p, { coop: 20 }); await p.waitForTimeout(250); s = await S(p);
  ok('§2.2 label with coop >= per-tap is "Collect +5"', /^Collect \+5$/.test(s.collect), s.collect);
  ok('collect gate open -> coach mark (ring + pointer)', !s.hintMode && s.ring && s.cap && /Collect/.test(s.txt), s);
  await p.locator('#collect').click(); await set(p, { customers: [], nextCustomerInS: 8 }); await p.waitForTimeout(300); s = await S(p);
  ok('sell step, no customer -> "A customer is on the way… N s" hint, no ring', s.hintMode && !s.ring && /customer is on the way… ?\d+ s/.test(s.txt), s);
  await set(p, { customers: [{ id: 7001, demand: 3, filled: 0, waitedS: 0 }], basket: 0, coop: 0 }); await p.waitForTimeout(300); s = await S(p);
  ok('customer but basket 0 -> hint "Collect some eggs to sell."', s.hintMode && !s.ring && /Collect some eggs/.test(s.txt), s);
  await set(p, { basket: 10 }); await p.waitForTimeout(300); s = await S(p);
  ok('customer + basket -> Sell coach mark', !s.hintMode && s.ring && /customer!.*sell/i.test(s.txt), s);
  await p.evaluate(() => { const g = window.eggfarm; g.dispatch({ type: 'sell', customerId: 7001, by: 'player' }); }).catch(() => {});
  await p.waitForTimeout(300); let st = await p.evaluate(() => window.eggfarm.state.customers.length);
  if (st) { await p.locator('[data-nav=market]').click().catch(() => {}); await p.waitForTimeout(300); await p.locator('#mRows .order button').first().click({ timeout: 2000 }).catch(() => {}); await p.locator('.sheet:not([hidden]) .close').click().catch(() => {}); }
  await set(p, { coinsCents: 0 }); await p.waitForTimeout(400); s = await S(p);
  ok('buy step, unaffordable -> "Sell a few more eggs to afford it · $X to go", no ring', s.hintMode && !s.ring && /afford it · \$\d+ to go/.test(s.txt), s);
  await set(p, { coinsCents: 1e6 }); await p.waitForTimeout(400); s = await S(p);
  ok('buy affordable -> Buy coach mark', !s.hintMode && s.ring && /Spend coins/i.test(s.txt), s);
  ok('no page errors', errs.length === 0, errs); await ctx.close();
}
if (!process.env.QUICK) { // 15 s hide + 60 s timeout skip on a closed Sell gate
  const { ctx, p } = await open(); await set(p, { coop: 20 }); await p.waitForTimeout(250); await p.locator('#collect').click();
  const hold = setInterval(() => set(p, { customers: [], nextCustomerInS: 999 }).catch(() => {}), 500);
  await p.waitForTimeout(5000); const a = await S(p); await p.waitForTimeout(12000); const c = await S(p);
  ok('wait hint visible at 5 s, auto-hidden after 15 s (Skip stays)', a.cap && /on the way/.test(a.txt) && !c.cap, { at5: a, at17: c });
  await p.waitForTimeout(46000); clearInterval(hold); await set(p, { coinsCents: 0 }); await p.waitForTimeout(500);
  const e = await ev(p), d = await S(p);
  ok('closed 60 s -> step skipped silently, onboarding_step {timeout:true} logged, now on Buy', e.some(x => x.timeout === true && (x.step === 2 || x.name === 'sell' || x.k === 'sell' || /sell/.test(JSON.stringify(x)))) && /afford|Spend coins/i.test(d.txt ?? ''), { events: e.slice(-4), now: d });
  await ctx.close();
}
console.log(R.join('\n')); console.log(`${R.filter(x => x.startsWith('PASS')).length}/${R.length} passed`);
await b.close(); process.kill(-srv.pid); process.exit(R.some(x => x.startsWith('FAIL')) ? 1 : 0);
