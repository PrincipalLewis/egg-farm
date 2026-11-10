"""Hire-nudge affordability log, casual no-workers profile (never hires). NUDGE=1 python3 nudge_run.py <csv> <out.csv>"""
import os, sys, csv, math
os.environ['NUDGE'] = '1'; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import late_curve as lc
from multiprocessing import Pool
rows = list(csv.DictReader(open(sys.argv[1]))); R = [{k: float(v) for k, v in r.items()} for r in rows]
with Pool(6) as p: rs = lc.mc(R, False, pool=p, model='casual', T_=200 * 60, seeds=100)
with open(sys.argv[2], 'w', newline='') as f:
  w = csv.writer(f, lineterminator='\n'); w.writerow(['seed', 'kind', 'fire_t_s', 'farm_level', 'coins_at_fire', 'next_hire_cost', 'afford_after_s'])
  for s, r in enumerate(rs):
    for e in r['nudges']: w.writerow([s, e['kind'], e['t'], e['F'], e['coins'], 40 if e['kind'] == 'first_hire' else 150, e.get('afford_s', 'never')])  # f25 / coop-full → Coop Hand $150
p95 = lambda v: v[min(len(v) - 1, math.ceil(0.95 * len(v)) - 1)]
for k in ('first_hire', 'coop_full', 'coop_full_gate_L25', 'nudge_f25_noworker'):
  ev = [e for r in rs for e in r['nudges'] if e['kind'] == k]
  a = sorted(e.get('afford_s', math.inf) for e in ev); Fs = sorted(e['F'] for e in ev)
  print(k, 'fired', len(ev), '/100 seeds', 'F range', (Fs[0], Fs[-1]) if Fs else None, 'afford P95 s', p95(a) if a else None, 'worst s', a[-1] if a else None)
