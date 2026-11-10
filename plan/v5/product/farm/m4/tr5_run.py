#!/usr/bin/env python3
"""TR-5 / M4 AC7 reference check (PM Farm Upgrades; HoP decision 2026-10-16). Collection-aware greedy best-ROI buyer
from m4_sim.py, no workers. Exit 0 = PASS, 1 = FAIL, 2 = usage/table error.
Table resolution (--csv omitted): product/economy.csv if it carries M4 track cost columns, else product/economy.f1-m4cols.csv
plus the HoP-adopted params Hens 36x1.30^H, Egg value 48x1.33^V (caps F+3).
A table "carries M4 columns" if it has hens_cost and egg_value_cost (per level, cost to go L->L+1); those are then used
instead of the formula params. Optional hens_cap_over_farm / egg_value_cap_over_farm columns override the +3 caps."""
import argparse, csv, os, sys, math, statistics as st
HERE = os.path.dirname(os.path.abspath(__file__)); PROD = os.path.normpath(os.path.join(HERE, '..', '..'))
ap = argparse.ArgumentParser(description='TR-5 M4 AC7 check (greedy best-ROI buyer, no workers)')
ap.add_argument('--csv', help='economy table (default: canonical M4 table if published, else economy.f1-m4cols.csv + 36/48 params)')
ap.add_argument('--seeds', type=int, default=30)
ap.add_argument('--minutes', type=int, default=30, help='run length; gap criterion covers the whole run (M3: use 60 for the extended check)')
ap.add_argument('--tune', default='', help='diagnostic cost scaling, e.g. f22-26=0.75,v22-26=0.75 (multiplies table costs for levels L..L)')
ap.add_argument('--scenario', default='standard', choices=['standard', 'casual', 'd25'],
                help='standard = tap 1/s, Sell all every 15 s (gating); casual = Poisson, 20 s, demand x0.75; d25 = standard with demand x0.75')
ap.add_argument('--hens', default='36,1.30', help='Hens cost base,growth when the table has no hens_cost column')
ap.add_argument('--value', default='48,1.33', help='Egg value cost base,growth when the table has no egg_value_cost column')
ap.add_argument('--taps', type=float, default=1.0, help='Collect taps per second (default 1/s; casual bot = 0.5)')
ap.add_argument('--ac37', action='store_true', help='M4A-37 mode: PASS iff >= 95%% of seeds (P95) reach F18 within --minutes (use --scenario casual --taps 0.5 --minutes 45)')
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
path = a.csv or (os.path.join(PROD, 'economy.csv') if has_m4(os.path.join(PROD, 'economy.csv')) else os.path.join(PROD, 'economy.f1-m4cols.csv'))
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
N = len(rs); need = math.ceil(0.95 * N)  # HoP 23:15 gate standard: P95 across seeds (ac7-qa-threshold-changes.md)
STEP_MAX, STEP_WORST, GAP_MAX, GAP_WORST, STEP_FLOOR_S = 2.0, 2.25, 3.0, 4.0, 60.0
if a.ac37:
  t18 = sorted(r['reach'].get(18, math.inf) / 60 for r in rs); n = sum(x <= a.minutes for x in t18)
  print(f'M4A-37 | table {os.path.relpath(path, PROD)} | scenario {a.scenario} | taps {a.taps}/s | {N} seeds | F18 within {a.minutes} min: {n}/{N} (need {need}), median {t18[N//2]:.2f} min')
  print('RESULT:', 'PASS' if n >= need else 'FAIL'); sys.exit(0 if n >= need else 1)
t18 = [r['reach'].get(18, math.inf) / 60 for r in rs]; L30 = [r['L30'] for r in rs]; gaps = [r['gap'][0] / 60 for r in rs]
def band(vals, lo, hi):
  med = st.median(vals); n = sum(lo <= v <= hi for v in vals); return med, n, n >= need  # P95: >= ceil(0.95N) seeds in band
def p95(vals):
  v = sorted(vals); return v[need - 1]  # value that ceil(0.95N) seeds are at or below
def steps(r):
  # Farm level times: (L, seconds from reaching L-1 to reaching L)
  t = sorted((L, x) for L, x in r['reach'].items() if x != math.inf); return [(t[i][0], t[i][1] - t[i-1][1]) for i in range(1, len(t))]
def step_ratio(r, lo, hi):
  # worst level-step ratio for one seed over levels lo..hi: time(L) / time(L-1), only steps whose previous level took >= 60 s count (HoP 23:30, all ranges)
  d = steps(r); rr = [(b[1] / a_[1], b[0]) for a_, b in zip(d, d[1:]) if lo <= b[0] <= hi and a_[1] >= STEP_FLOOR_S]
  return max(rr) if rr else None
def ratio_check(lo, hi):
  sr = [step_ratio(r, lo, hi) for r in rs]; got = [x for x in sr if x is not None]
  if not got: return None
  v = sorted(x[0] for x in got); p = v[min(len(v), math.ceil(0.95 * len(v))) - 1]; w = max(got)
  return p, w, len(got), (p <= STEP_MAX and w[0] <= STEP_WORST)
# HoP 23:22: step ratio HARD from L30 up; L18-29 WARN only + HARD worst-seed level time <= 8 min (ac7-qa-threshold-changes.md AC-W4 guard); no step check below L18
LT_LO, LT_HI, LT_WORST_MIN, HARD_FROM = 18, 29, 8.0, 30
t_med, t_n, t_ok = band(t18, 17.8, 21.7)
BLO, BHI = (20, 24) if (getattr(a, 'workers_band', False) or a.workers) else (18, 22)  # --workers implies the L20-24 band
l_med, l_n, l_ok = band(L30, BLO, BHI)
g_med, g_n, _ = band(gaps, 0, GAP_MAX); g_p95 = p95(gaps)
worst = max(rs, key=lambda r: r['gap'][0])['gap']; g_ok = g_p95 <= GAP_MAX and worst[0] / 60 <= GAP_WORST
hard = ratio_check(HARD_FROM, 10**9); warn = ratio_check(LT_LO, LT_HI)
lt = [(sec / 60, L) for r in rs for L, sec in steps(r) if LT_LO <= L <= LT_HI]; lt_w = max(lt) if lt else None
lt_ok = lt_w is None or lt_w[0] <= LT_WORST_MIN; s_ok = hard is None or hard[3]
fmt = lambda x: 'not reached' if x == math.inf else f'{x:.2f}'
print(f'TR-5 M4 AC7 check | table {os.path.relpath(path, PROD)} | Hens/Value costs from {src} | caps F+{m.TUNE["hcap"]}/F+{m.TUNE["vcap"]}')
print(f'scenario {a.scenario} | taps {a.taps}/s | {a.minutes} min{" | tune " + a.tune if a.tune else ""} | seeds 0-{N-1} | bot: Collection-aware greedy best-ROI (m4_sim.best_roi), {("WORKERS+Grader+abilities (refill_delay=%s, jitter=%g, skip=%g)" % (a.refill_delay, a.ability_jitter, a.ability_skip)) if a.workers else "no workers"} | in band = >= {need}/{N} seeds (P95); worst-seed guards gap <= {GAP_WORST:g} min, step <= {STEP_WORST:g}x')
print(f'[{"PASS" if t_ok else "FAIL"}] F18 time 17.8-21.7 min: median {fmt(t_med)}, in band {t_n}/{N} (min {fmt(min(t18))}, max {fmt(max(t18))})')
print(f'[{"PASS" if l_ok else "FAIL"}] Farm level at 30:00 in L{BLO}-L{BHI}: median L{l_med:g}, in band {l_n}/{N} (min L{min(L30)}, max L{max(L30)})')
print(f'[{"PASS" if g_ok else "FAIL"}] gap between purchases <= 3.0 min over {a.minutes}:00: P95 {g_p95:.2f}, median {g_med:.2f}, ok {g_n}/{N}, worst (guard <= {GAP_WORST:g}) {worst[0]/60:.2f} min at F{worst[1]}' + ('' if a.workers else f' ({worst[2]/60:.1f} min)'))
if hard is None: print(f'[PASS] level-step ratio L{HARD_FROM}+ <= {STEP_MAX:g}x P95, worst <= {STEP_WORST:g}x: n/a (no seed reached L{HARD_FROM + 1} in {a.minutes} min)')
else: print(f'[{"PASS" if s_ok else "FAIL"}] level-step ratio L{HARD_FROM}+ <= {STEP_MAX:g}x (steps >= {STEP_FLOOR_S:g} s): P95 {hard[0]:.2f}x, worst {hard[1][0]:.2f}x at F{hard[1][1]} (guard <= {STEP_WORST:g}x), {hard[2]}/{N} seeds')
if warn is not None and not warn[3]: print(f'[WARN] level-step ratio L{LT_LO}-{LT_HI} (warn only, not gated): P95 {warn[0]:.2f}x, worst {warn[1][0]:.2f}x at F{warn[1][1]} (target P95 <= {STEP_MAX:g}x, worst <= {STEP_WORST:g}x)')
elif warn is not None: print(f'[INFO] level-step ratio L{LT_LO}-{LT_HI} (warn only, prev level >= {STEP_FLOOR_S:g} s): P95 {warn[0]:.2f}x, worst {warn[1][0]:.2f}x at F{warn[1][1]} - within target')
print(f'[{"PASS" if lt_ok else "FAIL"}] level time L{LT_LO}-{LT_HI} worst seed <= {LT_WORST_MIN:g} min: ' + ('n/a (no levels in range)' if lt_w is None else f'worst {lt_w[0]:.2f} min at F{lt_w[1]}'))
ok = t_ok and l_ok and g_ok and s_ok and lt_ok
print('RESULT:', 'PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
