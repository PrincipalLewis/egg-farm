# M5.2 (PMW scope cut 2026-10-25): pooled time-weighted F10-29 starved share only. Input out/pr.<prof>.<on|off>.p<P>.jsonl (h2/m5px.ts, 8dc90e2b B3 at_pct 30).
import json,random,os
import os as _os
PD=_os.environ.get("PDIR","out")  # 2026-10-25: PDIR=out/o1a for the o1a re-run
from press import load,k30,hq
def agg(R):
  return {s:(sum(o['st'][:k30(o)]),10*k30(o)) for s,o in R.items()}
def pool(A,seeds): n=sum(A[s][0] for s in seeds); d=sum(A[s][1] for s in seeds); return n/d
def boot(Aon,Aoff,seeds,B=2000):
  rnd=random.Random(1); on=[];off=[];rt=[]
  for _ in range(B):
    ss=[rnd.choice(seeds) for _ in seeds]; a=pool(Aon,ss); b=pool(Aoff,ss); on.append(a); off.append(b); rt.append(a/b)
  sd=lambda v:(sum((x-sum(v)/len(v))**2 for x in v)/(len(v)-1))**.5
  return sd(on),sd(off),sd(rt)
out={}
for p in ('optimal','seller15','casual'):
  f=lambda c,P:f'{PD}/pr.{p}.{c}.p{P}.jsonl'
  if not all(os.path.exists(f(c,0)) and sum(1 for _ in open(f(c,0)))==200 for c in ('on','off')): continue
  Aon,Aoff=agg(load(f('on',0))),agg(load(f('off',0))); seeds=sorted(Aon)
  pon,poff=pool(Aon,seeds),pool(Aoff,seeds); se=boot(Aon,Aoff,seeds)
  son={s:Aon[s][0]/Aon[s][1] for s in seeds}; d={s:son[s]-Aoff[s][0]/Aoff[s][1] for s in seeds}
  r=dict(pooled_on=pon,se_on=se[0],pooled_off=poff,se_off=se[1],ratio=pon/poff,se_ratio=se[2],
    on_p5=hq(list(son.values()),.05),on_p10=hq(list(son.values()),.10),d_p5=hq(list(d.values()),.05),d_p10=hq(list(d.values()),.10),
    s148=(son.get(148),d.get(148)),s116=(son.get(116),d.get(116)))
  for c in ('on','off'):
    for P in (1,-1):
      if os.path.exists(f(c,P)) and sum(1 for _ in open(f(c,P)))==200:
        Ap=agg(load(f(c,P))); a=pool(Ap,seeds) if c=='on' else pon; b=pool(Ap,seeds) if c=='off' else poff
        r[f'{c}{P:+d}']=dict(pooled_on=a,pooled_off=b,ratio=a/b,d_ratio=a/b-pon/poff,d_on=a-pon,d_off=b-poff)
  out[p]=r; print(p,json.dumps(r))
json.dump(out,open(f'{PD}/pool2.json','w'),indent=1)
