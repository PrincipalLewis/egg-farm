"""Leave-penalty trace rerun: idle arms with leave_pen=0 (no seller awake -> no penalty), shares 0/0.15/0.20, F22-24, 60 min, 100 seeds."""
import statistics as st, json
from multiprocessing import Pool
import tel_streak as t
def job(j):
  F, pl, sh, s, lp = j; tel = {}
  v = t.window(F, F, F, F - 3, pl, dict(t.B, leave_pen=lp), s, t.TR, T=3600, w2_asleep=sh, tel=tel); return j, (v, tel['pen'], tel['basket'])
if __name__ == '__main__':
  J = [(F, pl, sh, s, lp) for F in (22, 23, 24) for pl in ('idle_mgd', 'idle') for sh in (0, 0.15, 0.20) for lp in (0.05, 0.0) for s in range(100)]
  with Pool(4) as p: D = dict(p.map(job, J, chunksize=16))
  m = lambda F, pl, sh, lp: st.mean(D[(F, pl, sh, s, lp)][0] for s in range(100))
  out = ['| share | leave_pen | unmanaged idle $/s F22/23/24 | delta vs share 0 | mgd/unm F22-24 mean | unsold basket @60 min (F23) |', '|---|---|---|---|---|---|']
  for lp in (0.05, 0.0):
    for sh in (0, 0.15, 0.20):
      u = [m(F, 'idle', sh, lp) for F in (22, 23, 24)]; u0 = [m(F, 'idle', 0, lp) for F in (22, 23, 24)]
      r = st.mean(m(F, 'idle_mgd', sh, lp) / m(F, 'idle', sh, lp) for F in (22, 23, 24))
      b = st.mean(D[(23, 'idle', sh, s, lp)][2] for s in range(100))
      out.append(f"| {sh} | {lp} | {' / '.join(f'{x:.1f}' for x in u)} | {100*(sum(u)/sum(u0)-1):+.1f}% | {r:.2f} | {b:.0f} |")
  open('tel_pen_fix_out.md', 'w').write('\n'.join(out)); print('\n'.join(out))
