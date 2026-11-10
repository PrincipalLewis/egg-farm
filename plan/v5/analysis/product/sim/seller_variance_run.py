"""100-seed seller15 variance report (F1 m4cols 86f0e80e). python3 seller_variance_run.py [--seeds 100]"""
import math, sys, json, seller_variance_sim as S
N = int(sys.argv[sys.argv.index('--seeds') + 1]) if '--seeds' in sys.argv else 100
e = S.Eco(S.F1); W = S.spec_from_csv(S.F1_CSV); T = 3600
def q(a, p): a = sorted(a); return a[min(len(a) - 1, max(0, math.ceil(p * len(a)) - 1))]
def metrics(r):
  R = sorted(r['reach'].items()); d = [(L, R[i][1] - R[i - 1][1]) for i, (L, _) in enumerate(R) if i]
  step = max([b / a for (_, a), (_, b) in zip(d, d[1:]) if a >= 60] or [0])
  bt = [0.0] + [b[0] for b in r['buys'] if b[0] <= T]; gap = max(y - x for x, y in zip(bt, bt[1:]))
  return dict(l30=S.lvl_at(r, 1800), t18=(S.t_to(r, 18) or float('inf')) / 60, step=step, gap=gap / 60)
out = {}
for wk in ('no workers', 'workers'):
  for mode, var in (('old', None), ('variance', S.VAR_DEFAULT)):
    M = [metrics(S.run(e, 'seller15', s, T=T, var=var) if wk == 'no workers' else S.run_m2(e, 'seller15', s, T=T, spec=W, var=var)) for s in range(1, N + 1)]
    row = {}
    for k in ('l30', 't18', 'step', 'gap'):
      v = [m[k] for m in M]; hi = k != 'l30'
      row[k] = dict(P5=q(v, .05), P50=q(v, .5), P95=q(v, .95), worst=max(v) if hi else min(v), distinct=len(set(round(x, 3) for x in v)))
    row['t18_p95_over_p50_pct'] = round(100 * (row['t18']['P95'] / row['t18']['P50'] - 1), 1)
    row['ac7'] = dict(l30_P5=q([m['l30'] for m in M], .05), l30_P95=q([m['l30'] for m in M], .95))
    out[f'{wk} / {mode}'] = row
    print(wk, mode, json.dumps(row))
json.dump(out, open('seller_variance_out.json', 'w'), indent=1)
