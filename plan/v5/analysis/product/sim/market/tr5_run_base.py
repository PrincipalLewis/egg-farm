#!/usr/bin/env python3
"""TR-5 / M4 AC7 reference check (PM Farm Upgrades; HoP decision 2026-10-16). Collection-aware greedy best-ROI buyer
from m4_sim.py, no workers. Exit 0 = PASS, 1 = FAIL, 2 = usage/table error.
Table resolution (--csv omitted): product/economy.csv if it carries M4 track cost columns, else product/economy.f1.csv
plus the HoP-adopted params Hens 36x1.30^H, Egg value 48x1.33^V (caps F+3).
A table "carries M4 columns" if it has hens_cost and egg_value_cost (per level, cost to go L->L+1); those are then used
instead of the formula params. Optional hens_cap_over_farm / egg_value_cap_over_farm columns override the +3 caps."""
import argparse, csv, os, sys, math, statistics as st
HERE = os.path.dirname(os.path.abspath(__file__)); PROD = os.path.normpath(os.path.join(HERE, '..', '..'))
ap = argparse.ArgumentParser(description='TR-5 M4 AC7 check (greedy best-ROI buyer, no workers)')
ap.add_argument('--csv', help='economy table (default: canonical M4 table if published, else economy.f1.csv + 36/48 params)')
ap.add_argument('--seeds', type=int, default=30)
ap.add_argument('--minutes', type=int, default=30, help='run length; gap criterion covers the whole run (M3: use 60 for the extended check)')
ap.add_argument('--tune', default='', help='diagnostic cost scaling, e.g. f22-26=0.75,v22-26=0.75 (multiplies table costs for levels L..L)')
ap.add_argument('--scenario', default='standard', choices=['standard', 'casual', 'd25'],
                help='standard = tap 1/s, Sell all every 15 s (gating); casual = Poisson, 20 s, demand x0.75; d25 = standard with demand x0.75')
ap.add_argument('--hens', default='36,1.30', help='Hens cost base,growth when the table has no hens_cost column')
ap.add_argument('--value', default='48,1.33', help='Egg value cost base,growth when the table has no egg_value_cost column')
ap.add_argument('--taps', type=float, default=1.0, help='Collect taps per second (default 1/s; casual bot = 0.5)')
ap.add_argument('--ac37', action='store_true', help='M4A-37 mode: PASS iff >= 80%% of seeds reach F18 within --minutes (use --scenario casual --taps 0.5 --minutes 45)')
ap.add_argument('--workers-band', action='store_true', help='Use the with-workers 30:00 band L20-24 (HoP 14:58); default no-worker band L18-22')
ap.add_argument('--workers', action='store_true', help='add hires W1-W3, Grader tiers and v0.3 abilities (product/sim/m4/m4_workers_prog.py; stops at completion); band L20-24 at 30:00 (HoP 14:58)')
ap.add_argument('--refill-delay', type=float, default=None, help='--workers: simulate energy; refill at a visit >= S s after a worker reaches 40%% (default: always working)')
ap.add_argument('--ability-jitter', type=float, default=0.0, help='--workers: delay each ability activation by U(0,S) s')
ap.add_argument('--ability-skip', type=float, default=0.0, help='--workers: probability P that an ability window is skipped')
a = ap.parse_args()
M4COLS = ('hens_cost', 'egg_value_cost')
def has_m4(p):
  try: h = next(csv.reader(open(p)))
  except Exception: return False
  return all(c in h for c in M4COLS)
path = a.csv or (os.path.join(PROD, 'economy.csv') if has_m4(os.path.join(PROD, 'economy.csv')) else os.path.join(PROD, 'economy.f1.csv'))
if not os.path.exists(path): print(f'ERROR: table not found: {path}'); sys.exit(2)
os.environ['ECON_CSV'] = path
sys.path.insert(0, HERE); import m4_sim as m
hb, hg = map(float, a.hens.split(',')); vb, vg = map(float, a.value.split(','))
m.TUNE.update(hb=hb, hg=hg, vb=vb, vg=vg)
src = 'formula params Hens %gx%g^H, Value %gx%g^V' % (hb, hg, vb, vg)
if has_m4(path):
  rows = list(csv.DictReader(open(path))); hc = [float(r['hens_cost']) for r in rows]; vc = [float(r['egg_value_cost']) for r in rows]
  if 'hens_cap_over_farm' in rows[0]: m.TUNE['hcap'] = int(float(rows[0]['hens_cap_over_farm']))
  if 'egg_value_cap_over_farm' in rows[0]: m.TUNE['vcap'] = int(float(rows[0]['egg_value_cap_over_farm']))
  base_cost = m.cost
  def cost(k, L, T=m.TUNE):
    if L >= 30: return math.inf
    if k == 'h': return hc[int(L)]
    if k == 'v': return vc[int(L)]
    return base_cost(k, L, T)
  m.cost = cost; src = 'table columns hens_cost / egg_value_cost'
model = {'standard': 's15', 'casual': 'casual', 'd25': 'd25'}[a.scenario]
SC = {}
for part in filter(None, a.tune.split(',')):
  key, mult = part.split('='); k, rng_ = key[0], key[1:]; lo, hi = map(int, rng_.split('-'))
  for L in range(lo, hi + 1): SC[(k, L)] = float(mult)
if SC:
  _c0 = m.cost
  def _cs(k, L, T=m.TUNE): return _c0(k, L, T) * SC.get((k, int(L)), 1.0) if L < 30 else _c0(k, L, T)
  m.cost = _cs
m.TUNE['tap'] = a.taps
if a.workers:
  if SC: print('ERROR: --tune is not supported with --workers'); sys.exit(2)
  sys.path.insert(0, os.path.join(PROD, 'sim', 'm4')); import m4_workers_prog as wp
  O = dict(refill_delay=a.refill_delay, jitter=a.ability_jitter, skip=a.ability_skip, taps=a.taps)
  wmodel = {'s15': 's15', 'casual': 'casual', 'd25': 'd25'}[model]
  rs = [wp.run((path, s, wmodel, a.minutes * 60, True, O)) for s in range(a.seeds)]
  for r in rs: r['gap'] = (r['gap'][0], r['gap'][1], 0.0)
else:
  rs = [m.run(('greedy', s, model, a.minutes * 60, None)) for s in range(a.seeds)]
N = len(rs); need = math.ceil(0.8 * N)
if a.ac37:
  t18 = sorted(r['reach'].get(18, math.inf) / 60 for r in rs); n = sum(x <= a.minutes for x in t18)
  print(f'M4A-37 | table {os.path.relpath(path, PROD)} | scenario {a.scenario} | taps {a.taps}/s | {N} seeds | F18 within {a.minutes} min: {n}/{N} (need {need}), median {t18[N//2]:.2f} min')
  print('RESULT:', 'PASS' if n >= need else 'FAIL'); sys.exit(0 if n >= need else 1)
t18 = [r['reach'].get(18, math.inf) / 60 for r in rs]; L30 = [r['L30'] for r in rs]; gaps = [r['gap'][0] / 60 for r in rs]
def band(vals, lo, hi):
  med = st.median(vals); n = sum(lo <= v <= hi for v in vals); return med, n, (lo <= med <= hi and n >= need)
t_med, t_n, t_ok = band(t18, 17.8, 21.7)
BLO, BHI = (20, 24) if (getattr(a, 'workers_band', False) or a.workers) else (18, 22)  # --workers implies the L20-24 band
l_med, l_n, l_ok = band(L30, BLO, BHI)
g_med, g_n, g_ok = band(gaps, 0, 3.0)
worst = max(rs, key=lambda r: r['gap'][0])['gap']
fmt = lambda x: 'not reached' if x == math.inf else f'{x:.2f}'
print(f'TR-5 M4 AC7 check | table {os.path.relpath(path, PROD)} | Hens/Value costs from {src} | caps F+{m.TUNE["hcap"]}/F+{m.TUNE["vcap"]}')
print(f'scenario {a.scenario} | taps {a.taps}/s | {a.minutes} min{" | tune " + a.tune if a.tune else ""} | seeds 0-{N-1} | bot: Collection-aware greedy best-ROI (m4_sim.best_roi), {("WORKERS+Grader+abilities (refill_delay=%s, jitter=%g, skip=%g)" % (a.refill_delay, a.ability_jitter, a.ability_skip)) if a.workers else "no workers"} | in band = median in band AND >= {need}/{N} seeds')
print(f'[{"PASS" if t_ok else "FAIL"}] F18 time 17.8-21.7 min: median {fmt(t_med)}, in band {t_n}/{N} (min {fmt(min(t18))}, max {fmt(max(t18))})')
print(f'[{"PASS" if l_ok else "FAIL"}] Farm level at 30:00 in L{BLO}-L{BHI}: median L{l_med:g}, in band {l_n}/{N} (min L{min(L30)}, max L{max(L30)})')
print(f'[{"PASS" if g_ok else "FAIL"}] gap between purchases <= 3.0 min over {a.minutes}:00: median {g_med:.2f}, ok {g_n}/{N}, worst {worst[0]/60:.2f} min at F{worst[1]}' + ('' if a.workers else f' ({worst[2]/60:.1f} min)'))
ok = t_ok and l_ok and g_ok
print('RESULT:', 'PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
