// MK-59a harness: shipped game sim (src/sim) + Economy's seller15 player (svs_mh.py run_m2, var=VAR_DEFAULT), progression T=3600.
// Usage: REPO=<worktree> vite-node harness.ts -- <seedFrom> <seedTo> <out.json>   (see run-sha.sh to run by build SHA)
// v2 (2026-10-17): also records per-Farm-level income (sell events, bucketed by farmLevel at the sale) -> inc[L] cents.
const REPO = process.env.REPO!;
const { step } = await import(`${REPO}/src/sim/tick.ts`);
const { apply } = await import(`${REPO}/src/sim/actions.ts`);
const { initialState, collectionCost, farmCost } = await import(`${REPO}/src/sim/state.ts`);
const W = await import(`${REPO}/src/sim/workers.ts`);
const raw = (await import(`${REPO}/src/config/balance.json`, { with: { type: 'json' } })).default;
import { writeFileSync } from 'node:fs';
const b: any = { ...structuredClone(raw), sim_test: { poisson_arrivals: true } };
if (process.env.MH_EVERY) b.workers.market_hand.every_s = +process.env.MH_EVERY; // perturbed variant for paired-SD estimate only // VAR_DEFAULT poisson=True
// ---- Python random.Random port (MT19937 + random(), lognormvariate, uniform) for the variance stream _V ----
import { PyRandom } from './pyrandom.ts';
const VAR = { check_mean_s: 15, check_sigma: 0.35, check_min_s: 5, check_max_s: 60, tap_skill_sigma: 0.15, tap_skill_lo: 0.6, tap_skill_hi: 1.4, tap_jitter: 0.25, p_delay: 0.1, p_cheap_first: 0.1 };
const COLL_SHARE = 0.5, SELL_EVERY = 15, T = 3600, dt = 1 / b.tickHz, MANAGE_AT = b.workers.energy.manage_prompt_threshold * 100;
function run(seed: number) {
  const r = new PyRandom(1_000_003 * (seed + 1) + 17);
  const skill = Math.min(VAR.tap_skill_hi, Math.max(VAR.tap_skill_lo, r.lognorm(0, VAR.tap_skill_sigma)));
  const check = () => Math.min(VAR.check_max_s, Math.max(VAR.check_min_s, SELL_EVERY / 15 * VAR.check_mean_s * r.lognorm(0, VAR.check_sigma)));
  let s = initialState(b, seed); let tapT = 1.0, sellT = check();
  const arrLv = new Map<number, number>(), spawn: number[] = [], filled: number[] = [], reach: Record<number, number> = { 0: 0 }, inc: Record<number, number> = {};
  const n = Math.round(T / dt);
  for (let i = 1; i <= n; i++) {
    const t = Math.round(i * dt * 10) / 10, ev: any[] = [], L = s.farmLevel;
    s = step(s, dt, b, ev);
    let pt = t >= sellT - 1e-9; if (pt) sellT = t + check();
    if (t >= tapT - 1e-9) { tapT += (1 / skill) * r.uniform(1 - VAR.tap_jitter, 1 + VAR.tap_jitter); s = apply(s, { type: 'collect' }, b, ev); }
    if (pt) {
      s = apply(s, { type: 'sellAll' }, b, ev);
      const low = W.WORKERS.filter((id: string) => s.workers[id] && s.workers[id].energy <= MANAGE_AT);
      if (low.length && s.manageCdS <= 1e-9) {
        if (W.showManageAll(s.workers, b)) s = apply(s, { type: 'manageAll' }, b, ev);
        else { const w = low.reduce((a: string, c: string) => s.workers[c].energy < s.workers[a].energy ? c : a); s = apply(s, { type: 'manage', worker: w }, b, ev); }
      }
      if (r.random() < VAR.p_delay) pt = false;
    }
    if (pt) {
      let chf = r.random() < VAR.p_cheap_first;
      for (;;) {
        const before = s; let bought = false;
        for (const id of ['market_hand', 'coop_hand', 'hawker']) { const x = apply(s, { type: 'hire', worker: id }, b, ev); if (x !== s) { s = x; bought = true; } }
        { const x = apply(s, { type: 'buyGraderTier' }, b, ev); if (x !== s) { s = x; bought = true; } }
        const f = s.farmLevel, c = s.collectionLevel, coins = s.coinsCents;
        const fc = f < 30 ? farmCost(f, b) * 100 : Infinity, cc = c < 30 ? collectionCost(c, b) * 100 : Infinity;
        let kind: string | null = null;
        if (chf && coins >= cc && c < 30) { kind = 'c'; chf = false; }
        else if (coins >= fc) kind = 'f'; else if (coins >= cc && cc <= COLL_SHARE * fc) kind = 'c';
        if (kind === 'f') { s = apply(s, { type: 'buyFarm' }, b, ev); reach[s.farmLevel] = t; } else if (kind === 'c') s = apply(s, { type: 'buyCollection' }, b, ev);
        if (!kind && !bought) break; if (s === before) break;
      }
    }
    for (const e of ev) {
      if (e.type === 'sell') inc[e.lvl ?? L] = (inc[e.lvl ?? L] ?? 0) + e.value;
      if (e.type === 'customer_arrive') { arrLv.set(e.id, L); spawn.push(L); }
      else if (e.type === 'customer_lost' && e.reason === 'full_queue') spawn.push(L);
      else if (e.type === 'customer_served') filled.push(arrLv.get(e.id)!);
    }
  }
  return { seed, reach, spawn, filled, inc };
}
const [a, z, out] = process.argv.slice(-3); const R = [];
for (let sd = +a; sd <= +z; sd++) R.push(run(sd));
writeFileSync(out, JSON.stringify(R));
