import csv,sys,math
src='../../economy.m4-candidate.csv'
def mk(out,mult_fn,farm_mult=1.0):
  R=list(csv.DictReader(open(src))); h=list(R[0].keys())
  for r in R:
    F=int(r['level']); k=mult_fn(F)
    r['demand_min']=str(int(round(float(r['demand_min'])*k))); r['demand_max']=str(int(round(float(r['demand_max'])*k)))
    if F>=10: r['farm_cost']=str(int(round(float(r['farm_cost'])*farm_mult)))
  w=csv.DictWriter(open(out,'w',newline=''),fieldnames=h); w.writeheader(); w.writerows(R)
ms=lambda F:2.0 if F>=30 else 1.5 if F>=20 else 1.25 if F>=10 else 1.0
mk('m4a-fix-m1a-demand.csv',ms)
for fm in (1.15,1.25,1.35):
  mk(f'm4a-fix-m1b-demand-farm{int(fm*100)}.csv',ms,fm)
