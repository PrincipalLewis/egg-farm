"""Active/idle 10-min ratio, base v7 vs fixB (no Hens lay milestones), using m4_final_run's ALL stack. python3 m4a_m1_ratio.py"""
import statistics as st, m4_active as a, m4_final_run as fr
from multiprocessing import Pool
TRS = {'base': fr.TR, 'fixB': dict(fr.TR, hens_ms=False)}
K = 'ALL_st0.4' if 'ALL_st0.4' in fr.X else 'base'
def run(j): t, F, pl, s = j; return j, a.window(F, F, F, F - 3, pl, fr.X[K] if pl != 'idle' else {}, s, TRS[t])
if __name__ == '__main__':
  J = [(t, F, pl, s) for t in TRS for F in (10, 18, 24) for pl in ('optimal', 'seller15', 'idle') for s in range(30)]
  with Pool(8) as p: D = dict(p.map(run, J))
  print('stack', K)
  for t in TRS:
    for F in (10, 18, 24):
      m = lambda pl: st.mean(D[(t, F, pl, s)] for s in range(30))
      print(t, F, 'opt/idle %.2f seller15/idle %.2f idle $/s %.1f' % (m('optimal') / m('idle'), m('seller15') / m('idle'), m('idle')))
