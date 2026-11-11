import sys; sys.path.insert(0,'.'); from economy_sim import *
e=Eco(CURRENT); R=[run_m2(e,'seller15',s,T=3600,sell_every=20,poisson=True,dem_scale=0.75,spec=M2_CURRENT) for s in range(100)]
t10=[r['reach'].get(10) for r in R]; t18=[r['reach'].get(18) for r in R]
print("py casual pass10", sum(1 for x in t10 if x is not None and x<=900), "medF10", round(med(t10)/60,2), "medF18", round(med(t18)/60,2))
for pol in ('seller15','cheapest'):
  r=run_m2(e,pol,0,spec=M2_CURRENT); st=[(r['reach'][L+1]-r['reach'][L])/60 for L in range(18,25) if L+1 in r['reach'] and L in r['reach']]
  print(pol, "F25", round(r['reach'].get(25,0)/60,2), "worst step F18-25", round(max(st),2))
