"""M4 abilities (PM Workers spec v0.1) on F1 economy (farm_cost per level from economy.f1.csv) + F1 Market Hand hold (mh_hold=2).
python3 abilities_sweep.py [json-of-extra-variants]"""
import csv, sys, json, pickle, statistics as st, copy
from multiprocessing import Pool
import m4_sim as M
import economy_sim as m
FC = {int(r['level']): int(float(r['farm_cost'])) for r in csv.DictReader(open('/workspace/egg-farm-studio/product/economy.f1.csv'))}
class EcoF1(m.Eco):
  def fcost(s, f): return FC[f]
E = EcoF1(m.CURRENT); W = copy.deepcopy(M.W); W_NO2 = ('w1', 'w3', 'w4')
B = dict(M.A05, mh_hold=2, pause_rec=0.25)
V = {'M4 baseline (no abilities)': B, 'W1 Rush 0.5 s': dict(B, ab=('w1',)), 'W2 Sweep x2': dict(B, ab=('w2',)),
     'W3 Shout x1.5': dict(B, ab=('w3',)), 'W4 Inspect +0.5': dict(B, ab=('w4',)), 'All four': dict(B, ab=('w1', 'w2', 'w3', 'w4')),
     'All four + pause W1/W2 @40 (rec 0.25)': dict(B, ab=('w1', 'w2', 'w3', 'w4'), pause='yawn12')}
if len(sys.argv) > 1: V.update({k: dict(B, **v) for k, v in json.loads(sys.argv[1]).items()})
MO = ('seller15', 'cheapest', 'casual', 'slow'); S = range(30)
def job(a):
  v, sc, mo, s = a; mk = dict(M.MODELS[mo]); pol = mk.pop('policy')
  kw = {} if sc == 'M1' else dict(spec=W, manage='unmanaged' if sc == 'unmanaged' else 'managed')
  if sc == 'noW2': kw = dict(spec=W, use=W_NO2)
  r = M.run_m4(E, pol, s, T=7200, x=V[v], **mk, **kw)
  steps = [r['reach'][L + 1] - r['reach'][L] for L in range(18, 25) if L + 1 in r['reach'] and L in r['reach']]
  inc = [m.income_at_level(r, L) for L in (22, 23, 24)]; inc = [x for x in inc if x]
  return dict(k=a, t={L: r['reach'].get(L) for L in (10, 18, 25)}, i60=sum(g for t, F, g in r['income'] if t < 3600) / 3600,
              i2224=st.mean(inc) if len(inc) == 3 else None, inc21=m.income_at_level(r, 21), maxstep=max(steps) if len(steps) == 7 else None,
              man15=r['manages'] / 8, uses=r['ab_uses'])
if __name__ == '__main__':
  base = 'M4 baseline (no abilities)'
  jobs = [(v, 'managed', mo, s) for v in V for mo in MO for s in S] + [(v, 'noW2', 'slow', s) for v in V for s in S] + \
         [(base, sc, mo, s) for sc in ('unmanaged', 'M1') for mo in MO for s in S]  # unmanaged never uses abilities; M1 has no workers
  with Pool(8) as p: R = {r['k']: r for r in p.map(job, jobs, chunksize=4)}
  pickle.dump(R, open('/tmp/abilities.pkl', 'wb'))
  md = M.md; fm = M.fm; g = lambda v, sc, mo: [R[(v, sc, mo, i)] for i in S]
  med = lambda rs, k: md([r[k] for r in rs]); T = lambda rs, L: md([r['t'][L] for r in rs])
  print('## Income and AC-A5 (30 seeds, medians)\n| variant | ' + ' | '.join(f'{mo}: uplift 0-60 / F22-24; ratio' for mo in MO) + ' | AC-A5 |\n|' + '---|' * 6)
  for v in V:
    cells = []; ok = True
    for mo in MO:
      a, b, u = g(v, 'managed', mo), g(base, 'managed', mo), g(base, 'unmanaged', mo)
      u60 = med(a, 'i60') / med(b, 'i60') - 1; u22 = med(a, 'i2224') / med(b, 'i2224') - 1
      rat = md([x['i2224'] / y['i2224'] if x['i2224'] and y['i2224'] else None for x, y in zip(a, u)])
      ok &= u60 <= 0.15 and u22 <= 0.15 and rat >= 1.5; cells.append(f'{u60:+.1%} / {u22:+.1%}; {rat:.2f}')
    print(f'| {v} | ' + ' | '.join(cells) + f" | {'PASS' if ok else 'FAIL'} |")
  print('\n## AC-W1..W6\n| variant | W1 casual F10<=15 (>=95%) / F18 med (<=40) | W2 s15 dF10/dF18 vs M1 (<=+1) | W3 unm F25 s15/ch vs M1 | W4 s15 worst step (<=6) / F25 (<=70) | W4b ch worst step (<=8, soft) | W5 manages/15m | W6 slow dF18 (>=4) / dInc21 (>=15%) | all gating pass |\n|' + '---|' * 9)
  M1s, M1c, us, uc = g(base, 'M1', 'seller15'), g(base, 'M1', 'cheapest'), g(base, 'unmanaged', 'seller15'), g(base, 'unmanaged', 'cheapest')
  for v in V:
    ms, mc, mca, msl, n2 = g(v, 'managed', 'seller15'), g(v, 'managed', 'cheapest'), g(v, 'managed', 'casual'), g(v, 'managed', 'slow'), g(v, 'noW2', 'slow')
    w1n = sum(1 for r in mca if r['t'][10] and r['t'][10] <= 900); w1f = T(mca, 18)
    d10, d18 = (T(ms, 10) - T(M1s, 10)) / 60, (T(ms, 18) - T(M1s, 18)) / 60
    w3 = T(us, 25) <= T(M1s, 25) and T(uc, 25) <= T(M1c, 25)
    w4, f25, w4b = med(ms, 'maxstep'), T(ms, 25), med(mc, 'maxstep')
    w6 = (T(n2, 18) - T(msl, 18)) / 60; w6i = med(msl, 'inc21') / med(n2, 'inc21') - 1
    ok = w1n >= 0.95 * 30 and w1f <= 2400 and d10 <= 1 and d18 <= 1 and w3 and w4 <= 360 and f25 <= 4200 and w6 >= 4 and w6i >= 0.15
    print(f"| {v} | {w1n}/30 / {fm(w1f)} | {d10:+.1f}/{d18:+.1f} | {fm(T(us,25))} vs {fm(T(M1s,25))} / {fm(T(uc,25))} vs {fm(T(M1c,25))} | {fm(w4)} / {fm(f25)} | {fm(w4b)} | {med(ms,'man15'):.2f} | {w6:+.1f} / {w6i:+.0%} | {'PASS' if ok else 'FAIL'} |")
  print('\n## Ability uses in 2 h (seller15 managed, median)')
  for v in V: print(f"- {v}: " + ', '.join(f"{w} {md([r['uses'].get(w,0) for r in g(v,'managed','seller15')])}" for w in ('w1','w2','w3','w4')))
