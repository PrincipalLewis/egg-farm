"""Playtest-1 re-sim (Economy/Balance Designer, 2026-10-15). Variants only; economy.csv / balance.json untouched.
P1: orders 0.4-0.8 k (k = eggs/s x BASE interval), interval x0.5.  P3: L0 eggs/s 1.0 -> 1.5 (L0-only override).
P4: Manage only when a worker <= 40% (yawn); Manage all counts/refills only workers <= 40%; free, 30 s shared cd.
Usage: python3 pt1_resim.py [--seeds 100] > ../../playtest1-resim-raw.md
"""
import sys, copy, math, argparse, statistics as st
sys.path.insert(0, '/workspace/egg-farm-studio/product/sim'); import economy_sim as m
from multiprocessing import Pool
W = m.spec_from_csv('/workspace/egg-farm-studio/product/economy.csv')
W4 = copy.deepcopy(W); W4.update(manage_at=W['yawn_at'], manage_all_low_only=True, manage_all_unlock_by_hired=True)
P1 = dict(d_lo=0.4, d_hi=0.8, iv_scale=0.5); P3 = dict(rate_l0=1.5)
Q2 = dict(q_base=6, q_step=5, q_cap=10)  # queue_max = min(10, 6 + floor(F/5)) ~ 2x slots, same eggs-in-queue as baseline
PAT = lambda s: dict(P1, patience=s)
VAR = {'baseline': ({}, W), 'P1': (P1, W), 'P3': (P3, W), 'P1+P3': (dict(P1, **P3), W), 'P4': ({}, W4), 'P1+P3+P4': (dict(P1, **P3), W4),
       'P1+P3+P4 pat60': (dict(PAT(60), **P3), W4),            # compensation tried: patience (does not help; loss is queue-full)
       'P1q': (dict(P1, **Q2), W), 'P1q+P3': (dict(P1, **Q2, **P3), W), 'P1q+P3+P4': (dict(P1, **Q2, **P3), W4)}  # compensation: queue x2
MODELS = {'seller15': dict(policy='seller15'), 'cheapest': dict(policy='cheapest'),
          'casual': dict(policy='seller15', **m.CASUAL), 'slow': dict(policy='seller15', **m.SLOW)}
class CsvEco(m.Eco):
  """Eco whose per-level M1 values come from a CSV (candidate economy file), not formulas."""
  def __init__(s, path, p):
    import csv; super().__init__(p); s.R = {int(r['level']): r for r in csv.DictReader(open(path))}
  def _g(s, f, c, t=float): return t(s.R[min(f, 30)][c])
  def ccost(s, c): return s._g(c, 'collection_cost', int)
  def fcost(s, f): return s._g(f, 'farm_cost', int)
  def tap(s, c): return s._g(c, 'eggs_per_tap', int)
  def rate(s, f): return s._g(f, 'eggs_per_sec')
  def cap(s, f): return s._g(f, 'coop_capacity', int)
  def price(s, f, c=0): return round(s._g(f, 'egg_price') * (1 + float(s.R[min(c, 30)]['collection_price_bonus'])), 2)
  def iv(s, f): return s._g(f, 'customer_interval_s')
  def dmin(s, f): return s._g(f, 'demand_min', int)
  def dmax(s, f): return s._g(f, 'demand_max', int)
  def qmax(s, f): return s._g(f, 'queue_max', int)
CSV_PATH = '/workspace/egg-farm-studio/product/economy.p1q.csv'
def _csvspec():
  w = m.spec_from_csv(CSV_PATH); w.update(manage_at=w['yawn_at'], manage_all_low_only=True, manage_all_unlock_by_hired=True); return w
def eco(v):
  if v.startswith('CSV'): return CsvEco(CSV_PATH, dict(m.CURRENT, patience=30))
  return m.Eco(dict(m.CURRENT, **VAR[v][0]))
def m2(a):
  v, sc, mo, seed = a; mk = dict(MODELS[mo]); pol = mk.pop('policy'); e = eco(v)
  kw = {} if sc == 'M1' else dict(spec=VAR[v][1], manage='unmanaged' if sc == 'unmanaged' else 'managed')
  r = m.run_m2(e, pol, seed, T=7200, **mk, **kw)
  steps = [r['reach'][L + 1] - r['reach'][L] for L in range(18, 25) if L + 1 in r['reach'] and L in r['reach']]
  return dict(k=(v, sc, mo, seed), t={L: r['reach'].get(L) for L in (10, 18, 25)}, inc21=m.income_at_level(r, 21),
    maxstep=max(steps) if len(steps) == 7 else None, man15=r['manages'] / 8, inc2=sum(g for t, F, g in r['income'] if t <= 120) / 120,
    qfull=r['qfull_ticks'] / r['ticks'], lostfull=r['lost_full'] / r['spawned'], lost=r['lost'] / r['spawned'], partial=r['partial'] / r['spawned'],
    filled=r['filled'] / r['spawned'])
def m1(a):
  v, pol, seed, casual = a; e = eco(v)
  r = m.run(e, pol, seed, T=3600, **m.CASUAL) if casual else m.run(e, pol, seed, T=1800)
  return dict(k=(v, pol, seed, casual), l10=m.lvl_at(r, 600), l30=m.lvl_at(r, 1800), u5=sum(1 for b in r['buys'] if b[0] <= 300), t10=r['reach'].get(10), t18=r['reach'].get(18))
md = lambda v: (lambda w: st.median(w) if w else None)([x for x in v if x is not None]); fm = lambda x: 'n/r' if x is None else f'{x/60:.1f}'
if __name__ == '__main__':
  ap = argparse.ArgumentParser(); ap.add_argument('--seeds', type=int, default=100); ap.add_argument('--csv-only', action='store_true')
  a = ap.parse_args(); N = a.seeds; S = range(N)
  if a.csv_only:  # reproduce P1q+P3+P4 from the candidate CSV (economy.p1q.csv) via spec_from_csv
    for k in list(VAR): del VAR[k]
    VAR['P1q+P3+P4'] = (dict(P1, **Q2, **P3), W4); VAR['CSV economy.p1q.csv'] = ({}, _csvspec())
  with Pool(8) as p:
    A = {r['k']: r for r in p.map(m1, [(v, pol, s, False) for v in VAR for pol in ('seller15', 'cheapest') for s in S] + [(v, 'seller15', s, True) for v in VAR for s in S], chunksize=10)}
    B = {r['k']: r for r in p.map(m2, [(v, sc, mo, s) for v in VAR for sc in ('M1', 'managed', 'unmanaged') for mo in MODELS for s in S], chunksize=10)}
  print(f'## M1 AC7 / AC7-soft ({N} seeds; run())\n| variant | seller15 L@10m | seller15 L@30m | upg@5m min/med | cheapest L@10m / L@30m | cheap/seller @10/@30 | casual F10<=15m | casual F10 med | casual F18<=45m | casual F18 med |\n|---|---|---|---|---|---|---|---|---|---|')
  for v in VAR:
    s = [A[(v, 'seller15', i, False)] for i in S]; c = [A[(v, 'cheapest', i, False)] for i in S]; cs = [A[(v, 'seller15', i, True)] for i in S]
    a, b, cc, cd = md([x['l10'] for x in s]), md([x['l30'] for x in s]), md([x['l10'] for x in c]), md([x['l30'] for x in c])
    print(f"| {v} | {a} | {b} | {min(x['u5'] for x in s)}/{md([x['u5'] for x in s])} | {cc} / {cd} | {cc/a:.0%} / {cd/b:.0%} | {sum(1 for x in cs if x['t10'] and x['t10']<=900)}/{N} | {fm(md([x['t10'] for x in cs]))} | {sum(1 for x in cs if x['t18'] and x['t18']<=2700)}/{N} | {fm(md([x['t18'] for x in cs]))} |")
  print(f'\n## M2 Workers v1.1 ({N} seeds, 120 min, run_m2)\n| variant | model | scen | F10<=15m | F10 | F18 | F25 (n/r) | max step F18-25 | Manage/15m | managed/unmanaged inc@F21 | $/s first 2 min | queue-full time % | arrivals lost to full % | lost % | partial % | fully filled % |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
  for v in VAR:
    for mo in MODELS:
      for sc in ('M1', 'managed', 'unmanaged'):
        rs = [B[(v, sc, mo, i)] for i in S]; T = lambda L: md([r['t'][L] for r in rs])
        rat = md([B[(v, 'managed', mo, i)]['inc21'] / B[(v, 'unmanaged', mo, i)]['inc21'] if B[(v, 'managed', mo, i)]['inc21'] and B[(v, 'unmanaged', mo, i)]['inc21'] else None for i in S]) if sc == 'managed' else None
        pc = lambda k: f"{100*md([r[k] for r in rs]):.1f}"
        print(f"| {v} | {mo} | {sc} | {sum(1 for r in rs if r['t'][10] and r['t'][10]<=900)} | {fm(T(10))} | {fm(T(18))} | {fm(T(25))} ({sum(1 for r in rs if not r['t'][25])}) | {fm(md([r['maxstep'] for r in rs]))} | {md([r['man15'] for r in rs]):.2f} | {'—' if rat is None else f'{rat:.2f}'} | {md([r['inc2'] for r in rs]):.2f} | {pc('qfull')} | {pc('lostfull')} | {pc('lost')} | {pc('partial')} | {pc('filled')} |")
