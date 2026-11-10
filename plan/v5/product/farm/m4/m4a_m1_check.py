"""M1 reproduction (PM Farm Upgrades, 2026-10-16): Hens marginal in-tab value F5-F29, and Hens purchases by the TR-5 bot.
Usage: python3 m4a_m1_check.py [CSV]  (default product/economy.m4-candidate.csv). Uses m4_sim.py's model (same as tr5_run.py)."""
import os, sys, csv, math, statistics as st
HERE = os.path.dirname(os.path.abspath(__file__)); P = os.path.normpath(os.path.join(HERE, '..', '..'))
path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(P, 'economy.m4-candidate.csv'); os.environ['ECON_CSV'] = path
sys.path.insert(0, HERE); import m4_sim as m
rows = list(csv.DictReader(open(path))); hc = [float(r['hens_cost']) for r in rows]; vc = [float(r['egg_value_cost']) for r in rows]
bc = m.cost
def cost(k, L, T=m.TUNE):
  if L >= 30: return math.inf
  return hc[int(L)] if k == 'h' else vc[int(L)] if k == 'v' else bc(k, L, T)
m.cost = cost
print('table', os.path.relpath(path, P))
print('F | demand/s | supply H=F | supply H=F-1 | dInc/$1k H (at H=F) | V | F   (C=30, tap not binding)')
zero = []
for F in range(5, 30):
  s = (F, F, F, 30); b = m.inc(s); r = {}
  for k in 'fhv':
    if m.capok(k, s): r[k] = (m.inc(m.bump(s, k)) - b) / cost(k, s[m.IDX[k]]) * 1000
  rr = m.row(F); d = (rr['demand_min'] + rr['demand_max']) / 2 / rr['customer_interval_s']
  if r.get('h', 0) <= 1e-9: zero.append(F)
  print(f"F{F} | {d:.2f} | {m.hens_rate(F):.2f} | {m.hens_rate(F-1):.2f} | {r.get('h',0):.3f} | {r.get('v',0):.3f} | {r.get('f',0):.3f}")
print('Hens marginal = 0 at H=F for F in', zero)
rs = [m.run(('greedy', s, 's15', 1800, None)) for s in range(30)]
print('TR-5 greedy, 30 seeds: median buys by track in 30 min:', {k: st.median(r['mix'][k] for r in rs) for k in 'fhvc'},
      '| median end H', st.median(r['H'] for r in rs), 'F', st.median(r['F'] for r in rs), 'V', st.median(r['V'] for r in rs))
