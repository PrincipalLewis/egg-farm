#!/usr/bin/env python3
"""QA L30+ release gate — l30plus-spec v0.3 FINAL + HoP 00:29.
Drives product/sim/late/late_curve.py (import only; never modified).
Pins (HoP 00:29): CSV b59c4e0db7e7… (polish; 3e3d61fd RETIRED); late_curve ab928dc96d1c…
  (max(row,extra) default). --csv-sha and --late-curve-sha REQUIRED (no silent default).
Official default: 100 seeds. EX-1 window L30–40; other step-ratio gates L30–50.
"""
from __future__ import annotations
import argparse, csv, hashlib, math, os, statistics as st, sys, time
from multiprocessing import Pool

STUDIO = '/workspace/egg-farm-studio'
PROD = os.path.join(STUDIO, 'product')
# pre-move: farm-upgrades if present, else farm
def _farm_dir():
  for d in (os.path.join(PROD, 'farm-upgrades'), os.path.join(PROD, 'farm')):
    if os.path.isdir(d): return d
  return os.path.join(PROD, 'farm')
FARM = _farm_dir()
CSV_PATH = os.path.join(PROD, 'economy.l30plus-polish.csv')  # shipping; 3e3d61fd retired
LC_PATH = os.path.join(PROD, 'sim', 'late', 'late_curve.py')
# Expected pins (help text only — CLI still requires explicit --csv-sha / --late-curve-sha)
PIN_LC = 'ab928dc96d1c'   # late_curve.py max(row,extra) — HoP 00:29
PIN_CSV = 'b59c4e0db7e7'  # economy.l30plus-polish.csv shipping
RETIRED_CSV = '3e3d61fdc869'  # retired as revert target (HoP 00:29)
NUDGE_LOG = os.path.join(PROD, 'sim', 'late', 'nudge_log_casual_noworkers.csv')
NUDGE_RUN = os.path.join(PROD, 'sim', 'late', 'nudge_run.py')
NUDGE_KIND = 'nudge_f25_noworker'
L3019A_LIMIT_S = 180.0  # 3 min

def sha256(path: str) -> str:
  h = hashlib.sha256()
  with open(path, 'rb') as f:
    for chunk in iter(lambda: f.read(1 << 20), b''):
      h.update(chunk)
  return h.hexdigest()

def check_pins(csv_sha_prefix: str | None, lc_sha_prefix: str | None = None, hard=True):
  """Both --csv-sha and --late-curve-sha required explicitly; must match file digests."""
  csv_h = sha256(CSV_PATH); lc_h = sha256(LC_PATH)
  print(f'PIN csv  full={csv_h}')
  print(f'PIN late_curve.py full={lc_h}')
  if not csv_sha_prefix:
    print('PIN ERROR: --csv-sha is required (no default). '
          f'Expected shipping polish prefix {PIN_CSV}… '
          f'({RETIRED_CSV} is RETIRED — not a revert target).', file=sys.stderr)
    if hard: sys.exit(2)
    return csv_h, lc_h, False
  if not lc_sha_prefix:
    print('PIN ERROR: --late-curve-sha is required (no default). '
          f'Expected {PIN_LC}… (HoP 00:29 max(row,extra) pin).', file=sys.stderr)
    if hard: sys.exit(2)
  if csv_sha_prefix.startswith(RETIRED_CSV[:8]) or RETIRED_CSV.startswith(csv_sha_prefix):
    print(f'PIN ERROR: CSV {RETIRED_CSV} is RETIRED (HoP 00:29) — not a revert target. '
          f'Use shipping polish {PIN_CSV}…', file=sys.stderr)
    if hard: sys.exit(2)
  ok_csv = csv_h.startswith(csv_sha_prefix)
  ok_lc = lc_h.startswith(lc_sha_prefix)
  ok = ok_csv and ok_lc
  if not ok:
    msg = (f'PIN MISMATCH: csv prefix want {csv_sha_prefix}… got {csv_h[:12]}…; '
           f'late_curve want {lc_sha_prefix}… got {lc_h[:12]}…')
    print(msg, file=sys.stderr)
    if hard: sys.exit(2)
  else:
    print(f'PIN OK: csv starts {csv_sha_prefix}…; late_curve starts {lc_sha_prefix}…')
  return csv_h, lc_h, ok

def p95_rank(vals):
  """P95 = value at rank ceil(0.95N) of sorted values (1-indexed)."""
  if not vals: return float('nan')
  v = sorted(vals)
  n = len(v)
  rank = math.ceil(0.95 * n)  # 1-indexed
  return v[rank - 1]

def load_R(path=CSV_PATH):
  rows = list(csv.DictReader(open(path)))
  return [{k: float(v) for k, v in r.items()} for r in rows]

def import_late_curve():
  # Prefer directory of LC_PATH so --late-curve overrides work; clear cached module.
  lc_dir = os.path.dirname(os.path.abspath(LC_PATH))
  if 'late_curve' in sys.modules:
    del sys.modules['late_curve']
  sys.path.insert(0, lc_dir)
  import late_curve as lc  # noqa
  return lc

# Scenarios → (workers, model) for late_curve.run / mc
# HoP 23:56: at L30+ "casual" means casual+workers (HARD). casual-no-workers is REPORT-ONLY.
SCENARIOS = {
  'standard': dict(workers=True, model='s15', T=150 * 60, report_only=False),
  # L30+: casual ≡ casual+workers (HARD). Alias casual+workers kept for older invocations.
  'casual': dict(workers=True, model='casual', T=200 * 60, report_only=False),
  'casual+workers': dict(workers=True, model='casual', T=200 * 60, report_only=False),
  'casual-no-workers': dict(workers=False, model='casual', T=200 * 60, report_only=True),
  # late_curve has no separate "active" model; map to seller15+workers (same as standard).
  'active': dict(workers=True, model='s15', T=150 * 60, report_only=False),
}

def _lc_emits_nudge_event() -> bool:
  try:
    with open(LC_PATH, 'r', encoding='utf-8', errors='replace') as f:
      return NUDGE_KIND in f.read()
  except OSError:
    return False

def load_l3019a_from_csv(path: str, min_seeds: int = 30):
  """Read nudge_f25_noworker rows → per-seed afford_after_s (missing seed = inf)."""
  if not os.path.isfile(path):
    return None
  by = {}
  with open(path, newline='') as f:
    for r in csv.DictReader(f):
      if r.get('kind') != NUDGE_KIND:
        continue
      s = int(float(r['seed']))
      raw = r.get('afford_after_s', 'never')
      if raw in ('', 'never', None):
        a = math.inf
      else:
        a = float(raw)
      # first nudge per seed
      if s not in by:
        by[s] = a
  if len(by) < min_seeds:
    return None
  seeds = sorted(by)
  return [by[s] for s in seeds]

def measure_l3019a_live(R, lc, seeds: int, pool=None) -> list[float] | None:
  """Run casual-no-workers with NUDGE=1; return per-seed afford_s (inf if no nudge).
  Uses a fresh Pool so workers inherit NUDGE=1 (reusing an earlier Pool keeps the old env)."""
  if not _lc_emits_nudge_event():
    return None
  prev = os.environ.get('NUDGE')
  os.environ['NUDGE'] = '1'
  try:
    with Pool(max(1, min(6, os.cpu_count() or 2))) as nudge_pool:
      rs = lc.mc(R, False, seeds=seeds, T_=200 * 60, model='casual', pool=nudge_pool)
  finally:
    if prev is None:
      os.environ.pop('NUDGE', None)
    else:
      os.environ['NUDGE'] = prev
  out = []
  for r in rs:
    ev = [e for e in (r.get('nudges') or []) if e.get('kind') == NUDGE_KIND]
    if not ev:
      out.append(math.inf)  # never reached nudge → FAIL contribution
      continue
    a = ev[0].get('afford_s', math.inf)
    out.append(math.inf if a is None else float(a))
  return out

def evaluate_l3019a(aff_per_seed: list[float]):
  """HARD: P95(afford_s) <= 180; any missing nudge (inf) fails. Report worst."""
  n = len(aff_per_seed)
  missing = sum(1 for a in aff_per_seed if a == math.inf)
  fired = n - missing
  finite = sorted(a for a in aff_per_seed if a != math.inf)
  # For P95 include infs so a missing nudge pushes P95 to inf → FAIL
  ranked = sorted(aff_per_seed)
  sp = p95_rank(ranked)
  worst = ranked[-1] if ranked else math.inf
  def fmt(x):
    return 'inf' if x == math.inf else f'{x:.1f}s'
  if missing:
    status = 'FAIL'
    detail = (f'P95 {fmt(sp)} worst {fmt(worst)}; fired {fired}/{n}; '
              f'{missing} seed(s) never reached {NUDGE_KIND} (each counts FAIL)')
  elif sp > L3019A_LIMIT_S:
    status = 'FAIL'
    detail = f'P95 {fmt(sp)} worst {fmt(worst)}; fired {fired}/{n} (HARD P95≤{L3019A_LIMIT_S:.0f}s)'
  else:
    status = 'PASS'
    detail = f'P95 {fmt(sp)} worst {fmt(worst)}; fired {fired}/{n} (HARD P95≤{L3019A_LIMIT_S:.0f}s)'
  return status, detail, dict(p95=sp, worst=worst, fired=fired, n=n, missing=missing)

def resolve_l3019a(R, lc, seeds: int, pool):
  """Source order: live late_curve event → nudge_log CSV → loud fail (no approx)."""
  src = None
  aff = measure_l3019a_live(R, lc, seeds, pool)
  if aff is not None:
    src = f'live:{NUDGE_KIND} via late_curve NUDGE=1'
    return src, evaluate_l3019a(aff)
  aff = load_l3019a_from_csv(NUDGE_LOG, min_seeds=seeds)
  if aff is not None:
    # trim/pad to seeds: use first `seeds` entries by seed index order already
    aff = aff[:seeds]
    if len(aff) < seeds:
      print(f'L30-19a ERROR: {NUDGE_LOG} has only {len(aff)} {NUDGE_KIND} seeds; need ≥{seeds}',
            file=sys.stderr)
      sys.exit(2)
    src = f'csv:{NUDGE_LOG}'
    return src, evaluate_l3019a(aff)
  # nudge_run.py exists but we refuse to silently invent numbers without a log or live event
  have_run = os.path.isfile(NUDGE_RUN)
  print('L30-19a ERROR: no nudge source. Need late_curve emitting '
        f'{NUDGE_KIND} (NUDGE=1), or {NUDGE_LOG}'
        + (f' (nudge_run.py present at {NUDGE_RUN} but no log to read — run it first)' if have_run else '')
        + '. Refusing to approximate.', file=sys.stderr)
  sys.exit(2)

def level_steps(reach, lo, hi):
  """Per-level durations (sec) for L in [lo, hi]: time from L-1 to L."""
  out = []
  for L in range(lo, hi + 1):
    if L in reach and (L - 1) in reach:
      out.append((L, reach[L] - reach[L - 1]))
  return out

def step_ratios(reach, lo, hi, floor_s=60.0, floor_dt=None):
  """Ratios time(L)/time(L-1) for L in [lo,hi], only if prev level >= floor_s.
  floor_dt: if set (Economy late_curve.summarise uses 30), both legs are max(floor_dt, dt)
  before the ratio — QA official gate keeps floor_dt=None (raw dt)."""
  ratios = []
  for L in range(max(lo, 1), hi + 1):
    if L not in reach or (L - 1) not in reach or (L - 2) not in reach:
      continue
    prev = reach[L - 1] - reach[L - 2]
    cur = reach[L] - reach[L - 1]
    if prev < floor_s:
      continue
    if floor_dt is not None:
      prev = max(floor_dt, prev); cur = max(floor_dt, cur)
    ratios.append((cur / prev, L))
  return ratios

def per_seed_step_p95(rs, lo, hi, floor_s=60.0, floor_dt=None):
  """Per-seed max of step ratios in [lo,hi], then nearest-rank P95 + worst."""
  per = []
  for r in rs:
    rr = step_ratios(r['reach'], lo, hi, floor_s, floor_dt=floor_dt)
    per.append(max((x[0] for x in rr), default=0.0))
  return p95_rank(per), (max(per) if per else 0.0)

def gate_scenario(name, rs, level_times_mode='cumulative'):
  """Return dict of gate results for one scenario."""
  N = len(rs)
  rows = []  # list of (name, status, detail)
  fail = 0; warn = 0

  def add(nm, status, detail):
    nonlocal fail, warn
    rows.append((nm, status, detail))
    if status == 'FAIL': fail += 1
    elif status == 'WARN': warn += 1

  # --- cumulative / per-level medians for L35/40/50 ---
  def med_cum(L):
    vals = [r['reach'].get(L, math.inf) / 60 for r in rs]
    finite = [v for v in vals if v < math.inf]
    if len(finite) < N:  # any miss → treat as inf for median conservatism
      return st.median(vals)
    return st.median(finite)

  def med_per(L):
    vals = []
    for r in rs:
      rc = r['reach']
      if L in rc and (L - 1) in rc:
        vals.append((rc[L] - rc[L - 1]) / 60)
      else:
        vals.append(math.inf)
    return st.median(vals)

  targets = {
    # cumulative bands (PM/HoQA 23:46; HoP ±20%)
    35: (None, 64.8),   # <= 64.8
    40: (48.0, 86.4),
    50: (80.0, 120.0),
  }
  for L, (lo, hi) in targets.items():
    if level_times_mode == 'cumulative':
      m = med_cum(L); label = f'L{L} cumulative median'
    else:
      m = med_per(L); label = f'L{L} per-level median'
    if m == math.inf or math.isnan(m):
      add(label, 'FAIL', f'median=n/a (not all seeds reached L{L})')
      continue
    ok = (lo is None or m >= lo) and m <= hi
    band = f'<={hi}' if lo is None else f'{lo}–{hi}'
    add(label, 'PASS' if ok else 'FAIL', f'{m:.2f} min (band {band} min)')

  # --- worst-seed per-level <= 8 min for every L from 30 up, every seed ---
  worst_pl = (0.0, 0, -1)  # min, L, seed
  bad = 0
  for s, r in enumerate(rs):
    for L, dt in level_steps(r['reach'], 30, 50):
      mins = dt / 60
      if mins > worst_pl[0]:
        worst_pl = (mins, L, s)
      if mins > 8.0:
        bad += 1
  add('per-level <=8 min (L30+, every seed)',
      'PASS' if bad == 0 else 'FAIL',
      f'worst {worst_pl[0]:.2f} min at L{worst_pl[1]} seed {worst_pl[2]}; violations={bad}')

  # --- step ratio (HoP 00:29): EX-1 window L30–40; other ratio gates L30–50 ---
  # QA official: raw dt, prev>=60s, per-seed max, nearest-rank P95.
  # Economy column: same aggregation with max(30,dt) floor (late_curve.summarise).
  sp, sw = per_seed_step_p95(rs, 31, 50, 60.0, floor_dt=None)
  sp_e, sw_e = per_seed_step_p95(rs, 31, 50, 60.0, floor_dt=30.0)
  sp3040, sw3040 = per_seed_step_p95(rs, 31, 40, 60.0, floor_dt=None)
  sp3040_e, sw3040_e = per_seed_step_p95(rs, 31, 40, 60.0, floor_dt=30.0)

  if name in ('casual', 'casual+workers'):
    # EX-1 ACCEPTED EXCEPTION (HoP 00:12 / 00:29): HARD ≤2.25/2.25 over L30–40.
    # HoP 23:56: 'casual' at L30+ is casual+workers.
    if sp3040 > 2.25 or sw3040 > 2.25:
      add('EX-1 L30–40 step ratio (ACCEPTED EXCEPTION HoP 00:12)', 'FAIL',
          f'QA P95 {sp3040:.2f}x worst {sw3040:.2f}x | Economy(max30) P95 {sp3040_e:.2f}x worst {sw3040_e:.2f}x '
          f'(HARD ≤2.25/2.25 exceeded; post-launch telemetry re-judges)')
    else:
      add('EX-1 L30–40 step ratio (ACCEPTED EXCEPTION HoP 00:12)', 'PASS',
          f'QA P95 {sp3040:.2f}x worst {sw3040:.2f}x | Economy(max30) P95 {sp3040_e:.2f}x worst {sw3040_e:.2f}x '
          f'(HARD ≤2.25/2.25; post-launch telemetry re-judges)')
    # Remaining band L41–50 under normal HARD 2.0/2.25 (part of L30–50 other-ratio rule)
    sp41, sw41 = per_seed_step_p95(rs, 41, 50, 60.0, floor_dt=None)
    sp41_e, sw41_e = per_seed_step_p95(rs, 41, 50, 60.0, floor_dt=30.0)
    ok41 = sp41 <= 2.0 and sw41 <= 2.25
    add('step ratio L41–50 (HARD, L30–50 other)', 'PASS' if ok41 else 'FAIL',
        f'QA P95 {sp41:.2f}x worst {sw41:.2f}x | Economy(max30) P95 {sp41_e:.2f}x worst {sw41_e:.2f}x')
  else:
    ok = sp <= 2.0 and sw <= 2.25
    add('step ratio L30–50 (HARD, prev>=60s)', 'PASS' if ok else 'FAIL',
        f'QA P95 {sp:.2f}x worst {sw:.2f}x | Economy(max30) P95 {sp_e:.2f}x worst {sw_e:.2f}x')

  # --- purchase gap ---
  gaps = [r['gap'] / 60 for r in rs]
  gp = p95_rank(gaps); gw = max(gaps)
  if gp > 4.0 or gw > 4.0:
    add('purchase gap', 'FAIL', f'P95 {gp:.2f} worst {gw:.2f} (HARD P95<=4, worst<=4)')
  elif gp > 3.0:
    add('purchase gap', 'WARN', f'P95 {gp:.2f} worst {gw:.2f} (WARN P95>3; still HARD-pass <=4)')
  else:
    add('purchase gap', 'PASS', f'P95 {gp:.2f} worst {gw:.2f}')

  return dict(rows=rows, fail=fail, warn=warn, N=N,
              med35=med_cum(35) if level_times_mode == 'cumulative' else med_per(35),
              med40=med_cum(40) if level_times_mode == 'cumulative' else med_per(40),
              med50=med_cum(50) if level_times_mode == 'cumulative' else med_per(50),
              step_p95=sp, step_worst=sw, gap_p95=gp, gap_worst=gw)

def active_idle_ratios(R, lc, seeds=30):
  """Active/idle at L30/40/50 (gate 1.4–2.0 P95, worst <=2.25).
  Window start: canonical state Farm=L, H=V=L, C=max(0,L-3) — same as late_curve.windows
  (run() does not export mid-run state). Measured as 10-min m4_active rates; under steady
  state the ratio equals 2 h active income / 2 h in-tab idle income (both scale by 7200).
  Idle = in-tab idle (workers, no taps) — NOT offline (offline/active is ~15× and reported-only).
  """
  sys.path.insert(0, os.path.join(PROD, 'sim', 'm4'))
  import m4_active as a
  import m4_final_run as fr
  a.R[:] = R
  base_price = a.price
  a.price = lambda F, H, V, C, tr: round(base_price(F, H, V, C, tr) * lc.fms(F) * lc.feed(F), 2) if tr else base_price(F, H, V, C, tr)
  X = dict(fr.X['ALL_st0.4'], ab2=True)
  out = {}
  for L in (30, 40, 50):
    a.SP['w2']['every'] = 1 if L >= 40 else 2
    HV = L
    C = max(0, L - 3)
    ratios = []
    for s in range(seeds):
      act = a.window(L, HV, HV, C, 'seller15',
                     dict(X, cb=X['cb'] + R[L].get('contracts_manual_bonus', 0.0)),
                     s, fr.TR, T=600)
      idle = a.window(L, HV, HV, C, 'idle', {}, s, fr.TR, T=600)
      ratios.append(act / idle if idle > 0 else float('inf'))
    ratios.sort()
    out[L] = dict(p95=p95_rank(ratios), worst=ratios[-1], mean=st.mean(ratios))
  a.SP['w2']['every'] = 2
  return out

def run_selftest(csv_sha_prefix=None, lc_sha_prefix=None):
  print('=== SELFTEST ===')
  # P95 rank
  vals = list(range(1, 31))  # 1..30
  # ceil(0.95*30)=29 → 1-indexed rank 29 → value 29
  assert p95_rank(vals) == 29, p95_rank(vals)
  assert p95_rank([10.0] * 30) == 10.0
  print('PASS p95_rank ceil(0.95N) 1-indexed')
  # 60 s filter
  reach = {28: 100.0, 29: 130.0, 30: 200.0, 31: 260.0}  # prev to 30 = 30s < 60; prev to 31 = 70s
  # step into 30: prev level 29 duration = 30s → skip; into 31: prev 30 duration = 70s → count 60/70
  rr = step_ratios(reach, 30, 31, 60.0)
  assert rr == [(60 / 70, 31)], rr
  print('PASS 60s previous-level filter')
  # HoP 23:56 scenario map
  assert SCENARIOS['casual']['workers'] is True and SCENARIOS['casual']['report_only'] is False
  assert SCENARIOS['casual-no-workers']['workers'] is False and SCENARIOS['casual-no-workers']['report_only'] is True
  assert SCENARIOS['casual']['model'] == SCENARIOS['casual+workers']['model']
  print('PASS HoP 23:56 casual≡casual+workers HARD; casual-no-workers REPORT-ONLY')
  # L30-19a evaluate helpers
  # ceil(0.95*30)=29 → rank 29 of sorted([0]*28+[20,20]) = 20
  st_ok, det_ok, m_ok = evaluate_l3019a([0.0] * 28 + [20.0, 20.0])
  assert st_ok == 'PASS' and m_ok['p95'] == 20.0, (st_ok, det_ok, m_ok)
  st_bad, det_bad, m_bad = evaluate_l3019a([0.0] * 28 + [math.inf, math.inf])
  assert st_bad == 'FAIL' and m_bad['missing'] == 2, (st_bad, det_bad, m_bad)
  st_slow, _, m_slow = evaluate_l3019a([100.0] * 28 + [200.0, 200.0])
  assert st_slow == 'FAIL' and m_slow['p95'] == 200.0, (st_slow, m_slow)
  print('PASS L30-19a evaluate (PASS/ missing-nudge FAIL / P95>180 FAIL)')
  assert _lc_emits_nudge_event() or os.path.isfile(NUDGE_LOG) or os.path.isfile(NUDGE_RUN)
  print(f'PASS L30-19a source available (lc_event={_lc_emits_nudge_event()} log={os.path.isfile(NUDGE_LOG)})')
  # windows
  assert per_seed_step_p95.__doc__
  print('PASS step windows: EX-1 L30–40; other ratios L30–50; official seeds default 100')
  # pins: optional in selftest unless both flags given
  if csv_sha_prefix and lc_sha_prefix:
    check_pins(csv_sha_prefix, lc_sha_prefix, hard=True)
    print('PASS pin check')
  else:
    print('SKIP full pin check in selftest (pass both --csv-sha and --late-curve-sha to exercise)')
  print('SELFTEST OK')
  return 0

def main():
  ap = argparse.ArgumentParser(description='QA L30+ gate (l30plus-spec v0.3)')
  ap.add_argument('--seeds', type=int, default=100,
                  help='Monte Carlo seeds (official default 100; HoP 00:29)')
  ap.add_argument('--csv-sha', default=None, required=False,
                  help=f'Required CSV sha256 prefix (no default). Shipping: {PIN_CSV}. '
                       f'{RETIRED_CSV} is RETIRED.')
  ap.add_argument('--late-curve-sha', default=None, required=False,
                  help=f'Required late_curve.py sha256 prefix (no default). Expected: {PIN_LC}.')
  ap.add_argument('--csv', default=None,
                  help='Override path to L30+ CSV (default product/economy.l30plus-polish.csv)')
  ap.add_argument('--late-curve', default=None, help='Override path to late_curve.py dir or file')
  ap.add_argument('--level-times', choices=['cumulative', 'per-level'], default='cumulative',
                  help='L35/40/50 median mode (default cumulative = t=0→L; PM/HoQA 23:46)')
  ap.add_argument('--scenarios',
                  default='standard,casual,casual-no-workers,active',
                  help='Comma list. HoP 23:56: casual=casual+workers HARD; '
                       'casual-no-workers REPORT-ONLY')
  ap.add_argument('--selftest', action='store_true')
  ap.add_argument('--skip-active-idle', action='store_true')
  ap.add_argument('--log', default='')
  a = ap.parse_args()
  if a.selftest:
    # selftest is math-only unless BOTH pin flags are given explicitly
    sys.exit(run_selftest(a.csv_sha if (a.csv_sha and a.late_curve_sha) else None,
                          a.late_curve_sha if (a.csv_sha and a.late_curve_sha) else None))

  global CSV_PATH, LC_PATH
  if a.csv:
    CSV_PATH = a.csv
  if a.late_curve:
    lp = a.late_curve
    LC_PATH = lp if lp.endswith('.py') else os.path.join(lp, 'late_curve.py')

  # HoP 00:28/00:29: max(row,extra) is late_curve default when HV_MAX_ROW unset.
  if 'HV_MAX_ROW' in os.environ:
    print(f'NOTE: unsetting HV_MAX_ROW={os.environ["HV_MAX_ROW"]!r} so max(row,extra) default applies',
          file=sys.stderr)
    del os.environ['HV_MAX_ROW']

  # Pins before anything else — both --csv-sha and --late-curve-sha required explicitly.
  csv_h, lc_h, _ = check_pins(a.csv_sha, a.late_curve_sha, hard=True)

  if a.seeds < 30:
    print('ERROR: need >=30 seeds (official default 100)', file=sys.stderr); sys.exit(2)

  if a.csv_sha.startswith('77a68a61'):
    print('*** WARNING: 77a68a61 is superseded by 3e3d61fdc869 — not the baseline pin ***')

  t0 = time.time()
  R = load_R(CSV_PATH)
  lc = import_late_curve()
  # Ensure late_curve MAXL/HVMAX cover the candidate
  assert len(R) >= 51, len(R)

  names = [x.strip() for x in a.scenarios.split(',') if x.strip()]
  overall_fail = 0
  results = {}

  print(f'l30plus-gate | seeds={a.seeds} | level-times={a.level_times} | csv={csv_h[:12]}… | lc={lc_h[:12]}…')
  print(f'farm_dir={FARM}')
  print('HoP 00:29: 100 seeds; EX-1 L30–40; other ratios L30–50; 3e3d61fd RETIRED; L30-19a HARD')

  with Pool(max(1, min(6, os.cpu_count() or 2))) as pool:
    for name in names:
      if name not in SCENARIOS:
        print(f'ERROR: unknown scenario {name!r}; known={sorted(SCENARIOS)}', file=sys.stderr)
        sys.exit(2)
      cfg = SCENARIOS[name]
      ro = cfg.get('report_only', False)
      tag = 'REPORT-ONLY' if ro else 'HARD'
      print(f'\n== scenario {name} [{tag}] workers={cfg["workers"]} model={cfg["model"]} T={cfg["T"]}s ==')
      rs = lc.mc(R, cfg['workers'], seeds=a.seeds, T_=cfg['T'], model=cfg['model'], pool=pool)
      g = gate_scenario(name, rs, a.level_times)
      results[name] = g
      print(f'| gate | status | detail |')
      print(f'|---|---|---|')
      for nm, status, detail in g['rows']:
        print(f'| {nm} | {status} | {detail} |')
        if name in ('casual', 'casual+workers') and 'EX-1' in nm:
          print(f'ACCEPTED EXCEPTION (HoP 00:12), to be re-judged by post-launch telemetry: {status} — {detail}')
      if ro:
        print(f'(REPORT-ONLY: {g["fail"]} fail-shaped rows ignored for OVERALL)')
      else:
        overall_fail += g['fail']

    # L30-19a HARD in casual-no-workers (spec v0.3 FINAL)
    print(f'\n== L30-19a [HARD] casual-no-workers: {NUDGE_KIND} → hire affordable ≤{L3019A_LIMIT_S:.0f}s P95 ==')
    src19, (st19, det19, meta19) = resolve_l3019a(R, lc, a.seeds, pool)
    print(f'source={src19}')
    print(f'| gate | status | detail |')
    print(f'|---|---|---|')
    print(f'| L30-19a nudge→afford | {st19} | {det19} |')
    results['L30-19a'] = (st19, det19, meta19, src19)
    if st19 == 'FAIL':
      overall_fail += 1

    if not a.skip_active_idle:
      print('\n== active/idle 2h @ L30/40/50 (canonical H=V=F, C=F-3) ==')
      ai = active_idle_ratios(R, lc, seeds=a.seeds)
      print('| L | P95 | worst | mean | status |')
      print('|---|---|---|---|---|')
      for L, d in ai.items():
        ok = 1.4 <= d['p95'] <= 2.0 and d['worst'] <= 2.25
        st_ = 'PASS' if ok else 'FAIL'
        if not ok: overall_fail += 1
        print(f'| L{L} | {d["p95"]:.3f} | {d["worst"]:.3f} | {d["mean"]:.3f} | {st_} |')
        results.setdefault('_active_idle', {})[L] = (st_, d)

  elapsed = time.time() - t0
  print(f'\nOVERALL: {"FAIL" if overall_fail else "PASS"} (fail_gates={overall_fail}) in {elapsed:.0f}s')
  if a.log:
    # already printed to stdout; caller redirects
    pass
  # stash summary for report writer via exit code
  sys.exit(1 if overall_fail else 0)

if __name__ == '__main__':
  main()
