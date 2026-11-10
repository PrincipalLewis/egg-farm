"""MJ2: active (optimal, ALL stack, 10-min window $/s) vs 2 h offline $/s at H=F=V=10/20/30, C=F-3.
Offline eggs/s = min(hens_rate, Farm demand) (no taps), x hens_offline_mult; cap offline_max_eggs_2h x mult; price w/o Grader. python3 mj2_offline.py"""
import csv, statistics as st, m4_active as a, m4_final_run as fr
from multiprocessing import Pool
R = [{k: float(v) for k, v in r.items()} for r in csv.DictReader(open('/workspace/egg-farm-studio/product/economy.f1-m4cols.csv'))]
TR = fr.TR; K = 'ALL_st0.4'
def ms(H): return max([1.0] + [R[0][f'hens_ms{k}_offline_mult'] for k in (1, 2, 3) if H >= R[0][f'hens_ms{k}_level']])
def run(j): F, pl, s = j; return j, a.window(F, F, F, F - 3, pl, fr.X[K] if pl != 'idle' else {}, s, TR)
if __name__ == '__main__':
  LV = (10, 20, 30); J = [(F, pl, s) for F in LV for pl in ('optimal', 'idle') for s in range(30)]
  with Pool(8) as p: D = dict(p.map(run, J))
  print('| H=F=V | active $/s | in-tab idle $/s | act/idle | offline mult | offline eggs/s (uncapped) | cap eggs (2h x mult) | offline $/s | active/offline | in-tab idle/offline |')
  for F in LV:
    act = st.mean(D[(F, 'optimal', s)] for s in range(30)); idl = st.mean(D[(F, 'idle', s)] for s in range(30)); r = R[F]
    dem = (r['demand_min'] + r['demand_max']) / 2 / r['customer_interval_s']; m = ms(F)
    eggs = min(a.hens_rate(F, TR), dem) * m; cap = r['offline_max_eggs_2h'] * m; e2h = min(eggs * 7200, cap)
    off = e2h * a.price(F, F, F, F - 3, TR) / 7200
    print(f'| {F} | {act:.1f} | {idl:.1f} | {act/idl:.2f} | {m} | {eggs:.2f} | {cap:.0f} | {off:.1f} | {act/off:.2f}{" FLAG<1.4" if act/off < 1.4 else ""} | {idl/off:.2f} |')
