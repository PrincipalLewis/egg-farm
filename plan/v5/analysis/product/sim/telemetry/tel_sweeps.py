"""Task 2 (w2 asleep share) + task 3 (coop-cap floor) window sweeps. python3 tel_sweeps.py -> tel_sweeps_raw.json"""
import sys, json
from multiprocessing import Pool
import tel_streak as t
SH = [0, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40]; NS = [0, 60, 90, 120, 180, 240]; S = range(100); C = 0.40
FL = (11, 17, 23)
def J():
  j = []
  for sh in SH:
    j += [(F, f'visit{G}_unm', C, s, 3600, sh, 0, False) for F in FL for G in (20, 45, 90) for s in S]
    j += [(F, pl, C, s, 3600, sh, 0, False) for F in (22, 23, 24) for pl in ('idle_mgd', 'idle') for s in S]
    j += [(F, 'idle', C, s, 600, sh, 0, False) for F in (10, 18, 24) for s in S]
  for n in NS:
    j += [(F, f'visit{G}', C, s, 3600, 0, n, True) for F in FL for G in (20, 45, 90) for s in S]
    j += [(F, pl, C, s, 3600, 0, n, False) for F in (22, 23, 24) for pl in ('idle_mgd', 'idle') for s in S]
    j += [(F, pl, C, s, 600, 0, n, False) for F in (10, 18, 24) for pl in ('optimal', 'idle') for s in S]
  j += [(F, 'optimal', C, s, 600, 0, 0, False) for F in (10, 18, 24) for s in S]
  return sorted(set(j))
if __name__ == '__main__':
  jobs = J(); extra = [x for x in json.loads(sys.argv[1])] if len(sys.argv) > 1 else []
  jobs += [tuple(x) for x in extra]
  with Pool(4) as p: D = p.map(t.job, jobs, chunksize=16)
  json.dump([[list(k), v] for k, v in D], open(sys.argv[2] if len(sys.argv) > 2 else 'tel_sweeps_raw.json', 'w')); print(len(D))
