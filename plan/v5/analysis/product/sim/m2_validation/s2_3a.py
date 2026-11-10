"""S2-3a (Economy, 2026-10-16): queue visibility after an offline break + option B (Market Hand min wait) cost.
Part 1: stock-bound queue model at L5-20 from economy.csv (basket never empty, Market Hand serves every 1 s Working / 3 s Tired,
serves only customers waited >= min_wait; A = served dwell 1.5 s drawn after serve). Visible = >=1 card (waiting or dwelling).
Part 2: pacing/income cost of B via economy_sim.run_m2 (w1 'defer' = min wait), CURRENT + M2_CURRENT, 30 seeds, managed.
Usage: python3 s2_3a.py [--seeds 30]"""
import sys, csv, copy, random, argparse, statistics as st
sys.path.insert(0, '/workspace/egg-farm-studio/product/sim'); import economy_sim as m
from multiprocessing import Pool
R = {int(r['level']): r for r in csv.DictReader(open('/workspace/egg-farm-studio/product/economy.csv'))}
def vis(L, mw, every, dwell, first, seed, T=120, dt=0.05):
  r = R[L]; iv = float(r['customer_interval_s']); qm = int(r['queue_max']); pat = float(r['customer_patience_s'])
  rng = random.Random(seed); q = []; dw = []; nxt = first; mh = 1.0; on = 0; t0 = None; served = 0; n = int(T / dt)
  for i in range(n):
    t = i * dt
    q = [a for a in q if a + pat > t]; dw = [d for d in dw if d > t]
    if t >= nxt: nxt += iv; (q.append(t) if len(q) < qm else None)
    if t >= mh:
      mh += every
      for a in q:
        if t - a >= mw - 1e-9: q.remove(a); served += 1; dw.append(t + dwell); break
    if q or dw:
      on += 1; t0 = t if t0 is None else t0
  return on / n, t0
def p1(seeds):
  print('## Part 1: share of the first 120 s after return with >=1 customer card visible (stock-bound, Market Hand Working 1 s)\n')
  print('| L | interval s | today (no A, no C) | C only | A (1.5 s dwell) | A+C | B 2 s min wait | A+C+B 2 s | A+C+B 3 s | first card visible s today / C |\n|---|---|---|---|---|---|---|---|---|---|')
  for L in (5, 8, 10, 12, 14, 18):
    iv = float(R[L]['customer_interval_s'])
    def f(mw, dwell, c):
      o = [vis(L, mw, 1.0, dwell, (1.0 if c else rng_first(iv, s)), s) for s in range(seeds)]; return st.median(x[0] for x in o), st.median(x[1] for x in o)
    cols = [f(0, 0, 0), f(0, 0, 1), f(0, 1.5, 0), f(0, 1.5, 1), f(2, 0, 0), f(2, 1.5, 1), f(3, 1.5, 1)]
    print(f"| {L} | {iv} | " + ' | '.join(f'{100*a:.0f}%' for a, b in cols) + f" | {cols[0][1]:.1f} / {cols[1][1]:.1f} |")
def rng_first(iv, s): return random.Random(1000 + s).uniform(0, iv)  # saved timer resumes at a random point of the interval
MOD = {'seller15': ('seller15', {}), 'casual': ('seller15', m.CASUAL), 'cheapest': ('cheapest', {})}
def one(a):
  mw, mo, s = a; sp = copy.deepcopy(m.M2_CURRENT); sp['w1']['defer'] = mw; pol, kw = MOD[mo]
  r = m.run_m2(m.Eco(dict(m.CURRENT)), pol, s, T=7200, spec=sp, manage='managed', **kw)
  return a, dict(t10=r['reach'].get(10), t18=r['reach'].get(18), t25=r['reach'].get(25), coins=sum(g for t, F, g in r['income']),
                 lost=r['lost'] / r['spawned'], inc21=m.income_at_level(r, 21))
def p2(N):
  MW = (0, 2, 3)
  with Pool(8) as p: D = dict(p.map(one, [(mw, mo, s) for mw in MW for mo in MOD for s in range(N)]))
  md = lambda v: st.median([x for x in v if x is not None]); fm = lambda x: f'{x/60:.1f}'
  print(f'\n## Part 2: option B cost in normal play (run_m2, CURRENT + M2_CURRENT, managed, {N} seeds, 120 min)\n')
  print('| min wait s | model | F10 min | F18 min | F25 min | income 120 min ($k) | lost customers % | $/s @F21 |\n|---|---|---|---|---|---|---|---|')
  for mw in MW:
    for mo in MOD:
      rs = [D[(mw, mo, s)] for s in range(N)]
      print(f"| {mw} | {mo} | {fm(md([r['t10'] for r in rs]))} | {fm(md([r['t18'] for r in rs]))} | {fm(md([r['t25'] for r in rs]))} | {md([r['coins'] for r in rs])/1000:.1f} | {100*md([r['lost'] for r in rs]):.1f} | {md([r['inc21'] for r in rs]):.1f} |")
if __name__ == '__main__':
  ap = argparse.ArgumentParser(); ap.add_argument('--seeds', type=int, default=30); N = ap.parse_args().seeds
  p1(N); p2(N)
