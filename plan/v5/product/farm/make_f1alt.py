"""Build F1 alternative tables: copy of economy.f1.csv with farm_cost re-segmented and w4_tier_cost recomputed
(= floor(0.5 x farm_cost at the latest W4 tier level <= L), tiers at L18,19,21,22,24 as in economy.csv). Canonical files untouched.
usage: python3 make_f1alt.py OUT.csv seg1 seg2 ...   seg = from:to:growth (inclusive), base 100, default growth 1.35"""
import csv, math, sys
def cost(F, segs):
  v=100.0; n=F
  for a,b,g in segs:
    k=max(0,min(F,b)-a+1); v*=g**k; n-=k
  return math.floor(v*1.35**n)
def build(out, segs):
  rows=list(csv.DictReader(open('../economy.f1.csv'))); cols=list(rows[0].keys())
  tiers=[18,19,21,22,24]
  for r in rows:
    L=int(r['level']); r['farm_cost']=cost(L,segs)
    if L>=18: t=max(x for x in tiers if x<=L); r['w4_tier_cost']=math.floor(0.5*cost(t,segs))
  w=csv.DictWriter(open(out,'w',newline=''),fieldnames=cols); w.writeheader(); w.writerows(rows)
if __name__=='__main__':
  segs=[tuple(float(x) if i==2 else int(x) for i,x in enumerate(s.split(':'))) for s in sys.argv[2:]]; build(sys.argv[1],segs)
