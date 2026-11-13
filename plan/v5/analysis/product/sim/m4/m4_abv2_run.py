"""v0.2 abilities in the full stack, 10-min active/idle, seeds 0-99. python3 m4_abv2_run.py > m4_abv2_out.md"""
import statistics as st, sys
from multiprocessing import Pool
import m4_active as a
TR = dict(a.TR, h_base=36, v_base=48, v_cap=3, price='A')
B = dict(cb=0.05, leave_pen=0.05)
ALL = dict(B, streak=True, st_spec=True, st_cap=0.40, egg=True, egg_v=3, eggs_cash_from=20, focus=0.10)  # HoP 13:42 values
X = {'ALL no ability': ALL, 'ALL + old ability': dict(ALL, abil=True)}
def v2(a1, a2, a3): return dict(ALL, abil=True, ab2=True, a1=a1, a2=a2, a3=a3, a4=0.5)
SIZES = [(1.10,)*3, (1.15,)*3, (1.10, 1.15, 1.25)] + [(k,)*3 for k in (1.20, 1.25, 1.30, 1.40, 1.50)]
for z in SIZES: X['v0.2 W1/W2/W3 x' + '/'.join(f'{q:g}' for q in z) + ' W4 +0.5'] = v2(*z)
X['v0.2 x1.15 worst luck (egg every 120 s, frenzy 100%)'] = dict(v2(1.15, 1.15, 1.15), egg_gap=(120, 120), w_cash=0, w_fr=1, w_eggs=0)
S = range(100); LV = (10, 18, 24)
def run(j): F, pl, k, s = j; return j, a.window(F, F, F, F - 3, pl, X[k] if k != 'idle' else B, s, TR)
if __name__ == '__main__':
  jobs = [(F, pl, k, s) for F in LV for k in X for pl in ('optimal', 'casual') for s in S] + [(F, pl, 'idle', s) for F in LV for pl in ('idle', 'idle_casual') for s in S]
  with Pool(8) as p: D = dict(p.map(run, jobs, chunksize=16))
  print('| variant | F10 opt mean [worst] / casual | F18 | F24 | max worst | cap 2x | band 1.5-2 (opt means) |\n|---|---|---|---|---|---|---|')
  for k in X:
    cells = []; worst = 0; means = []
    for F in LV:
      io = st.mean(D[(F, 'idle', 'idle', s)] for s in S); ic = st.mean(D[(F, 'idle_casual', 'idle', s)] for s in S)
      ro = [D[(F, 'optimal', k, s)] / io for s in S]; rc = st.mean(D[(F, 'casual', k, s)] for s in S) / ic
      worst = max(worst, max(ro)); means.append(st.mean(ro)); cells.append(f'{st.mean(ro):.2f} [{max(ro):.2f}] / {rc:.2f}')
    print(f"| {k} | {' | '.join(cells)} | {worst:.2f} | {'PASS' if worst <= 2 else 'FAIL'} | {'PASS' if all(1.5 <= x <= 2 for x in means) else 'FAIL'} |")
