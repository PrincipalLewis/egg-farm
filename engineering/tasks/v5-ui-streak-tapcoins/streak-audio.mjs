// Hire 3 streak audio check (2026-11-10): combo-tiers §1 "the tier sting replaces that tap's collect" + R16 tier pitch, read from
// F6 v1.0 eggfarmQa.audio.log (one entry per sound actually started; only collect/streak* hooks are compared, other game sounds can coincide). Same trial build as streak-browser.mjs; sfx ON. ENGINE=chromium|firefox|webkit
import pw from 'playwright-core'; import { serveForRun } from './scripts/serve-own.mjs';
const ENGINE = process.env.ENGINE ?? 'chromium', srv = await serveForRun('dist-qa', `streak-audio-${ENGINE}`);
const br = await (ENGINE === 'chromium' ? pw.chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] }) : pw[ENGINE].launch());
let bad = 0; const errors = [];
const ok = (n, p, i = {}) => { if (!p) bad++; console.log(`${p ? 'PASS' : 'FAIL'} [${ENGINE}] ${n} ${JSON.stringify(i)}`); };
const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => localStorage.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: true, reducedMotion: false, seenSlots: 3 })));
const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
await p.goto(srv.url); await p.getByText('Tap to start').click(); await p.waitForFunction(() => window.eggfarm && window.eggfarmUi && window.eggfarmQa); await p.waitForTimeout(2500);
const wb = p.locator('#wbCollect'); if (await wb.isVisible().catch(() => false)) { await wb.click(); await p.waitForTimeout(200); }
await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, farmLevel: 8, coinsCents: 500000, coop: 200 }; window.eggfarmUi.render(); });
const tapLog = async () => { await p.waitForTimeout(1050); const n = await p.evaluate(() => window.eggfarmQa.audio.log.length); await p.locator('#collect').click(); await p.waitForTimeout(120);
  return p.evaluate(n => window.eggfarmQa.audio.log.slice(n).filter(e => /^(collect|streak)/.test(e.hook)).map(e => `${e.hook}:${e.semi ?? 0}`), n); };
const taps = []; for (let i = 0; i < 8; i++) taps.push(await tapLog());
console.log(JSON.stringify(taps));
ok('taps 1-6 (tier 0): one collect at semi 0 each', taps.slice(0, 6).every(t => t.length === 1 && t[0] === 'collect:0'), taps.slice(0, 6));
ok('tap 7 (tier-up 1): streakTier1 sting, NO collect (§1)', taps[6].includes('streakTier1:0') && !taps[6].some(h => h.startsWith('collect')), taps[6]);
ok('tap 8 (tier 1): collect at +1 semitone (R16)', taps[7].length === 1 && taps[7][0] === 'collect:1', taps[7]);
await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, streakS: 0.13, streakHoldS: 3, coop: 200 }; window.eggfarmUi.render(); });
const t2 = await tapLog(), t2b = await tapLog();
ok('tier-up 2: streakTier2, NO collect; next tap collect +2', t2.includes('streakTier2:0') && !t2.some(h => h.startsWith('collect')) && t2b[0] === 'collect:2', { t2, t2b });
await p.evaluate(() => { const g = window.eggfarm; g.state = { ...g.state, streakS: 0.27, streakHoldS: 3, coop: 200 }; window.eggfarmUi.render(); });
const tm = await tapLog(), tmb = await tapLog();
ok('MAX: streakMax, NO collect; next tap collect +4 (cap)', tm.includes('streakMax:0') && !tm.some(h => h.startsWith('collect')) && tmb[0] === 'collect:4', { tm, tmb });
ok('no page errors', errors.length === 0, errors);
await br.close(); await srv.close?.(); console.log(`${ENGINE} audio: ${bad ? `${bad} FAIL` : 'all PASS'}`); process.exit(bad ? 1 : 0);
