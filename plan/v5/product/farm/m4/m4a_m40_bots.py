"""M4A-40 bots (PM Farm Upgrades, 2026-10-16; O4 draft). Wraps m4_sim.choose with two extra policies:
# SUPERSEDED 2026-10-16 (m4a-spec v1.3): cheapest-row highlight bot; use product/sim/m4/m4a_gate40.py (best-payback highlight).
 farmonly : buys Farm when affordable; Collection when tap is the binding supply limit and cost <= 50% of Farm's.
 highlight: buys the M4A-18 highlighted row (cheapest AFFORDABLE of Hens/Egg value/Farm, tie H,V,F) as soon as one is affordable;
            Collection by the same tap rule as the priority bots. Usage: python3 m4a_m40_bots.py [CSV] [scenario s15|casual]"""
import os, sys, csv, math, statistics as st
HERE = os.path.dirname(os.path.abspath(__file__)); P = os.path.normpath(os.path.join(HERE, '..', '..'))
path = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(P, 'economy.m4-candidate.csv'); os.environ['ECON_CSV'] = path
model = sys.argv[2] if len(sys.argv) > 2 else 's15'
sys.path.insert(0, HERE); import m4_sim as m
R = list(csv.DictReader(open(path))); hc = [float(r['hens_cost']) for r in R]; vc = [float(r['egg_value_cost']) for r in R]; bc = m.cost
m.cost = lambda k, L, T=m.TUNE: math.inf if L >= 30 else hc[int(L)] if k == 'h' else vc[int(L)] if k == 'v' else bc(k, L, T)
orig = m.choose
def choose(policy, s, coins, dem, T=m.TUNE):
  if policy not in ('farmonly', 'highlight'): return orig(policy, s, coins, dem, T)
  F, H, V, C = s; af = lambda k: m.capok(k, s, T) and coins >= m.cost(k, s[m.IDX[k]], T)
  rows = 'f' if policy == 'farmonly' else 'hvf'
  if m.row(C)['eggs_per_tap'] < m.hens_rate(H) and af('c') and m.cost('c', C, T) <= 0.5 * min(m.cost(k, s[m.IDX[k]], T) for k in rows if m.capok(k, s, T)): return 'c'
  ok = [k for k in rows if af(k)]
  return min(ok, key=lambda k: (m.cost(k, s[m.IDX[k]], T), rows.index(k))) if ok else None
m.choose = choose
for pol in ('greedy', 'farmonly', 'highlight'):
  rs = [m.run((pol, s, model, 1800, None)) for s in range(30)]
  L = [r['L30'] for r in rs]; t18 = [r['reach'].get(18, math.inf) / 60 for r in rs]
  print(f"{pol:9s} {model}: L@30 median L{st.median(L):g} (min {min(L)}, max {max(L)}, in L18-22 {sum(18<=x<=22 for x in L)}/30); F18 median {st.median(t18):.2f} min; worst gap {max(r['gap'][0] for r in rs)/60:.2f} min")
