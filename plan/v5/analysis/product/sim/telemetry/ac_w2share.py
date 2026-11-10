"""AC-W1..W7 with w2_asleep_collect_share (copy of sim/m4/rf_v04 harness; file unchanged). python3 ac_w2share.py SHARE NSEEDS"""
import sys, statistics as st, collections
sys.path.insert(0, '/workspace/egg-farm-studio/product/sim/m4')
from multiprocessing import Pool
import rf_v04 as v
o = "if 'w2' in hired and stt('w2') != 'asleep' and t >= w2_t: w2_t = t + (2 if stt('w2') == 'work' else 4);"
assert v.src.count(o) == 1
src = v.src.replace(o, "if 'w2' in hired and (stt('w2') != 'asleep' or W2A > 0) and t >= w2_t: w2_t = t + (2 if stt('w2') == 'work' else 4 if stt('w2') == 'tired' else 2 / W2A);")
g = dict(vars(v.wp)); g['collections'] = collections; g['W2A'] = float(sys.argv[1]) if __name__ == '__main__' else 0.0
exec(src, g); RUN = g['run_v4']
def job(j):
  name, mo, T, w, rf, sess, taps, s = j
  return j, RUN((v.CSV, s, mo, T, w, dict(refill_delay=0, rf=rf, sess=sess, taps=taps)))
CFG = {k: v.CFG[k] for k in ('s15_rf', 's15_rc1', 's15_unm', 's15_none', 'cas_rf', 'slow_rf', 'slow_none')}
if __name__ == '__main__':
  N = int(sys.argv[2]); S = range(N)
  with Pool(4) as p: D = dict(p.map(job, [(k,) + c + (s,) for k, c in CFG.items() for s in S], chunksize=4))
  R_ = {k: [D[(k,) + c + (s,)] for s in S] for k, c in CFG.items()}
  med = lambda k, L: st.median(r['reach'].get(L, 1e9) for r in R_[k]) / 60
  f10 = sum(1 for r in R_['cas_rf'] if r['reach'].get(10, 1e9) <= 900) / N
  steps = st.median(max(r['reach'].get(L + 1, 1e9) - r['reach'].get(L, 0) for L in range(18, 25)) for r in R_['s15_rf']) / 60
  a15 = st.median(r['S']['refills'] / max(1e-9, r['S']['act_t']) * 900 for r in R_['s15_rf'])
  L30 = lambda k: st.median(r['L30'] for r in R_[k])
  G = [('W1', f10 >= .95 and med('cas_rf', 18) <= 40, f'{f10:.0%}, {med("cas_rf",18):.1f}'),
       ('W2', max(med('s15_rf', 10) - med('s15_rc1', 10), med('s15_rf', 18) - med('s15_rc1', 18)) <= 1, f'{med("s15_rf",18)-med("s15_rc1",18):+.2f}'),
       ('W3', med('s15_unm', 25) < med('s15_none', 25), f'{med("s15_unm",25):.1f} vs {med("s15_none",25):.1f}'),
       ('W4', steps <= 6 and med('s15_rf', 25) <= 70, f'{steps:.2f}, {med("s15_rf",25):.1f}'),
       ('W5', a15 >= 1, f'{a15:.1f}'),
       ('W6', med('slow_none', 18) - med('slow_rf', 18) >= 4, f'{med("slow_none",18)-med("slow_rf",18):.1f} min'),
       ('W7', 20 <= L30('s15_rf') <= 24 and 18 <= L30('s15_none') <= 22, f'{L30("s15_rf"):g}/{L30("s15_none"):g}')]
  print(f'share {sys.argv[1]}: ' + '; '.join(f'AC-{a} {"PASS" if ok else "FAIL"} ({s})' for a, ok, s in G) + f'; unm F25 {med("s15_unm",25):.1f} F30 {med("s15_unm",30):.1f}; rf/unm F25 {med("s15_unm",25)/med("s15_rf",25):.2f}')
