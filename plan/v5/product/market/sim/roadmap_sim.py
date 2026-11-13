"""Customer-type roadmap quick estimate (draft). python3 roadmap_sim.py > roadmap_table.md
Same player/economy model as mechanics_sim.py (economy.csv live, Collect 1/s, market check every 5/15/30 s, no workers,
AC7 buy rule), with the M4 baseline complete_bonus 0.05 on. Adds, one at a time:
 bulk : bulk buyer from F6, every U(150,270) s, outside the queue, waits 60 s, wants clamp(round(0.4*basket), demand_max, 4*demand_max)
        fixed at arrival, pays 1.5x unit, served first on a check if basket covers it (all or nothing).
 rush : golden customer from F8, every U(120,300) s, on screen 13 s; if a check lands in the window: x2 price for 30 s.
 goals: rolling mini-goal from F5: v0.2 defaults: manually serve 10 customers fully -> reward = 12 s of production at current price; next goal 120 s after the claim (serves during the gap don't count).
"""
import csv,os,random,statistics as st
R=list(csv.DictReader(open(os.path.join(os.path.dirname(__file__),'../../economy.csv'))))
f=lambda L,c: float(R[min(L,30)][c])
V={'M4 base (done05)':{},'+bulk':{'bulk':1},'+goals v0.2':{'goals':1},'+bulk+goals v0.2':{'bulk':1,'goals':1}}  # v0.2: golden customer dropped (rush code kept, unused)
def run(seed,check,v,T=3600,dt=0.1):
    rng=random.Random(seed);F=C=0;coop=basket=coins=earned=0.0;q=[];t=0.0;nxt=f(0,'first_customer_s');tap=1.0;chk=check
    reach={};inc=[];bulk=None;bnext=None;rnext=None;rwin=-1;rush_until=-1;gcount=0;gnext=0;ev={'bulk':0,'bulkmiss':0,'rush':0,'rushmiss':0,'goal':0}
    for _ in range(int(T/dt)):
        t=round(t+dt,1);coop=min(f(F,'coop_capacity'),coop+f(F,'eggs_per_sec')*dt)
        for x in [x for x in q if t>=x['until']]: q.remove(x)
        if t>=nxt:
            nxt=t+f(F,'customer_interval_s')
            if len(q)<int(f(F,'queue_max')):
                N=rng.randint(int(f(F,'demand_min')),int(f(F,'demand_max')));q.append({'N':N,'left':N,'until':t+30})
        if t>=tap: tap+=1;m=min(coop,f(C,'eggs_per_tap'));coop-=m;basket+=m
        if v.get('bulk') and F>=6:
            if bnext is None: bnext=t+rng.uniform(150,270)
            if bulk and t>=bulk['until']: bulk=None;ev['bulkmiss']+=1
            if bulk is None and t>=bnext:
                dm=f(F,'demand_max');bulk={'N':int(min(4*dm,max(dm,round(0.4*basket)))),'until':t+60};bnext=t+rng.uniform(150,270)
        if v.get('rush') and F>=8:
            if rnext is None: rnext=t+rng.uniform(120,300)
            if t>=rnext: rwin=t+13;rnext=t+rng.uniform(120,300)
            if 0<rwin<t: rwin=-1;ev['rushmiss']+=1
        unit=round(f(F,'egg_price')*(1+f(C,'collection_price_bonus')),2)*(2 if t<rush_until else 1)
        if t>=chk:
            chk+=check;gain=0.0
            if rwin>0: rush_until=t+30;rwin=-1;ev['rush']+=1;unit*=2
            if bulk and basket>=bulk['N']: basket-=bulk['N'];gain+=1.5*bulk['N']*unit;bulk=None;ev['bulk']+=1
            for x in q[:]:
                k=min(int(basket),x['left'])
                if k<=0:break
                basket-=k;x['left']-=k;gain+=k*unit
                if x['left']==0:
                    q.remove(x);gain+=0.05*x['N']*unit;gcount+=1
                    if v.get('goals') and F>=5 and t>=gnext and gcount>=v.get('gn',10): gcount=0;gnext=t+v.get('gcd',120);gain+=v.get('gr',12)*f(F,'eggs_per_sec')*unit;ev['goal']+=1
                    elif t<gnext: gcount=0
            coins+=round(gain,2);earned+=round(gain,2)
            while True:
                fc=f(F,'farm_cost');cc=f(C,'collection_cost')
                if F<30 and coins>=fc: coins-=fc;F+=1;reach.setdefault(F,t);continue
                if C<30 and coins>=cc and cc<=0.5*fc: coins-=cc;C+=1;continue
                break
        if t in (600.0,1800.0): inc.append(earned)
    return dict(L10=reach.get(10,9e9),L18=reach.get(18,9e9),L20=reach.get(20,9e9),i10=inc[0]/10,i30=(inc[1]-inc[0])/20,**ev)
if __name__=='__main__':
    print("| seller | variant | L10 min | L18 min | L20 min | $/min 0-10 | $/min 10-30 | bulk served/missed | rush caught/missed | goals done |\n|---|---|---|---|---|---|---|---|---|---|")
    for check in (5,15,30):
        for n,v in V.items():
            rs=[run(s,check,v) for s in range(12)];g=lambda k:st.median([r[k] for r in rs])
            print(f"| {check}s | {n} | {g('L10')/60:.1f} | {g('L18')/60:.1f} | {g('L20')/60:.1f} | {g('i10'):.0f} | {g('i30'):.0f} | {g('bulk'):.0f}/{g('bulkmiss'):.0f} | {g('rush'):.0f}/{g('rushmiss'):.0f} | {g('goal'):.0f} |")
