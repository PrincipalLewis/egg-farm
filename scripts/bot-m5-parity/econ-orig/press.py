# M5.2 pressure-metric analysis (SCRATCH, Economy 2026-10-25). Input: out/<tag>.<prof>.<on|off>.p<0|1|-1>.jsonl from h2/m5px.ts.
import json,math,sys,statistics as stt
def hq(v,p): s=sorted(v); return s[min(len(s)-1,max(0,math.ceil(p*len(s))-1))]   # harness nearest-rank
def load(f):
  R={}
  for l in open(f):
    o=json.loads(l); d=lambda k:[ord(c)-48 for c in o[k]]; o['st'],o['ex'],o['el']=d('st'),d('ex'),d('el'); R[o['seed']]=o
  return R
def k30(o): return max(0,min(len(o['st']), math.ceil(o['t30'])-1-o['start'])) if o['t30'] is not None else len(o['st'])
def m(o):
  K=k30(o); st,ex,el=o['st'],o['ex'],o['el']
  S=lambda a,i,j:sum(a[i:j])
  share=S(st,0,K)/(10*K); spw=3600*S(ex,0,K)/S(el,0,K); spwb=3600*S(st,0,K)/S(el,0,K)
  N=len(st); sess=3600*S(ex,0,N)/S(el,0,N); sessh=S(st,0,N)/(10*N)
  # rolling 30 min over L10->end, step 60 s (prefix sums)
  pe=[0];pl=[0];ps=[0]
  for i in range(N): pe.append(pe[-1]+ex[i]); pl.append(pl[-1]+el[i]); ps.append(ps[-1]+st[i])
  W=1800; roll=[3600*(pe[i+W]-pe[i])/(pl[i+W]-pl[i]) for i in range(0,N-W+1,60) if pl[i+W]-pl[i]>0]
  rolls=[(ps[i+W]-ps[i])/(10*W) for i in range(0,N-W+1,60)]
  return {'share':share,'spw':spw,'spwb':spwb,'sess_spw':sess,'sess_share':sessh,'roll_spw_max':max(roll),'roll_spw_mean':sum(roll)/len(roll),'roll_share_max':max(rolls),'roll_share_mean':sum(rolls)/len(rolls),'_K':K,'_sc29':o['sc29']}
def dist(v):
  v=[x for x in v if x is not None and math.isfinite(x)]; med=hq(v,.5); q1,q3=hq(v,.25),hq(v,.75); mu=sum(v)/len(v); sd=stt.pstdev(v)
  return dict(n=len(v),min=min(v),p5=hq(v,.05),p50=med,p95=hq(v,.95),max=max(v),iqr=q3-q1,cv=sd/mu if mu else None,mean=mu,sd=sd,riqr=(q3-q1)/1.349)
