import sys, statistics as st, copy, json
sys.path.insert(0, '/workspace/egg-farm-studio/product/sim'); import economy_sim as m
from multiprocessing import Pool
e = m.Eco(m.CURRENT); S = m.M2_SPEC
def spec(**kw):
  s = copy.deepcopy(S)
  for k, v in kw.items():
    a, b = k.split('__'); s[a][b] = v
  return s
MODELS = {'seller15': dict(policy='seller15'), 'cheapest': dict(policy='cheapest'),
          'casual': dict(policy='seller15', poisson=True, sell_every=20, dem_scale=0.75)}
def one(args):
  label, model, kw, seed = args
  mk = dict(MODELS[model]); pol = mk.pop('policy')
  r = m.run_m2(e, pol, seed, T=7200, **mk, **kw)
  steps = [r['reach'][L + 1] - r['reach'][L] for L in range(18, 25) if L + 1 in r['reach'] and L in r['reach']]
  return dict(label=label, model=model, seed=seed, t={L: r['reach'].get(L) for L in (10, 18, 20, 21, 25)},
              inc21=m.income_at_level(r, 21), lost=r['lost'] / r['spawned'], fees=r['fees'], wages=r['wages'],
              maxstep=max(steps) if len(steps) == 7 else None, fend=r['f'])
def runall(scen, models, seeds=100):
  jobs = [(lab, mo, kw, s) for lab, kw in scen for mo in models for s in range(seeds)]
  with Pool(8) as p: return p.map(one, jobs, chunksize=10)
if __name__ == '__main__':
  W13 = ('w1', 'w3'); NONE = dict()
  scen = [('M1 (no workers)', dict()),
    ('spec v0.1 all workers, managed', dict(spec=S)),
    ('spec v0.1 all workers, unmanaged', dict(spec=S, manage='unmanaged')),
    ('W4 Grader only, managed', dict(spec=S, use=('w4',))),
    ('per-F price mult (= W4 tiers, no cost)', dict(price_mult={F: x for F in range(31) for (u, x) in [max([(u, x) for u, x in S['w4'] if u <= F] or [(0, 1.0)])]})),
  ]
  for d in (0, 2, 5, 10, 15):
    scen.append((f'W1+W3 defer {d}s fee 10%', dict(spec=spec(w1__defer=d), use=W13)))
  for fee in (0.0, 0.05, 0.20):
    scen.append((f'W1+W3 defer 5s fee {int(fee*100)}%', dict(spec=spec(w1__fee=fee), use=W13)))
  scen.append(('W1 only defer 0 fee 10% (PM check)', dict(spec=spec(w1__defer=0), use=('w1',))))
  res = runall(scen, list(MODELS), seeds=int(sys.argv[1]) if len(sys.argv) > 1 else 100)
  json.dump(res, open('/workspace/m2val.json', 'w'))
  print('done', len(res))
