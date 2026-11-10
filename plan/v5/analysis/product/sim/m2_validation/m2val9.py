import sys; exec(open('/workspace/m2val7.py').read().split("SC = [")[0])
W = m.spec_from_csv('/workspace/egg-farm-studio/product/economy.csv')
nu = copy.deepcopy(W); nu['unpaid_rule'] = False
SC = [('M1', dict()), ('v1.1 from CSV, managed', dict(spec=W)), ('v1.1 managed, no Unpaid rule', dict(spec=nu)), ('v1.1 unmanaged', dict(spec=W, manage='unmanaged'))]
exec("def one" + open('/workspace/m2val7.py').read().split("def one")[1].split("if __name__")[0])
if __name__ == '__main__':
  jobs = [(l, mo, kw, s) for l, kw in SC for mo in MODELS for s in range(100)]
  with Pool(8) as p: R = p.map(one, jobs, chunksize=10)
  idx = {(r['label'], r['model'], r['seed']): r for r in R}
  md = lambda v: (lambda w: st.median(w) if w else None)([x for x in v if x is not None]); fm = lambda x: 'n/r' if x is None else f'{x/60:.1f}'
  print('| model | scenario | F10 | F18 | F25 (n/r) | ×M1 @F21 | max step F18→25 | Manage / 15 min |\n|---|---|---|---|---|---|---|---|')
  for mo in MODELS:
    for l, _ in SC:
      rs = [idx[(l, mo, s)] for s in range(100)]; T = lambda L: md([r['t'][L] for r in rs])
      rat = md([r['inc21'] / idx[('M1', mo, r['seed'])]['inc21'] if r['inc21'] and idx[('M1', mo, r['seed'])]['inc21'] else None for r in rs])
      print(f"| {mo} | {l} | {fm(T(10))} | {fm(T(18))} | {fm(T(25))} ({sum(1 for r in rs if not r['t'][25])}) | {rat:.2f} | {fm(md([r['maxstep'] for r in rs]))} | {1.5*md([r['act10'] for r in rs]):.2f} |")
