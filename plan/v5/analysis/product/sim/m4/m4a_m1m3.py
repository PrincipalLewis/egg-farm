"""M1/M3: Collection-aware look-ahead greedy buyer, 60 min, base v7 vs Hens-demand coupling fixes. python3 m4a_m1m3.py"""
import inspect, statistics as st, m4_active as a
from multiprocessing import Pool
src = inspect.getsource(a.prog)
src = src.replace("dem_r = (r_['demand_min'] + r_['demand_max']) / 2 / r_['customer_interval_s'] * dem",
                  "dem_r = (r_['demand_min'] + r_['demand_max']) / 2 / r_['customer_interval_s'] * dem * DMS(H_, tr)")
src = src.replace("* dem)), t + 30])", "* dem * DMS(H, tr))), t + 30])")
src = src.replace("def prog(", "def prog2(")
def DMS(H, tr):
  k = tr.get('dms', 0) if tr else 0
  if k == 0: return 1.0
  m = 2.0 if H >= 30 else 1.5 if H >= 20 else 1.25 if H >= 10 else 1.0
  return 1 + (m - 1) * k
g = dict(vars(a)); g['DMS'] = DMS; exec(src, g); prog2 = g['prog2']
BASE = dict(a.TR, h_base=36, v_base=48, v_cap=3)
VAR = {'base v7': BASE, 'fixA Hens ms also x order size (k=1)': dict(BASE, dms=1.0), 'fixA half (k=0.5)': dict(BASE, dms=0.5),
       'fixB no Hens lay ms': dict(BASE, hens_ms=False)}
def job(x):
  name, s = x; r = prog2('greedy', s, VAR[name], 3600, 0.1, 'seller15'); return name, s, r
if __name__ == '__main__':
  with Pool(8) as p: R = p.map(job, [(n, s) for n in VAR for s in range(20)])
  for n in VAR:
    rs = [r for nn, s, r in R if nn == n]
    sh = {}; waits = {}
    for r in rs:
      lg = r['log']
      for (t0, *_), (t1, k, F, C) in zip(lg, lg[1:]):
        band = '5-9' if F < 10 else '10-19' if F < 20 else '20-30'
        sh.setdefault(band, {'f': 0, 'h': 0, 'v': 0, 'c': 0})[k] += 1
        if t1 - t0 > 180: waits.setdefault(F, []).append(round(t1 - t0))
      tail = 3600 - lg[-1][0]
      if tail > 180 and lg[-1][2] < 30: waits.setdefault(lg[-1][2], []).append(round(tail))
    t = lambda L: st.median([r['reach'][L] / 60 for r in rs if L in r['reach']]) if all(L in r['reach'] for r in rs) else None
    print(f"## {n}: F18 {t(18):.1f} min, F22 {t(22) or 0:.1f}, F25 {t(25) or 0:.1f}, F@60 {st.median(r['L30'] for r in rs)}, H {st.median(r['H'] for r in rs)}, V {st.median(r['V'] for r in rs)}")
    for b, d in sh.items(): tot = sum(d.values()); print('  buys F', b, {k: f"{v/tot:.0%}" for k, v in d.items()})
    print('  waits>180s by Farm level (s, all seeds):', {F: (len(w), max(w)) for F, w in sorted(waits.items())})
