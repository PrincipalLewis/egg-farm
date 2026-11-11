// QA-owned SS-15 / P-1 property test + SS-27 working-path check + SS-28 unit: head (30b29d3) vs base (5d9efa6), 10^4 random states, seeds 0..99 (100 states/seed).
// usage: cd /tmp/qa-p1-30b29d3 && npx vite-node <this> -- /tmp/qa-p1-30b29d3 /tmp/qa-p1-base-5d9efa6
const [HEAD, BASE] = process.argv.slice(-2);
const hb = (await import(HEAD + '/src/config/balance.ts')).balance, bb = (await import(BASE + '/src/config/balance.ts')).balance;
const hi = await import(HEAD + '/src/econ/income.ts'), bi = await import(BASE + '/src/econ/income.ts');
const hbb = await import(HEAD + '/src/econ/best-buy.ts'), bbb = await import(BASE + '/src/econ/best-buy.ts');
const { initialState } = await import(HEAD + '/src/sim/state.ts'); const { initialState: initB } = await import(BASE + '/src/sim/state.ts');
const { mood, isOff } = await import(HEAD + '/src/sim/workers.ts');
let rng = 1; const R = () => { rng = (rng * 1103515245 + 12345) >>> 0; return rng / 2 ** 32; }; const I = (a: number, z: number) => a + Math.floor(R() * (z - a + 1));
const ids = ['market_hand', 'coop_hand', 'hawker', 'grader'] as const;
const c = { stalled: 0, stalledOk: 0, other: 0, otherOk: 0, nan: 0, working: 0, workingOk: 0, pickOk: 0, eta: 0, etaOk: 0, byMood: {} as Record<string, number> }; const bad: unknown[] = [];
for (let seed = 0; seed <= 99; seed++) { rng = seed * 7919 + 1;
  for (let k = 0; k < 100; k++) {
    const F = I(0, 30), w: any = {};
    for (const id of ids) if (R() < 0.6) { const e = [0, 0, I(0, 29), I(30, 50), I(51, 100), 100][I(0, 5)]; w[id] = { energy: e, cdS: I(0, 5), ...(R() < 0.2 && (id === 'market_hand' || id === 'coop_hand') ? { unpaid: true } : {}), ...(id === 'market_hand' && R() < 0.1 ? { paused: true } : {}) }; }
    const patch = { farmLevel: F, collectionLevel: I(0, 30), hensLevel: Math.min(30, I(0, F + 3)), eggValueLevel: I(0, 30), graderTier: I(0, 2), coinsCents: I(0, 1e9), coop: I(0, 500), basket: I(0, 500), workers: w };
    const sh = { ...initialState(hb, 1), ...patch } as any, sb = { ...initB(bb, 1), ...patch } as any;
    const lh = hi.incomePerSec(sh, hb), lb = bi.incomePerSec(sb, bb), wh = hi.wagesPerSec(sh, hb);
    if (!Number.isFinite(lh)) c.nan++;
    const mh = w.market_hand, m = mh ? mood(mh, hb) : 'none'; c.byMood[(mh?.paused ? 'paused-' : '') + m] = (c.byMood[(mh?.paused ? 'paused-' : '') + m] ?? 0) + 1;
    if (mh && !mh.paused && isOff(m)) { c.stalled++; if (lh === -wh && wh === bi.wagesPerSec(sb, bb)) c.stalledOk++; else bad.push({ seed, k, t: 'stalled', lh, wh }); }
    else { c.other++; if (Object.is(lh, lb)) c.otherOk++; else bad.push({ seed, k, t: 'other', lh, lb, m }); }
    c.working++; const ah = hi.incomePerSec(sh, hb, { assumeWorking: true }), ab = bi.incomePerSec(sb, bb, { assumeWorking: true }); if (Object.is(ah, ab)) c.workingOk++; else bad.push({ seed, k, t: 'working', ah, ab });
    const ph = hbb.bestBuy(sh, hb), pb = bbb.bestBuy(sb, bb); if (JSON.stringify(ph?.key ?? null) === JSON.stringify(pb?.key ?? null) && Object.is(ph?.gain, pb?.gain)) c.pickOk++; else bad.push({ seed, k, t: 'pick', ph: ph?.key, pb: pb?.key });
    if (mh && !mh.paused && isOff(m) && lh <= 0) { c.eta++; if (hi.secondsToAffordSteady(sh, hb, 1e6) === null) c.etaOk++; }
  } }
console.log('SS15 ' + JSON.stringify(c)); console.log('BAD ' + JSON.stringify(bad.slice(0, 10)) + ' total ' + bad.length);
// SS-28 fixture: MH asleep F10
const s10 = { ...initialState(hb, 1), farmLevel: 10, collectionLevel: 5, coinsCents: 100, workers: { market_hand: { energy: 0, cdS: 0 } } } as any;
console.log('SS28 F10 MH asleep: incomePerSec ' + hi.incomePerSec(s10, hb) + ' secondsToAffordSteady(need $100) ' + hi.secondsToAffordSteady(s10, hb, 10000));
process.exit(bad.length || c.nan ? 1 : 0);
