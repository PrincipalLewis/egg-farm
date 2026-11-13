"""Market mechanics sim (penalty / completion bonus / focus vs bulk). python3 mechanics_sim.py > mechanics_table.md
Numbers: read live from product/economy.csv (P1q queue/interval/demand, F1-era costs, collection price bonus).
Player: taps Collect 1/s; every `check` s acts on the market; buys per AC7 seller15 rule after each check
(Farm if affordable, else Collection if cost <= 50% of next Farm cost; repeat). No workers. 0.1 s ticks, 20 seeds, 60 min.
"""
import csv, math, random, os, statistics as st
R=list(csv.DictReader(open(os.path.join(os.path.dirname(__file__),'../../economy.csv'))))
f=lambda L,c: float(R[min(L,30)][c])
VARIANTS={
 'base':{},
 'P-rep':{'rep':True},          # (1) reputation: walkout -2% price (floor 80%), +1% per full serve back to 100%
 'P-fee':{'fee':True},       # (1) alt: walkout costs 5% of that order's value in coins (floor $0)
 'B-done':{'done':0.10},        # (2) +10% of the customer's order value on full fill before timeout
 'C-bulk':{'combo':0.03,'cap':0.15},   # (3) Sell all: +3% per extra customer fully served in the same tap, cap +15%
 'C-focus':{'focus':0.15},      # (3) one customer per action at +15%
 'rep+done':{'rep':True,'done':0.10},
 'done05':{'done':0.05},
 'M4 pen05+done05':{'pen':0.05,'done':0.05},   # M4: timeout unserved loses 5% of remaining value if basket>0; +5% completion
}
def run(seed,check,v,T=3600,dt=0.1):
    rng=random.Random(seed);F=C=0;coop=basket=coins=0.0;q=[];t=0.0;nxt=f(0,'first_customer_s');tap=1.0;chk=check
    unit=1.0;rep=1.0;reach={};inc=[];lost_full=lost_to=spawn=0;earned=0.0
    for _ in range(int(T/dt)):
        t=round(t+dt,1);coop=min(f(F,'coop_capacity'),coop+f(F,'eggs_per_sec')*dt)
        for x in [x for x in q if t>=x['until']]:
            q.remove(x);lost_to+=1
            if v.get('rep'):rep=max(0.8,rep-0.02)
            if v.get('fee'):coins=max(0.0,coins-round(0.05*x['N']*unit,2))
            if v.get('pen') and basket>=1:
                p=round(v['pen']*x['left']*unit,2);paid=min(coins,p);coins-=paid;earned-=paid
        if t>=nxt:
            nxt=t+f(F,'customer_interval_s');spawn+=1
            if len(q)<int(f(F,'queue_max')):
                N=rng.randint(int(f(F,'demand_min')),int(f(F,'demand_max')));q.append({'N':N,'left':N,'until':t+30})
            else: lost_full+=1
        if t>=tap: tap+=1;m=min(coop,f(C,'eggs_per_tap'));coop-=m;basket+=m
        unit=round(f(F,'egg_price')*(1+f(C,'collection_price_bonus'))*rep,2)
        if t>=chk:
            chk+=check
            targets=q[:1] if v.get('focus') else q[:]
            served=0;gain=0.0
            for x in targets:
                k=min(int(basket),x['left'])
                if k<=0:break
                basket-=k;x['left']-=k;g=k*unit*(1+v.get('focus',0));gain+=g
                if x['left']==0:
                    q.remove(x);served+=1
                    if v.get('done'):gain+=v['done']*x['N']*unit
                    if v.get('rep'):rep=min(1.0,rep+0.01)
            if v.get('combo') and served>1: gain*=1+min(v['cap'],v['combo']*(served-1))
            coins+=round(gain,2);earned+=round(gain,2)
            while True:
                fc=f(F,'farm_cost');cc=f(C,'collection_cost')
                if F<30 and coins>=fc: coins-=fc;F+=1;reach.setdefault(F,t);continue
                if C<30 and coins>=cc and cc<=0.5*fc: coins-=cc;C+=1;continue
                break
        if t in (600.0,1800.0): inc.append(earned)
    return dict(L10=reach.get(10),L18=reach.get(18),L20=reach.get(20),i10=inc[0]/10,i30=(inc[1]-inc[0])/20,F60=F,
                lf=100*lost_full/spawn,lt=100*lost_to/spawn,rep=rep)
med=lambda xs:(st.median(xs) if None not in xs else float('nan'))
if __name__=='__main__':
    print("| seller | variant | L10 min | L18 min | L20 min | $/min 0-10 | $/min 10-30 | Farm L @60 | lost full % | lost timeout % |\n|---|---|---|---|---|---|---|---|---|---|")
    for check in (5,15,30):
        for name,v in VARIANTS.items():
            rs=[run(s,check,v) for s in range(20)]
            g=lambda k:med([r[k] for r in rs])
            m=lambda k:(g(k)/60 if g(k)==g(k) else float('nan'))
            print(f"| {check}s | {name} | {m('L10'):.1f} | {m('L18'):.1f} | {m('L20'):.1f} | {g('i10'):.0f} | {g('i30'):.0f} | {g('F60'):.0f} | {g('lf'):.1f} | {g('lt'):.1f} |")
