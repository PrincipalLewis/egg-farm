# Paired-diff noise from base vs perturbed (MH every_s 1.2) on the shipped sim, 400 seeds; power sim for rules A and B.
import json, numpy as np
ld=lambda v:json.load(open(f'r400-{v}-a.json'))+json.load(open(f'r400-{v}-b.json'))
B,P=ld('base'),ld('p12'); n0=len(B); LV=list(range(3,26))
def mat(R,key): return np.array([[x[key].count(L) for L in LV] for x in R],float)
sb,fb,sp,fp=mat(B,'spawn'),mat(B,'filled'),mat(P,'spawn'),mat(P,'filled')
eco=json.load(open('/workspace/egg-farm-studio/scratch/mh-hold/t2_lc1.json'))['prog']
true=np.array([eco['hold5']['levels'][str(L)]['served_pct']-eco['base']['levels'][str(L)]['served_pct'] for L in LV])
i20=LV.index(20)
def est(idx):
  Sb,Fb,Sp,Fp=sb[idx],fb[idx],sp[idx],fp[idx]
  Rb,Rp=Fb.sum(0)/Sb.sum(0),Fp.sum(0)/Sp.sum(0)
  zb=(Fb-Rb*Sb)/Sb.mean(0); zp=(Fp-Rp*Sp)/Sp.mean(0)   # linearised ratio estimator
  d=100*(zp-zb); se=d.std(0,ddof=1)/np.sqrt(len(idx))
  return 100*(Rp-Rb), se, d
full,se400,d=est(np.arange(n0))
per_seed_sd=d.std(0,ddof=1)
# unpaired reference: per-seed served% SD
zb=100*(fb-fb.sum(0)/sb.sum(0)*sb)/sb.mean(0); zp=100*(fp-fp.sum(0)/sp.sum(0)*sp)/sp.mean(0)
rho=[np.corrcoef(zb[:,j],zp[:,j])[0,1] for j in range(len(LV))]
print('observed perturbed-vs-base diff L20 %.2f, per-seed paired SD L20 %.2f, unpaired per-seed SD %.2f, corr %.2f'%(full[i20],per_seed_sd[i20],zb[:,i20].std(),rho[i20]))
print('per-seed paired SD all levels: min %.1f median %.1f max %.1f'%(per_seed_sd.min(),np.median(per_seed_sd),per_seed_sd.max()))
rng=np.random.default_rng(20261017); res={}
for n in (100,300,400):
  pa=pb=pb20=0; K=4000
  for _ in range(K):
    idx=rng.integers(0,n0,n); m,se,_=est(idx); m=m-full+true  # centred noise + assumed true effect
    lo=m-1.96*se
    pa+= (m[i20]>=-0.5) and (lo[i20]>=-1.0)
    pb+= lo.min()>=-0.5
  res[n]=(pa/K,pb/K); print(f'n={n}: P(pass A)={pa/K:.2f}  P(pass B)={pb/K:.2f}  (L20 SE≈{per_seed_sd[i20]/np.sqrt(n):.2f})')
# B with all levels' true effect 0 except L20 (sensitivity)
t0=np.zeros(len(LV)); t0[i20]=-0.48
for n in (300,400):
  pb=0;K=4000
  for _ in range(K):
    idx=rng.integers(0,n0,n); m,se,_=est(idx); m=m-full+t0; pb+=(m-1.96*se).min()>=-0.5
  print(f'B sensitivity (only L20 = -0.48, others 0) n={n}: {pb/K:.2f}')
print('Economy true effects used:',dict(zip(LV,np.round(true,2))))
