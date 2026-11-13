"""M3-AC6 D1 + first-session script (Economy/Balance Designer).
Each export = one tester. Keyed on install_id: an export whose session_start events carry 0 or >1 distinct
install_id (or any missing one) is flagged and not counted. The install's first session = earliest session_start.
D1 = yes if any later session_start has ts in [first + 20 h, first + 48 h], both ends inclusive.
First session length = first session_end at or after the first session_start, in minutes.
Report: D1 share and median first session, with bootstrap 80% CIs (2000 resamples, seed 0);
n < 10 counted testers -> "insufficient data" (m3-proposal.md §4, C2).
Usage: python3 d1_review.py <exports_dir> [--check]   (--check compares against <dir>/expected.json)"""
import json, sys, os, glob, random, statistics as st
H = 3_600_000

def analyse(path):
  ev = json.load(open(path))['events']
  starts = sorted((e for e in ev if e.get('type') == 'session_start'), key=lambda e: e['ts'])
  ids = [e.get('install_id') for e in starts]
  if not starts or None in ids or len(set(ids)) != 1:
    return dict(install_id=None, flag='install_id', d1=None, first_session_min=None)
  t0 = starts[0]['ts']
  d1 = any(t0 + 20 * H <= e['ts'] <= t0 + 48 * H for e in starts[1:])
  ends = [e['ts'] for e in ev if e.get('type') == 'session_end' and e['ts'] >= t0]
  first = round((min(ends) - t0) / 60000, 2) if ends else None
  return dict(install_id=ids[0], flag=None, d1=d1, first_session_min=first)

def boot(vals, stat, n=2000, seed=0):
  if not vals: return None
  r = random.Random(seed); xs = sorted(stat([r.choice(vals) for _ in vals]) for _ in range(n))
  return xs[int(0.1 * n)], xs[int(0.9 * n) - 1]

def report(d):
  res = {os.path.basename(f)[:-5]: analyse(f) for f in sorted(glob.glob(os.path.join(d, '*.json'))) if not f.endswith('expected.json')}
  # one tester per install_id: if two exports share an id, keep one (latest file name) and flag the duplicate
  seen = {}
  for k, r in res.items():
    if r['install_id']:
      if r['install_id'] in seen: res[seen[r['install_id']]].update(flag='duplicate_install', d1=None)
      seen[r['install_id']] = k
  counted = [r for r in res.values() if r['d1'] is not None]
  n = len(counted); share = sum(r['d1'] for r in counted) / n if n else None
  firsts = [r['first_session_min'] for r in counted if r['first_session_min'] is not None]
  summ = dict(n=n, flagged=len(res) - n, d1_share=share, d1_ci80=boot([int(r['d1']) for r in counted], st.mean),
              first_session_median=st.median(firsts) if firsts else None, first_session_ci80=boot(firsts, st.median),
              verdict='insufficient data (n<10)' if n < 10 else 'reportable')
  return res, summ

if __name__ == '__main__':
  d = sys.argv[1]; res, summ = report(d); ok = 0
  exp = json.load(open(os.path.join(d, 'expected.json'))) if '--check' in sys.argv else {}
  for k, r in res.items():
    line = f"{k:26} D1={r['d1']!s:5} first={r['first_session_min']} flag={r['flag']}"
    if exp:
      good = r['d1'] == exp[k]['d1'] and (exp[k].get('first_session_min') is None or r['first_session_min'] == exp[k]['first_session_min'])
      ok += good; line += '  OK' if good else '  MISMATCH'
    print(line)
  if exp: print(f"{ok}/{len(res)} match expected.json")
  print(json.dumps(summ))
