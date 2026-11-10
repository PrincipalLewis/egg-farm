"""M4 abilities spec v0.2 sweep: F1 economy (economy.f1.csv farm_cost incl. F1-GAP rows 18/19), mh_hold=2, pause_rec 0.25, seeds 0-99.
python3 abilities_v2_sweep.py [combo-json]  -> prints tables; pickle /tmp/ab_v2.pkl"""
import csv, sys, json, pickle, statistics as st, copy
from multiprocessing import Pool
import m4_sim as M
import economy_sim as m
FC = {int(r['level']): int(float(r['farm_cost'])) for r in csv.DictReader(open('/workspace/egg-farm-studio/product/economy.f1.csv'))}
class EcoF1(m.Eco):
  def fcost(s, f): return FC[f]
E = EcoF1(m.CURRENT); W = copy.deepcopy(M.W); W_NO2 = ('w1', 'w3', 'w4')
B = dict(M.A05, mh_hold=2, pause_rec=0.25, ab_v2=True)
BASE = 'baseline (no abilities)'
V = {BASE: B}
for k in (1.1, 1.2, 1.3, 1.4, 1.5): V[f'W1 Rush x{k}'] = dict(B, ab=('w1',), ab_w1_price=k)
for k in (1.25, 1.5, 1.75, 2.0): V[f'W2 Sweep x{k}'] = dict(B, ab=('w2',), ab_w2_lay=k)
for k in (1.25, 1.5, 1.75, 2.0): V[f'W3 Shout x{k}'] = dict(B, ab=('w3',), ab_w3_price=k)
V['W4 Inspect +0.5'] = dict(B, ab=('w4',))
if len(sys.argv) > 1:
  V = {BASE: B}; V.update({k: dict(B, **v) for k, v in json.loads(sys.argv[1]).items()})
MO = ('seller15', 'cheapest', 'casual', 'slow'); S = range(100)
def job(a):
  v, sc, mo, s = a; mk = dict(M.MODELS[mo]); pol = mk.pop('policy')
  kw = {} if sc == 'M1' else dict(spec=W, manage='unmanaged' if sc == 'unmanaged' else 'managed')
  if sc == 'noW2': kw = dict(spec=W, use=W_NO2)
  r = M.run_m4(E, pol, s, T=7200, x=V[v], **mk, **kw)
  steps = [r['reach'][L + 1] - r['reach'][L] for L in range(18, 25) if L + 1 in r['reach'] and L in r['reach']]
  inc = [m.income_at_level(r, L) for L in (22, 23, 24)]; inc = [x for x in inc if x]
  return dict(k=a, t={L: r['reach'].get(L) for L in (10, 18, 25)}, i60=sum(g for t, F, g in r['income'] if t < 3600) / 3600,
              i2224=st.mean(inc) if len(inc) == 3 else None, inc21=m.income_at_level(r, 21), maxstep=max(steps) if len(steps) == 7 else None,
              man15=r['manages'] / 8)
if __name__ == '__main__':
  jobs = [(v, 'managed', mo, s) for v in V for mo in MO for s in S] + [(v, 'noW2', 'slow', s) for v in V for s in S] + \
         [(BASE, sc, mo, s) for sc in ('unmanaged', 'M1') for mo in MO for s in S]
  with Pool(8) as p: R = {r['k']: r for r in p.map(job, jobs, chunksize=8)}
  md = M.md; fm = M.fm; g = lambda v, sc, mo: [R[(v, sc, mo, i)] for i in S]
  med = lambda rs, k: md([r[k] for r in rs]); T = lambda rs, L: md([r['t'][L] for r in rs])
  M1s, M1c, us, uc = g(BASE, 'M1', 'seller15'), g(BASE, 'M1', 'cheapest'), g(BASE, 'unmanaged', 'seller15'), g(BASE, 'unmanaged', 'cheapest')
  print('| variant | uplift 0-60 s15/ch/cas/slow | uplift F22-24 s15/ch/cas/slow | ratio F22-24 s15/ch/cas/slow | min uplift | max uplift | ratio>=1.5 | AC-W (W1/W2/W3/W4/W6; W4b soft) | gating |\n|' + '---|' * 9)
  out = {}
  for v in V:
    u60, u22, rat = [], [], []
    for mo in MO:
      a, b, u = g(v, 'managed', mo), g(BASE, 'managed', mo), g(BASE, 'unmanaged', mo)
      u60.append(med(a, 'i60') / med(b, 'i60') - 1); u22.append(med(a, 'i2224') / med(b, 'i2224') - 1)
      rat.append(md([x['i2224'] / y['i2224'] if x['i2224'] and y['i2224'] else None for x, y in zip(a, u)]))
    ms, mc, mca, msl, n2 = g(v, 'managed', 'seller15'), g(v, 'managed', 'cheapest'), g(v, 'managed', 'casual'), g(v, 'managed', 'slow'), g(v, 'noW2', 'slow')
    w1 = sum(1 for r in mca if r['t'][10] and r['t'][10] <= 900) >= 95 and T(mca, 18) <= 2400
    d10, d18 = (T(ms, 10) - T(M1s, 10)) / 60, (T(ms, 18) - T(M1s, 18)) / 60; w2 = d10 <= 1 and d18 <= 1
    w3 = T(us, 25) <= T(M1s, 25) and T(uc, 25) <= T(M1c, 25)
    w4 = med(ms, 'maxstep') <= 360 and T(ms, 25) <= 4200; w4b = med(mc, 'maxstep') <= 480
    w6d = (T(n2, 18) - T(msl, 18)) / 60; w6i = med(msl, 'inc21') / med(n2, 'inc21') - 1; w6 = w6d >= 4 and w6i >= 0.15
    acw = all((w1, w2, w3, w4, w6)); mn, mx = min(u60 + u22), max(u60 + u22)
    out[v] = dict(u60=u60, u22=u22, rat=rat, acw=acw, mn=mn, mx=mx, det=f'casF10 {sum(1 for r in mca if r["t"][10] and r["t"][10] <= 900)}/100 F18 {fm(T(mca,18))}; W2 {d10:+.1f}/{d18:+.1f}; W4 {fm(med(ms,"maxstep"))}/F25 {fm(T(ms,25))}; W4b {fm(med(mc,"maxstep"))}; W6 {w6d:+.1f}/{w6i:+.0%}')
    P = lambda L: ' / '.join(f'{x:+.1%}' for x in L)
    print(f"| {v} | {P(u60)} | {P(u22)} | {' / '.join(f'{x:.2f}' for x in rat)} | {mn:+.1%} | {mx:+.1%} | {'yes' if min(rat) >= 1.5 else 'NO'} | {'PASS' if acw else 'FAIL'}{'' if w4b else ' (W4b soft miss)'} | {'PASS' if acw and min(rat) >= 1.5 else 'FAIL'} |")
  print('\nAC-W detail:'); [print(f'- {v}: {o["det"]}') for v, o in out.items()]
  pickle.dump(out, open('/tmp/ab_v2_' + ('combo' if len(sys.argv) > 1 else 'single') + '.pkl', 'wb'))
