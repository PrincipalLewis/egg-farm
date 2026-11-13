"""Trickle sim (order-chip-and-trickle-proposal.md). Market Hand every w1_every_s sells front-to-back; variants gate each card's sale.
Player idle (MH only; Coop Hand + passive coop->basket at eggs_per_sec as auto-collect proxy). 0.1s ticks, 40 seeds, 20 min, per Farm level.
python3 trickle_sim.py"""
import csv,os,random,math,statistics as st
R=list(csv.DictReader(open(os.path.join(os.path.dirname(__file__),'../../economy.csv'))))
f=lambda L,c: float(R[L][c])
def run(L,seed,var,T=1200,dt=0.1):
    rng=random.Random(seed);basket=0.;q=[];t=0.;nxt=f(L,'first_customer_s');cd=0.;coins=0.;sales=[];served=spawn=0
    price=f(L,'egg_price');eps=f(L,'eggs_per_sec');P=f(L,'customer_patience_s')
    for _ in range(int(T/dt)):
        t+=dt;basket+=eps*dt
        for c in [c for c in q if t>=c['until']]: q.remove(c)
        if t>=nxt:
            nxt=t+f(L,'customer_interval_s');spawn+=1
            if len(q)<int(f(L,'queue_max')):N=rng.randint(int(f(L,'demand_min')),int(f(L,'demand_max')));q.append({'N':N,'left':N,'t0':t,'until':t+P})
        cd-=dt
        if cd<=1e-9:
            cd=float(var[5:]) if var.startswith('every') else f(L,'w1_every_s')
            if var.startswith('hold') and q:
                S=float(var[4:].rstrip('x'));fr=q[0]
                if int(basket)<min(fr['left'],math.ceil(S*eps)) and fr['until']-t>(0.15 if var.endswith('x') else 3):continue
            for c in list(q):
                k=min(int(basket),c['left'])
                if k<1:break
                if var=='minwait2' and t-c['t0']<2:continue
                if var.startswith('min'):  # min partial size X = min(remaining, max(Xabs, share*N)); bypass when patience < 10s
                    X=min(c['left'],max(5,math.ceil(float(var[3:])*c['N']))) if var!='minwait2' else 1
                    if k<X and c['until']-t>10:break
                if var=='fill' and k<c['left'] and c['until']-t>10:break
                basket-=k;c['left']-=k;coins+=k*price;sales.append(k)
                if c['left']==0:q.remove(c);served+=1
    return coins/T*60,served/max(1,spawn),st.median(sales) if sales else 0,len(sales)/T*60
V=['base','minwait2','min0.25','fill','hold5','hold5x','every3','every5']
print('| F | variant | income/min | served % | median eggs/sale | sales/min |\n|---|---|---|---|---|---|')
for L in [2,3,5,8,10]:
    b=None
    for v in V:
        r=[run(L,s,v) for s in range(40)];inc=st.mean(x[0] for x in r)
        b=b or inc
        print(f'| {L} | {v} | {inc:.1f} ({(inc/b-1)*100:+.1f}%) | {st.mean(x[1] for x in r)*100:.1f} | {st.mean(x[2] for x in r):.1f} | {st.mean(x[3] for x in r):.1f} |')
