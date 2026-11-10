"""Farm Upgrades pacing stress test (Monte Carlo). Reads canonical formulas from ../economy_sim.py logic (copied, unchanged).
Differences vs economy_sim.py: random integer demand per customer, real queue (max 3, 30 s patience),
queue cap by Farm level (3/4@L10/5@L20), optional Poisson arrivals, variable tap rate. Bot sells to whole queue each second, greedy cheapest upgrade
(same Collection rule as economy_sim). Usage: python3 farm_stress_sim.py"""
import math,random,statistics as st,sys
def coll_cost(c): return math.floor(10*1.15**c)
def farm_cost(f): return math.floor(25*1.35**f)
def tap(c): return 5+5*c
def rate(f): return (5+5*f)*0.2
def cap(f): return 50+50*f
def price(f): return round(1+0.10*f,2)
def dmin(f): return 3+f
def dmax(f): return 8+2*f
def qmax(f): return 3 if f<10 else (4 if f<20 else 5)  # P2 approved 2026-10-15
def interval(f): return max(3.0, round(10*0.95**f,2))
def run(seed,T=7200,taps=1.0,poisson=False,patience=30,dem_scale=1.0,sell_every=1,fcost=farm_cost):
  R=random.Random(seed);c=f=0;coop=0.0;inv=0;cash=0.0;q=[];nxt=10.0;tl={0:0};last_buy=0;gaps=[];tacc=0.0
  lost=0;served=0
  for t in range(1,T+1):
    coop=min(cap(f),coop+rate(f)); tacc+=taps
    while tacc>=1: tacc-=1; m=min(int(coop),tap(c)); coop-=m; inv+=m
    while t>=nxt:
      if len(q)<qmax(f):
        d=R.randint(dmin(f),dmax(f)); q.append([max(1,round(d*dem_scale)),t])
      nxt+= R.expovariate(1/interval(f)) if poisson else interval(f)
    lost+=sum(1 for x in q if t-x[1]>=patience); q=[x for x in q if t-x[1]<patience]
    if t%sell_every==0:
      while q and inv>0:
        n,_=q.pop(0); s=min(inv,n); inv-=s; cash=round(cash+s*price(f),2); served+=1
    bought=True
    while bought:
      bought=False
      opts=sorted([('c',coll_cost(c)),('f',fcost(f) if f<30 else 1e18)],key=lambda x:x[1])
      for k,cost in opts:
        if cash>=cost and (k=='f' or tap(c)<rate(f)*3 or c<2):
          cash=round(cash-cost,2); gaps.append(t-last_buy); last_buy=t
          if k=='c': c+=1
          else: f+=1; tl[f]=t
          bought=True; break
    if f>=30: break
  return tl,max(gaps) if gaps else T,lost,served,gaps
def summarize(name,N=500,**kw):
  res=[run(s,**kw) for s in range(N)]
  def pct(L,p):
    v=sorted(r[0].get(L,1e9) for r in res); x=v[int(p*(N-1))]; return '—' if x>=1e9 else f'{x/60:.1f}'
  out={L:(pct(L,.1),pct(L,.5),pct(L,.9)) for L in (1,5,10,15,20,25,30)}
  gap=sorted(r[1] for r in res); lost=st.mean(r[2]/(r[2]+r[3]+1e-9) for r in res)
  print(f'\n## {name}'); print('Farm L: p10/p50/p90 minutes')
  for L,v in out.items(): print(f'  L{L}: {v[0]} / {v[1]} / {v[2]}')
  print(f'  longest gap between purchases p50/p90: {gap[N//2]/60:.1f}/{gap[int(.9*N)]/60:.1f} min; lost-customer rate {lost*100:.1f}%')
  return res
if __name__=='__main__':
  r=summarize('Baseline (1 tap/s, uniform demand, fixed interval)')
  # per-level median time and level-to-level step
  print('\nPer-level median arrival (min) and step (s), baseline:')
  for L in range(1,31):
    v=sorted(x[0].get(L,1e9) for x in r); m=v[len(v)//2]; pv=sorted(x[0].get(L-1,1e9) for x in r)[len(v)//2]
    print(f'  L{L}: {m/60:.1f} min  step {m-pv:.0f}s  cost {farm_cost(L-1)}')
  summarize('Poisson arrivals',poisson=True)
  summarize('Low tapper 0.5 tap/s',taps=0.5)
  summarize('Low tapper 0.25 tap/s',taps=0.25)
  summarize('Casual seller (sells every 20 s)',sell_every=20)
  summarize('Demand -25%',dem_scale=0.75)
  summarize('Demand +25%',dem_scale=1.25)
  summarize('Worst: Poisson + 0.5 tap/s + sells every 20 s',poisson=True,taps=0.5,sell_every=20)
