// [v5-ui harness, NEW 2026-10-29] M5.1 zero-gain (ZG) unit/property lane, spec product/collection/m5.1-zero-gain-purchase-ui.md v0.3.5
// sha1 1098f14e100edb0e80b43a099777be22fa13fd04. Runs the RC's OWN modules (no repo edits): cd $QA_WT && npx vite-node <this> -- <WT> <out.json>
// Covers: §9 fixture preconditions (FX-L30, FX-L30u, FX-FLIP, FX-H20, FX-FARM0, FX-F27 substitute search), ZG-AC1 (zeroGainVerdict pairs),
// ZG-AC2 (exempt keys), ZG-AC3 unit, ZG-AC7 property (fixtures; trace states only if the RC exposes an observe hook), ZG-AC20 parity on
// fixtures + grid. Symbols that do not exist yet (isZeroGain / zeroGainVerdict) are located by scanning src/ for their export; if absent
// the case is recorded "UNVERIFIED-UNTIL-RC (symbol missing)" (never PASS). Writes precheck JSON consumed by the browser probe zg.mjs.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'; import { join } from 'node:path';
const [WT, OUT] = process.argv.slice(-2); const FXD = new URL('../fixtures/zg/', import.meta.url).pathname;
const { balance } = await import(WT + '/src/config/balance.ts'); const bb = await import(WT + '/src/econ/best-buy.ts');
const inc = await import(WT + '/src/econ/income.ts'); const fm = await import(WT + '/src/config/formulas.ts'); const st = await import(WT + '/src/sim/state.ts');
const b: any = { ...balance, m4: { ...(balance as any).m4, enabled: 1, flags: { ...((balance as any).m4?.flags ?? {}), breeds: 0 } } };
const res: any = { spec: 'm5.1-zero-gain-purchase-ui.md v0.3.5 1098f14e', wt: WT, checks: [], fixtures: {}, symbols: {} };
const ok = (id: string, name: string, pass: boolean | 'UNVERIFIED', info: any = {}) => { res.checks.push({ id, name, pass, info }); console.log(`${pass === true ? 'PASS' : pass === 'UNVERIFIED' ? 'UNVERIFIED-UNTIL-RC' : 'FAIL'} ${id}: ${name}`); };
// locate ZG symbols in the RC
const files: string[] = []; const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.ts$/.test(f) && files.push(p); } }; walk(WT + '/src');
const find = (sym: string) => files.find(f => new RegExp(`export\\s+(function|const)\\s+${sym}\\b`).test(readFileSync(f, 'utf8')));
let zgv: any = null, isZG: any = null; for (const sym of ['zeroGainVerdict', 'isZeroGain']) { const f = find(sym); res.symbols[sym] = f?.replace(WT + '/', '') ?? null; if (f) { const m = await import(f); sym === 'zeroGainVerdict' ? zgv = m[sym] : isZG = m[sym]; } }
const flagKeys = { zeroGainUi: (balance as any).m4?.flags?.zeroGainUi ?? null, confirm: (balance as any).m4?.zeroGain?.confirm ?? null, bestBuyV2: (balance as any).m4?.flags?.bestBuyV2 ?? null };
res.flags_in_shipped_balance = flagKeys;
const W = { energy: 100, cdS: 0 };
const mk = (f: any, coins: number) => { const tiers = b.workers.grader.tiers; const s0: any = st.initialState(b, 1);
  return { ...s0, farmLevel: f.farmLevel, hensLevel: f.hensLevel, eggValueLevel: f.eggValueLevel, collectionLevel: f.collectionLevel, graderTier: f.graderTier === 'tiers.length' ? tiers.length : f.graderTier, workers: f.workers, coinsCents: coins, tracksV7: 1 }; };
const gain = (s: any, k: string) => bb.optionGain(s, b, k)?.gain ?? null; const opts = (s: any) => bb.options(s, b); const opt = (s: any, k: string) => opts(s).find((o: any) => o.key === k);
const aff = (s: any, k: string) => { const o = opt(s, k); return !!o && s.coinsCents >= Math.round(o.cost * 100); };
const dCap = (s: any, k: string) => { const o = opt(s, k); return o ? fm.trackCoopCapacity(o.after.farmLevel, o.after.hensLevel, b) - fm.trackCoopCapacity(s.farmLevel, s.hensLevel, b) : null; };
const oracle = (s: any, k: string) => { if (!['COLL', 'HENS', 'VALUE'].includes(k)) return false; const o = opt(s, k); if (!o) return null;
  const i0 = inc.incomePerSec(s, b, { assumeWorking: true }), i1 = inc.incomePerSec(o.after, b, { assumeWorking: true }); return i1 <= i0 && (dCap(s, k) ?? 0) <= 0; };
const fx = (id: string) => JSON.parse(readFileSync(FXD + id + '.json', 'utf8'));
const states: Record<string, any> = {};
// Wage-drain margin (2026-10-29 fix): in the live page 4 paid workers drain ~$1.2/s between setS and the tap, so a bare cost+1¢ fixture
// turned unaffordable before the ZG-AC9 tap (dry-run 22eac98: coins 324518501 -> 324518426 < cost 324518500, Buy aria-disabled). Fixtures whose
// rule is 'just affordable' get +DRAIN cents; every precondition below is re-checked WITH the margin (FARM stays unaffordable etc.).
const DRAIN = +(process.env.QA_DRAIN_CENTS ?? 2000);
// ---- fixtures (current picker; BBv2 run N/A: m4.flags.bestBuyV2 ships 0 (HoQA Q8)) ----
{ const f = fx('FX-L30'); let s = mk(f.state, 0); s = { ...s, coinsCents: Math.round(opt(s, 'COLL').cost * 100) + 1 + DRAIN }; states['FX-L30'] = s;
  const keys = opts(s).map((o: any) => o.key); ok('FX-L30', `options == [COLL] (got ${keys}); gain(COLL)=${gain(s, 'COLL')} <= 0; COLL affordable`, keys.join() === 'COLL' && gain(s, 'COLL')! <= 0 && aff(s, 'COLL'), { keys, gain: gain(s, 'COLL') }); }
{ const f = fx('FX-L30u'); const s = mk(f.state, f.coins.cents + DRAIN); states['FX-L30u'] = s; const keys = opts(s).map((o: any) => o.key).sort();
  ok('FX-L30u', `options {FARM,COLL} (got ${keys}); gain(COLL)<=0; COLL affordable; FARM not`, keys.join() === 'COLL,FARM' && gain(s, 'COLL')! <= 0 && aff(s, 'COLL') && !aff(s, 'FARM'), { keys, gC: gain(s, 'COLL'), gF: gain(s, 'FARM'), costs: opts(s).map((o: any) => [o.key, o.cost]) }); }
{ const f = fx('FX-FLIP'); let s = mk(f.state, 0); const c0 = opt(s, 'COLL').cost; const after0 = opt(s, 'COLL').after; const c1 = opt(after0, 'COLL').cost; const h1 = opt(after0, 'HENS')?.cost ?? 0;
  const coins = Math.round((c0 + Math.max(c1, h1)) * 100) + 1 + DRAIN; s = { ...s, coinsCents: coins }; states['FX-FLIP'] = s; const farm = opt(s, 'FARM').cost;
  const a = { ...opt(s, 'COLL').after, coinsCents: coins - Math.round(c0 * 100) }; states['FX-FLIP-after'] = a;
  ok('FX-FLIP', `before: gain(COLL)=${gain(s, 'COLL')} > 0, gain(HENS)=${gain(s, 'HENS')} <= 0; W1 offered gain<0 (${gain(s, 'W1')})`, gain(s, 'COLL')! > 0 && gain(s, 'HENS')! <= 0 && gain(s, 'W1') !== null && gain(s, 'W1')! < 0);
  ok('FX-FLIP', `after 1 COLL buy: gain(COLL)=${gain(a, 'COLL')} <= 0, gain(HENS)=${gain(a, 'HENS')} > 0, HENS affordable, coins >= C1 cost and < Farm cost (${a.coinsCents} vs ${c1 * 100}/${farm * 100})`,
    gain(a, 'COLL')! <= 0 && gain(a, 'HENS')! > 0 && aff(a, 'HENS') && a.coinsCents >= c1 * 100 && a.coinsCents < farm * 100, { coins, c0, c1, h1, farm }); }
{ const f = fx('FX-H20'); const s = mk(f.state, f.coins.cents); states['FX-H20'] = s;
  ok('FX-H20', `HENS offered, gain(HENS)=${gain(s, 'HENS')} <= 0, dCap=${dCap(s, 'HENS')} > 0 (spec +225), gain(COLL)=${gain(s, 'COLL')} > 0`, !!opt(s, 'HENS') && gain(s, 'HENS')! <= 0 && dCap(s, 'HENS')! > 0 && gain(s, 'COLL')! > 0, { dCap: dCap(s, 'HENS') }); }
{ const f = fx('FX-FARM0'); const s = mk(f.state, 0); states['FX-FARM0'] = s; ok('FX-FARM0', `FARM offered, gain(FARM)=${gain(s, 'FARM')} <= 0`, !!opt(s, 'FARM') && gain(s, 'FARM')! <= 0); }
// FX-F27: trace hook needed; substitute grid search (layout-only, labelled FX-F27s)
{ let sub: any = null; outer: for (let F = 27; F <= 29; F++) for (let H = F - 3; H <= Math.min(30, F + 3); H++) for (let C = 0; C <= 27; C++) for (const V of [F - 2, F, Math.min(30, F + 3)]) { const s = { ...mk({ farmLevel: F, hensLevel: H, eggValueLevel: V, collectionLevel: C, graderTier: 'tiers.length', workers: { market_hand: W, coop_hand: W, hawker: W, grader: W } }, 0) };
    const sc = { ...s, coinsCents: 1e13 }; if (!opt(sc, 'COLL') || gain(sc, 'COLL')! > 0) continue; const cc = Math.round(opt(sc, 'COLL').cost * 100); const s2 = { ...s, coinsCents: cc + 1 };
    const nonZG = opts(s2).filter((o: any) => !oracle(s2, o.key) && aff(s2, o.key)); if (nonZG.length) { sub = { s: s2, nonZG: nonZG.map((o: any) => o.key) }; break outer; } }
  const hook = files.find(f => /observe/i.test(f) && /bot/i.test(f)) ?? null; res.fixtures['FX-F27'] = { traceHook: hook, substitute: sub ? { F: sub.s.farmLevel, H: sub.s.hensLevel, V: sub.s.eggValueLevel, C: sub.s.collectionLevel, coins: sub.s.coinsCents, nonZG: sub.nonZG } : null };
  if (sub) states['FX-F27s'] = sub.s; ok('FX-F27', 'FX-F27 from the committed AC7 trace (tests/bot-m4.ts seed 1 seller15, observe-only hook)', hook ? 'UNVERIFIED' : 'UNVERIFIED', { hook, note: 'trace derivation runs in zg-trace step when the hook exists; substitute FX-F27s is layout-only' }); }
// ---- ZG-AC1 verdict seam ----
if (zgv) { const T: [number, number, number, boolean | 'throw'][] = [[100, 100, 0, true], [100, 100 - 1e-6, 0, true], [100, 100 + 1e-12, 0, false], [1e15, 1e15 + 0.125, 0, false], [100, 100, 1, false], [100, 101, 0, false], [NaN, 100, 0, 'throw'], [100, NaN, 0, 'throw'], [Infinity, 100, 0, 'throw'], [100, -Infinity, 0, 'throw'], [2 ** 53 + 2, 100, 0, 'throw']];
  for (const [a, c, d, want] of T) { let got: any; try { got = zgv(a, c, d); } catch { got = 'throw'; } ok('ZG-AC1', `zeroGainVerdict(${a}, ${c}, ${d}) -> ${want} (got ${got})`, got === want || (want === 'throw' && got === false && process.env.ZG_ASSERT_FREE === '1'), { got }); } }
else ok('ZG-AC1', 'zeroGainVerdict export exists', 'UNVERIFIED', { note: 'symbol missing on this SHA' });
// ---- ZG-AC2 / AC3 / AC20 on fixtures; ZG-AC7 perturbation property ----
for (const [id, s] of Object.entries(states)) for (const o of opts(s)) {
  const want = oracle(s, o.key); res.fixtures[id] = res.fixtures[id] ?? {}; res.fixtures[id][o.key] = { gain: gain(s, o.key), dCap: dCap(s, o.key), oracleZG: want, cost: o.cost, affordable: aff(s, o.key) };
  if (isZG) { const got = isZG(s, b, o.key);
    if (['FARM', 'W1', 'W2', 'W3', 'W4'].includes(o.key)) ok('ZG-AC2', `${id} ${o.key} exempt -> isZeroGain false`, got === false, { got, gain: gain(s, o.key) });
    else ok('ZG-AC20', `${id} ${o.key}: isZeroGain == oracle (incomePerSec after<=before && dCap<=0) -> ${want}`, got === want, { got, want });
    const s0 = JSON.stringify(s); const ps: boolean[] = []; let r = 7 + o.key.length;
    for (let i = 0; i < 20; i++) { r = (r * 1103515245 + 12345) >>> 0; const p = { ...s, coinsCents: r % 1e9, rng: r, workers: Object.fromEntries(Object.entries(s.workers).map(([k, w]: any) => [k, { ...w, energy: (r >> 3) % 101 }])) }; ps.push(isZG(p, b, o.key) === got); }
    ok('ZG-AC7', `${id} ${o.key}: 20 perturbations (coins, energy, rng) keep isZeroGain; s deep-equal after calls`, ps.every(Boolean) && JSON.stringify(s) === s0); } }
if (!isZG) ok('ZG-AC2/3/7/20', 'isZeroGain export exists', 'UNVERIFIED', { note: 'symbol missing on this SHA; fixture oracle values recorded in fixtures{}' });
if (isZG && states['FX-H20']) ok('ZG-AC3', 'FX-H20: isZeroGain(HENS) false (capacity partial gain)', isZG(states['FX-H20'], b, 'HENS') === false);
res.states = Object.fromEntries(Object.entries(states).map(([k, s]: any) => [k, { farmLevel: s.farmLevel, hensLevel: s.hensLevel, eggValueLevel: s.eggValueLevel, collectionLevel: s.collectionLevel, graderTier: s.graderTier, workers: s.workers, coinsCents: s.coinsCents }]));
const n = (p: any) => res.checks.filter((c: any) => c.pass === p).length; res.summary = { pass: n(true), fail: n(false), unverified: n('UNVERIFIED') };
(res as any).drainMarginCents = DRAIN; writeFileSync(OUT, JSON.stringify(res, null, 1)); console.log('DONE zg-unit', JSON.stringify(res.summary), 'symbols', JSON.stringify(res.symbols), 'flags', JSON.stringify(flagKeys));
