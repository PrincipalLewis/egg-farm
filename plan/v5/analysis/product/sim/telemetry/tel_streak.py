"""Streak cap 0.40 rerun on the full M4 stack (Economy, 2026-10-16). Patched copy of sim/m4/m4_active.window:
economy = economy.m4-candidate.csv (caps x Hens milestone coop mult, workers from CSV); adds visit players (Poisson gaps, 5 taps @1/s).
Also w2_asleep_share: asleep/unpaid Coop Hand collects at that share of its normal rate (PM Workers sweep).
python3 tel_streak.py MODE   (MODE = streak | asleep)"""
import sys, os, csv, inspect, random, math, json, statistics as st
from multiprocessing import Pool
sys.path.insert(0, '/workspace/egg-farm-studio/product/sim/m4'); import m4_active as a
CAND = '/workspace/egg-farm-studio/product/economy.m4-candidate.csv'
a.R = [{k: float(v) for k, v in r.items()} for r in csv.DictReader(open(CAND))]; a.SP = a.m.spec_from_csv(CAND)
src = inspect.getsource(a.window)
rep = [
 ("def window(F, H, V, C, pl, x, seed, tr=TR, T=600, dt=0.1, workers=True, e0=100.0):",
  "def window(F, H, V, C, pl, x, seed, tr=TR, T=600, dt=0.1, workers=True, e0=100.0, w2_asleep=0.0, tel=None, floorN=0, nohand=False):"),
 ("  P = PLAYERS[pl];", "  P = PLAYERS[pl]; vrng = random.Random(seed * 7 + 3); burst = 5; fullt = 0.0; penT = 0.0;"),
 ("      tap_t = t + 1 / P['tap']; ", "      tap_t = t + 1 / P['tap']\n      if P.get('visit'):\n        burst -= 1\n        if burst <= 0: burst = 5; tap_t = t + 1 + vrng.expovariate(1 / P['visit'])\n      "),
 ("      if ev and t >= wt['w2']:", "      if ev is None and w2_asleep > 0: ev = SP['w2']['every'] / w2_asleep\n      if ev and t >= wt['w2']:"),
 ("  rate = hens_rate(H, tr) if tr else rw['eggs_per_sec']; pr = price(F, H, V, C, tr)", "  rate = hens_rate(H, tr) if tr else rw['eggs_per_sec']; pr = price(F, H, V, C, tr)\n  if floorN and F >= 8: cap = max(cap, math.ceil(floorN * rate))"),
 ("  W = [w for w in ('w1', 'w2', 'w3')", "  W = [w for w in (('w1', 'w3') if nohand else ('w1', 'w2', 'w3'))"),
 ("  return coins / T", "  if tel is not None: tel['full'] = fullt / T; tel['basket'] = basket; tel['coop'] = coop; tel['pen'] = penT; tel['wages'] = wages\n  return coins / T"),
 ("coins -= fee\n", "coins -= fee; penT += fee\n"),
]
for o, n in rep: assert o in src, o; src = src.replace(o, n)
# coop-full accounting: find the coop fill line
import re
mm = re.search(r"\n(\s+)coop = min\(cap, coop \+ ([^\n]+)\)\n", src); assert mm, 'coop line'
src = src.replace(mm.group(0), f"\n{mm.group(1)}coop = min(cap, coop + {mm.group(2)})\n{mm.group(1)}if coop >= cap - 1e-9: fullt += dt\n")
g = dict(vars(a)); exec(src, g); window = g['window']
P = a.PLAYERS
P['casual05'] = dict(tap=0.5, sell=20, refill=True, catch=0.6, ab_use=0.5, poisson=True, dem=0.75)
for G in (20, 45, 90): P[f'visit{G}'] = dict(tap=1.0, sell=30, refill=True, catch=min(1.0, 35 / (G + 5)), ab_use=0.5, poisson=True, dem=0.75, visit=G)
for G in (20, 45, 90): P[f'visit{G}_unm'] = dict(P[f'visit{G}'], refill=False)
TR = dict(a.TR, h_base=36, v_base=48, v_cap=3, price='A')
B = dict(cb=0.05, leave_pen=0.05)
ALL = dict(B, streak=True, st_spec=True, egg=True, egg_v=3, eggs_cash_from=20, focus=0.10, abil=True, ab2=True, a1=1.15, a2=1.15, a3=1.15, a4=0.5)
LV = {'F0-2': 1, 'F3-7': 5, 'F8-14': 11, 'F15-19': 17, 'F20-30': 24}
IDLE = {'optimal': 'idle', 'seller15': 'idle', 'casual': 'idle_casual', 'casual05': 'idle_casual', 'visit20': 'idle_casual', 'visit45': 'idle_casual', 'visit90': 'idle_casual'}
def job(j):
  F, pl, cap, s, T, w2a = j[:6]; fN, nh = (j[6], j[7]) if len(j) > 6 else (0, False); tel = {}
  x = B if pl.startswith('idle') else dict(ALL, st_cap=cap)
  v = window(F, F, F, max(0, F - 3), pl, x, s, TR, T=T, w2_asleep=w2a, tel=tel, floorN=fN, nohand=nh); return j, (v, tel.get('full', 0))
P['idle_mgd'] = dict(tap=0, sell=None, refill=True, catch=0, ab_use=0, poisson=False, dem=1.0)
P['idle_casual_mgd'] = dict(P['idle_mgd'], poisson=True, dem=0.75)
ACTS = ['optimal', 'seller15', 'casual05', 'visit20', 'visit45', 'visit90']
IDL60 = {'optimal': 'idle_mgd', 'seller15': 'idle_mgd', 'casual05': 'idle_casual_mgd', 'visit20': 'idle_casual_mgd', 'visit45': 'idle_casual_mgd', 'visit90': 'idle_casual_mgd'}
def pct(v, p): v = sorted(v); k = (len(v) - 1) * p; i = int(k); return v[i] + (v[min(i + 1, len(v) - 1)] - v[i]) * (k - i)
if __name__ == '__main__' and sys.argv[1] == 'streak':
  S = range(200); NP = 4
  jobs = [(F, pl, 0.40, s, 3600, 0) for F in LV.values() for pl in ACTS + ['idle_mgd', 'idle_casual_mgd'] for s in S]
  jobs += [(F, pl, c, s, 600, 0) for F in (10, 18, 24) for pl in ('optimal', 'casual') for c in (0.30, 0.40) for s in S]
  jobs += [(F, pl, 0.40, s, 600, 0) for F in (10, 18, 24) for pl in ('idle', 'idle_casual') for s in S]
  with Pool(NP) as p: D = dict(p.map(job, jobs, chunksize=16))
  json.dump([[list(k), v] for k, v in D.items()], open('tel_streak_raw.json', 'w'))
  out = ['### 60-min window, streak cap 0.40, full stack (200 seeds); ratio = per-seed active / mean managed-idle at same F', '| player | ' + ' | '.join(f'{g} mean / P95 / max' for g in LV) + ' | overall mean / P95 / max | P95 ≤ 2.0 |', '|---|' + '---|' * 7]
  for pl in ACTS:
    allr = []; cells = []
    for g, F in LV.items():
      i_ = st.mean(D[(F, IDL60[pl], 0.40, s, 3600, 0)][0] for s in S)
      if i_ <= 0: cells.append('n/a (idle = 0, no workers)'); continue
      r = [D[(F, pl, 0.40, s, 3600, 0)][0] / i_ for s in S]; allr += r
      cells.append(f'{st.mean(r):.2f} / {pct(r,.95):.2f} / {max(r):.2f}')
    out.append(f'| {pl} | ' + ' | '.join(cells) + f' | {st.mean(allr):.2f} / {pct(allr,.95):.2f} / {max(allr):.2f} | {"PASS" if pct(allr,.95) <= 2 else "FAIL"} |')
  out += ['', '### 10-min window (approved rule; reproduces m4-active-checks ALL row), 200 seeds: mean [P95] [worst]', '| cap | player | F10 | F18 | F24 |', '|---|---|---|---|---|']
  for c in (0.30, 0.40):
    for pl, idl in (('optimal', 'idle'), ('casual', 'idle_casual')):
      cells = []
      for F in (10, 18, 24):
        i_ = st.mean(D[(F, idl, 0.40, s, 600, 0)][0] for s in S); r = [D[(F, pl, c, s, 600, 0)][0] / i_ for s in S]
        cells.append(f'{st.mean(r):.2f} [{pct(r,.95):.2f}] [{max(r):.2f}]')
      out.append(f'| {c} | {pl} | ' + ' | '.join(cells) + ' |')
  open('tel_streak_out.md', 'w').write('\n'.join(out)); print('\n'.join(out))
