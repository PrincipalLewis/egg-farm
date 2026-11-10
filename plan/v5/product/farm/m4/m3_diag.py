"""M3 diag: which purchase ends the >3 min gaps in the 60-min TR-5 run (table costs, optional cost scales). python3 m3_diag.py [k=mult@lo-hi ...]"""
import os, sys, csv, math
P = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'economy.f1-m4cols.csv'); os.environ['ECON_CSV'] = P
import m4_sim as m
rows = list(csv.DictReader(open(P))); hc = [float(r['hens_cost']) for r in rows]; vc = [float(r['egg_value_cost']) for r in rows]
m.TUNE.update(hcap=3, vcap=3); b0 = m.cost; SC = {}
for a in sys.argv[1:]:
  k, rest = a.split('='); mult, rg = rest.split('@'); lo, hi = map(int, rg.split('-'))
  for L in range(lo, hi + 1): SC[(k, L)] = float(mult)
def cost(k, L, T=m.TUNE):
  if L >= 30: return math.inf
  c = hc[int(L)] if k == 'h' else vc[int(L)] if k == 'v' else b0(k, L, T)
  return c * SC.get((k, int(L)), 1.0)
m.cost = cost
ch0 = m.choose; LOG = []
def ch(policy, s, coins, dem, T):
  k = ch0(policy, s, coins, dem, T)
  if k: LOG.append((k, s, coins))
  return k
m.choose = ch
from collections import Counter
cnt = Counter()
for seed in range(30):
  LOG.clear(); T0 = [0.0]
  r = m.run(('greedy', seed, 's15', 3600, None))
  g = r['gap']
  cnt[(g[1], round(g[0]))] += 1
print('worst gap per seed (F at gap start, s):', dict(cnt))
print('last state', r['F'], r['H'], r['V'], r['C'], 'mix', dict(r['mix']))
F, H, V, C = r['F'], r['H'], r['V'], r['C']
for k, L in (('f', F), ('h', H), ('v', V), ('c', C)): print(k, L, round(cost(k, L)), 'capok', m.capok(k, (F, H, V, C), m.TUNE))
