import sys; exec(open('/workspace/m2val5.py').read().split("SC = [")[0])
import copy
def w2(u, c=150):
  s = copy.deepcopy(REC); s['w2'].update(unlock=u, cost=c); return s
SC = [('M2_REC (Coop Hand F10)', dict(spec=REC))] + [(f'Coop Hand at F{u}', dict(spec=w2(u))) for u in (3, 5, 7)]
exec("def one" + open('/workspace/m2val5.py').read().split("def one")[1].split("if __name__")[0])
if __name__ == '__main__':
  jobs = [(l, mo, kw, s) for l, kw in SC for mo in ('seller15', 'slow', 'casual') for s in range(100)]
  with Pool(8) as p: R = p.map(one, jobs, chunksize=10)
  import statistics as st; from collections import defaultdict
  G = defaultdict(list); [G[(r['label'], r['model'])].append(r) for r in R]
  md = lambda v: (lambda w: st.median(w) if w else None)([x for x in v if x is not None]); fm = lambda x: 'n/r' if x is None else f'{x/60:.1f}'
  print('| scenario | model | F10 | F18 | F25 | F10 ≤ 15 m | lost % |\n|---|---|---|---|---|---|---|')
  for l, _ in SC:
    for mo in ('seller15', 'slow', 'casual'):
      rs = G[(l, mo)]
      print(f"| {l} | {mo} | {fm(md([r['t'][10] for r in rs]))} | {fm(md([r['t'][18] for r in rs]))} | {fm(md([r['t'][25] for r in rs]))} | {sum(1 for r in rs if r['t'][10] and r['t'][10]<=900)}% | {100*md([r['lost'] for r in rs]):.0f} |")
