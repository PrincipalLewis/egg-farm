"""Per-level step times (median s) L1-30 for seller15/casual/cheapest + key metrics. ECON_CSV selects the table."""
import farm_stress_sim as m, statistics as st, math, sys
def steps(res):
  out={}
  for L in range(1,31):
    v=[r['reach'][L]-r['reach'][L-1] for r in res if L in r['reach'] and L-1 in r['reach']]
    out[L]=st.median(v) if len(v)>=len(res)/2 else None
  return out
def lvlat(res,s): return st.median(max(L for L,t in r['reach'].items() if t<=s) for r in res)
def tto(res,L):
  v=sorted(r['reach'].get(L,math.inf) for r in res); return v[len(v)//2]/60
models={'seller15':dict(),'casual':dict(sell_every=20,poisson=True,dem_scale=0.75),'cheapest':dict(policy='cheapest'),'demand-25':dict(dem_scale=0.75),'casual20':dict(sell_every=20)}
N=int(sys.argv[1]) if len(sys.argv)>1 else 30
print('# table', m.CSV)
allst={}
for name,kw in models.items():
  res=[m.run(s,T=6*3600,**kw) for s in range(N)]; S=steps(res); allst[name]=S
  rat=[S[L]/S[L-1] for L in range(2,31) if S[L] and S[L-1]]
  print(f"\n## {name}: L5 {tto(res,5):.1f} L10 {tto(res,10):.1f} L15 {tto(res,15):.1f} L18 {tto(res,18):.1f} L20 {tto(res,20):.1f} L25 {tto(res,25):.1f} L30 {tto(res,30):.1f} min | L@10m {lvlat(res,600):.0f} L@30m {lvlat(res,1800):.0f}")
  print('steps s: '+' '.join(f"L{L}:{S[L]:.0f}" if S[L] is not None else f"L{L}:n/r" for L in range(1,31)))
  d=[L for L in range(1,31) if S[L] and S[L]>180]; print('steps >180 s:', d[:3], '... first', d[0] if d else None, '| count', len(d))
  print('max step ratio L2-18: %.2f, L19-30: %.2f' % (max(S[L]/S[L-1] for L in range(2,19) if S[L] and S[L-1]), max(S[L]/S[L-1] for L in range(19,31) if S[L] and S[L-1])))
