from late_polish_ev import *
import argparse
ap=argparse.ArgumentParser()
ap.add_argument('--mstep',type=float,default=0.03); ap.add_argument('--hvsmooth',type=int,default=1)
ap.add_argument('--iters',type=int,default=10); ap.add_argument('--wcas',type=float,default=0.5)
ap.add_argument('--t1',type=float,default=2.2); ap.add_argument('--t41',type=float,default=3.0); ap.add_argument('--t50',type=float,default=3.8)
ap.add_argument('--hvs',type=float,default=0.3); ap.add_argument('--hvtail',type=float,default=1.0)
ap.add_argument('--hvg1',type=float,default=0);ap.add_argument('--unbump',type=float,default=1.0);ap.add_argument('--tover',default='');ap.add_argument('--out',default=None); ap.add_argument('--seeds',type=int,default=30)
a=ap.parse_args()
R,head=load()
ks=('hens_cost','egg_value_cost')
if a.hvsmooth:  # H/V rows 30-40: one geometric from row 29 to approved row 40 (removes the +8% row-35 bump)
  for k in ks:
    g=(R[40][k]/R[29][k])**(1/11)
    for L in range(30,40): R[L][k]=math.floor(R[29][k]*g**(L-29))
for k in ks:
  if a.hvg1:
    for L in range(30,35): R[L][k]=math.floor(R[29][k]*(1+a.hvg1)**(L-29))
for k in ks:
  for L in range(35,40): R[L][k]=math.floor(R[L][k]/a.unbump)
sh={k:R[40][k]/R[40]['farm_cost'] for k in ks}
T={L:a.t1 for L in range(31,41)}; T.update({L:a.t41+(a.t50-a.t41)*(L-41)/9 for L in range(41,51)})
for kv in filter(None,a.tover.split(',')): L,v=kv.split(':'); T[int(L)]=float(v)
def enforce():
  m=1+a.mstep
  for L in range(30,50): R[L]['farm_cost']=max(R[L]['farm_cost'],math.floor(R[L-1]['farm_cost']*m)+1)
  gF=(R[49]['farm_cost']/R[40]['farm_cost'])**(1/9)
  for L in range(50,56): R[L]['farm_cost']=math.floor(R[49]['farm_cost']*gF**(L-49))
  for k in ks:
    for L in range(41,56): R[L][k]=math.floor(R[L]['farm_cost']*sh[k]*a.hvs*(a.hvtail if L>=50 else 1))
    for L in range(30,56): R[L][k]=max(R[L][k],math.floor(R[L-1][k]*m)+1)
with Pool(6) as p:
  for it in range(a.iters):
    enforce(); sw=lc.summarise(lc.mc(R,True,pool=p,seeds=a.seeds)); sc=lc.summarise(lc.mc(R,True,pool=p,model='casual',T_=200*60,seeds=a.seeds))
    print(it,line('W',sw),'|',line('C',sc),file=sys.stderr)
    for L in T:
      pw=sw['per'][L]; pc=sc['per'].get(L,pw)*(sw['lv'][40]/sc['lv'][40])
      per=(1-a.wcas)*pw+a.wcas*pc
      R[L-1]['farm_cost']=math.floor(R[L-1]['farm_cost']*(T[L]/max(0.3,per))**0.6)
  enforce()
  sw,sc,sn=evaluate(R,p,100)
  print(line('W100',sw)); print(line('C100',sc)); print(line('N100',sn))
  ones,mins,mono=steps(R); print('ones',len(ones),ones,'minstep',{k:round(v,4) for k,v in mins.items()},'mono',mono)
  print('per W',{L:round(v,2) for L,v in sw['per'].items() if L>=30})
  print('per C',{L:round(v,2) for L,v in sc['per'].items() if L>=30})
  if a.out:
    with open(a.out,'w',newline='') as f:
      w=csv.writer(f,lineterminator='\n'); w.writerow(head)
      for r in R: w.writerow([(int(r[k]) if float(r[k]).is_integer() else r[k]) for k in head])
