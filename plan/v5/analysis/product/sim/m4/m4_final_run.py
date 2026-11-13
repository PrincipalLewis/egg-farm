"""Final M4 active/idle rerun (2026-10-16 13:xx): 36/48 tracks, leave_pen 0.05 (fixed hook), cb 0.05, spec streak 0.30,
golden egg v0.3 (frenzy x2 price 30 s), plus E1 and frenzy scope. python3 m4_final_run.py > m4_final_out.md"""
import statistics as st
from multiprocessing import Pool
import m4_active as a
TR = dict(a.TR, h_base=36, v_base=48, v_cap=3, price='A')
B = dict(cb=0.05, leave_pen=0.05)
STK = dict(B, streak=True, st_spec=True, st_cap=0.30)
EGG = dict(STK, egg=True, egg_v=3)
ALL = dict(EGG, abil=True, focus=0.10)
X = {'base': B, 'cb0_pen0': dict(cb=0, leave_pen=0), 'focus': dict(B, focus=0.10), 'pause': dict(B, pause='yawn'),
     'egg_only': dict(B, egg=True, egg_v=3), 'abil': dict(B, abil=True), 'streak': STK, 'streak+egg': EGG,
     'streak+egg+focus': dict(EGG, focus=0.10), 'ALL': ALL, 'ALL_frmanual': dict(ALL, fr_scope='manual_new'),
     'ALL_worst(gap120,frenzy100%)': dict(ALL, egg_gap=(120, 120), w_cash=0, w_fr=1, w_eggs=0), 'idle': B,
     # E1 (30-min windows)
     'e1_base': STK, 'e1_egg': EGG, 'e1_cash': dict(EGG, w_cash=1, w_fr=0, w_eggs=0), 'e1_fr': dict(EGG, w_cash=0, w_fr=1, w_eggs=0),
     'e1_eggs': dict(EGG, w_cash=0, w_fr=0, w_eggs=1), 'e1_frman': dict(EGG, fr_scope='manual_new'),
     'e1_fr_man': dict(EGG, w_cash=0, w_fr=1, w_eggs=0, fr_scope='manual_new')}
for c in (0.20, 0.25, 0.35, 0.40, 0.50): X[f'ALL_worst_st{c}'] = dict(X['ALL_worst(gap120,frenzy100%)'], st_cap=c); X[f'ALL_st{c}'] = dict(ALL, st_cap=c)
S = range(30); LV = (10, 18, 24)
W10 = [k for k in X if not k.startswith('e1') and k != 'idle']
PL = (('optimal', 'idle'), ('seller15', 'idle'), ('casual', 'idle_casual'))
E1P = ('seller15', 'seller15_c60', 'seller15_unm', 'seller15_unm_c60')
def run(j): F, pl, k, s, T = j; return j, a.window(F, F, F, F - 3, pl, X[k], s, TR, T=T)
if __name__ == '__main__':
  jobs = [(F, pl, k, s, 600) for F in LV for k in W10 for pl in ('optimal', 'seller15', 'casual') for s in S]
  jobs += [(F, pl, 'idle', s, 600) for F in LV for pl in ('idle', 'idle_casual') for s in S]
  jobs += [(F, pl, k, s, 1800) for F in LV for pl in E1P for k in X if k.startswith('e1') for s in S]
  with Pool(8) as p: D = dict(p.map(run, jobs, chunksize=8))
  M = lambda F, pl, k, T=600: st.mean(D[(F, pl, k, s, T)] for s in S)
  print('## 10-min active/idle (mean of 30 seeds [worst seed]); optimal / seller15 / casual')
  print('| variant | F10 | F18 | F24 |\n|---|---|---|---|')
  for k in W10:
    cells = []
    for F in LV:
      cc = []
      for act, idl in PL:
        i_ = M(F, idl, 'idle'); rs = [D[(F, act, k, s, 600)] / i_ for s in S]
        cc.append(f'{st.mean(rs):.2f}' + (f' [{max(rs):.2f}]' if act == 'optimal' else ''))
      cells.append(' / '.join(cc))
    print(f'| {k} | ' + ' | '.join(cells) + ' |')
  print('\n## E1: golden-egg income gain, 30-min window, same state (streak on in both arms)')
  print('| level | player | gain | cash part (45%) | frenzy part (35%) | eggs part (20%) | gain, frenzy manual+new-eggs only |\n|---|---|---|---|---|---|---|')
  for F in LV:
    for pl in E1P:
      b = M(F, pl, 'e1_base', 1800); g = lambda k: M(F, pl, k, 1800) / b - 1
      print(f"| F{F} | {pl} | {g('e1_egg'):+.1%} | {g('e1_cash')*.45:+.1%} | {g('e1_fr')*.35:+.1%} | {g('e1_eggs')*.20:+.1%} | {g('e1_frman'):+.1%} |")
