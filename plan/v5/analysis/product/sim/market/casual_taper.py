"""Casual no-worker pacing check + smallest-fix search (Economy, 2026-10-16). python3 casual_taper.py [seeds] > casual_taper_out.md
Sim: roadmap_m4_prog.run (same as run_prog.py 'base'), economy.m4-candidate.csv. Variant CSVs are written to scratch/casual/ (never product/).
AC7 pacing targets (m4-manage-proposal: L10 8-12 min, L18 24-36 min -> centres 10 / 30 min), interpolated geometrically for L11-17 and
extrapolated to L19-20 (t = 10 * 3^((L-10)/8)); bar +-20%. 30:00 band: L18-22 without workers, L20-24 with."""
import sys, csv, math, statistics as st
from multiprocessing import Pool
sys.path.insert(0, '/workspace/egg-farm-studio/product/sim/market'); import roadmap_m4_prog as w
SRC = '/workspace/egg-farm-studio/product/economy.m4-candidate.csv'; SC = '/workspace/egg-farm-studio/scratch/casual/'
TGT = {L: 10 * 3 ** ((L - 10) / 8) for L in range(10, 21)}
def make(name, f):
  rows = list(csv.DictReader(open(SRC))); head = list(rows[0].keys())
  for L, r in enumerate(rows): f(L, r)
  for k in ('farm_cost', 'hens_cost', 'egg_value_cost'):
    for L in range(1, len(rows)):
      if float(rows[L][k]) <= float(rows[L - 1][k]): rows[L][k] = str(int(float(rows[L - 1][k])) + 1)
  p = SC + name + '.csv'
  with open(p, 'w', newline='') as fh:
    wr = csv.DictWriter(fh, head, lineterminator='\n'); wr.writeheader(); wr.writerows(rows)
  return p
def taper(a, b, lo):  # costs x lo at the middle of [a,b], ramping linearly back to x1 at both ends (keeps the curve smooth)
  def f(L, r):
    if a < L < b:
      x = lo + (1 - lo) * abs(L - (a + b) / 2) / ((b - a) / 2)
      for k in ('farm_cost', 'hens_cost', 'egg_value_cost'): r[k] = str(int(float(r[k]) * x))
  return f
def qplus(L, r): r['queue_max'] = str(int(float(r['queue_max'])) + 2)
def pat(L, r): r['customer_patience_s'] = str(int(float(r['customer_patience_s']) * 1.5))
def w1cheap(L, r): r['w1_cost'] = '20'
def dem(m, a=0, b=30):
  def f(L, r):
    if a <= L <= b:
      for k in ('demand_min', 'demand_max'): r[k] = str(max(1, round(float(r[k]) * m)))
  return f
VAR = {'base': lambda L, r: None, 'taper30_0-14': taper(0, 14, 0.70), 'taper20_0-12': taper(0, 12, 0.80), 'demand_x1.25_L0-12': dem(1.25, 0, 12), 'w1_$20': w1cheap}
PL = {'5s': ('s15', 5, None), '15s': ('s15', 15, None), 'casual': ('casual', 20, 0.5)}
def job(j):
  v, pl, wk, s = j; mo, se, tp = PL[pl]
  r = w.run((PATHS[v], s, mo, 3600, wk, dict(se=se, taps=tp)))
  return j, dict(reach=r['reach'], L30=r['L30'], gap=r['gap'][0])
PATHS = {k: (SRC if k == 'base' else make(k, f)) for k, f in VAR.items()}
if __name__ == '__main__':
  N = int(sys.argv[1]) if len(sys.argv) > 1 else 200
  J = [(v, pl, wk, s) for v in VAR for pl in PL for wk in (False, True) for s in range(N)]
  with Pool(4) as p: D = dict(p.map(job, J, chunksize=20))
  print(f'# Casual no-worker pacing, economy.m4-candidate.csv, {N} seeds (roadmap_m4_prog.run)\n')
  print('AC7 targets (min): ' + ', '.join(f'L{L} {t:.1f}' for L, t in TGT.items()) + '\n')
  for v in VAR:
    print(f'## {v}\n| player | workers | ' + ' | '.join(f'L{L}' for L in TGT) + ' | worst dev L10-20 | L@30:00 med [min-max] | in band | worst gap min |')
    print('|---|---|' + '---|' * len(TGT) + '---|---|---|---|')
    for pl in PL:
      for wk in (False, True):
        rs = [D[(v, pl, wk, s)] for s in range(N)]
        md = {L: st.median(r['reach'].get(L, 1e9) for r in rs) / 60 for L in TGT}
        dev = {L: md[L] / TGT[L] - 1 for L in TGT}; wd = max(dev, key=lambda L: abs(dev[L]))
        Ls = [r['L30'] for r in rs]; lo, hi = (20, 24) if wk else (18, 22)
        cell = lambda L: '—' if md[L] > 1e5 else f'{md[L]:.1f} ({dev[L]:+.0%})'
        print(f"| {pl} | {'W' if wk else 'noW'} | " + ' | '.join(cell(L) for L in TGT) + f" | {dev[wd]:+.0%} (L{wd}) | L{st.median(Ls):g} [{min(Ls)}-{max(Ls)}] | {sum(lo <= x <= hi for x in Ls)}/{N} | {max(r['gap'] for r in rs)/60:.2f} |")
    print()
  for v, p_ in PATHS.items():
    rows = list(csv.DictReader(open(p_)))
    mono = all(float(rows[L][k]) < float(rows[L + 1][k]) for k in ('farm_cost', 'hens_cost', 'egg_value_cost') for L in range(len(rows) - 1))
    print(f'- {v}: costs strictly rising: {mono}')
