"""Roadmap v0.2: CEO 10-min active/idle ratio on the full M4 ALL stack (m4_final_run.py settings) + goals/bulk, economy.m4-candidate.csv.
Active player picks per seed the better of Market Hand ON / OFF (OFF = player pauses W1 to farm manual serves). python3 run_ratio.py [seeds] [goalsJSON] [bulkJSON]"""
import sys, json, statistics as st
from multiprocessing import Pool
sys.path.insert(0, '/workspace/egg-farm-studio/product/sim/market'); import roadmap_m4_active as a
TR = dict(a.TR, h_base=36, v_base=48, v_cap=3, price='A')
B = dict(cb=0.05, leave_pen=0.05); ALL = dict(B, streak=True, st_spec=True, st_cap=0.30, egg=True, egg_v=3, abil=True, focus=0.10)
N = int(sys.argv[1]) if len(sys.argv) > 1 else 200
G = json.loads(sys.argv[2]) if len(sys.argv) > 2 else dict(n=10, r=12, cd=120)
BU = json.loads(sys.argv[3]) if len(sys.argv) > 3 else dict(iv=[150, 270], share=0.4, maxm=4, pm=1.5, wait=60)
a.PLAYERS['seller5'] = dict(a.PLAYERS['seller15'], sell=5); a.PLAYERS['seller30'] = dict(a.PLAYERS['seller15'], sell=30)
V = {'ALL': ALL, '+goals': dict(ALL, goals=G), '+bulk': dict(ALL, bulk=BU), '+both': dict(ALL, goals=G, bulk=BU)}
FS = (10, 18, 22, 24); PLS = ('optimal', 'seller5', 'seller15', 'seller30', 'casual')
def job(j):
  F, pl, v, off, s = j
  if pl in ('idle', 'idle_casual'): return j, a.window(F, F, F, F - 3, pl, B, s, TR)
  return j, a.window(F, F, F, F - 3, pl, dict(V[v], w1off=off), s, TR)
if __name__ == '__main__':
  J = [(F, pl, v, off, s) for F in FS for pl in PLS for v in V for off in (0, 1) for s in range(N)] + [(F, pl, '-', 0, s) for F in FS for pl in ('idle', 'idle_casual') for s in range(N)]
  with Pool(8) as p: D = dict(p.map(job, J, chunksize=40))
  print(f'## 10-min active/idle, {N} seeds: mean / P95 seed / max seed (active = max(W1 on, W1 off) per seed); idle = workers only, no taps')
  print('| F | player | ALL (M4 stack) | +goals | +bulk | +both | lift +both vs ALL (mean) |\n|---|---|---|---|---|---|---|')
  OUT = {}
  for F in FS:
    for pl in PLS:
      idl = st.mean(D[(F, 'idle_casual' if pl == 'casual' else 'idle', '-', 0, s)] for s in range(N)); cells = []; mm = {}
      for v in V:
        rs = sorted(max(D[(F, pl, v, 0, s)], D[(F, pl, v, 1, s)]) / idl for s in range(N)); mm[v] = st.mean(rs)
        p95 = rs[int(0.95 * N) - 1]; cells.append(f'{mm[v]:.2f} / {p95:.2f} / {rs[-1]:.2f}'); OUT[(F, pl, v)] = (mm[v], p95, rs[-1])
        offsh = sum(D[(F, pl, v, 1, s)] > D[(F, pl, v, 0, s)] for s in range(N))
      print(f"| F{F} | {pl} | " + ' | '.join(cells) + f" | {100*(mm['+both']/mm['ALL']-1):+.1f}% |")
  # 2 h offline: eggs_per_sec*0.25*min(away,7200)*hens offline mult, price incl. Grader (awake), no customer features
  print('\n## 2 h: optimal active (10-min rate x 7200) vs offline formula')
  print('| F | offline 2 h $ | active/offline ALL | active/offline +both |\n|---|---|---|---|')
  for F in FS:
    rw = a.row(F); tiers = [g for f_, g in a.SP['w4'] if F >= f_]; g = tiers[-1] if tiers else 1.0
    off = a.hens_rate(F, TR) * 0.25 * 7200 * a.hens_ms(F) * a.price(F, F, F, F - 3, TR) * g
    act = lambda v: st.mean(max(D[(F, 'optimal', v, 0, s)], D[(F, 'optimal', v, 1, s)]) for s in range(N)) * 7200
    print(f'| F{F} | {off:,.0f} | {act("ALL")/off:.2f} | {act("+both")/off:.2f} |')
