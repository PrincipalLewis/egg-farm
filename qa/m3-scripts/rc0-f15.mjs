// QA rc0: Art & UX F1–F5 (art-ux/reviews/rc0-pt1-13-queue-review.md). Usage: PORT=.. ENGINE=.. node rc0-f15.mjs <worktree>
import { createRequire } from 'node:module'; import { spawn } from 'node:child_process'; import fs from 'node:fs';
const ROOT = process.argv[2], ENGINE = process.env.ENGINE ?? 'chromium', port = +(process.env.PORT ?? 4800);
const pw = createRequire(ROOT + '/package.json')('playwright-core'); const OUT = '/workspace/egg-farm-studio/qa/m3-rc0/shots/f1-f5'; fs.mkdirSync(OUT, { recursive: true });
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-qa', '--port', '' + port, '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore', detached: true, cwd: ROOT });
for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 250)); } }
const br = ENGINE === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const R = []; const ok = (n, p, i) => { R.push({ n, pass: !!p, i }); console.log(`${p ? 'PASS' : 'FAIL'} [${ENGINE}] ${n} — ${JSON.stringify(i)}`); };
async function page(w, h, F, n, basket = 0, seen = 99) {
  const ctx = await br.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage();
  await p.addInitScript(seen => localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sessions: 1, seenSlots: seen })), seen);
  await p.goto(`http://127.0.0.1:${port}/`); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm);
  await p.evaluate(([F, n, basket]) => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: F, collectionLevel: 20, coop: 0, basket, coinsCents: 0, customers: Array.from({ length: n }, (_, i) => ({ id: 9000 + i, demand: 50 + i, filled: 0, waitedS: i * 2.5 })), nextCustomerId: 9100, nextCustomerInS: 999 }; }, [F, n, basket]);
  await p.waitForTimeout(2600); return { ctx, p };
}
{ // F2/F3/F4/F5 at 390x844, F24, 10 customers, empty basket
  const { ctx, p } = await page(390, 844, 24, 10);
  const strip = await p.evaluate(() => ({ chips: document.querySelectorAll('#queue .chip.arrive').length, more: document.querySelector('#queue .chip.more')?.textContent?.trim() }));
  await p.evaluate(() => document.querySelector('nav [data-nav=market]').click()); await p.waitForTimeout(2300);
  const m = await p.evaluate(() => ({ cards: document.querySelectorAll('#mRows .order[data-row]').length, more: document.querySelector('#mRows .queue-more')?.textContent?.trim(), text: document.getElementById('mRows').innerText, sell: document.getElementById('sellAll').innerText }));
  ok('F2 no "$0.00" anywhere in Market (empty basket)', !/\$0\.00/.test(m.text + m.sell), { sell: m.sell });
  ok('F3 390x844 Market shows 5 cards', m.cards === 5, { cards: m.cards });
  const lines = (m.text.replace(/\n/g, '').match(/\d+\/\d+ eggs.{0,4}\$[\d.,KMB]+/g) ?? []);
  ok('F4 order line "{have}/{want} eggs · ${value}" with spaced separator', lines.length > 0 && lines.every(l => / · \$/.test(l)), lines.length ? lines.slice(0, 3) : m.text.slice(0, 300));
  const n1 = +(strip.more ?? '').replace(/\D/g, ''), n2 = +(m.more ?? '').replace(/\D/g, '');
  ok('F5 strip "+N" and Market "+N waiting" add up to the same queue of 10', strip.chips + n1 === 10 && m.cards + n2 === 10, { strip, market: { cards: m.cards, more: m.more } });
  await p.screenshot({ path: `${OUT}/market-390-${ENGINE}.png` }); await ctx.close();
}
{ // F1: L4 -> L5 farm upgrade (slot gain) toast below the strip, slot copy only on real gain; L5->L6 no slot copy
  for (const [F, label] of [[4, 'real slot gain'], [5, 'no slot gain']]) {
    const { ctx, p } = await page(390, 844, F, 8, 0, F === 4 ? 6 : 7); await p.evaluate(() => { window.eggfarm.state.coinsCents = 1e12; });
    await p.evaluate(() => window.eggfarm.dispatch({ type: 'buyFarm' })); await p.waitForTimeout(400);
    const r = await p.evaluate(() => { const t = [...document.querySelectorAll('.toast, [class*=toast]')].find(e => /Coop upgraded/i.test(e.textContent)); const q = document.getElementById('queue').getBoundingClientRect(); if (!t) return null; const b = t.getBoundingClientRect(); return { text: t.textContent.trim(), top: b.top, queueBottom: q.bottom, overlaps: !(b.top >= q.bottom || b.bottom <= q.top) }; });
    await p.screenshot({ path: `${OUT}/f1-farm${F + 1}-${ENGINE}.png` });
    ok(`F1 Farm L${F}->L${F + 1} (${label}): toast not over the queue strip; slot copy ${F === 4 ? 'present' : 'absent'}`, r && !r.overlaps && (F === 4 ? /slot/i.test(r.text) : !/slot/i.test(r.text)), r); await ctx.close();
  }
}
fs.writeFileSync(`/workspace/egg-farm-studio/qa/m3-rc0/f1-f5-${ENGINE}.json`, JSON.stringify(R, null, 1)); await br.close(); try { process.kill(-srv.pid); } catch {}
console.log(`TOTAL ${R.filter(r => r.pass).length}/${R.length}`); process.exit(0);
