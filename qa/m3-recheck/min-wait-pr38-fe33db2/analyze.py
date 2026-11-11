import json,sys,statistics as st,math
def load(p): return {x['seed']:x for f in p for x in json.load(open(f))}
M=load(sys.argv[1].split(',')); F=load(sys.argv[2].split(',')); seeds=sorted(set(M)&set(F)); n=len(seeds)
print('paired seeds',n,seeds[0],'-',seeds[-1])
def pct(x,L):
  sp=x['spawn'].count(L); return None if sp==0 else 100*x['filled'].count(L)/sp
print('L  main  fe33  meandiff  SD  SE  lo95')
trip=[]
for L in range(3,26):
  d=[];mm=[];ff=[]
  for s in seeds:
    a,b=pct(M[s],L),pct(F[s],L)
    if a is None or b is None: continue
    d.append(b-a);mm.append(a);ff.append(b)
  m=st.mean(d);sd=st.stdev(d);se=sd/math.sqrt(len(d))
  print(L,round(st.mean(mm),2),round(st.mean(ff),2),round(m,3),round(sd,2),round(se,3),round(m-1.96*se,3),'n',len(d))
  if m< -2.0: trip.append(L)
print('TRIPS',trip)
for k in ['wageN','wageC','inc']:
  a=sum(M[s][k] for s in seeds);b=sum(F[s][k] for s in seeds); print(k,'main',a,'fe33',b,'rel%%', '%.3f'%(100*(b-a)/a))
same=sum(M[s]['wageN']==F[s]['wageN'] for s in seeds); print('per-seed wageN equal',same,'/',n)
dW=[F[s]['wageN']-M[s]['wageN'] for s in seeds]; print('per-seed wageN diff min/max',min(dW),max(dW))
ip=[100*(F[s]['inc']-M[s]['inc'])/M[s]['inc'] for s in seeds]; print('per-seed income diff%% mean %.3f median %.3f'%(st.mean(ip),st.median(ip)))
for nm,X in (('main',M),('fe33',F)):
  k=[v for s in seeds for v in X[s]['mhK2']]; print('F2 MH sale eggs',nm,'n',len(k),'median',st.median(k) if k else None)
