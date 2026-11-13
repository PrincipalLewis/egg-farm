import sys, json, copy, statistics as st
sys.path.insert(0, '/workspace/egg-farm-studio/product/sim'); import economy_sim as m
from multiprocessing import Pool
from collections import defaultdict
e = m.Eco(m.CURRENT); V = m.M2_V03; V2 = m.M2_V03_E2
V2b = copy.deepcopy(V2); V2b['manage_all'] = False
MODELS = {'seller15': dict(policy='seller15'), 'cheapest': dict(policy='cheapest'),
          'casual': dict(policy='seller15', **m.CASUAL), 'slow': dict(policy='seller15', **m.SLOW)}
NOW2 = ('w1', 'w3', 'w4')
SC = [('M1', dict()),
      ('old energy managed', dict(spec=V)), ('old energy unmanaged', dict(spec=V, manage='unmanaged')),
      ('new energy managed (Manage all)', dict(spec=V2)), ('new energy managed, no Manage all', dict(spec=V2b)),
      ('new energy unmanaged', dict(spec=V2, manage='unmanaged')),
      ('new energy managed, no Coop Hand', dict(spec=V2, use=NOW2))]
def one(a):
  lab, mo, kw, seed = a; mk = dict(MODELS[mo]); pol = mk.pop('policy')
  r = m.run_m2(e, pol, seed, T=7200, **mk, **kw)
  steps = [r['reach'][L + 1] - r['reach'][L] for L in range(18, 25) if L + 1 in r['reach'] and L in r['reach']]
  hires = [b[0] for b in r['buys'] if b[1] in ('w1', 'w2', 'w3') or (b[1] == 'w4' and b[0] == min([x[0] for x in r['buys'] if x[1] == 'w4'] or [0]))]
  wt = sum(7200 - h for h in hires)  # worker-seconds employed
  return dict(label=lab, model=mo, seed=seed, t={L: r['reach'].get(L) for L in (10, 18, 20, 21, 25)}, inc21=m.income_at_level(r, 21),
    lost=r['lost'] / r['spawned'], maxstep=max(steps) if len(steps) == 7 else None, fend=r['f'],
    act10=r.get('manages', 0) / 12, nw=len(hires), wt=wt, manages=r.get('manages', 0))
if __name__ == '__main__':
  jobs = [(l, mo, kw, s) for l, kw in SC for mo in MODELS for s in range(100)]
  with Pool(8) as p: R = p.map(one, jobs, chunksize=10)
  json.dump(R, open('/workspace/m2val7.json', 'w'))
  G = defaultdict(list); [G[(r['label'], r['model'])].append(r) for r in R]
  idx = {(r['label'], r['model'], r['seed']): r for r in R}
  md = lambda v: (lambda w: st.median(w) if w else None)([x for x in v if x is not None]); fm = lambda x: 'n/r' if x is None else f'{x/60:.1f}'
  for mo in MODELS:
    print(f'\n### {mo}\n| scenario | F10 | F18 | F20 | F25 | ×M1 @F21 | max step F18→25 | actions / 10 min | refills per worker / 10 min | lost % |\n|---|---|---|---|---|---|---|---|---|---|')
    for l, _ in SC:
      rs = G[(l, mo)]; T = lambda L: md([r['t'][L] for r in rs]); n25 = sum(1 for r in rs if not r['t'][25])
      ratio = md([r['inc21'] / idx[('M1', mo, r['seed'])]['inc21'] if r['inc21'] and idx[('M1', mo, r['seed'])]['inc21'] else None for r in rs])
      man = 'managed' in l and 'unmanaged' not in l
      refill = md([(r['manages'] * (r['nw'] if ('Manage all' in l and r['nw'] >= 3) else 1)) / (r['wt'] / 600) if r['wt'] else None for r in rs]) if man else None
      print(f"| {l} | {fm(T(10))} | {fm(T(18))} | {fm(T(20))} | {fm(T(25))}{f' ({n25} n/r)' if n25 else ''} | {'—' if ratio is None else f'{ratio:.2f}'} | {fm(md([r['maxstep'] for r in rs]))} | {md([r['act10'] for r in rs]):.2f} | {'—' if refill is None else f'{refill:.2f}'} | {100*md([r['lost'] for r in rs]):.0f} |")
  print('\n### Managed vs unmanaged (per-seed income ratio @F21, L25 gap)\n| model | energy | income managed/unmanaged @F21 | L25 managed | L25 unmanaged | L25 gap (min) |\n|---|---|---|---|---|---|')
  for mo in MODELS:
    for tag, a, b in (('old', 'old energy managed', 'old energy unmanaged'), ('new', 'new energy managed (Manage all)', 'new energy unmanaged')):
      rat = md([idx[(a, mo, s)]['inc21'] / idx[(b, mo, s)]['inc21'] if idx[(a, mo, s)]['inc21'] and idx[(b, mo, s)]['inc21'] else None for s in range(100)])
      la = md([idx[(a, mo, s)]['t'][25] for s in range(100)]); lb = md([idx[(b, mo, s)]['t'][25] for s in range(100)])
      nb = sum(1 for s in range(100) if not idx[(b, mo, s)]['t'][25])
      print(f"| {mo} | {tag} | {'—' if rat is None else f'{rat:.2f}'} | {fm(la)} | {fm(lb)}{f' ({nb} n/r)' if nb else ''} | {'—' if la is None or lb is None else f'{(lb-la)/60:.1f}'} |")
