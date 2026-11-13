import csv
src='../../economy.m4-candidate.csv'
def mk(out,ms,fm):
  R=list(csv.DictReader(open(src))); h=list(R[0].keys())
  for r in R:
    F=int(r['level']); k=ms[2] if F>=30 else ms[1] if F>=20 else ms[0] if F>=10 else 1.0
    for c in ('demand_min','demand_max'): r[c]=str(int(round(float(r[c])*k)))
    if F>=10: r['farm_cost']=str(int(round(float(r['farm_cost'])*fm)))
    for i,c in enumerate(('hens_ms1_mult','hens_ms2_mult','hens_ms3_mult')): r[c]=str(ms[i])
  w=csv.DictWriter(open(out,'w',newline=''),fieldnames=h); w.writeheader(); w.writerows(R)
for fm in (1.0,1.15,1.25):
  mk(f'm4a-fix-m1c-ms110-120-130-farm{round(fm*100)}.csv',(1.10,1.20,1.30),fm)
