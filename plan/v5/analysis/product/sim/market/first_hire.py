"""First-hire nudge (rc2-first-hire-nudge.md, AC-FH3) on the casual model (Economy, 2026-10-16). python3 first_hire.py [seeds] > first_hire_out.md
roadmap_m4_prog.run (economy.m4-candidate.csv, casual: 0.5 taps/s, sells every 20 s, demand x0.75, Poisson), patched at import:
- trigger = first visit with F >= 3, W1 not hired, coins >= $40 (rule 1). W1 can be hired only at visits >= trigger + delay
  (it then takes priority over track buys, as all hires do in the bot). Later hires (W2/W3/Grader) unchanged once W1 is hired.
- nudge: delay ~ U(0, 60) s (player acts within 60 s of the nudge).
- no nudge (assumption, no telemetry yet): delay ~ Exp(mean 600 s) (player finds the Workers tab on their own), and 'never' (no workers).
- instant: delay 0 (the bot as used in all earlier runs)."""
import sys, inspect, random, statistics as st, math
from multiprocessing import Pool
sys.path.insert(0, '/workspace/egg-farm-studio/product/sim/market'); import roadmap_m4_prog as w
src = inspect.getsource(w.run).replace('def run(', 'def run_fh(')
R = [("w1off=False)", "w1off=False, fh=0.0)"),
("          w = next((w for w in ('w1', 'w2', 'w3') if w not in hired and F >= WK[w]['unlock'] and coins >= WK[w]['cost']), None)",
 """          if FH['trig'] is None and 'w1' not in hired and F >= WK['w1']['unlock'] and coins >= WK['w1']['cost']: FH['trig'] = t
          w = next((w for w in ('w1', 'w2', 'w3') if w not in hired and F >= WK[w]['unlock'] and coins >= WK[w]['cost'] and (w != 'w1' or (FH['trig'] is not None and t >= FH['trig'] + O['fh']))), None)
          if w == 'w1': FH['hire'] = t; FH['F'] = F"""),
("  hired = set();", "  FH = dict(trig=None, hire=None, F=None); hired = set();"),
("  return dict(reach=reach,", "  return dict(fh=FH, reach=reach,")]
for o, n in R:
  assert src.count(o) == 1, o[:60]; src = src.replace(o, n)
g = dict(vars(w)); exec(src, g); RUN = g['run_fh']
P = '/workspace/egg-farm-studio/product/economy.m4-candidate.csv'
def delay(mode, s):
  rng = random.Random(s * 977 + 3)
  return {'instant': 0.0, 'nudge': rng.uniform(0, 60), 'no_nudge': rng.expovariate(1 / 600)}[mode]
def job(j):
  mode, s = j
  if mode == 'never': r = w.run((P, s, 'casual', 3600, False, dict(se=20, taps=0.5)))
  else: r = RUN((P, s, 'casual', 3600, True, dict(se=20, taps=0.5, fh=delay(mode, s))))
  return j, r
if __name__ == '__main__':
  N = int(sys.argv[1]) if len(sys.argv) > 1 else 200; M = ('nudge', 'no_nudge', 'instant', 'never')
  with Pool(4) as p: D = dict(p.map(job, [(m, s) for m in M for s in range(N)], chunksize=10))
  p95 = lambda v: sorted(v)[min(len(v) - 1, math.ceil(0.95 * len(v)) - 1)]
  print(f'# First-hire nudge, casual model, economy.m4-candidate.csv, {N} seeds\n')
  print('| case | F3 unlock -> first hire: median / P95 / worst (min) | worker by L10 | L@30:00 median [min-max] | in band L20-24 | F18 median (min) | AC-FH3 (med <=3, P95 <=8, >=90% by L10) |')
  print('|---|---|---|---|---|---|---|')
  for m in M:
    rs = [D[(m, s)] for s in range(N)]; L = [r['L30'] for r in rs]
    t18 = st.median(r['reach'].get(18, 1e9) for r in rs) / 60
    if m == 'never':
      print(f"| never hires | — | 0% | L{st.median(L):g} [{min(L)}-{max(L)}] | {sum(20 <= x <= 24 for x in L)}/{N} (no-worker band L18-22: {sum(18 <= x <= 22 for x in L)}/{N}) | {t18:.1f} | FAIL |"); continue
    d = [((r['fh']['hire'] if r['fh']['hire'] is not None else 3600) - r['reach'][3]) / 60 for r in rs]
    by10 = sum(r['fh']['hire'] is not None and r['fh']['hire'] <= r['reach'].get(10, 1e9) for r in rs) / N
    ok = st.median(d) <= 3 and p95(d) <= 8 and by10 >= 0.9
    print(f"| {m} | {st.median(d):.2f} / {p95(d):.2f} / {max(d):.2f} | {by10:.0%} | L{st.median(L):g} [{min(L)}-{max(L)}] | {sum(20 <= x <= 24 for x in L)}/{N} | {t18:.1f} | {'PASS' if ok else 'FAIL'} |")
