"""Task C: golden egg v0.3 E1 + frenzy scope + stacking worst case. python3 m4_taskc_run.py > m4_taskc_out.md"""
import statistics as st
from multiprocessing import Pool
import m4_active as a
TR = dict(a.TR, h_base=30, v_base=40, v_cap=3, price='A')
APP = dict(streak=True, st_cap=0.30); EGG = dict(APP, egg=True, egg_v=3); ALL = dict(EGG, abil=True, focus=0.10)
X = {'base': APP, 'egg': EGG, 'egg_cash': dict(EGG, w_cash=1, w_fr=0, w_eggs=0), 'egg_fr': dict(EGG, w_cash=0, w_fr=1, w_eggs=0),
     'egg_eggs': dict(EGG, w_cash=0, w_fr=0, w_eggs=1), 'egg_frmanual': dict(EGG, fr_scope='manual_new'),
     'all': ALL, 'all_frmanual': dict(ALL, fr_scope='manual_new'), 'all_gap120': dict(ALL, egg_gap=(120, 120)),
     'all_gap120_fr100': dict(ALL, egg_gap=(120, 120), w_cash=0, w_fr=1, w_eggs=0), 'idle': {}}
for fp in (1.5, 1.75): X[f'all_gap120_fr100_x{fp}'] = dict(X['all_gap120_fr100'], fr_price=fp)
for sc in (0.20, 0.25): X[f'all_gap120_fr100_st{sc}'] = dict(X['all_gap120_fr100'], st_cap=sc)
S = range(30); LV = (10, 18, 24)
PLS = ('seller15', 'seller15_c60', 'seller15_unm', 'seller15_unm_c60')
E1K = ('base', 'egg', 'egg_cash', 'egg_fr', 'egg_eggs', 'egg_frmanual')
STK = ('all', 'all_frmanual', 'all_gap120', 'all_gap120_fr100') + tuple(k for k in X if k.startswith('all_gap120_fr100_'))
def run(j): F, pl, k, s, T = j; return j, a.window(F, F, F, F - 3, pl, X[k], s, TR, T=T)
if __name__ == '__main__':
  jobs = [(F, pl, k, s, 1800) for F in LV for pl in PLS for k in E1K for s in S]
  jobs += [(F, 'optimal', k, s, 600) for F in LV for k in STK for s in S] + [(F, 'idle', 'idle', s, 600) for F in LV for s in S]
  with Pool(8) as p: D = dict(p.map(run, jobs, chunksize=4))
  M = lambda F, pl, k, T: st.mean(D[(F, pl, k, s, T)] for s in S)
  print('## E1: income gain from golden eggs (30-min window, 30 seeds; same state, streak 0.30 on in both arms)')
  print('| level | player | gain all outcomes | cash share | frenzy share | eggs share | gain if frenzy manual+new eggs only |\n|---|---|---|---|---|---|---|')
  for F in LV:
    for pl in PLS:
      b = M(F, pl, 'base', 1800); g = M(F, pl, 'egg', 1800) / b - 1
      c = (M(F, pl, 'egg_cash', 1800) / b - 1) * .45; fr = (M(F, pl, 'egg_fr', 1800) / b - 1) * .35; e = (M(F, pl, 'egg_eggs', 1800) / b - 1) * .20
      gm = M(F, pl, 'egg_frmanual', 1800) / b - 1
      print(f'| F{F} | {pl} | {g:+.1%} | {c:+.1%} | {fr:+.1%} | {e:+.1%} | {gm:+.1%} |')
  print('\n## Stacking: optimal active / idle, 10-min window (mean over 30 seeds; worst seed in brackets)')
  print('| variant | F10 | F18 | F24 |\n|---|---|---|---|')
  for k in STK:
    cells = []
    for F in LV:
      idl = M(F, 'idle', 'idle', 600); rs = [D[(F, 'optimal', k, s, 600)] / idl for s in S]
      cells.append(f'{st.mean(rs):.2f} [{max(rs):.2f}]')
    print(f'| {k} | ' + ' | '.join(cells) + ' |')
