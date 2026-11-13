"""Leave-penalty check (m4-manage-proposal.md §12). Imports m4_sim (not edited); patches a private copy of run_m4 so the
walkout hook matches §12: no penalty when basket < 1 egg at timeout, price incl. Grader tier. F1 farm costs from economy.f1.csv."""
import csv, inspect, pickle, sys, statistics as st
from multiprocessing import Pool
import m4_sim as M
import economy_sim as m
FC = {int(r['level']): int(float(r['farm_cost'])) for r in csv.DictReader(open('/workspace/egg-farm-studio/product/economy.f1.csv'))}
class EcoF1(m.Eco):
  def fcost(s, f): return FC[f]
EF1 = EcoF1(m.CURRENT); ECUR = m.Eco(m.CURRENT)
src = inspect.getsource(M.run_m4)
old = "if X['walk_fee'] and x_[0] > 0:"; assert old in src
src = src.replace(old, "if X['walk_fee'] and x_[0] > 0 and basket >= 1:")
old2 = "X['walk_fee'] * x_[0] * e.price(f, c)"; assert old2 in src
src = src.replace(old2, "X['walk_fee'] * x_[0] * e.price(f, c) * (grade if 'w4' in hired else 1)")
ns = dict(M.__dict__); exec(src, ns); run = ns['run_m4']
V = {'off': dict(cb=0.05), 'on': dict(cb=0.05, walk_fee=0.05)}
MO = ('seller15', 'cheapest', 'casual', 'slow'); S = range(30)
def j(a):
  v, sc, mo, s = a
  if sc.startswith('nw'):
    eco = EF1 if sc.endswith('f1') else ECUR
    r = run(eco, 'seller15', s, T=3600, x=V[v], sell_every=mo)
  else:
    mk = dict(M.MODELS[mo]); pol = mk.pop('policy')
    r = run(EF1, pol, s, T=7200, x=V[v], spec=M.W, manage=sc, **mk)
  inc = [m.income_at_level(r, L) for L in (22, 23, 24)]; inc = [x for x in inc if x]
  return dict(k=a, l18=r['reach'].get(18), l30=m.lvl_at(r, 1800), pen=r['walk'] / (max(r['reach'].values()) or 1) * 60,
              penh=r['walk'], minc=r['minc'], i21=m.income_at_level(r, 21), i2224=st.mean(inc) if inc else None, timeouts=r['lost'] - r['lost_full'] + r['partial'], spawned=r['spawned'])
if __name__ == '__main__':
  jobs = [(v, sc, mo, s) for v in V for sc in ('managed', 'unmanaged') for mo in MO for s in S]
  jobs += [(v, sc, se, s) for v in V for sc in ('nw_f1', 'nw_cur') for se in (5, 15, 30) for s in S]
  with Pool(8) as p: R = {r['k']: r for r in p.map(j, jobs, chunksize=4)}
  pickle.dump(R, open('/tmp/leave_pen.pkl', 'wb'))
  md = M.md; g = lambda v, sc, mo, k: [R[(v, sc, mo, s)][k] for s in S]
  f = lambda x, d=1: 'n/r' if x is None else f'{x:.{d}f}'
  print('| model | mode | L18 min off→on | L@30 off→on | penalty $/min (on) | penalty % of 2h earn | lowest balance after 10 min off→on |\n|---|---|---|---|---|---|---|')
  for mo in MO:
    for sc in ('unmanaged', 'managed'):
      print(f"| {mo} | {sc} | {f(md(g('off',sc,mo,'l18'))/60)}→{f(md(g('on',sc,mo,'l18'))/60)} | {md(g('off',sc,mo,'l30'))}→{md(g('on',sc,mo,'l30'))} | {f(md(g('on',sc,mo,'pen')),2)} (max {f(max(g('on',sc,mo,'pen')),2)}) | – | ${f(md(g('off',sc,mo,'minc')),2)}→${f(md(g('on',sc,mo,'minc')),2)} |")
  print('\n| model | F21 ratio off→on | F22-24 ratio off→on | ≥1.5? |\n|---|---|---|---|')
  for mo in MO:
    rat = lambda v, k: md([a / b if a and b else None for a, b in zip(g(v, 'managed', mo, k), g(v, 'unmanaged', mo, k))])
    print(f"| {mo} | {rat('off','i21'):.2f}→{rat('on','i21'):.2f} | {rat('off','i2224'):.2f}→{rat('on','i2224'):.2f} | {'yes' if rat('on','i2224') >= 1.5 else 'NO'} |")
  print('\n| no-worker seller | economy | L18 min off→on | penalty $/min | PM Market L18 |\n|---|---|---|---|---|')
  pm = {5: 25.8, 15: 26.0, 30: 30.5}
  for sc in ('nw_cur', 'nw_f1'):
    for se in (5, 15, 30):
      print(f"| {se} s | {'today (economy.csv)' if sc=='nw_cur' else 'F1'} | {f(md(g('off',sc,se,'l18'))/60)}→{f(md(g('on',sc,se,'l18'))/60)} | {f(md(g('on',sc,se,'pen')),2)} | {pm[se]} |")
