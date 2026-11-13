"""Roadmap v0.2 progression grid on economy.m4-candidate.csv. python3 run_prog.py [seeds] [variant-set] > prog_out.md"""
import sys, statistics as st, json
from multiprocessing import Pool
sys.path.insert(0, '/workspace/egg-farm-studio/product/sim/market'); import roadmap_m4_prog as w
P = '/workspace/egg-farm-studio/product/economy.m4-candidate.csv'
N = int(sys.argv[1]) if len(sys.argv) > 1 else 200
GO = dict(n=10, r=12, cd=120); BU = dict(iv=(150, 270), share=0.4, maxm=4, pm=1.5, wait=60)
FE = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {'base': {}, 'bulk': {'bulk': BU}, 'goals': {'goals': GO}, 'both': {'bulk': BU, 'goals': GO}}
PL = {'5s': ('s15', 5, None), '15s': ('s15', 15, None), '30s': ('s15', 30, None), 'casual': ('casual', 20, 0.5)}
WM = {'noW': (False, False), 'W': (True, False), 'W_w1off': (True, True)}
def job(j):
  pl, wm, fe, s = j; mo, se, tp = PL[pl]; wk, off = WM[wm]
  r = w.run((P, s, mo, 3600, wk, dict(FE[fe], se=se, taps=tp, w1off=off)))
  i = r['inc']; return j, dict(i1030=(i.get(30, 0) - i.get(10, 0)) / 20, i060=i.get(60, i.get(max(i)) if i else 0) / 60, L30=r['L30'],
    gap=r['gap'][0], gapF=r['gap'][1], dead=sum(1 for g in r['perF'].values() if g > 180), goals=r['goals'], bulk=r['bulk'], miss=r['bulk_miss'],
    t18=r['reach'].get(18, 1e9), done=r['done'])
if __name__ == '__main__':
  J = [(pl, wm, fe, s) for pl in PL for wm in WM for fe in FE for s in range(N)]
  with Pool(8) as p: D = dict(p.map(job, J, chunksize=20))
  json.dump({'|'.join(map(str, k)): v for k, v in D.items()}, open('/workspace/egg-farm-studio/scratch/roadmap_prog_raw.json', 'w'))
  print(f'| player | workers | variant | $/min 10-30 med | lift 10-30 (mean) | lift 0-60 | Farm@30:00 med [min-max] | in band | worst gap min (F) | seeds w/ gap>3 min | goals/h | bulk served/missed |')
  print('|---|---|---|---|---|---|---|---|---|---|---|---|')
  for pl in PL:
    for wm in WM:
      b = [D[(pl, wm, 'base', s)] for s in range(N)]; mb = st.mean(x['i1030'] for x in b); mb6 = st.mean(x['i060'] for x in b)
      lo, hi = (20, 24) if wm != 'noW' else (18, 22)
      for fe in FE:
        rs = [D[(pl, wm, fe, s)] for s in range(N)]; m_ = st.mean(x['i1030'] for x in rs); m6 = st.mean(x['i060'] for x in rs)
        L = [x['L30'] for x in rs]; wg = max(rs, key=lambda x: x['gap'])
        print(f"| {pl} | {wm} | {fe} | {st.median(x['i1030'] for x in rs):,.0f} | {100*(m_/mb-1):+.1f}% | {100*(m6/mb6-1):+.1f}% | L{st.median(L):g} [{min(L)}-{max(L)}] | {sum(lo<=v<=hi for v in L)}/{N} | {wg['gap']/60:.2f} (F{wg['gapF']}) | {sum(x['gap']>180 for x in rs)} | {st.median(x['goals'] for x in rs):g} | {st.median(x['bulk'] for x in rs):g}/{st.median(x['miss'] for x in rs):g} |")
