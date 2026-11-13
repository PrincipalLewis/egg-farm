"""Market pacing sim (P1/P2/P3). python3 market_sim.py > results.txt
Steady-state per Farm level L (0..30), Collection level C=round(0.6L) (tracks economy.md pacing table).
Player: taps Collect 1/s; every `check` s does Sell all. Tick 0.1 s. Seeded (seed = 1000*L + run).
Customer: demand uniform int [3+L,8+2L]; leaves when fully served or patience expires; spawn at full queue = lost.
"""
import math,random,sys
def P(L): return dict(tap=5+5*round(0.6*L),rate=0.2*(5+5*L),cap=50+50*L,price=round(1+.1*L,2),
    iv=max(3,10*0.95**L),dmin=3+L,dmax=8+2*L)
def run(L,seed,variant,check,T=1800,warm=120,dt=0.1):
    p=P(L);rng=random.Random(seed);qmax=4 if variant=='P3' and L>=10 else 3
    coop=basket=0.0;q=[];t=0;nxt=p['iv'];tap_t=0;chk_t=0
    st=dict(spawn=0,served=0,lost_full=0,lost_timeout=0,eggs_sold=0,produced=0)
    while t<T:
        t+=dt;rec=t>warm
        add=min(p['rate']*dt,p['cap']-coop);coop+=add
        if rec: st['produced']+=p['rate']*dt
        if t>=nxt:
            nxt+=p['iv']
            if rec: st['spawn']+=1
            if len(q)<qmax:
                n=rng.randint(p['dmin'],p['dmax'])
                pat=30+0.5*n if variant=='P2' else 30
                q.append([n,t+pat])
            elif rec: st['lost_full']+=1
        for c in q[:]:
            if t>=c[1]:
                q.remove(c)
                if rec: st['lost_timeout']+=1
        if t>=tap_t: tap_t+=1;m=min(coop,p['tap']);coop-=m;basket+=m
        if t>=chk_t:
            chk_t+=check
            for c in q[:]:
                k=min(math.floor(basket),c[0]);basket-=k;c[0]-=k
                if rec: st['eggs_sold']+=k
                if c[0]==0:
                    q.remove(c)
                    if rec: st['served']+=1
    st['demand_rate']=(p['dmin']+p['dmax'])/2/p['iv'];st['supply_rate']=min(p['rate'],p['tap'])
    return st
def agg(L,variant,check,runs=10):
    S={}
    for r in range(runs):
        for k,v in run(L,1000*L+r,variant,check).items(): S[k]=S.get(k,0)+v/runs
    return S
if __name__=='__main__':
    for check in (5,15,30,45):
        print(f"\n### Player sells every {check} s\n")
        print("| L | demand eggs/s | supply eggs/s | bottleneck | base lost% (full/timeout) | P2 lost% (full/timeout) | P3 lost% (full/timeout) | base eggs sold/s |")
        print("|---|---|---|---|---|---|---|---|")
        for L in range(31):
            row=[]
            for v in ('base','P2','P3'):
                s=agg(L,v,check);sp=s['spawn']
                row.append((s,f"{100*(s['lost_full']+s['lost_timeout'])/sp:.1f} ({100*s['lost_full']/sp:.1f}/{100*s['lost_timeout']/sp:.1f})"))
            b=row[0][0];bn='market' if b['demand_rate']<b['supply_rate'] else 'production'
            print(f"| {L} | {b['demand_rate']:.2f} | {b['supply_rate']:.2f} | {bn} | {row[0][1]} | {row[1][1]} | {row[2][1]} | {b['eggs_sold']/1680:.2f} |")
