"""M4A-38 / M4A-39 gates on a table (m4_sim bots, standard scenario, 30 seeds; farm_cost/hens_cost/egg_value_cost/collection_cost read per row from the CSV). python3 m4a_gates_3839.py <csv>"""
import os, sys, csv, math, statistics as st
from multiprocessing import Pool
P = os.path.abspath(sys.argv[1]); os.environ['ECON_CSV'] = P
sys.path.insert(0, '/workspace/egg-farm-studio/product/farm/m4'); import m4_sim as m
rows = list(csv.DictReader(open(P))); hc = [float(r['hens_cost']) for r in rows]; vc = [float(r['egg_value_cost']) for r in rows]; fc = [float(r['farm_cost']) for r in rows]; cc = [float(r['collection_cost']) for r in rows]
m.TUNE.update(hcap=int(float(rows[0]['hens_cap_over_farm'])), vcap=int(float(rows[0]['egg_value_cap_over_farm']))); b0 = m.cost
def cost(k, L, T=m.TUNE):
  if L >= 30: return math.inf
  return {'h': hc, 'v': vc, 'f': fc, 'c': cc}[k][int(L)]  # every track per row from the CSV (covers the L23-29 taper)
m.cost = cost
def job(a): return a, m.run((a[0], a[1], 's15', 1800, None))
if __name__ == '__main__':
  print('costs per row from CSV; L22-29 farm_cost', [int(fc[L]) for L in range(22, 30)], 'egg_value_cost', [int(vc[L]) for L in range(22, 30)])
  pols = ('greedy', 'hens', 'value', 'balanced')
  with Pool(8) as p: D = dict(p.map(job, [(pol, s) for pol in pols for s in range(30)]))
  R = {pol: [D[(pol, s)] for s in range(30)] for pol in pols}
  t18 = {pol: st.median(r['reach'].get(18, math.inf) for r in R[pol]) / 60 for pol in pols}
  L30 = {pol: (st.median(r['L30'] for r in R[pol]), sum(18 <= r['L30'] <= 22 for r in R[pol])) for pol in pols}
  g = R['greedy']; frac = [r['sw'] / max(1, r['nseq'] - 1) for r in g]
  ok38 = st.median(frac) >= 0.5 and st.median(r['maxrun'] for r in g) <= 3
  print(f"M4A-38 greedy L5-20: switches med {st.median(r['sw'] for r in g):g}/{st.median(r['nseq'] for r in g):g} buys ({st.median(frac):.0%}), longest run med {st.median(r['maxrun'] for r in g):g} (max over seeds {max(r['maxrun'] for r in g)}) -> {'PASS' if ok38 else 'FAIL'}")
  fx = [t18[p_] for p_ in ('hens', 'value', 'balanced')]; mid = (max(fx) + min(fx)) / 2
  a = max(fx) <= 1.15 * mid and min(fx) >= 0.85 * mid; b = min(fx) >= 0.85 * t18['greedy']
  c = all(L30[p_][0] >= 18 and L30[p_][0] <= 22 and L30[p_][1] >= 24 for p_ in ('hens', 'value', 'balanced'))
  print('M4A-39 F18 medians (min):', {k: round(v, 2) for k, v in t18.items()}, f'| fixed range ±{(max(fx)-mid)/mid:.1%} of midpoint {mid:.2f}', '| L@30 (med, in-band/30):', L30)
  print(f"M4A-39 spread {'PASS' if a else 'FAIL'}, none beats greedy by >15% {'PASS' if b else 'FAIL'}, L@30 band {'PASS' if c else 'FAIL'} -> {'PASS' if a and b and c else 'FAIL'}")
