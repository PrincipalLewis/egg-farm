// SCRATCH M5.2 pressure-metric driver: at_pct 30 shipping (reserve 0, rest off, clock on), CFG on (auto-only) / off (flag-off manual MANAT 32), PERT 0 / 1 / -1.
// Env CSV (default 8dc90e2b m50-draft; added 2026-10-25 for the o1a re-run). Writes one JSON line per seed: seed, t10, t30, start, st/ex/el per-second strings (chr(48+x)), pertT. Env: PROFS CFGS PERT SEEDS S0 OUT
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { run, PROFS, Stack, RC2 } from './m5p';
import { parseEconomyCsv, buildBalance, readEconomyConfig } from './scripts/sync-economy';
import { validateBalance, type Balance } from './src/config/balance';
const b = validateBalance(buildBalance(parseEconomyCsv(readFileSync(process.env.CSV ?? '../../v2-econ/economy.m50-draft.csv', 'utf8')), JSON.parse(readFileSync('./src/config/balance.json', 'utf8')), readEconomyConfig() as any) as Balance, false);
(b as any).__clockWage = true; (b as any).__payWage = false;
const S: Stack = { on: true, streakCap: 0.28, tapShare: 0.03, broody: true, golden: { gapMin: 120, gapMax: 300 }, abil: true, sweep: 'A', sweepMult: 1.15, pause: false, warm: true, ssZero: true, hold: true };
const rcMan: RC2 = { cost: 10, manual: true, manAt: 32, auto: null }, rcAuto: RC2 = { ...rcMan, manual: false, auto: { at: 30, reserve: 0, rest: false, waive0: false } };
const E = process.env, NS = +(E.SEEDS ?? 200), S0 = +(E.S0 ?? 1), PERT = +(E.PERT ?? 0), OUT = E.OUT!;
const enc = (a: number[]) => String.fromCharCode(...a.map(x => 48 + x));
for (const pf of (E.PROFS ?? 'optimal,seller15,casual').split(',')) for (const ck of (E.CFGS ?? 'on,off').split(',')) {
  const f = `${OUT}.${pf}.${ck}.p${PERT}.jsonl`; writeFileSync(f, '');
  for (let i = 0; i < NS; i++) { const seed = S0 + i; const z = { start: -1, st: [] as number[], ex: [] as number[], el: [] as number[], pertT: null as number | null };
    const r = run(b, seed, PROFS[pf], { ...S, rc2: ck === 'on' ? rcAuto : rcMan }, 12000, { series: z, pert: PERT });
    appendFileSync(f, JSON.stringify({ seed, t10: r.reach.get(10) ?? null, t30: r.reach.get(30) ?? null, start: z.start, st: enc(z.st), ex: enc(z.ex), el: enc(z.el), pertT: z.pertT, sc29: r.rm.t29 > 0 ? r.rm.scT29 / r.rm.t29 : null, bb5: (r as any).g4m.bb5 }) + '\n'); }
  console.error(pf, ck, 'p' + PERT, 'done'); }
