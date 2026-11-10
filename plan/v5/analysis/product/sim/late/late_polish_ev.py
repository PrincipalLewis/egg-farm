import sys, csv, math, os, json
sys.path.insert(0,'/workspace/egg-farm-studio/product/sim/late')
os.environ.setdefault('HVS','0.3')
import late_curve_polish as lc
from multiprocessing import Pool
APP='/workspace/egg-farm-studio/product/economy.l30plus-candidate.csv'
def load(fn=APP):
  rows=list(csv.DictReader(open(fn))); head=list(rows[0].keys())
  return [{k:float(v) for k,v in r.items()} for r in rows], head
def gapwhere(rs):
  out=[]
  for r in rs:
    b=r['buys']; t_end=b[-1] if False else None
    g=[(y-x,x) for x,y in zip(b,b[1:])]
    m=max(g); F=max([L for L,t in r['reach'].items() if t<=m[1]]); out.append((round(m[0]/60,2),F))
  return out
def evaluate(R,pool,seeds=100,win=False):
  sw=lc.summarise(lc.mc(R,True,pool=pool,seeds=seeds)); sc=lc.summarise(lc.mc(R,True,pool=pool,model='casual',T_=200*60,seeds=seeds))
  sn=lc.summarise(lc.mc(R,False,pool=pool,T_=200*60,seeds=seeds))
  return sw,sc,sn
def steps(R):
  ones=[(k.split('_')[0],L) for k in ('farm_cost','hens_cost','egg_value_cost') for L in range(30,55) if R[L+1][k]-R[L][k]<=1]
  mins={k:min((R[L+1][k]/R[L][k]-1) for L in range(29,55 if k!='farm_cost' else 49)) for k in ('farm_cost','hens_cost','egg_value_cost')}
  mono=all(R[L][k]<R[L+1][k] for k in ('farm_cost','hens_cost','egg_value_cost') for L in range(55))
  return ones,mins,mono
def line(nm,s):
  d=s['std']; lv=s['lv']
  wr=max(s['seed_ratios']) if s['seed_ratios'] else (0,0)
  return f"{nm}: L35 {lv[35]:.1f} L40 {lv[40]:.1f} L50 {lv.get(50,math.inf):.1f} ratio P95 {d['ratio_p95']:.2f} worst {d['ratio_worst']:.2f}@L{wr[1]} gap P95 {d['gap_p95']:.2f} worst {d['gap_worst']:.2f} n50 {s['n50']}"
