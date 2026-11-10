import sys; exec(open('/workspace/m2val7.py').read().split("SC = [")[0])
def k(x):
  s = copy.deepcopy(V2); s['w4_asleep_keep'] = x; return s
SC = [('M1', dict())] + [(f'new unmanaged keep {x}', dict(spec=k(x), manage='unmanaged')) for x in (0.25, 0.15, 0.10)] + [('new managed', dict(spec=V2))]
exec("def one" + open('/workspace/m2val7.py').read().split("def one")[1].split("if __name__")[0])
if __name__ == '__main__':
  jobs = [(l, mo, kw, s) for l, kw in SC for mo in MODELS for s in range(100)]
  with Pool(8) as p: R = p.map(one, jobs, chunksize=10)
  idx = {(r['label'], r['model'], r['seed']): r for r in R}
  md = lambda v: (lambda w: st.median(w) if w else None)([x for x in v if x is not None]); fm = lambda x: 'n/r' if x is None else f'{x/60:.1f}'
  print('| model | scenario | F10 | F18 | F25 (n/r) | managed/unmanaged income @F21 | L25 gap vs managed | F10≤15m |\n|---|---|---|---|---|---|---|---|')
  for mo in MODELS:
    for l, _ in SC:
      rs = [idx[(l, mo, s)] for s in range(100)]; T = lambda L: md([r['t'][L] for r in rs])
      rat = md([idx[('new managed', mo, s)]['inc21'] / idx[(l, mo, s)]['inc21'] if idx[('new managed', mo, s)]['inc21'] and idx[(l, mo, s)]['inc21'] else None for s in range(100)])
      la = md([idx[('new managed', mo, s)]['t'][25] for s in range(100)]); lb = T(25); nb = sum(1 for r in rs if not r['t'][25])
      print(f"| {mo} | {l} | {fm(T(10))} | {fm(T(18))} | {fm(lb)} ({nb}) | {'—' if rat is None else f'{rat:.2f}'} | {'—' if la is None or lb is None else f'{(lb-la)/60:.1f}'} | {sum(1 for r in rs if r['t'][10] and r['t'][10] <= 900)}% |")
