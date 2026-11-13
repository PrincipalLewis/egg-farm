"""Progression market sim: levels bought from real sale income. python3 progression_sim.py > progression_table.md
Start: new game (coins 0, L0/C0, first customer at 10 s). Tap Collect 1/s; Sell all every `check` s.
Buy rule = economy_sim.py (greedy cheapest; Collection only while tap < 3x production or C<2).
Queue cap 3+floor(L/10), patience 30 s, demand uniform int [3+L,8+2L], price at sale time. 0.1 s ticks; 10 seeds.
"""
import math,random
ccost=lambda c:math.floor(10*1.15**c); fcost=lambda f:math.floor(25*1.35**f)
tap=lambda c:5+5*c; rate=lambda f:0.2*(5+5*f); cap=lambda f:50+50*f
price=lambda f:round(1+.1*f,2); iv=lambda f:max(3.0,round(10*0.95**f,2)); qmax=lambda f:3+f//10
def run(seed,check,T=7200,dt=0.1):
    rng=random.Random(seed);c=f=0;coop=basket=coins=0.0;q=[];t=0.0;nxt=10.0;tap_t=1.0;chk=check
    per={L:[0,0,0] for L in range(31)}  # spawned, lost_full, lost_timeout (by Farm level at spawn)
    reach={}
    for _ in range(int(T/dt)):
        t=round(t+dt,1);coop=min(cap(f),coop+rate(f)*dt)
        if t>=nxt:
            nxt=t+iv(f);per[f][0]+=1
            if len(q)<qmax(f): q.append([rng.randint(3+f,8+2*f),t+30,f])
            else: per[f][1]+=1
        for x in [x for x in q if t>=x[1]]: q.remove(x);per[x[2]][2]+=1
        if t>=tap_t: tap_t+=1;m=min(coop,tap(c));coop-=m;basket+=m
        if t>=chk:
            chk+=check
            for x in q[:]:
                k=min(math.floor(basket),x[0]);basket-=k;x[0]-=k;coins=round(coins+math.floor(k*price(f)*100+0.5)/100,2)
                if x[0]==0:q.remove(x)
        for kind in sorted('cf',key=lambda k:ccost(c) if k=='c' else fcost(f)):
            cost=ccost(c) if kind=='c' else fcost(f)
            if f<30 and coins>=cost and (kind=='f' or tap(c)<rate(f)*3 or c<2):
                coins-=cost
                if kind=='c':c+=1
                else:
                    f+=1;reach.setdefault(f,t)
    return per,reach
if __name__=='__main__':
    for check in (5,15,30):
        P={L:[0,0,0] for L in range(31)};R={10:[],20:[]};maxL=[]
        for s in range(10):
            per,reach=run(s,check)
            for L in per: P[L]=[a+b for a,b in zip(P[L],per[L])]
            for k in R: R[k].append(reach.get(k))
            maxL.append(max(reach) if reach else 0)
        fmt=lambda v:'not reached' if None in v else f"{sum(v)/len(v)/60:.1f} min (range {min(v)/60:.1f}–{max(v)/60:.1f})"
        print(f"\n### Sell all every {check} s — time to Farm L10: {fmt(R[10])}; L20: {fmt(R[20])}; Farm L at 2 h: {sum(maxL)/10:.1f}\n")
        print("| Farm L | queue_max | customers seen | lost % | full queue % | timeout % |\n|---|---|---|---|---|---|")
        for L in range(31):
            sp,lf,lt=P[L]
            if sp: print(f"| {L} | {qmax(L)} | {sp} | {100*(lf+lt)/sp:.1f} | {100*lf/sp:.1f} | {100*lt/sp:.1f} |")
