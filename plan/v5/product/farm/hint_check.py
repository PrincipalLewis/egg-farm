"""Time-to-afford hint accuracy check (F7). Instruments farm_stress_sim mechanics. ECON_CSV selects the table.
Hint each second: est = (cost - coins) / (coins earned in last 60 s / 60), rounded to nearest second. Compared with the
actual time until the Farm purchase. Samples only while est is shown (rate > 0) and actual remaining >= 20 s."""
import farm_stress_sim as m, math, random, statistics as st, sys
R=m.R; MAXL=m.MAXL
def run(seed,T=2400,dt=0.1,sell_every=15,poisson=False,dem_scale=1.0):
  rng=random.Random(seed); c=f=0; coop=0.0; basket=0; coins=0.0; q=[]; nxt=R[0]['first_customer_s']; tap_t=1.0; sell_t=sell_every
  earned=[]; samples=[]; pend=[]; n=int(round(T/dt))
  for i in range(1,n+1):
    t=round(i*dt,2); r=R[f]
    coop=min(r['coop_capacity'],coop+r['eggs_per_sec']*dt)
    while t>=nxt:
      if len(q)<r['queue_max']: q.append([max(1,round(rng.randint(int(r['demand_min']),int(r['demand_max']))*dem_scale)),nxt+r['customer_patience_s']])
      nxt=round(nxt+(rng.expovariate(1/r['customer_interval_s']) if poisson else r['customer_interval_s']),2)
    q=[x for x in q if x[1]>t]
    if t>=tap_t-1e-9: tap_t+=1; mm=min(math.floor(coop),int(R[c]['eggs_per_tap'])); coop-=mm; basket+=mm
    if t>=sell_t-1e-9:
      sell_t+=sell_every; g=0.0
      for x in q[:]:
        if basket<=0: break
        k=min(basket,x[0]); basket-=k; x[0]-=k; g+=k*m.price(f,c)
        if x[0]==0: q.remove(x)
      coins=m.cents(coins+g); earned.append((t,g))
      while True:
        fc=R[f]['farm_cost'] if f<MAXL else math.inf; cc=R[c]['collection_cost'] if c<MAXL else math.inf
        if coins>=fc: coins=m.cents(coins-fc); f+=1; samples+= [(e,t-t0) for e,t0 in pend if t-t0>=20]; pend=[]
        elif coins>=cc and cc<=0.5*fc: coins=m.cents(coins-cc); c+=1
        else: break
      if f>=MAXL: break
    if abs(t-round(t))<1e-9 and f<MAXL:
      g60=sum(g for tt,g in earned if tt>t-60); 
      if g60>0 and coins<R[f]['farm_cost']: pend.append((round((R[f]['farm_cost']-coins)/(g60/60)),t))
  return samples
def report(name,**kw):
  S=[s for seed in range(40) for s in run(seed,**kw)]
  err=[(e-a)/a for e,a in S]; ae=[abs(x) for x in err]
  print(f'{name}: n={len(S)} median |err| {100*st.median(ae):.1f}%  within ±10% {100*sum(x<=.1 for x in ae)/len(ae):.1f}%  within ±25% {100*sum(x<=.25 for x in ae)/len(ae):.1f}%  bias {100*st.median(err):+.1f}%  p90 |err| {100*sorted(ae)[int(.9*len(ae))]:.0f}%')
if __name__=='__main__':
  print('# table:',m.CSV)
  report('seller15 (sell 15 s)'); report('active (sell 1 s)',sell_every=1); report('casual (20 s, Poisson)',sell_every=20,poisson=True)
