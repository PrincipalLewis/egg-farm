"""Locate the longest no-purchase gap in the F1 no-worker run (first 30 min) and test candidate fixes."""
import sys, csv, statistics as st
import m4_active as a
def load(p): a.R[:] = [{k: float(v) for k, v in r.items()} for r in csv.DictReader(open(p))]
def gaps(seed, model, T=1800):
  r = a.prog('seller15', seed, None, T, 0.1, model); L = r['log']
  g = [(b[0] - x[0], x, b) for x, b in zip(L, L[1:])] + [(T - L[-1][0], L[-1], (T, 'end', r['L30'], 0))]
  return max(g), r
if __name__ == '__main__':
  load(sys.argv[1] if len(sys.argv) > 1 else '/workspace/egg-farm-studio/product/economy.f1.csv')
  for model in ('seller15', 'casual'):
    res = [gaps(s, model) for s in range(30)]
    gl = sorted(res, key=lambda z: z[0][0])
    print(model, 'median gap', st.median(z[0][0] for z in res), 'worst', gl[-1][0][0])
    from collections import Counter
    print(' where (after-buy -> next-buy):', Counter((z[0][1][1], z[0][1][2], z[0][1][3], z[0][2][1]) for z in res).most_common(6))
    print(' worst seed', gl[-1][0], 'median seed', gl[15][0])
