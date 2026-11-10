import sys, json, copy, statistics as st
sys.path.insert(0, '/workspace/egg-farm-studio/product/sim'); import economy_sim as m
from multiprocessing import Pool
e = m.Eco(m.CURRENT); REC = m.M2_REC
MODELS = {'seller15': dict(policy='seller15'), 'cheapest': dict(policy='cheapest'),
          'casual': dict(policy='seller15', **m.CASUAL), 'slow': dict(policy='seller15', **m.SLOW)}
def rec(**w3):
  s = copy.deepcopy(REC); s['w3'].update(w3); return s
ALL = ('w1', 'w2', 'w3', 'w4')
SC = [('M1 (no workers)', dict()),
      ('M2_REC', dict(spec=REC)),
      ('REC + Hawker queue +1, uncapped (max 6)', dict(spec=rec(queue_bonus=1, queue_mode='uncapped'))),
      ('REC + Hawker queue +1, capped at 5', dict(spec=rec(queue_bonus=1, queue_mode='capped', queue_hard_cap=5))),
      ('REC without Coop Hand (W1+W3+W4)', dict(spec=REC, use=('w1', 'w3', 'w4'))),
      ('Coop Hand only (W2)', dict(spec=REC, use=('w2',))),
      ('REC unmanaged', dict(spec=REC, manage='unmanaged')),
      ('REC without Coop Hand, unmanaged', dict(spec=REC, use=('w1', 'w3', 'w4'), manage='unmanaged'))]
def one(a):
  lab, mo, kw, seed = a; mk = dict(MODELS[mo]); pol = mk.pop('policy')
  r = m.run_m2(e, pol, seed, T=7200, **mk, **kw)
  steps = [r['reach'][L + 1] - r['reach'][L] for L in range(18, 25) if L + 1 in r['reach'] and L in r['reach']]
  return dict(label=lab, model=mo, seed=seed, t={L: r['reach'].get(L) for L in (10, 18, 20, 21, 25)}, inc21=m.income_at_level(r, 21),
              lost=r['lost'] / r['spawned'], full=r['lost_full'] / r['spawned'], partial=r['partial'] / r['spawned'],
              maxstep=max(steps) if len(steps) == 7 else None, fend=r['f'], wages=r['wages'])
if __name__ == '__main__':
  jobs = [(l, mo, kw, s) for l, kw in SC for mo in MODELS for s in range(100)]
  with Pool(8) as p: R = p.map(one, jobs, chunksize=10)
  json.dump(R, open('/workspace/m2val5.json', 'w'))
  from collections import defaultdict
  G = defaultdict(list); [G[(r['label'], r['model'])].append(r) for r in R]
  base = {(r['model'], r['seed']): r for r in R if r['label'] == 'M1 (no workers)'}
  md = lambda v: (lambda w: st.median(w) if w else None)([x for x in v if x is not None])
  fm = lambda x: 'n/r' if x is None else f'{x/60:.1f}'
  for mo in MODELS:
    print(f'\n### {mo} (100 seeds, 2 h)\n| scenario | F10 | F18 | F20 | F25 | ×M1 @F21 | max step F18→25 | lost % | of which full-queue % | partial % | Farm @2h |\n|---|---|---|---|---|---|---|---|---|---|---|')
    for l, _ in SC:
      rs = G[(l, mo)]; T = lambda L: md([r['t'][L] for r in rs]); n25 = sum(1 for r in rs if not r['t'][25])
      ratio = md([r['inc21'] / base[(mo, r['seed'])]['inc21'] if r['inc21'] and base[(mo, r['seed'])]['inc21'] else None for r in rs])
      print(f"| {l} | {fm(T(10))} | {fm(T(18))} | {fm(T(20))} | {fm(T(25))}{f' ({n25} n/r)' if n25 else ''} | {'—' if ratio is None else f'{ratio:.2f}'} | {fm(md([r['maxstep'] for r in rs]))} | {100*md([r['lost'] for r in rs]):.0f} | {100*md([r['full'] for r in rs]):.0f} | {100*md([r['partial'] for r in rs]):.1f} | {md([r['fend'] for r in rs]):.0f} |")
