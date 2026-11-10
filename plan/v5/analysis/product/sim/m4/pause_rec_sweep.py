"""Pause-recovery sweep (PM Workers B2, slower recovery). F1 economy: farm_cost per level from product/economy.f1.csv
(w4 tier cost follows via fcost). Note: m4_sim's run_m4 does not implement the F1 Market Hand hold (b)."""
import csv, pickle, statistics as st
from multiprocessing import Pool
import m4_sim as M
import economy_sim as m
FC = {int(r['level']): int(float(r['farm_cost'])) for r in csv.DictReader(open('/workspace/egg-farm-studio/product/economy.f1.csv'))}
class EcoF1(m.Eco):
  def fcost(s, f): return FC[f]
M.E = EcoF1(m.CURRENT)
RECS = [1.0, 0.5, 0.35, 0.25, 0.15, 0.1, 0.0]; S = range(30); MO = ('seller15', 'cheapest', 'casual', 'slow')
V = {'never': dict(M.A05)}; V.update({f'pause rec {r}': dict(M.A05, pause='yawn12', pause_rec=r) for r in RECS})
def j(a):
  v, sc, mo, s = a; r = M.job((v, sc, mo, s, V[v]))
  # F22-24 average managed income
  return r
def j2(a):
  v, sc, mo, s = a; mk = dict(M.MODELS[mo]); pol = mk.pop('policy')
  r = M.run_m4(M.E, pol, s, T=7200, x=V[v], spec=M.W, manage=sc, **mk)
  inc = [m.income_at_level(r, L) for L in (22, 23, 24)]; inc = [x for x in inc if x]
  i60 = sum(g for t, F, g in r['income'] if t < 3600) / 3600
  return dict(k=(v, sc, mo, s), i60=i60, i2224=st.mean(inc) if inc else None, wages=r['wages'])
if __name__ == '__main__':
  jobs = [(v, 'managed', mo, s) for v in V for mo in MO for s in S] + [('pause rec 0.25', 'unmanaged', mo, s) for mo in MO for s in S] + [('never', 'unmanaged', mo, s) for mo in MO for s in S]
  with Pool(8) as p: R = {r['k']: r for r in p.map(j2, jobs, chunksize=4)}
  pickle.dump(R, open('/tmp/pause_rec.pkl', 'wb'))
  md = M.md; g = lambda v, sc, mo, k: [R[(v, sc, mo, i)][k] for i in S]
  print('| recovery x drain | ' + ' | '.join(f'{mo} pause vs never $/s 0-60 (wins/30)' for mo in MO) + ' | kills exploit? |'); print('|---' * 6 + '|')
  for r_ in RECS:
    v = f'pause rec {r_}'; cells = []; ok = True
    for mo in MO:
      a, b = g(v, 'managed', mo, 'i60'), g('never', 'managed', mo, 'i60'); d = (md(a) - md(b)) / md(b)
      w = sum(x > y for x, y in zip(a, b)); ok &= d < 0; cells.append(f'{md(a):.2f} vs {md(b):.2f} ({d:+.1%}, {w}/30)')
    print(f'| {r_} | ' + ' | '.join(cells) + f" | {'yes' if ok else 'no'} |")
  print('\n| model | F22-24 managed (pause 0.25) | F22-24 unmanaged | ratio | ratio, never pausing |\n|---|---|---|---|---|')
  for mo in MO:
    rat = lambda v: md([x / y if x and y else None for x, y in zip(g(v, 'managed', mo, 'i2224'), g(v, 'unmanaged', mo, 'i2224'))])
    print(f"| {mo} | {md(g('pause rec 0.25','managed',mo,'i2224')):.1f} | {md(g('pause rec 0.25','unmanaged',mo,'i2224')):.1f} | {rat('pause rec 0.25'):.2f} | {rat('never'):.2f} |")
