"""P1-L16 (Economy, 2026-10-16): demand/supply at L10-20 and order completion, F1 order-size fix candidates.
economy_sim.py untouched: run_m2 is exec-patched here (per-level order log + optional complete_bonus_share for a sanity check only).
Usage: python3 f1_p1l16.py [--seeds 30]"""
import sys, inspect, textwrap, argparse, statistics as st, copy
sys.path.insert(0, '/workspace/egg-farm-studio/product/sim'); import economy_sim as m
import f1_levers as F
from multiprocessing import Pool
src = textwrap.dedent(inspect.getsource(m.run_m2))
R = [("  income_log = []", "  income_log = []; LOG = dict(sp=[], out=[]); CB = (spec or {}).get('complete_bonus_share', 0)"),
     ("      if len(q) < qm: q.append([max(1, round(rng.randint(e.dmin(f), e.dmax(f)) * dm)), t + e.p['patience'], f, 0, t])",
      "      _z = max(1, round(rng.randint(e.dmin(f), e.dmax(f)) * dm)); LOG['sp'].append((f, _z))\n      if len(q) < qm: q.append([_z, t + e.p['patience'], f, 0, t, _z])"),
     ("          if x[3]: partial += 1\n          else: lost += 1", "          if x[3]: partial += 1; LOG['out'].append((x[2], 'p'))\n          else: lost += 1; LOG['out'].append((x[2], 'l'))"),
     ("      else: lost += 1; lost_full += 1", "      else: lost += 1; lost_full += 1; LOG['out'].append((f, 'q'))"),
     ("        if x[0] == 0: q.remove(x); filled += 1\n      if manage", "        if x[0] == 0: q.remove(x); filled += 1; LOG['out'].append((x[2], 'f')); _b = cents(CB * x[5] * unit); coins = cents(coins + _b); income_log.append((t, f, _b))\n      if manage"),
     ("        if x[0] == 0: q.remove(x); filled += 1\n    if pt:", "        if x[0] == 0: q.remove(x); filled += 1; LOG['out'].append((x[2], 'f')); _b = cents(CB * x[5] * unit); coins = cents(coins + _b); income_log.append((t, f, _b))\n    if pt:"),
     ("qfull_ticks=qfull_ticks, ticks=n, filled=filled)", "qfull_ticks=qfull_ticks, ticks=n, filled=filled, LOG=LOG)")]
for a, b in R:
  assert a in src, a[:60]; src = src.replace(a, b)
ns = dict(vars(m)); exec(src, ns); run_m2 = ns['run_m2']
SEG = dict(f_seg=((6, 14, 1.25), (15, 20, 1.45)))
V = {'F1': SEG,
     'S1 orders x2/3 (0.53/1.07)': dict(SEG, d_lo=0.53, d_hi=1.07),
     'S2 orders x2/3 + price 1.25+0.0625F': dict(SEG, d_lo=0.53, d_hi=1.07, price_base=1.25, price_per=0.0625),
     'S3 orders x0.75 (0.6/1.2) + price 1.10+0.06F': dict(SEG, d_lo=0.6, d_hi=1.2, price_base=1.10, price_per=0.06)}
for k, v in V.items(): F.VARS.setdefault(k, v)
LV = range(10, 21)
def one(a):
  v, mo, s, cb, wk = a; pol, kw = F.MOD4[mo]; sp = copy.deepcopy(F.SPEC); sp['complete_bonus_share'] = cb
  e = F.eco(v)
  r = run_m2(e, pol, s, T=7200, spec=sp if wk else {'complete_bonus_share': cb, 'w1': {}}, manage='managed', **kw) if wk else run_m2(e, pol, s, T=7200, **kw)
  L = r['LOG']; o = {}
  for f in LV:
    out = [x[1] for x in L['out'] if x[0] == f]; t0, t1 = r['reach'].get(f), r['reach'].get(f + 1)
    dem = sum(z for g, z in L['sp'] if g == f)
    o[f] = dict(ds=(dem / (t1 - t0)) / e.rate(f) if t0 is not None and t1 else None, n=len(out),
                fill=out.count('f') / len(out) if out else None, fs=(out.count('f') / (out.count('f') + out.count('p'))) if (out.count('f') + out.count('p')) else None)
  return a, dict(o=o, t10=r['reach'].get(10), t18=r['reach'].get(18), t25=r['reach'].get(25))
md = lambda v: (lambda w: st.median(w) if w else None)([x for x in v if x is not None])
def analytic():
  print('## Analytic demand/supply = ((dmin+dmax)/2 / interval) / eggs_per_sec  (x1.25 with Hawker Working)\n')
  print('| variant | ' + ' | '.join(f'L{f}' for f in LV) + ' | L16 order range (Hawker) |\n|---|' + '---|' * (len(LV) + 1))
  for v in V:
    e = F.eco(v); print(f'| {v} | ' + ' | '.join(f'{e.demand_rate(f)/e.rate(f):.2f}' for f in LV) + f' | {e.dmin(16)}-{e.dmax(16)} ({round(e.dmin(16)*1.25)}-{round(e.dmax(16)*1.25)}) |')
  pe = m.Eco(dict(m.PROPOSAL)); print(f'| pre-P1q (M1-R1, rc builds before b652cb0) | ' + ' | '.join(f'{pe.demand_rate(f)/pe.rate(f):.2f}' for f in LV) + f' | {pe.dmin(16)}-{pe.dmax(16)} ({round(pe.dmin(16)*1.25)}-{round(pe.dmax(16)*1.25)}) |')
def simtab(N, VV, cbs=(0,)):
  jobs = [(v, mo, s, cb, wk) for v in VV for mo in ('seller15', 'casual') for wk in (False, True) for cb in cbs for s in range(N)]
  with Pool(8) as p: D = dict(p.map(one, jobs, chunksize=2))
  print(f'\n## Sim ({N} seeds, 120 min): demand/supply at level, fully-filled share of all customers [full ÷ (full+partial)]\n')
  print('| variant | model | workers | bonus | d/s L10 / L14 / L16 / L20 | fully filled % L10 / L14 / L16 / L20 | F10 / F18 / F25 min |\n|---|---|---|---|---|---|---|')
  for v in VV:
    for mo in ('seller15', 'casual'):
      for wk in (False, True):
        for cb in cbs:
          rs = [D[(v, mo, s, cb, wk)] for s in range(N)]
          g = lambda f, k: md([r['o'][f][k] for r in rs])
          ff = lambda x: 'n/r' if x is None else f'{x:.2f}'; pc = lambda x: 'n/r' if x is None else f'{100*x:.0f}'
          tm = lambda k: 'n/r' if md([r[k] for r in rs]) is None else f"{md([r[k] for r in rs])/60:.1f}"
          print(f"| {v} | {mo} | {'on' if wk else 'off'} | {cb} | {' / '.join(ff(g(f,'ds')) for f in (10,14,16,20))} | {' / '.join(pc(g(f,'fill'))+' ['+pc(g(f,'fs'))+']' for f in (10,14,16,20))} | {tm('t10')} / {tm('t18')} / {tm('t25')} |")
if __name__ == '__main__':
  ap = argparse.ArgumentParser(); ap.add_argument('--seeds', type=int, default=30); ap.add_argument('--bonus', action='store_true'); a = ap.parse_args()
  analytic(); simtab(a.seeds, list(V), (0, 0.05) if a.bonus else (0,))
