"""Floor N + asleep share 0.15 (unmanaged Coop Hand) and floor alone for no hand already in tel_sweeps. 50 seeds."""
import json, statistics as st
from multiprocessing import Pool
import tel_streak as t
if __name__ == '__main__':
  J = [(F, f'visit{G}_unm', 0.4, s, 3600, 0.15, n, False) for n in (60, 90, 120, 180, 240) for F in (11, 17, 23) for G in (20, 45, 90) for s in range(50)]
  with Pool(2) as p: D = dict(p.map(t.job, J, chunksize=8))
  out = ['| N (s), share 0.15, unmanaged hand | visit20 | visit45 | visit90 |', '|---|---|---|---|']
  for n in (60, 90, 120, 180, 240):
    out.append(f'| {n} | ' + ' | '.join(f"{100*st.median(D[(F, f'visit{G}_unm', 0.4, s, 3600, 0.15, n, False)][1] for F in (11,17,23) for s in range(50)):.0f}" for G in (20, 45, 90)) + ' |')
  open('tel_combo_out.md', 'w').write('\n'.join(out)); print('\n'.join(out))
