import sys; sys.path.insert(0,'.')
from economy_sim import *
e=Eco(CURRENT)
W={'none':None,
 'seller F1 $40 10%':dict(w_every=1,w_fee=0.10,w_demand=1.0,w_unlock=1,w_cost=40),
 'seller+hawker25 F1 $40':dict(w_every=1,w_fee=0.10,w_demand=1.25,w_unlock=1,w_cost=40),
 'unmanaged (serve 3s, +10%)':dict(w_every=3,w_fee=0.10,w_demand=1.10,w_unlock=1,w_cost=40)}
for mode,kw,T in [('casual',CASUAL,3600),('seller15',{},7200)]:
  for n,w in W.items():
    R=[run(e,'seller15',s,T=T,worker=w,**kw) for s in range(20)]
    g=lambda L:med([t_to(r,L) for r in R]); f=lambda x:'n/r' if x is None else f'{x/60:.1f}'
    print(mode,n,'F10',f(g(10)),'F18',f(g(18)),'F20',f(g(20)),'F25',f(g(25)),'Fend',med([r['f'] for r in R]),'lost%',round(100*med([r['lost']/r['spawned'] for r in R])))
