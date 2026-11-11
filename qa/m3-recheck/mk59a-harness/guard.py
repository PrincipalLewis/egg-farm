# MK-59a per-level guard power: FAIL if any L3-25 mean paired diff < -2.0; plus L20 lower 95% bound >= -2.0.
# Noise from 400 measured paired seeds (stand-in MH every_s 1.2 on main acaceee); resample 400 seeds with replacement,
# centre on observed full-sample diff, add assumed true effects. Joint min over 23 levels keeps cross-level correlation.
import json, numpy as np
exec(open('power.py').read().split('rng=np.random')[0].replace("print(","(lambda *a,**k:None)("))
se=se400; K=20000; rng=np.random.default_rng(59)
print('per-level per-seed paired SD and SE (n=400):')
for L,s,e in zip(LV,per_seed_sd,se): print(f'  L{L}: SD {s:.2f}  SE {e:.3f}')
from math import erf,sqrt
Phi=lambda x:0.5*(1+erf(x/sqrt(2)))
for name,t in (('a: all true 0',np.zeros(len(LV))),('b: Economy t2_lc1 hold5-base',true)):
  trip=np.zeros(len(LV)); ff=0; l20=0; full_pass=0; worst=np.zeros(len(LV))
  for _ in range(K):
    idx=rng.integers(0,n0,400); m,s,_=est(idx); m=m-full+t
    bad=m<-2.0; trip+=bad; g=bad.any(); ff+=g
    if g: worst[np.argmin(m)]+=1
    ok20=(m[i20]-1.96*s[i20])>=-2.0; l20+=ok20; full_pass+=ok20 and not g
  an=1-np.prod([Phi((tt+2.0)/e) for tt,e in zip(t,se)])
  print(f'\n[{name}] P(guard false-fail)={ff/K:.4f} (indep. analytic {an:.4f}); P(L20 LB>=-2)={l20/K:.4f}; P(full served gate PASS)={full_pass/K:.4f}')
  for j in np.argsort(-trip)[:6]:
    if trip[j]: print(f'  L{LV[j]}: marginal trip {trip[j]/K:.4f}, worst-level share of fails {worst[j]/max(ff,1):.2f} (analytic {1-Phi((t[j]+2)/se[j]):.4f})')
